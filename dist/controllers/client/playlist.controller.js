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
exports.postRemoveSongFromPlaylist = exports.postAddSongToPlaylist = exports.deletePlaylist = exports.patchUpdatePlaylist = exports.postCreatePlaylist = void 0;
const playlistService = __importStar(require("../../services/client/playlist.service"));
const userService = __importStar(require("../../services/client/user.service"));
const postCreatePlaylist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        const playlist = await playlistService.createPlaylist(userId, {
            title: req.body?.title,
            description: req.body?.description,
        });
        res.status(201).json({
            success: true,
            message: "Tạo playlist thành công.",
            data: playlist,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tạo playlist.";
        res.status(400).json({ success: false, message });
    }
};
exports.postCreatePlaylist = postCreatePlaylist;
const patchUpdatePlaylist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const playlistId = String(req.params?.id || "").trim();
        if (!userId) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        if (!playlistId) {
            res.status(400).json({ success: false, message: "Thiếu playlistId." });
            return;
        }
        const playlist = await playlistService.updatePlaylist(userId, playlistId, {
            title: req.body?.title,
            description: req.body?.description,
        });
        res.status(200).json({
            success: true,
            message: "Cập nhật playlist thành công.",
            data: playlist,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Không thể cập nhật playlist.";
        res.status(400).json({ success: false, message });
    }
};
exports.patchUpdatePlaylist = patchUpdatePlaylist;
const deletePlaylist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const playlistId = String(req.params?.id || "").trim();
        if (!userId) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        if (!playlistId) {
            res.status(400).json({ success: false, message: "Thiếu playlistId." });
            return;
        }
        await playlistService.softDeletePlaylist(userId, playlistId);
        res.status(200).json({ success: true, message: "Đã xóa playlist." });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Không thể xóa playlist.";
        res.status(400).json({ success: false, message });
    }
};
exports.deletePlaylist = deletePlaylist;
const postAddSongToPlaylist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const songId = String(req.body?.songId || "").trim();
        const playlistId = String(req.body?.playlistId || "").trim();
        if (!userId) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        if (!songId) {
            res.status(400).json({ success: false, message: "Thiếu songId." });
            return;
        }
        const result = await userService.addSongToUserDefaultPlaylist(userId, songId, playlistId || undefined);
        res.status(200).json({
            success: true,
            message: result.added ? "Đã thêm bài hát vào playlist của bạn." : "Bài hát đã có sẵn trong playlist.",
            data: result,
        });
    }
    catch (error) {
        console.error("postAddSongToPlaylist error:", error);
        res.status(500).json({
            success: false,
            message: "Không thể thêm bài hát vào playlist.",
        });
    }
};
exports.postAddSongToPlaylist = postAddSongToPlaylist;
const postRemoveSongFromPlaylist = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const playlistId = String(req.body?.playlistId || "").trim();
        const songId = String(req.body?.songId || "").trim();
        if (!userId) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        if (!playlistId || !songId) {
            res.status(400).json({ success: false, message: "Thiếu playlistId hoặc songId." });
            return;
        }
        const result = await userService.removeSongFromPlaylist(userId, playlistId, songId);
        res.status(200).json({
            success: true,
            message: "Đã gỡ bài hát khỏi playlist.",
            data: { songId, stillInUserPlaylists: result.stillInUserPlaylists },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Không thể gỡ bài hát.";
        console.error("postRemoveSongFromPlaylist error:", error);
        res.status(400).json({ success: false, message });
    }
};
exports.postRemoveSongFromPlaylist = postRemoveSongFromPlaylist;
