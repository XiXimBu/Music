"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopicDetailService = void 0;
const topic_model_1 = __importDefault(require("../../models/topic.model"));
const song_model_1 = __importDefault(require("../../models/song.model"));
const album_model_1 = __importDefault(require("../../models/album.model"));
const getTopicDetailService = async (slug) => {
    try {
        const normalizedSlug = decodeURIComponent(slug).trim();
        if (!normalizedSlug || normalizedSlug === "...") {
            return null;
        }
        const topic = await topic_model_1.default.findOne({
            slug: normalizedSlug,
            status: "active",
            deleted: { $ne: true },
        }).lean();
        if (!topic) {
            return null;
        }
        const songs = await song_model_1.default.find({
            topics: topic._id,
        })
            .populate("artists", "name")
            .sort({ createdAt: -1 })
            .lean();
        const relatedTopics = await topic_model_1.default.aggregate([
            {
                $match: {
                    status: "active",
                    deleted: { $ne: true },
                    _id: { $ne: topic._id },
                },
            },
            { $sample: { size: 3 } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    slug: 1,
                    thumbnail: 1,
                    description: 1,
                },
            },
        ]);
        const trendingAlbums = await album_model_1.default.aggregate([
            {
                $match: {
                    status: "active",
                    deleted: { $ne: true },
                },
            },
            { $sample: { size: 2 } },
            {
                $lookup: {
                    from: "artists",
                    localField: "artist",
                    foreignField: "_id",
                    as: "artistDoc",
                },
            },
            { $unwind: { path: "$artistDoc", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    thumbnail: 1,
                    artistName: "$artistDoc.name",
                },
            },
        ]);
        return { topic, songs, relatedTopics, trendingAlbums };
    }
    catch (error) {
        console.error(">>> Error in getTopicDetailService:", error);
        throw error;
    }
};
exports.getTopicDetailService = getTopicDetailService;
