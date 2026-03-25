"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCreateArtist = exports.getCreateArtist = exports.getManageArtist = void 0;
const ArtistService = __importStar(require("../../services/admin/artist.service"));
const session_toast_helper_1 = require("../../helpers/session-toast.helper");
const slug_helper_1 = require("../../helpers/slug.helper");
const emptyPagination = () => ({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 5,
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
    res.redirect(`${req.baseUrl}/create`);
};
const getManageArtist = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const result = await ArtistService.getArtistsPaginated(page);
        res.render("admin/pages/manageartist/index", {
            pageTitle: "Quản lý nghệ sĩ",
            artists: result.artists,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                total: result.total,
                limit: result.limit,
            },
            paginationBasePath: req.baseUrl,
        });
    }
    catch (error) {
        console.error("getManageArtist error:", error);
        res.status(500).render("admin/pages/manageartist/index", {
            pageTitle: "Quản lý nghệ sĩ",
            artists: [],
            pagination: emptyPagination(),
            paginationBasePath: req.baseUrl,
            error: "Có lỗi xảy ra khi tải danh sách nghệ sĩ",
        });
    }
};
exports.getManageArtist = getManageArtist;
const getCreateArtist = async (req, res) => {
    try {
        res.render("admin/pages/manageartist/create", {
            pageTitle: "Tạo nghệ sĩ",
        });
    }
    catch (error) {
        console.error("getCreateArtist error:", error);
        res.status(500).send("Lỗi tải trang");
    }
};
exports.getCreateArtist = getCreateArtist;
const postCreateArtist = async (req, res) => {
    try {
        const name = String(req.body.name ?? "").trim();
        const descRaw = String(req.body.description ?? "").trim();
        const description = descRaw.length > 0 ? descRaw : undefined;
        const imageUrl = typeof req.body.image === "string" ? req.body.image.trim() : "";
        if (!name || !imageUrl) {
            (0, session_toast_helper_1.setSessionToast)(req, {
                type: "error",
                message: "Vui lòng nhập đầy đủ thông tin!",
            });
            redirectSafeBack(req, res);
            return;
        }
        const baseSlug = (0, slug_helper_1.slugifyArtistName)(name);
        const slug = await (0, slug_helper_1.ensureUniqueArtistSlug)(baseSlug);
        await ArtistService.createArtist({
            name,
            description,
            avatar: imageUrl,
            slug,
        });
        (0, session_toast_helper_1.setSessionToast)(req, {
            type: "success",
            message: "Tạo nghệ sĩ thành công 😎",
        });
        res.redirect(req.baseUrl);
    }
    catch (error) {
        console.error("postCreateArtist error:", error);
        (0, session_toast_helper_1.setSessionToast)(req, {
            type: "error",
            message: "Có lỗi xảy ra khi tạo nghệ sĩ. Vui lòng thử lại.",
        });
        redirectSafeBack(req, res);
    }
};
exports.postCreateArtist = postCreateArtist;
