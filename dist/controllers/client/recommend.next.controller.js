"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendNext = void 0;
const recommend_next_service_1 = require("../../services/client/recommend.next.service");
const getRecommendNext = async (req, res) => {
    try {
        const songId = String(req.query.songId || "").trim();
        const excludeRaw = String(req.query.excludeIds || "").trim();
        const excludeIds = excludeRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
        const songs = await (0, recommend_next_service_1.getRecommendNextSongs)(songId, excludeIds, limit);
        res.json({ success: true, songs });
    }
    catch (error) {
        console.error("getRecommendNext:", error);
        res.status(500).json({ success: false, songs: [] });
    }
};
exports.getRecommendNext = getRecommendNext;
