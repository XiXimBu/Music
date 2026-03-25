import { Request, Response } from "express";
import mongoose from "mongoose";
import DashboardService from "../../services/admin/dashboard.service";
import Album from "../../models/album.model";

const emptyPagination = () => ({
	total: 0,
	page: 1,
	limit: 2,
	totalPages: 1,
});

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
	try {
		const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
		const limit = Math.max(1, parseInt(String(req.query.limit), 10) || 2);
		const result = await DashboardService.getDashboardAlbums({ page, limit });
		res.render("admin/pages/dashboard/index", {
			pageTitle: "Trang chủ",
			albums: result.docs,
			pagination: {
				total: result.total,
				page: result.page,
				limit: result.limit,
				totalPages: result.totalPages,
			},
			paginationBasePath: req.baseUrl,
		});
	} catch (error) {
		console.error("getDashboard error:", error);
		res.status(500).render("admin/pages/dashboard/index", {
			pageTitle: "Trang chủ",
			albums: [],
			pagination: emptyPagination(),
			paginationBasePath: req.baseUrl,
			error: "Có lỗi xảy ra",
		});
	}
};

const paramString = (value: string | string[] | undefined): string => {
	if (value === undefined) return "";
	return Array.isArray(value) ? (value[0] ?? "") : value;
};

export const changeStatus = async (req: Request, res: Response): Promise<void> => {
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

		const result = await Album.updateOne(
			{ _id: id, deleted: false },
			{ $set: { status: normalized } }
		);

		if (result.matchedCount === 0) {
			res.status(404).json({ code: 404, message: "Không tìm thấy album" });
			return;
		}

		res.json({
			code: 200,
			message: "Cập nhật trạng thái thành công!",
			status: normalized,
		});
	} catch (error) {
		console.error("changeStatus error:", error);
		res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
	}
};

