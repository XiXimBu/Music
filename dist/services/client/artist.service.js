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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const artist_model_1 = __importDefault(require("../../models/artist.model"));
const album_model_1 = __importDefault(require("../../models/album.model"));
const song_model_1 = __importDefault(require("../../models/song.model"));
const mongoose_1 = __importStar(require("mongoose"));
const getArtistBySlug = async (slug) => {
    try {
        const normalizedSlug = decodeURIComponent(slug).trim();
        if (!normalizedSlug || normalizedSlug === "...") {
            return null;
        }
        const artist = await artist_model_1.default.findOne({
            slug: normalizedSlug,
            deleted: false
        }).lean();
        return artist;
    }
    catch (error) {
        console.error(">>> Service getArtistBySlug error:", error);
        throw error;
    }
};
const getAlbumsByArtist = async (artistId) => {
    try {
        const cleanId = artistId.trim();
        if (!mongoose_1.default.Types.ObjectId.isValid(cleanId)) {
            console.error("ID không hợp lệ:", cleanId);
            throw new Error("Invalid artistId format");
        }
        const normalizedArtistId = new mongoose_1.Types.ObjectId(cleanId);
        const albums = await album_model_1.default.find({
            artist: normalizedArtistId,
            deleted: false,
        })
            .select("title thumbnail artist slug ")
            .sort({ releaseDate: -1 })
            .lean();
        return albums;
    }
    catch (error) {
        console.error(">>> Service getAlbumsByArtist error:", error);
        throw error;
    }
};
const getAllSongs = async (artistId) => {
    try {
        console.time("⏱️ DB Query: getAllSongs");
        const filter = {
            deleted: false,
            status: "active",
        };
        if (artistId) {
            const cleanId = artistId.trim();
            if (!mongoose_1.default.Types.ObjectId.isValid(cleanId)) {
                throw new Error("Invalid artistId format");
            }
            filter.artists = new mongoose_1.Types.ObjectId(cleanId);
        }
        const songs = await song_model_1.default.aggregate([
            { $match: filter },
            { $sort: { views: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "artists",
                    localField: "artists",
                    foreignField: "_id",
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
                    as: "artists",
                },
            },
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
        ]);
        return songs;
    }
    catch (error) {
        console.error(">>> Service getAllSongs error:", error);
        throw error;
    }
};
exports.default = { getArtistBySlug, getAlbumsByArtist, getAllSongs };
