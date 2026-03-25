import { Request, Response } from "express";
import mongoose from "mongoose";
import Song from "../../models/song.model";
import SongService from "../../services/admin/song.service";
import { parseCreateSongBody } from "../../validations/admin/createSong.validation";
import { setSessionToast } from "../../helpers/session-toast.helper";

const paramString = (value: string | string[] | undefined): string => {
	if (value === undefined) return "";
	return Array.isArray(value) ? (value[0] ?? "") : value;
};

const emptyPagination = () => ({
	total: 0,
	page: 1,
	limit: 10,
	totalPages: 1,
});

/** Express 5 không còn xử lý `redirect("back")` — trình duyệt sẽ GET `/.../back`. */
const redirectSafeBack = (req: Request, res: Response): void => {
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
	res.redirect(req.baseUrl || "/admin/song");
};

export const getManageSong = async (req: Request, res: Response): Promise<void> => {
	try {
		const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
		const limit = Math.max(1, parseInt(String(req.query.limit), 10) || 10);
		const result = await SongService.getManageSongService({ page, limit });

		res.render("admin/pages/managesong/index", {
			pageTitle: "Quản lý bài hát",
			songs: result.docs,
			pagination: {
				total: result.total,
				page: result.page,
				limit: result.limit,
				totalPages: result.totalPages,
			},
			paginationBasePath: req.baseUrl,
		});
	} catch (error) {
		console.error("getManageSong error:", error);
		res.status(500).render("admin/pages/managesong/index", {
			pageTitle: "Quản lý bài hát",
			songs: [],
			pagination: emptyPagination(),
			paginationBasePath: req.baseUrl,
			error: "Có lỗi xảy ra",
		});
	}
};


export const changeStatusSong = async (req: Request, res: Response): Promise<void> => {
	try {
		const normalized = paramString(req.params.status).toLowerCase();
		const id = paramString(req.params.id);

		if (!mongoose.Types.ObjectId.isValid(id)) {
			res.status(400).json({ code: 400, message: "ID không hợp lệ" });
			return;
		}

		if (normalized !== "active" && normalized !== "inactive") {
			res.status(400).json({ code: 400, message: "Trạng thái không hợp lệ" });
			return;
		}

		const result = await Song.updateOne(
			{ _id: id, deleted: false },
			{ $set: { status: normalized } }
		);

		if (result.matchedCount === 0) {
			res.status(404).json({ code: 404, message: "Không tìm thấy bài hát" });
			return;
		}

		res.json({
			code: 200,
			message: "Cập nhật trạng thái thành công!",
			status: normalized,
		});
	} catch (error) {
		console.error("changeStatusSong error:", error);
		res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
	}
};

export const getCreateSong = async (req: Request, res: Response): Promise<void> => {
	try {
		const { topics } = await SongService.getCreateSongFormData();
		res.render("admin/pages/managesong/createSong", {
			pageTitle: "Tạo bài hát",
			topics,
		});
	} catch (error) {
		console.error("getCreateSong error:", error);
		res.status(500).send("Lỗi tải form");
	}
};

export const createSong = async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as Record<string, unknown>;
		const parsed = parseCreateSongBody(body);

		if (parsed.ok === false) {
			const { topics } = await SongService.getCreateSongFormData();
			res.status(400).render("admin/pages/managesong/createSong", {
				pageTitle: "Tạo bài hát",
				topics,
				error: parsed.error,
				form: body as Record<string, unknown>,
			});
			return;
		}

		try {
			await SongService.createSongService(parsed.data);
			setSessionToast(req, {
				type: "success",
				message: "Tạo bài hát thành công 😎",
			});
			redirectSafeBack(req, res);
		} catch (serviceErr) {
			const msg =
				serviceErr instanceof Error
					? serviceErr.message
					: "Không thể tạo bài hát.";
			setSessionToast(req, {
				type: "error",
				message: msg || "Có lỗi xảy ra 😢",
			});
			redirectSafeBack(req, res);
		}
	} catch (error) {
		console.error("createSong error:", error);
		setSessionToast(req, {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại. 😢",
		});
		redirectSafeBack(req, res);
	}
};
