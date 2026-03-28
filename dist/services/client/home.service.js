"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestSongs = exports.getPersonalizedForYouRanked = exports.getTopSongsByMood = exports.getRandomRankSongs = exports.getFeaturedTopics = exports.getLatestAlbums = exports.getFeaturedArtists = exports.DEFAULT_HOME_MOOD = exports.HOME_FOR_YOU_PERSONALIZED_LIMIT = void 0;
exports.resolveHomeMood = resolveHomeMood;
const mongoose_1 = require("mongoose");
const artist_model_1 = __importDefault(require("../../models/artist.model"));
const album_model_1 = __importDefault(require("../../models/album.model"));
const topic_model_1 = __importDefault(require("../../models/topic.model"));
const song_model_1 = __importDefault(require("../../models/song.model"));
const songMood_model_1 = __importDefault(require("../../models/songMood.model"));
const listen_history_service_1 = require("./listen.history.service");
const HOME_ALBUMS_LIMIT = 12;
const HOME_TOPICS_LIMIT = 24;
const HOME_FOR_YOU_BY_MOOD_LIMIT = 5;
exports.HOME_FOR_YOU_PERSONALIZED_LIMIT = 14;
exports.DEFAULT_HOME_MOOD = "chill";
function resolveHomeMood(query) {
    const s = String(query ?? "")
        .trim()
        .toLowerCase();
    if (/^[a-z0-9-]{1,48}$/.test(s))
        return s;
    return exports.DEFAULT_HOME_MOOD;
}
const activeFilter = { status: "active", deleted: false };
const topicHomeFilter = {
    deleted: { $ne: true },
    status: { $ne: "inactive" },
};
const mapRankedRow = (song) => {
    const durationNum = Number(song.duration || 0);
    const artistNames = Array.isArray(song.artists) && song.artists.length > 0
        ? song.artists
            .map((artist) => artist?.name || "Unknown Artist")
            .join(", ")
        : "Unknown Artist";
    const formattedDuration = `${Math.floor(durationNum / 60)}:${String(durationNum % 60).padStart(2, "0")}`;
    return {
        _id: String(song._id),
        title: song.title,
        duration: durationNum,
        formattedDuration,
        audioUrl: song.audioUrl || "",
        coverImage: song.coverImage || "",
        views: Number(song.views || 0),
        artistNames,
    };
};
const songLookupArtists = {
    $lookup: {
        from: "artists",
        localField: "artists",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
        as: "artists",
    },
};
const getFeaturedArtists = async () => {
    return (await artist_model_1.default.find({ deleted: false, slug: { $regex: /.+/ } }, { name: 1, avatar: 1, slug: 1, _id: 0 })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
        .exec());
};
exports.getFeaturedArtists = getFeaturedArtists;
const getLatestAlbums = async () => {
    const pipeline = [
        { $match: activeFilter },
        { $sort: { createdAt: -1 } },
        { $limit: HOME_ALBUMS_LIMIT },
        {
            $lookup: {
                from: "artists",
                localField: "artist",
                foreignField: "_id",
                pipeline: [{ $project: { _id: 1, name: 1 } }],
                as: "artistDoc",
            },
        },
        {
            $addFields: {
                _artist: { $arrayElemAt: ["$artistDoc", 0] },
            },
        },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                slug: 1,
                releaseDate: 1,
                artistName: "$_artist.name",
                artistId: {
                    $cond: [
                        { $ne: ["$_artist", null] },
                        { $toString: "$_artist._id" },
                        null,
                    ],
                },
            },
        },
    ];
    const albumsRaw = await album_model_1.default.aggregate(pipeline).exec();
    return (albumsRaw || []);
};
exports.getLatestAlbums = getLatestAlbums;
const getFeaturedTopics = async () => {
    const topics = await topic_model_1.default.find(topicHomeFilter, { name: 1, slug: 1, thumbnail: 1, _id: 0 })
        .sort({ createdAt: -1 })
        .limit(HOME_TOPICS_LIMIT)
        .lean()
        .exec();
    return topics;
};
exports.getFeaturedTopics = getFeaturedTopics;
const getRandomRankSongs = async () => {
    const pipeline = [
        { $match: activeFilter },
        { $sample: { size: 3 } },
        songLookupArtists,
        {
            $project: {
                _id: 1,
                title: 1,
                duration: 1,
                audioUrl: 1,
                coverImage: 1,
                views: 1,
                artists: 1,
            },
        },
    ];
    const rows = await song_model_1.default.aggregate(pipeline).exec();
    return rows.map(mapRankedRow);
};
exports.getRandomRankSongs = getRandomRankSongs;
const getTopSongsByMood = async (mood, limit = HOME_FOR_YOU_BY_MOOD_LIMIT) => {
    const m = String(mood || "")
        .trim()
        .toLowerCase();
    if (!m)
        return [];
    const pipeline = [
        { $match: { mood: m } },
        {
            $lookup: {
                from: "songs",
                localField: "songId",
                foreignField: "_id",
                as: "songInfo",
            },
        },
        { $unwind: "$songInfo" },
        {
            $match: {
                "songInfo.status": "active",
                "songInfo.deleted": false,
            },
        },
        { $sort: { "songInfo.views": -1 } },
        { $limit: limit },
        { $replaceRoot: { newRoot: "$songInfo" } },
        songLookupArtists,
        {
            $project: {
                _id: 1,
                title: 1,
                duration: 1,
                audioUrl: 1,
                coverImage: 1,
                views: 1,
                artists: 1,
            },
        },
    ];
    const rows = await songMood_model_1.default.aggregate(pipeline).exec();
    return rows.map(mapRankedRow);
};
exports.getTopSongsByMood = getTopSongsByMood;
const rankedSongProject = {
    $project: {
        _id: 1,
        title: 1,
        duration: 1,
        audioUrl: 1,
        coverImage: 1,
        views: 1,
        artists: 1,
    },
};
function roundRobinTakeUnique(pools, maxTotal) {
    if (maxTotal <= 0 || !pools.length)
        return [];
    const out = [];
    const seen = new Set();
    const idx = pools.map(() => 0);
    for (;;) {
        let progressed = false;
        for (let p = 0; p < pools.length; p++) {
            if (out.length >= maxTotal)
                return out;
            const pool = pools[p];
            while (idx[p] < pool.length) {
                const row = pool[idx[p]++];
                if (!seen.has(row._id)) {
                    seen.add(row._id);
                    out.push(row);
                    progressed = true;
                    break;
                }
            }
        }
        if (!progressed)
            break;
    }
    return out;
}
function interleaveTwoBranches(a, b) {
    const out = [];
    const seen = new Set();
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
        if (i < a.length) {
            const x = a[i++];
            if (!seen.has(x._id)) {
                seen.add(x._id);
                out.push(x);
            }
        }
        if (j < b.length) {
            const y = b[j++];
            if (!seen.has(y._id)) {
                seen.add(y._id);
                out.push(y);
            }
        }
    }
    return out;
}
async function fetchRankedForArtist(artistId, excludeIds, cap) {
    if (cap <= 0)
        return [];
    const pipeline = [
        { $match: { ...activeFilter, _id: { $nin: excludeIds }, artists: artistId } },
        { $sort: { views: -1, createdAt: -1 } },
        { $limit: cap },
        songLookupArtists,
        rankedSongProject,
    ];
    const rows = await song_model_1.default.aggregate(pipeline).exec();
    return rows.map(mapRankedRow);
}
async function fetchRankedForTopic(topicId, excludeIds, cap) {
    if (cap <= 0)
        return [];
    const pipeline = [
        { $match: { ...activeFilter, _id: { $nin: excludeIds }, topics: topicId } },
        { $sort: { views: -1, createdAt: -1 } },
        { $limit: cap },
        songLookupArtists,
        rankedSongProject,
    ];
    const rows = await song_model_1.default.aggregate(pipeline).exec();
    return rows.map(mapRankedRow);
}
async function fetchRankedForMoodSlug(mood, excludeIds, cap) {
    const m = String(mood || "")
        .trim()
        .toLowerCase();
    if (!m || cap <= 0)
        return [];
    const pipeline = [
        { $match: { mood: m } },
        {
            $lookup: {
                from: "songs",
                localField: "songId",
                foreignField: "_id",
                as: "songInfo",
            },
        },
        { $unwind: "$songInfo" },
        {
            $match: {
                "songInfo.status": "active",
                "songInfo.deleted": false,
                "songInfo._id": { $nin: excludeIds },
            },
        },
        { $sort: { "songInfo.views": -1 } },
        { $limit: cap },
        { $replaceRoot: { newRoot: "$songInfo" } },
        songLookupArtists,
        rankedSongProject,
    ];
    const rows = await songMood_model_1.default.aggregate(pipeline).exec();
    return rows.map(mapRankedRow);
}
const capPerPool = (poolCount, target) => Math.max(3, Math.ceil(target / Math.max(1, poolCount)) + 4);
const getPersonalizedForYouRanked = async (userId, limit = exports.HOME_FOR_YOU_PERSONALIZED_LIMIT) => {
    if (!String(userId || "").trim())
        return [];
    const { topArtistIds, topTopicIds, topMoodSlugs, playedSongIds } = await (0, listen_history_service_1.getUserTasteProfile)(userId);
    const excludeBase = playedSongIds;
    const hasArtists = topArtistIds.length > 0;
    const hasMoods = topMoodSlugs.length > 0;
    const hasTopics = topTopicIds.length > 0;
    const useMoodsForBranchB = hasMoods;
    const branchBReady = useMoodsForBranchB ? hasMoods : hasTopics;
    const halfA = Math.ceil(limit / 2);
    const halfB = limit - halfA;
    let merged = [];
    if (hasArtists && branchBReady) {
        const ca = capPerPool(topArtistIds.length, halfA);
        const artistPools = await Promise.all(topArtistIds.map((id) => fetchRankedForArtist(id, excludeBase, ca)));
        const seqA = roundRobinTakeUnique(artistPools, halfA);
        const bCount = useMoodsForBranchB ? topMoodSlugs.length : topTopicIds.length;
        const cb = capPerPool(bCount, halfB);
        let seqB = [];
        if (useMoodsForBranchB) {
            const moodPools = await Promise.all(topMoodSlugs.map((m) => fetchRankedForMoodSlug(m, excludeBase, cb)));
            seqB = roundRobinTakeUnique(moodPools, halfB);
        }
        else {
            const topicPools = await Promise.all(topTopicIds.map((tid) => fetchRankedForTopic(tid, excludeBase, cb)));
            seqB = roundRobinTakeUnique(topicPools, halfB);
        }
        merged = interleaveTwoBranches(seqA, seqB);
    }
    else if (hasArtists) {
        const ca = capPerPool(topArtistIds.length, limit);
        const artistPools = await Promise.all(topArtistIds.map((id) => fetchRankedForArtist(id, excludeBase, ca)));
        merged = roundRobinTakeUnique(artistPools, limit);
    }
    else if (useMoodsForBranchB && topMoodSlugs.length > 0) {
        const cb = capPerPool(topMoodSlugs.length, limit);
        const moodPools = await Promise.all(topMoodSlugs.map((m) => fetchRankedForMoodSlug(m, excludeBase, cb)));
        merged = roundRobinTakeUnique(moodPools, limit);
    }
    else if (hasTopics) {
        const cb = capPerPool(topTopicIds.length, limit);
        const topicPools = await Promise.all(topTopicIds.map((tid) => fetchRankedForTopic(tid, excludeBase, cb)));
        merged = roundRobinTakeUnique(topicPools, limit);
    }
    if (merged.length === 0 && (hasArtists || hasTopics)) {
        const orClause = [];
        if (topArtistIds.length)
            orClause.push({ artists: { $in: topArtistIds } });
        if (topTopicIds.length)
            orClause.push({ topics: { $in: topTopicIds } });
        const match = {
            ...activeFilter,
            _id: { $nin: excludeBase },
        };
        if (orClause.length) {
            match.$or = orClause;
        }
        const pipeline = [
            { $match: match },
            { $sort: { createdAt: -1, views: -1 } },
            { $limit: limit },
            songLookupArtists,
            rankedSongProject,
        ];
        const rows = await song_model_1.default.aggregate(pipeline).exec();
        merged = rows.map(mapRankedRow);
    }
    const seen = new Set();
    merged = merged
        .filter((s) => {
        if (seen.has(s._id))
            return false;
        seen.add(s._id);
        return true;
    })
        .slice(0, limit);
    if (merged.length < limit) {
        const have = new Set(merged.map((s) => s._id));
        const excludeIds = [...playedSongIds];
        for (const id of have) {
            if (mongoose_1.Types.ObjectId.isValid(id))
                excludeIds.push(new mongoose_1.Types.ObjectId(id));
        }
        const need = limit - merged.length;
        const fillPipeline = [
            {
                $match: {
                    ...activeFilter,
                    _id: { $nin: excludeIds },
                },
            },
            { $sort: { views: -1, createdAt: -1 } },
            { $limit: need },
            songLookupArtists,
            rankedSongProject,
        ];
        const fillRows = await song_model_1.default.aggregate(fillPipeline).exec();
        merged = merged.concat(fillRows.map(mapRankedRow));
    }
    return merged.slice(0, limit);
};
exports.getPersonalizedForYouRanked = getPersonalizedForYouRanked;
const getLatestSongs = async () => {
    const pipeline = [
        { $match: activeFilter },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        songLookupArtists,
        {
            $project: {
                _id: { $toString: "$_id" },
                title: 1,
                audioUrl: 1,
                coverImage: 1,
                createdAt: 1,
                artistNames: {
                    $cond: [
                        { $eq: [{ $size: { $ifNull: ["$artists", []] } }, 0] },
                        "Unknown Artist",
                        {
                            $reduce: {
                                input: {
                                    $map: {
                                        input: "$artists",
                                        as: "ar",
                                        in: { $ifNull: ["$$ar.name", "Unknown Artist"] },
                                    },
                                },
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
                    ],
                },
            },
        },
    ];
    const rows = await song_model_1.default.aggregate(pipeline).exec();
    return (rows || []);
};
exports.getLatestSongs = getLatestSongs;
exports.default = {
    getFeaturedArtists: exports.getFeaturedArtists,
    getLatestAlbums: exports.getLatestAlbums,
    getFeaturedTopics: exports.getFeaturedTopics,
    getRandomRankSongs: exports.getRandomRankSongs,
    getTopSongsByMood: exports.getTopSongsByMood,
    getPersonalizedForYouRanked: exports.getPersonalizedForYouRanked,
    getLatestSongs: exports.getLatestSongs,
};
