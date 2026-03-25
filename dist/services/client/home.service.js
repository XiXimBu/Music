"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestSongs = exports.getRandomRankSongs = exports.getFeaturedTopics = exports.getLatestAlbums = exports.getFeaturedArtists = void 0;
const artist_model_1 = __importDefault(require("../../models/artist.model"));
const album_model_1 = __importDefault(require("../../models/album.model"));
const topic_model_1 = __importDefault(require("../../models/topic.model"));
const song_model_1 = __importDefault(require("../../models/song.model"));
const HOME_ALBUMS_LIMIT = 12;
const HOME_TOPICS_LIMIT = 24;
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
exports.default = { getFeaturedArtists: exports.getFeaturedArtists, getLatestAlbums: exports.getLatestAlbums, getFeaturedTopics: exports.getFeaturedTopics, getRandomRankSongs: exports.getRandomRankSongs, getLatestSongs: exports.getLatestSongs };
