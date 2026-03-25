import { Request, Response, NextFunction } from "express";
import { cloudinaryImage, cloudinaryMusic } from "../../config/cloudinary";
import streamifier from "streamifier";
import { setSessionToast } from "../../helpers/session-toast.helper";

/** Bộ nhớ Multer: chỉ khai báo field đang dùng (tránh phụ thuộc Express.Multer khi `types: []`). */
type MulterMemoryFile = {
	buffer: Buffer;
	fieldname: string;
};

type ReqWithMulterFiles = Request & {
	files?: { [fieldname: string]: MulterMemoryFile[] };
};

/** Một file đơn (vd. avatar artist): Multer memory → không có `path`, chỉ có `buffer`. */
type ReqWithSingleFile = Request & {
	file?: Express.Multer.File;
};

type CloudinaryV2 = typeof cloudinaryImage;

/** Upload buffer lên Cloudinary qua stream (phù hợp file nặng hơn base64). */
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

export const uploadFields = async (req: ReqWithMulterFiles, res: Response, next: NextFunction) => {
	if (!req.files) return next();

	try {
		const files = req.files;

		// Upload song song (parallel): trước đây for + await lần lượt → thời gian ≈ tổng từng file (~7s với ảnh + nhạc).
		// Promise.all → thời gian ≈ file chậm nhất (thường audio), giảm đáng kể tổng latency.
		const entries = Object.entries(files);
		const results = await Promise.all(
			entries.map(async ([fieldName, fileList]) => {
				const file = fileList[0];
				const cloudinaryAccount: CloudinaryV2 =
					fieldName === "audio" ? cloudinaryMusic : cloudinaryImage;
				const uploaded = await streamUploadBuffer(file.buffer, cloudinaryAccount);
				return { fieldName, url: uploaded.secure_url };
			})
		);

		for (const { fieldName, url } of results) {
			req.body[fieldName] = url;
		}

		next();
	} catch (error) {
		console.error("Upload Error:", error);
		res.status(500).json({ message: "Lỗi khi upload lên Cloudinary" });
	}
};

/**
 * Upload một ảnh (field Multer `image`) lên Cloudinary, gán URL vào `req.body.image`.
 * Dùng sau `uploadSingleImage("image")` — đồng bộ với bài hát (buffer → URL, không dùng `req.file.path`).
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
