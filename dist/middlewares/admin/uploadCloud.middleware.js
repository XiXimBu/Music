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
const cookiesFilePath = (() => {
    const candidates = [
        path_1.default.resolve(process.cwd(), "cookies.txt"),
        path_1.default.resolve(process.cwd(), "cookies.json"),
    ];
    for (const p of candidates) {
        try {
            if (fs_1.default.existsSync(p))
                return p;
        }
        catch {
        }
    }
    return undefined;
})();
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
        const url = String(youtubeUrl || "").trim();
        if (!url) {
            reject(new Error("Missing youtubeUrl"));
            return;
        }
        const tempDir = path_1.default.join(os_1.default.tmpdir(), "music_app_youtube");
        const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const outTemplate = path_1.default.join(tempDir, `${jobId}.%(ext)s`);
        const outMp3Path = path_1.default.join(tempDir, `${jobId}.mp3`);
        let uploadedOk = false;
        try {
            await fs_1.default.promises.mkdir(tempDir, { recursive: true });
            await (0, youtube_dl_exec_1.default)(url, {
                noPlaylist: true,
                extractAudio: true,
                audioFormat: "mp3",
                ffmpegLocation: ffmpeg_static_1.default,
                postprocessorArgs: "ffmpeg:-b:a 128k",
                output: outTemplate,
                preferFreeFormats: true,
                ...(cookiesFilePath ? { cookies: cookiesFilePath } : {}),
                quiet: true,
                noWarnings: true,
            });
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
