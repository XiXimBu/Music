"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.softDeletePlaylist = exports.updatePlaylist = exports.createPlaylist = void 0;
const playlist_model_1 = __importDefault(require("../../models/playlist.model"));
const slug_helper_1 = require("../../helpers/slug.helper");
const ensureUniquePlaylistSlug = async (base) => {
    let candidate = base || "playlist";
    let count = 0;
    for (;;) {
        const exists = await playlist_model_1.default.exists({ slug: candidate });
        if (!exists)
            return candidate;
        count += 1;
        candidate = `${base}-${count}`;
    }
};
const toDTO = (playlist) => ({
    _id: playlist._id.toString(),
    title: playlist.title,
    description: playlist.description?.trim() || "",
    coverImage: playlist.coverImage?.trim() || "",
});
const createPlaylist = async (userId, payload) => {
    const title = String(payload.title || "").trim();
    const description = String(payload.description || "").trim();
    if (!title) {
        throw new Error("Playlist title is required");
    }
    const baseSlug = (0, slug_helper_1.slugifyTitle)(title);
    const uniqueSlug = await ensureUniquePlaylistSlug(baseSlug);
    const playlist = await playlist_model_1.default.create({
        title,
        description,
        coverImage: "",
        userId: userId,
        slug: uniqueSlug,
        deleted: false,
    });
    return toDTO(playlist);
};
exports.createPlaylist = createPlaylist;
const updatePlaylist = async (userId, playlistId, payload) => {
    const title = String(payload.title || "").trim();
    const description = String(payload.description || "").trim();
    if (!title) {
        throw new Error("Playlist title is required");
    }
    const playlist = await playlist_model_1.default.findOne({
        _id: playlistId,
        userId,
        deleted: false,
    });
    if (!playlist) {
        throw new Error("Playlist not found");
    }
    playlist.title = title;
    playlist.description = description;
    await playlist.save();
    return toDTO(playlist);
};
exports.updatePlaylist = updatePlaylist;
const softDeletePlaylist = async (userId, playlistId) => {
    const playlist = await playlist_model_1.default.findOne({
        _id: playlistId,
        userId,
        deleted: false,
    });
    if (!playlist) {
        throw new Error("Playlist not found");
    }
    playlist.deleted = true;
    await playlist.save();
};
exports.softDeletePlaylist = softDeletePlaylist;
