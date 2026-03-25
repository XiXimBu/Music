"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopSongs = exports.getRecentHistory = exports.saveHistory = exports.syncUserHistory = void 0;
const mongoose_1 = require("mongoose");
const listeningHistory_model_1 = require("../../models/listeningHistory.model");
const helpertime_1 = require("../../helpers/helpertime");
const RECENT_HISTORY_LIMIT = 5;
const USER_HISTORY_CAP = 20;
const PRUNE_BATCH_SIZE = 1000;
const mapSong = (song) => {
    if (!song?._id)
        return null;
    const artistNames = Array.isArray(song.artists)
        ? song.artists.map((artist) => artist?.name || "").filter(Boolean).join(", ")
        : "";
    return {
        _id: String(song._id),
        title: song.title || "Unknown title",
        coverImage: song.coverImage || "",
        artistNames: artistNames || "Unknown artist",
        duration: Number(song.duration || 0),
    };
};
const syncUserHistory = async (userId, songId) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId) || !mongoose_1.Types.ObjectId.isValid(songId))
        return;
    const uid = new mongoose_1.Types.ObjectId(userId);
    const sid = new mongoose_1.Types.ObjectId(songId);
    const listenedAt = new Date();
    await listeningHistory_model_1.ListeningHistory.bulkWrite([
        {
            insertOne: {
                document: {
                    userId: uid,
                    songId: sid,
                    listenedAt,
                },
            },
        },
    ], { ordered: true });
    setImmediate(() => {
        pruneExcessForUser(userId).catch((err) => {
            console.error("pruneExcessForUser (background):", err);
        });
    });
};
exports.syncUserHistory = syncUserHistory;
async function pruneExcessForUser(userId) {
    if (!mongoose_1.Types.ObjectId.isValid(userId))
        return;
    const uid = new mongoose_1.Types.ObjectId(userId);
    for (;;) {
        const count = await listeningHistory_model_1.ListeningHistory.countDocuments({ userId: uid }).exec();
        if (count <= USER_HISTORY_CAP)
            return;
        const excess = count - USER_HISTORY_CAP;
        const take = Math.min(excess, PRUNE_BATCH_SIZE);
        const oldest = await listeningHistory_model_1.ListeningHistory.find({ userId: uid })
            .sort({ listenedAt: 1 })
            .limit(take)
            .select({ _id: 1 })
            .lean()
            .exec();
        if (oldest.length === 0)
            return;
        const ids = oldest.map((d) => d._id);
        await listeningHistory_model_1.ListeningHistory.deleteMany({ _id: { $in: ids } }).exec();
    }
}
exports.saveHistory = exports.syncUserHistory;
const getRecentHistory = async (userId) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId))
        return [];
    const uid = new mongoose_1.Types.ObjectId(userId);
    const pipeline = [
        { $match: { userId: uid } },
        { $sort: { listenedAt: -1 } },
        { $limit: RECENT_HISTORY_LIMIT },
        {
            $lookup: {
                from: "songs",
                localField: "songId",
                foreignField: "_id",
                pipeline: [{ $project: { title: 1, coverImage: 1, duration: 1, artists: 1 } }],
                as: "songMatches",
            },
        },
        {
            $set: {
                songRaw: { $arrayElemAt: ["$songMatches", 0] },
            },
        },
        {
            $lookup: {
                from: "artists",
                localField: "songRaw.artists",
                foreignField: "_id",
                pipeline: [{ $project: { name: 1 } }],
                as: "songArtists",
            },
        },
        {
            $project: {
                _id: 1,
                listenedAt: 1,
                songPopulated: {
                    $cond: [
                        { $gt: [{ $size: { $ifNull: ["$songMatches", []] } }, 0] },
                        { $mergeObjects: ["$songRaw", { artists: "$songArtists" }] },
                        null,
                    ],
                },
            },
        },
    ];
    const rows = await listeningHistory_model_1.ListeningHistory.aggregate(pipeline).exec();
    return rows.map((item) => ({
        _id: String(item._id),
        listenedAt: item.listenedAt,
        listenedAtFromNow: (0, helpertime_1.formatFromNow)(item.listenedAt),
        song: mapSong(item.songPopulated),
    }));
};
exports.getRecentHistory = getRecentHistory;
const getTopSongs = async (userId, limit = 5) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId))
        return [];
    const topLimit = Math.max(1, Math.min(Number(limit) || 5, 50));
    const pipeline = [
        { $match: { userId: new mongoose_1.Types.ObjectId(userId) } },
        { $group: { _id: "$songId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: topLimit },
        {
            $lookup: {
                from: "songs",
                localField: "_id",
                foreignField: "_id",
                as: "song",
            },
        },
        { $unwind: { path: "$song", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "artists",
                localField: "song.artists",
                foreignField: "_id",
                as: "artistDocs",
            },
        },
        {
            $project: {
                _id: 0,
                songId: "$_id",
                count: 1,
                song: {
                    _id: "$song._id",
                    title: "$song.title",
                    coverImage: "$song.coverImage",
                    duration: "$song.duration",
                    audioUrl: "$song.audioUrl",
                    views: { $ifNull: ["$song.views", 0] },
                    artistNames: {
                        $reduce: {
                            input: "$artistDocs.name",
                            initialValue: "",
                            in: {
                                $cond: [
                                    { $eq: ["$$value", ""] },
                                    "$$this",
                                    { $concat: ["$$value", ", ", "$$this"] },
                                ],
                            },
                        },
                    },
                    artists: {
                        $map: {
                            input: { $ifNull: ["$artistDocs", []] },
                            as: "a",
                            in: { name: { $ifNull: ["$$a.name", ""] } },
                        },
                    },
                },
            },
        },
    ];
    const rows = await listeningHistory_model_1.ListeningHistory.aggregate(pipeline).exec();
    return rows.map((item) => ({
        songId: String(item.songId),
        count: Number(item.count || 0),
        song: item.song?._id
            ? {
                _id: String(item.song._id),
                title: item.song.title || "Unknown title",
                coverImage: item.song.coverImage || "",
                artistNames: item.song.artistNames || "Unknown artist",
                duration: Number(item.song.duration || 0),
                audioUrl: String(item.song.audioUrl || ""),
                views: Number(item.song.views || 0),
                artists: Array.isArray(item.song.artists)
                    ? item.song.artists.map((a) => ({ name: a?.name || "Unknown Artist" }))
                    : [],
            }
            : null,
    }));
};
exports.getTopSongs = getTopSongs;
exports.default = { saveHistory: exports.saveHistory, syncUserHistory: exports.syncUserHistory, getRecentHistory: exports.getRecentHistory, getTopSongs: exports.getTopSongs };
