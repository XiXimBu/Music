import { Request, Response, NextFunction } from "express";
import { cloudinaryImage, cloudinaryMusic } from "../../config/cloudinary";
import streamifier from "streamifier";
import ytdlExec from "youtube-dl-exec";
import ffmpeg from 'ffmpeg-static';
import fs from "fs";
import path from "path";
import os from "os";
import { setSessionToast } from "../../helpers/session-toast.helper";

/** Bộ nhớ Multer: chỉ khai báo field đang dùng */
type MulterMemoryFile = {
    buffer: Buffer;
    fieldname: string;
};

type ReqWithMulterFiles = Request & {
    files?: { [fieldname: string]: MulterMemoryFile[] };
};

/** Một file đơn (vd. avatar artist) */
type ReqWithSingleFile = Request & {
    file?: Express.Multer.File;
};

type CloudinaryV2 = typeof cloudinaryImage;

// Render (datacenter IP) dễ bị YouTube chặn; cấp “hộ chiếu” cookies cho yt-dlp.
// IMPORTANT: chỉ dùng Netscape cookie file `cookies.txt` để tránh nhầm JSON.
const cookiePath = path.resolve(process.cwd(), "cookies.txt");
const hasCookiesFile = (() => {
    try {
        return fs.existsSync(cookiePath);
    } catch {
        return false;
    }
})();

/** Upload buffer lên Cloudinary qua stream */
function streamUploadBuffer(buffer: Buffer, cloudinaryAccount: CloudinaryV2): Promise<{ secure_url: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinaryAccount.uploader.upload_stream(
            {
                folder: "music_app",
                resource_type: "auto",
            },
            (error: unknown, result: { secure_url?: string } | undefined) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (result?.secure_url) {
                    resolve({ secure_url: result.secure_url });
                    return;
                }
                reject(new Error("Cloudinary upload returned no URL"));
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
}

/** 
 * NEW: Stream trực tiếp từ YouTube sang Cloudinary 
 */
function streamUploadFromYoutube(youtubeUrl: string, cloudinaryAccount: CloudinaryV2): Promise<{ secure_url: string }> {
    return new Promise(async (resolve, reject) => {
        const rawUrl = String(youtubeUrl || "").trim();
        if (!rawUrl) {
            reject(new Error("Missing youtubeUrl"));
            return;
        }
        // Làm sạch link: bỏ tham số playlist/radio (&list=..., &index=..., ...)
        const url = rawUrl.split("&")[0];

        // Download + extract audio bằng yt-dlp (qua youtube-dl-exec).
        // Note: yêu cầu có ffmpeg trong PATH để extract/convert mp3.
        const tempDir = path.join(os.tmpdir(), "music_app_youtube");
        const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const outTemplate = path.join(tempDir, `${jobId}.%(ext)s`);
        const outMp3Path = path.join(tempDir, `${jobId}.mp3`);

        let uploadedOk = false;
        try {
            await fs.promises.mkdir(tempDir, { recursive: true });

            // Cấu hình “tổng lực” cho môi trường Cloud (Render).
            // IMPORTANT: dùng flags object (không truyền argv array), tránh lỗi flatten kiểu `-0`, `--13`, `--14`.
            const options: any = {
                // 1) ÉP LẤY LUỒNG ÂM THANH (ưu tiên m4a trước)
                format: "bestaudio[ext=m4a]/bestaudio/best",

                // 2) GIẢ LẬP THIẾT BỊ “SẠCH” (iOS/Android/mweb) + hiện formats missing POT
                extractorArgs: "youtube:player_client=ios,android,mweb;formats=missing_pot",

                extractAudio: true,
                audioFormat: "mp3",
                ffmpegLocation: ffmpeg,
                noPlaylist: true,

                // 3) DÙNG IPv4 (Render/Cloud ổn định hơn)
                forceIpv4: true,

                // 4) HEADER TỐI ƯU
                addHeader: [
                    "user-agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
                    "accept-language:vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                ],

                postprocessorArgs: "ffmpeg:-b:a 128k",

                rmCacheDir: true,
                noCheckCertificates: true,
                quiet: true,
                noWarnings: true,

                // output template (file tạm)
                output: outTemplate,

                // Cookies để vượt chặn datacenter IP (Render)
                ...(hasCookiesFile ? { cookies: cookiePath } : {}),
            };

            await ytdlExec(url, options);

            // Windows: đôi khi file vừa tạo xong bị lock ngắn (AV/indexer)
            const waitForReadable = async (p: string, attempts = 15) => {
                for (let i = 0; i < attempts; i++) {
                    try {
                        await fs.promises.access(p, fs.constants.R_OK);
                        const fd = await fs.promises.open(p, "r");
                        await fd.close();
                        return;
                    } catch {
                        await new Promise((r) => setTimeout(r, 200));
                    }
                }
                throw new Error(`MP3 not readable after download: ${p}`);
            };

            await waitForReadable(outMp3Path);

            const uploaded = await new Promise<{ secure_url: string }>((res, rej) => {
                const fileStream = fs.createReadStream(outMp3Path);

                const uploadStream = cloudinaryAccount.uploader.upload_stream(
                    {
                        folder: "music_app_youtube",
                        resource_type: "video", // Audio trên Cloudinary dùng resource_type video
                        format: "mp3",
                        transformation: [
                            {
                                audio_codec: "mp3",
                                bit_rate: "128k",
                            },
                        ],
                    },
                    (error: unknown, result: { secure_url?: string } | undefined) => {
                        if (error) {
                            rej(error);
                            return;
                        }
                        if (result?.secure_url) {
                            res({ secure_url: result.secure_url });
                            return;
                        }
                        rej(new Error("Cloudinary returned no URL for YouTube stream"));
                    }
                );

                fileStream.on("error", (err) => {
                    console.error("YT-DLP file stream error:", err);
                    rej(err);
                });

                fileStream.pipe(uploadStream);
            });

            uploadedOk = true;
            resolve(uploaded);
        } catch (err) {
            console.error("YT-DLP Error:", err);
            reject(err);
        } finally {
            // Best-effort cleanup
            try {
                // Chỉ cleanup sau khi upload đã hoàn tất (thành công hoặc thất bại sau khi đã mở stream)
                if (uploadedOk) {
                    await fs.promises.unlink(outMp3Path);
                } else {
                    // nếu fail trước upload, vẫn cố xóa
                    await fs.promises.unlink(outMp3Path);
                }
            } catch {
                /* ignore */
            }
        }
    });
}

/**
 * Cập nhật hàm uploadFields để hỗ trợ cả File và YouTube Link
 */
export const uploadFields = async (req: ReqWithMulterFiles, res: Response, next: NextFunction) => {
    // Nếu không có file và cũng không có link youtube thì next()
    if (!req.files && !req.body.youtubeUrl) return next();

    try {
        const files = req.files || {};
        const uploadTasks: Promise<{ fieldName: string, url: string }>[] = [];

        // 1. Xử lý upload ảnh (thumbnail) nếu có
        if (files['thumbnail'] && files['thumbnail'][0]) {
            const thumbnailFile = files['thumbnail'][0];
            uploadTasks.push(
                streamUploadBuffer(thumbnailFile.buffer, cloudinaryImage)
                    .then(res => ({ fieldName: 'thumbnail', url: res.secure_url }))
            );
        }

        // 2. Xử lý upload Audio (Ưu tiên link YouTube nếu có, ngược lại dùng file)
        if (req.body.youtubeUrl) {
            uploadTasks.push(
                streamUploadFromYoutube(req.body.youtubeUrl, cloudinaryMusic)
                    .then(res => ({ fieldName: 'audio', url: res.secure_url }))
            );
        } else if (files['audio'] && files['audio'][0]) {
            const audioFile = files['audio'][0];
            uploadTasks.push(
                streamUploadBuffer(audioFile.buffer, cloudinaryMusic)
                    .then(res => ({ fieldName: 'audio', url: res.secure_url }))
            );
        }

        // Chạy song song tất cả các tác vụ
        if (uploadTasks.length > 0) {
            const results = await Promise.all(uploadTasks);
            
            // Gán kết quả trả về vào req.body để controller sử dụng
            for (const { fieldName, url } of results) {
                req.body[fieldName] = url;
            }
        }

        next();
    } catch (error) {
        console.error("Upload/Youtube Error:", error);
        res.status(500).json({ message: "Lỗi khi upload dữ liệu (File hoặc YouTube)" });
    }
};

/**
 * Upload một ảnh (field Multer `image`) lên Cloudinary, gán URL vào `req.body.image`.
 */
export const uploadSingleImageToCloudinary = async (
    req: ReqWithSingleFile,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.file?.buffer) {
        next();
        return;
    }
    try {
        const uploaded = await streamUploadBuffer(req.file.buffer, cloudinaryImage);
        req.body.image = uploaded.secure_url;
        // ... (phần code redirect ở dưới giữ nguyên như của bạn)
        next();
    } catch (error) {
        console.error("uploadSingleImageToCloudinary error:", error);
        setSessionToast(req, {
            type: "error",
            message: "Lỗi khi upload ảnh. Vui lòng thử lại.",
        });
        const ref = req.get("Referrer") || req.get("Referer");
        const host = req.get("host");
        if (ref && host) {
            try {
                const u = new URL(ref);
                if (u.host === host) {
                    res.redirect(ref);
                    return;
                }
            } catch {
                /* ignore */
            }
        }
        res.redirect(`${req.baseUrl}/create`);
    }
};