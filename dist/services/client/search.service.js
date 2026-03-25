"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchResultServiceSongs = exports.searchSongs = exports.getSearchResultService = exports.searchSuggestService = void 0;
const song_model_1 = __importDefault(require("../../models/song.model"));
const artist_model_1 = __importDefault(require("../../models/artist.model"));
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchSuggestService = async (keyword) => {
    if (!keyword || keyword.trim() === "") {
        return { songs: [], artists: [] };
    }
    const trimmedKw = keyword.trim();
    const keywordRegex = new RegExp(escapeRegex(trimmedKw), "i");
    const songs = await song_model_1.default.find({
        deleted: false,
        status: "active",
        $or: [{ title: keywordRegex }, { slug: keywordRegex }],
    })
        .select("_id title audioUrl coverImage artists slug")
        .populate({
        path: "artists",
        select: "name slug",
    })
        .limit(6);
    const artists = await artist_model_1.default.find({
        name: keywordRegex,
        deleted: false
    })
        .select("name avatar slug")
        .limit(3);
    const formattedSongs = songs.map(song => {
        const artistNames = song.artists && song.artists.length > 0
            ? song.artists.map((a) => a.name).join(", ")
            : "Unknown Artist";
        return {
            _id: song._id,
            title: song.title,
            audioUrl: song.audioUrl,
            coverImage: song.coverImage || "/images/default-cover.png",
            artistName: artistNames,
            slug: song.slug,
        };
    });
    return {
        songs: formattedSongs,
        artists
    };
};
exports.searchSuggestService = searchSuggestService;
const getSearchResultService = async (keyword) => {
    if (!keyword || keyword.trim() === "") {
        return { topArtist: null };
    }
    const trimmed = keyword.trim();
    const keywordRegex = new RegExp(escapeRegex(trimmed), "i");
    const artists = await artist_model_1.default.find({
        name: keywordRegex,
        deleted: false,
    })
        .select("name avatar slug followers")
        .lean();
    if (artists.length === 0) {
        return { topArtist: null };
    }
    const lower = trimmed.toLowerCase();
    const matchScore = (name) => {
        const n = name.toLowerCase();
        if (n === lower)
            return 3;
        if (n.startsWith(lower))
            return 2;
        return 1;
    };
    artists.sort((a, b) => {
        const diff = matchScore(b.name) - matchScore(a.name);
        if (diff !== 0)
            return diff;
        return a.name.localeCompare(b.name);
    });
    const top = artists[0];
    return {
        topArtist: {
            name: top.name,
            avatar: top.avatar ?? null,
            slug: top.slug,
            followers: top.followers ?? 0,
        },
    };
};
exports.getSearchResultService = getSearchResultService;
const searchSongs = async (keyword) => {
    if (!keyword || keyword.trim() === "") {
        return [];
    }
    const trimmed = keyword.trim();
    const keywordRegex = new RegExp(escapeRegex(trimmed), "i");
    const songs = await song_model_1.default.find({
        deleted: false,
        status: "active",
        title: keywordRegex,
    })
        .select("_id title audioUrl coverImage artists slug duration views")
        .populate({
        path: "artists",
        select: "name slug",
    })
        .lean();
    return songs;
};
exports.searchSongs = searchSongs;
const getSearchResultServiceSongs = async (keyword) => {
    return (0, exports.searchSongs)(keyword);
};
exports.getSearchResultServiceSongs = getSearchResultServiceSongs;
