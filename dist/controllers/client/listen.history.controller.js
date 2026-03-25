"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopSongsStats = exports.getRecentListenHistory = exports.postAddListenHistory = void 0;
const listen_history_service_1 = __importDefault(require("../../services/client/listen.history.service"));
const postAddListenHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const songId = String(req.body?.songId || "").trim();
        if (!userId || !songId) {
            res.status(400).json({ success: false, message: "Thiếu userId hoặc songId." });
            return;
        }
        await listen_history_service_1.default.saveHistory(userId, songId);
        res.status(201).json({ success: true, message: "Đã lưu lịch sử nghe nhạc." });
    }
    catch (error) {
        console.error("postAddListenHistory error:", error);
        res.status(500).json({ success: false, message: "Không thể lưu lịch sử." });
    }
};
exports.postAddListenHistory = postAddListenHistory;
const getRecentListenHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        const recentHistory = await listen_history_service_1.default.getRecentHistory(userId);
        res.status(200).json({ success: true, data: recentHistory });
    }
    catch (error) {
        console.error("getRecentListenHistory error:", error);
        res.status(500).json({ success: false, message: "Không thể lấy lịch sử nghe nhạc." });
    }
};
exports.getRecentListenHistory = getRecentListenHistory;
const getTopSongsStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const limit = Number(req.query?.limit || 5);
        if (!userId) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        const topSongs = await listen_history_service_1.default.getTopSongs(userId, limit);
        res.status(200).json({ success: true, data: topSongs });
    }
    catch (error) {
        console.error("getTopSongsStats error:", error);
        res.status(500).json({ success: false, message: "Không thể lấy thống kê top songs." });
    }
};
exports.getTopSongsStats = getTopSongsStats;
