"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSongService = exports.getCreateSongFormData = exports.getManageSongService = void 0;
const mongoose_1 = require("mongoose");
const song_model_1 = __importDefault(require("../../models/song.model"));
const artist_model_1 = __importDefault(require("../../models/artist.model"));
const album_model_1 = __importDefault(require("../../models/album.model"));
const topic_model_1 = __importDefault(require("../../models/topic.model"));
const pagination_helper_1 = __importDefault(require("../../helpers/pagination.helper"));
const createSong_validation_1 = require("../../validations/admin/createSong.validation");
const slug_helper_1 = require("../../helpers/slug.helper");
const getManageSongService = async (options) => {
    return (0, pagination_helper_1.default)(song_model_1.default, { deleted: false }, {
        page: options?.page,
        limit: options?.limit ?? 10,
        search: options?.search,
        sort: options?.sort ?? "desc",
        sortBy: options?.sortBy ?? "createdAt",
        select: "title audioUrl duration slug status artists coverImage views createdAt",
        populate: [{ path: "artists", select: "name" }],
    });
};
exports.getManageSongService = getManageSongService;
const topicFilterForForm = () => ({
    deleted: { $ne: true },
    status: { $ne: "inactive" },
});
const getCreateSongFormData = async () => {
    const topics = await topic_model_1.default.find(topicFilterForForm())
        .select("name")
        .sort({ name: 1 })
        .lean();
    return { topics };
};
exports.getCreateSongFormData = getCreateSongFormData;
const findArtistIdByName = async (name) => {
    const doc = await artist_model_1.default.findOne({
        deleted: false,
        name: { $regex: new RegExp(`^${(0, createSong_validation_1.escapeRegex)(name.trim())}$`, "i") },
    })
        .select("_id")
        .lean();
    return doc?._id ? new mongoose_1.Types.ObjectId(String(doc._id)) : null;
};
const findAlbumIdByTitle = async (title) => {
    const doc = await album_model_1.default.findOne({
        deleted: false,
        title: { $regex: new RegExp(`^${(0, createSong_validation_1.escapeRegex)(title.trim())}$`, "i") },
    })
        .select("_id")
        .lean();
    return doc?._id ? new mongoose_1.Types.ObjectId(String(doc._id)) : null;
};
const createSongService = async (parsed) => {
    let artistIds = [];
    const name = parsed.artistName?.trim();
    if (name) {
        const artistId = await findArtistIdByName(name);
        if (!artistId) {
            throw new Error("Không tìm thấy nghệ sĩ trùng với tên đã nhập. Hãy dùng đúng tên có trong hệ thống hoặc để trống.");
        }
        artistIds = [artistId];
    }
    let albumId;
    if (parsed.albumTitle?.trim()) {
        const aid = await findAlbumIdByTitle(parsed.albumTitle);
        if (!aid) {
            throw new Error("Không tìm thấy album trùng với tên đã nhập. Để trống hoặc nhập đúng tên album.");
        }
        albumId = aid;
    }
    const baseSlug = (0, slug_helper_1.slugifyTitle)(parsed.title);
    const slug = await (0, slug_helper_1.ensureUniqueSongSlug)(baseSlug);
    if (parsed.topicIds.length) {
        const topicObjectIds = parsed.topicIds.map((id) => new mongoose_1.Types.ObjectId(id));
        const topicCount = await topic_model_1.default.countDocuments({
            _id: { $in: topicObjectIds },
            ...topicFilterForForm(),
        });
        if (topicCount !== parsed.topicIds.length) {
            throw new Error("Một hoặc nhiều topic không tồn tại hoặc không khả dụng.");
        }
    }
    const topicRefs = parsed.topicIds.map((id) => new mongoose_1.Types.ObjectId(id));
    const doc = await song_model_1.default.create({
        title: parsed.title,
        slug,
        duration: parsed.durationSeconds,
        audioUrl: parsed.audioUrl,
        coverImage: parsed.coverImage,
        artists: artistIds,
        album: albumId,
        topics: topicRefs,
        status: parsed.status,
        deleted: false,
        views: parsed.views,
        likes: 0,
    });
    return doc;
};
exports.createSongService = createSongService;
exports.default = { getManageSongService: exports.getManageSongService, getCreateSongFormData: exports.getCreateSongFormData, createSongService: exports.createSongService };
