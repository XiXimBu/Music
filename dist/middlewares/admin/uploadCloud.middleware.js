"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSingleImageToCloudinary = exports.uploadFields = void 0;
const cloudinary_1 = require("../../config/cloudinary");
const streamifier_1 = __importDefault(require("streamifier"));
const session_toast_helper_1 = require("../../helpers/session-toast.helper");
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
const uploadFields = async (req, res, next) => {
    if (!req.files)
        return next();
    try {
        const files = req.files;
        const entries = Object.entries(files);
        const results = await Promise.all(entries.map(async ([fieldName, fileList]) => {
            const file = fileList[0];
            const cloudinaryAccount = fieldName === "audio" ? cloudinary_1.cloudinaryMusic : cloudinary_1.cloudinaryImage;
            const uploaded = await streamUploadBuffer(file.buffer, cloudinaryAccount);
            return { fieldName, url: uploaded.secure_url };
        }));
        for (const { fieldName, url } of results) {
            req.body[fieldName] = url;
        }
        next();
    }
    catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Lỗi khi upload lên Cloudinary" });
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
