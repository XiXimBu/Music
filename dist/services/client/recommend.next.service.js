"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendNextSongs = void 0;
const mongoose_1 = require("mongoose");
const song_model_1 = __importDefault(require("../../models/song.model"));
const getRecommendNextSongs = async (songId, excludeIds = [], limit = 10) => {
    const lim = Math.min(20, Math.max(1, limit));
    if (!mongoose_1.Types.ObjectId.isValid(songId))
        return [];
    const song = await song_model_1.default.findOne({
        _id: new mongoose_1.Types.ObjectId(songId),
        status: "active",
        deleted: false,
    })
        .select("artists topics")
        .lean();
    if (!song)
        return [];
    const exclude = excludeIds.filter((id) => mongoose_1.Types.ObjectId.isValid(id)).map((id) => new mongoose_1.Types.ObjectId(id));
    const ors = [];
    const a0 = song.artists?.[0];
    const t0 = song.topics?.[0];
    if (a0)
        ors.push({ artists: a0 });
    if (t0)
        ors.push({ topics: t0 });
    const baseMatch = {
        status: "active",
        deleted: false,
        _id: { $nin: exclude },
    };
    const filter = ors.length ? { ...baseMatch, $or: ors } : baseMatch;
    const rows = await song_model_1.default.find(filter)
        .sort({ views: -1, createdAt: -1 })
        .limit(lim)
        .populate({ path: "artists", select: "name" })
        .lean()
        .exec();
    return (rows || []).map((s) => {
        const names = Array.isArray(s.artists)
            ? s.artists.map((x) => x?.name || "").filter(Boolean).join(", ")
            : "";
        return {
            _id: String(s._id),
            title: s.title || "",
            audioUrl: s.audioUrl || "",
            coverImage: s.coverImage || "",
            artistNames: names || "Unknown Artist",
            duration: Number(s.duration || 0),
        };
    });
};
exports.getRecommendNextSongs = getRecommendNextSongs;
