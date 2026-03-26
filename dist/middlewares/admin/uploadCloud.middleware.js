"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSingleImageToCloudinary = exports.uploadFields = void 0;
const cloudinary_1 = require("../../config/cloudinary");
const streamifier_1 = __importDefault(require("streamifier"));
const youtube_dl_exec_1 = __importDefault(require("youtube-dl-exec"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const session_toast_helper_1 = require("../../helpers/session-toast.helper");
const cookiePath = path_1.default.resolve(process.cwd(), "cookies.txt");
const hasCookiesFile = (() => {
    try {
        return fs_1.default.existsSync(cookiePath);
    }
    catch {
        return false;
    }
})();
const getExecutablePath = () => {
    if (process.env.YT_DLP_BIN)
        return process.env.YT_DLP_BIN;
    if (process.env.YOUTUBE_DL_PATH)
        return process.env.YOUTUBE_DL_PATH;
    const bundled = path_1.default.resolve(process.cwd(), "node_modules/youtube-dl-exec/bin/yt-dlp");
    if (fs_1.default.existsSync(bundled))
        return bundled;
    return "yt-dlp";
};
const ytExecutable = getExecutablePath();
const ytDlpRunner = youtube_dl_exec_1.default.create(ytExecutable);
function streamUploadBuffer(buffer, cloudinaryAccount) {
    return new Promise((resolve, reject) => {
        const stream = cloudinaryAccount.uploader.upload_stream({
            folder: "music_app",
            resource_type: "auto",
        }, (error, result) => {
            if (error) {
                reject(error);
                return;
            }
            if (result?.secure_url) {
                resolve({ secure_url: result.secure_url });
                return;
            }
            reject(new Error("Cloudinary upload returned no URL"));
        });
        streamifier_1.default.createReadStream(buffer).pipe(stream);
    });
}
function streamUploadFromYoutube(youtubeUrl, cloudinaryAccount) {
    return new Promise(async (resolve, reject) => {
        const rawUrl = String(youtubeUrl || "").trim();
        if (!rawUrl) {
            reject(new Error("Missing youtubeUrl"));
            return;
        }
        const url = rawUrl.split("&")[0];
        const tempDir = path_1.default.join(os_1.default.tmpdir(), "music_app_youtube");
        const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const outTemplate = path_1.default.join(tempDir, `${jobId}.%(ext)s`);
        const outMp3Path = path_1.default.join(tempDir, `${jobId}.mp3`);
        let uploadedOk = false;
        try {
            await fs_1.default.promises.mkdir(tempDir, { recursive: true });
            const baseOptions = {
                format: "bestaudio[ext=m4a]/bestaudio/best",
                extractorArgs: "youtube:player_client=ios,android,mweb;formats=missing_pot",
                extractAudio: true,
                audioFormat: "mp3",
                ffmpegLocation: ffmpeg_static_1.default,
                noPlaylist: true,
                forceIpv4: true,
                addHeader: [
                    "user-agent:Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
                    "accept-language:vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                ],
                postprocessorArgs: "ffmpeg:-b:a 128k",
                rmCacheDir: true,
                noCheckCertificates: true,
                quiet: true,
                noWarnings: true,
                output: outTemplate,
                ...(hasCookiesFile ? { cookies: cookiePath } : {}),
            };
            const isRequestedFormatNotAvailable = (err) => {
                const stderr = String(err?.stderr || "");
                const msg = String(err?.message || "");
                return (stderr.includes("Requested format is not available") ||
                    msg.includes("Requested format is not available"));
            };
            try {
                await ytDlpRunner(url, baseOptions);
            }
            catch (err) {
                if (!isRequestedFormatNotAvailable(err))
                    throw err;
                const retry1 = {
                    ...baseOptions,
                    format: undefined,
                    extractorArgs: "youtube:player_client=mweb,tv;skip=dash,hls",
                    noCheckFormats: true,
                };
                await ytDlpRunner(url, retry1);
            }
            const waitForReadable = async (p, attempts = 15) => {
                for (let i = 0; i < attempts; i++) {
                    try {
                        await fs_1.default.promises.access(p, fs_1.default.constants.R_OK);
                        const fd = await fs_1.default.promises.open(p, "r");
                        await fd.close();
                        return;
                    }
                    catch {
                        await new Promise((r) => setTimeout(r, 200));
                    }
                }
                throw new Error(`MP3 not readable after download: ${p}`);
            };
            await waitForReadable(outMp3Path);
            const uploaded = await new Promise((res, rej) => {
                const fileStream = fs_1.default.createReadStream(outMp3Path);
                const uploadStream = cloudinaryAccount.uploader.upload_stream({
                    folder: "music_app_youtube",
                    resource_type: "video",
                    format: "mp3",
                    transformation: [
                        {
                            audio_codec: "mp3",
                            bit_rate: "128k",
                        },
                    ],
                }, (error, result) => {
                    if (error) {
                        rej(error);
                        return;
                    }
                    if (result?.secure_url) {
                        res({ secure_url: result.secure_url });
                        return;
                    }
                    rej(new Error("Cloudinary returned no URL for YouTube stream"));
                });
                fileStream.on("error", (err) => {
                    console.error("YT-DLP file stream error:", err);
                    rej(err);
                });
                fileStream.pipe(uploadStream);
            });
            uploadedOk = true;
            resolve(uploaded);
        }
        catch (err) {
            const isSpawnMissingBinary = String(err?.code || "") === "ENOENT";
            if (isSpawnMissingBinary) {
                console.error("YT-DLP binary not found. Set YT_DLP_BIN/YOUTUBE_DL_PATH or ensure `yt-dlp` is in PATH.", {
                    ytExecutable,
                    YT_DLP_BIN: process.env.YT_DLP_BIN,
                    YOUTUBE_DL_PATH: process.env.YOUTUBE_DL_PATH,
                });
            }
            console.error("YT-DLP Error:", err);
            reject(err);
        }
        finally {
            try {
                if (uploadedOk) {
                    await fs_1.default.promises.unlink(outMp3Path);
                }
                else {
                    await fs_1.default.promises.unlink(outMp3Path);
                }
            }
            catch {
            }
        }
    });
}
const uploadFields = async (req, res, next) => {
    if (!req.files && !req.body.youtubeUrl)
        return next();
    try {
        const files = req.files || {};
        const uploadTasks = [];
        if (files['thumbnail'] && files['thumbnail'][0]) {
            const thumbnailFile = files['thumbnail'][0];
            uploadTasks.push(streamUploadBuffer(thumbnailFile.buffer, cloudinary_1.cloudinaryImage)
                .then(res => ({ fieldName: 'thumbnail', url: res.secure_url })));
        }
        if (req.body.youtubeUrl) {
            uploadTasks.push(streamUploadFromYoutube(req.body.youtubeUrl, cloudinary_1.cloudinaryMusic)
                .then(res => ({ fieldName: 'audio', url: res.secure_url })));
        }
        else if (files['audio'] && files['audio'][0]) {
            const audioFile = files['audio'][0];
            uploadTasks.push(streamUploadBuffer(audioFile.buffer, cloudinary_1.cloudinaryMusic)
                .then(res => ({ fieldName: 'audio', url: res.secure_url })));
        }
        if (uploadTasks.length > 0) {
            const results = await Promise.all(uploadTasks);
            for (const { fieldName, url } of results) {
                req.body[fieldName] = url;
            }
        }
        next();
    }
    catch (error) {
        console.error("Upload/Youtube Error:", error);
        res.status(500).json({ message: "Lỗi khi upload dữ liệu (File hoặc YouTube)" });
    }
};
exports.uploadFields = uploadFields;
const uploadSingleImageToCloudinary = async (req, res, next) => {
    if (!req.file?.buffer) {
        next();
        return;
    }
    try {
        const uploaded = await streamUploadBuffer(req.file.buffer, cloudinary_1.cloudinaryImage);
        req.body.image = uploaded.secure_url;
        next();
    }
    catch (error) {
        console.error("uploadSingleImageToCloudinary error:", error);
        (0, session_toast_helper_1.setSessionToast)(req, {
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
            }
            catch {
            }
        }
        res.redirect(`${req.baseUrl}/create`);
    }
};
exports.uploadSingleImageToCloudinary = uploadSingleImageToCloudinary;
