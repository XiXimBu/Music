"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeStatus = exports.getDashboard = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dashboard_service_1 = __importDefault(require("../../services/admin/dashboard.service"));
const album_model_1 = __importDefault(require("../../models/album.model"));
const emptyPagination = () => ({
    total: 0,
    page: 1,
    limit: 2,
    totalPages: 1,
});
const getDashboard = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.max(1, parseInt(String(req.query.limit), 10) || 2);
        const result = await dashboard_service_1.default.getDashboardAlbums({ page, limit });
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
    }
    catch (error) {
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
exports.getDashboard = getDashboard;
const paramString = (value) => {
    if (value === undefined)
        return "";
    return Array.isArray(value) ? (value[0] ?? "") : value;
};
const changeStatus = async (req, res) => {
    try {
        const normalized = paramString(req.params.status).toLowerCase();
        const id = paramString(req.params.id);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ code: 400, message: "ID không hợp lệ" });
            return;
        }
        if (normalized !== "active" && normalized !== "inactive") {
            res.status(400).json({ code: 400, message: "Trạng thái không hợp lệ" });
            return;
        }
        const result = await album_model_1.default.updateOne({ _id: id, deleted: false }, { $set: { status: normalized } });
        if (result.matchedCount === 0) {
            res.status(404).json({ code: 404, message: "Không tìm thấy album" });
            return;
        }
        res.json({
            code: 200,
            message: "Cập nhật trạng thái thành công!",
            status: normalized,
        });
    }
    catch (error) {
        console.error("changeStatus error:", error);
        res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
    }
};
exports.changeStatus = changeStatus;
