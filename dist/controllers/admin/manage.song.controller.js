"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSong = exports.getCreateSong = exports.changeStatusSong = exports.getManageSong = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const song_model_1 = __importDefault(require("../../models/song.model"));
const song_service_1 = __importDefault(require("../../services/admin/song.service"));
const createSong_validation_1 = require("../../validations/admin/createSong.validation");
const session_toast_helper_1 = require("../../helpers/session-toast.helper");
const paramString = (value) => {
    if (value === undefined)
        return "";
    return Array.isArray(value) ? (value[0] ?? "") : value;
};
const emptyPagination = () => ({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
});
const redirectSafeBack = (req, res) => {
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
    res.redirect(req.baseUrl || "/admin/song");
};
const getManageSong = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.max(1, parseInt(String(req.query.limit), 10) || 10);
        const result = await song_service_1.default.getManageSongService({ page, limit });
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
    }
    catch (error) {
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
exports.getManageSong = getManageSong;
const changeStatusSong = async (req, res) => {
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
        const result = await song_model_1.default.updateOne({ _id: id, deleted: false }, { $set: { status: normalized } });
        if (result.matchedCount === 0) {
            res.status(404).json({ code: 404, message: "Không tìm thấy bài hát" });
            return;
        }
        res.json({
            code: 200,
            message: "Cập nhật trạng thái thành công!",
            status: normalized,
        });
    }
    catch (error) {
        console.error("changeStatusSong error:", error);
        res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
    }
};
exports.changeStatusSong = changeStatusSong;
const getCreateSong = async (req, res) => {
    try {
        const { topics } = await song_service_1.default.getCreateSongFormData();
        res.render("admin/pages/managesong/createSong", {
            pageTitle: "Tạo bài hát",
            topics,
        });
    }
    catch (error) {
        console.error("getCreateSong error:", error);
        res.status(500).send("Lỗi tải form");
    }
};
exports.getCreateSong = getCreateSong;
const createSong = async (req, res) => {
    try {
        const body = req.body;
        const parsed = (0, createSong_validation_1.parseCreateSongBody)(body);
        if (parsed.ok === false) {
            const { topics } = await song_service_1.default.getCreateSongFormData();
            res.status(400).render("admin/pages/managesong/createSong", {
                pageTitle: "Tạo bài hát",
                topics,
                error: parsed.error,
                form: body,
            });
            return;
        }
        try {
            await song_service_1.default.createSongService(parsed.data);
            (0, session_toast_helper_1.setSessionToast)(req, {
                type: "success",
                message: "Tạo bài hát thành công 😎",
            });
            redirectSafeBack(req, res);
        }
        catch (serviceErr) {
            const msg = serviceErr instanceof Error
                ? serviceErr.message
                : "Không thể tạo bài hát.";
            (0, session_toast_helper_1.setSessionToast)(req, {
                type: "error",
                message: msg || "Có lỗi xảy ra 😢",
            });
            redirectSafeBack(req, res);
        }
    }
    catch (error) {
        console.error("createSong error:", error);
        (0, session_toast_helper_1.setSessionToast)(req, {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại. 😢",
        });
        redirectSafeBack(req, res);
    }
};
exports.createSong = createSong;
