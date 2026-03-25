"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSongFromPlaylist = exports.addSongToUserDefaultPlaylist = exports.getAddedSongIdsByUserId = exports.getPlaylistsByUserId = exports.updateProfile = exports.getProfile = exports.getFollowedArtistsForUser = void 0;
const user_model_1 = require("../../models/user.model");
const followArtist_model_1 = __importDefault(require("../../models/followArtist.model"));
const playlist_model_1 = __importDefault(require("../../models/playlist.model"));
const playlistSong_1 = __importDefault(require("../../models/playlistSong"));
const song_model_1 = __importDefault(require("../../models/song.model"));
const slug_helper_1 = require("../../helpers/slug.helper");
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const DEFAULT_ARTIST_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
function mapPopulatedArtistToFollowedView(artist) {
    return {
        _id: artist._id.toString(),
        name: artist.name,
        avatar: artist.avatar?.trim() || DEFAULT_ARTIST_AVATAR,
        slug: artist.slug?.trim() ?? "",
    };
}
const getFollowedArtistsForUser = async (userId) => {
    const followDocs = await followArtist_model_1.default.find({ userId })
        .populate("artistId", "name avatar slug deleted")
        .lean();
    return followDocs
        .map((doc) => doc.artistId)
        .filter((a) => a != null && !a.deleted)
        .map(mapPopulatedArtistToFollowedView);
};
exports.getFollowedArtistsForUser = getFollowedArtistsForUser;
const getProfile = async (userId) => {
    const user = await user_model_1.User.findOne({
        _id: userId,
        deleted: false,
        status: "active",
    }).select("avatar fullName description");
    if (!user) {
        throw new Error("User not found");
    }
    return {
        avatar: user.avatar?.trim() || DEFAULT_AVATAR,
        fullName: user.fullName,
        description: user.description?.trim() || "",
    };
};
exports.getProfile = getProfile;
const updateProfile = async (userId, input) => {
    const updateData = {};
    if (typeof input.fullName === "string") {
        const fullName = input.fullName.trim();
        if (fullName)
            updateData.fullName = fullName;
    }
    if (typeof input.description === "string") {
        updateData.description = input.description.trim();
    }
    if (typeof input.avatar === "string") {
        const avatar = input.avatar.trim();
        if (avatar)
            updateData.avatar = avatar;
    }
    if (Object.keys(updateData).length > 0) {
        await user_model_1.User.updateOne({
            _id: userId,
            deleted: false,
            status: "active",
        }, { $set: updateData });
    }
    return (0, exports.getProfile)(userId);
};
exports.updateProfile = updateProfile;
const getPlaylistsByUserId = async (userId) => {
    const playlists = await playlist_model_1.default.find({
        userId,
        deleted: false,
    }).select("_id title description coverImage");
    if (playlists.length === 0) {
        return [];
    }
    const playlistMap = new Map();
    for (const playlist of playlists) {
        const playlistId = playlist._id.toString();
        playlistMap.set(playlistId, {
            _id: playlistId,
            title: playlist.title,
            description: playlist.description?.trim() || "",
            coverImage: playlist.coverImage?.trim() || "",
            songs: [],
        });
    }
    const playlistIds = Array.from(playlistMap.keys());
    const playlistSongs = await playlistSong_1.default.find({
        playlistId: { $in: playlistIds },
    })
        .populate({
        path: "songId",
        select: "title coverImage audioUrl artists",
        populate: {
            path: "artists",
            select: "name",
        },
    })
        .sort({ addedAt: -1 });
    for (const item of playlistSongs) {
        const key = item.playlistId.toString();
        const currentPlaylist = playlistMap.get(key);
        if (!currentPlaylist)
            continue;
        const songDoc = item.songId;
        if (!songDoc)
            continue;
        const songItem = {
            _id: songDoc._id.toString(),
            title: songDoc.title,
            coverImage: songDoc.coverImage?.trim() || "",
            audioUrl: songDoc.audioUrl || "",
            artistNames: Array.isArray(songDoc.artists) && songDoc.artists.length > 0
                ? songDoc.artists.map((artist) => artist?.name || "")
                    .filter(Boolean)
                    .join(", ")
                : "Unknown Artist",
        };
        currentPlaylist.songs.push(songItem);
    }
    return Array.from(playlistMap.values());
};
exports.getPlaylistsByUserId = getPlaylistsByUserId;
const getAddedSongIdsByUserId = async (userId) => {
    const playlists = await playlist_model_1.default.find({ userId, deleted: false }).select("_id");
    if (!playlists.length)
        return [];
    const playlistIds = playlists.map((playlist) => playlist._id);
    const rows = await playlistSong_1.default.find({ playlistId: { $in: playlistIds } }).select("songId");
    return Array.from(new Set(rows.map((row) => row.songId.toString())));
};
exports.getAddedSongIdsByUserId = getAddedSongIdsByUserId;
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
const addSongToUserDefaultPlaylist = async (userId, songId, selectedPlaylistId) => {
    const song = await song_model_1.default.findOne({
        _id: songId,
        deleted: false,
        status: "active",
    }).select("_id");
    if (!song) {
        throw new Error("Song not found");
    }
    let targetPlaylist = null;
    if (selectedPlaylistId) {
        targetPlaylist = await playlist_model_1.default.findOne({
            _id: selectedPlaylistId,
            userId,
            deleted: false,
        });
    }
    if (!targetPlaylist) {
        targetPlaylist = await playlist_model_1.default.findOne({ userId, deleted: false }).sort({ createdAt: -1 });
    }
    if (!targetPlaylist) {
        const baseSlug = (0, slug_helper_1.slugifyTitle)("My Favorites");
        const uniqueSlug = await ensureUniquePlaylistSlug(baseSlug);
        targetPlaylist = await playlist_model_1.default.create({
            title: "My Favorites",
            description: "Playlist được tạo tự động từ Search.",
            coverImage: "",
            userId: userId,
            slug: uniqueSlug,
            deleted: false,
        });
    }
    const existed = await playlistSong_1.default.findOne({
        playlistId: targetPlaylist._id,
        songId,
    }).select("_id");
    if (existed) {
        return { added: false, playlistId: targetPlaylist._id.toString() };
    }
    await playlistSong_1.default.create({
        playlistId: targetPlaylist._id,
        songId: songId,
        addedAt: new Date(),
    });
    return { added: true, playlistId: targetPlaylist._id.toString() };
};
exports.addSongToUserDefaultPlaylist = addSongToUserDefaultPlaylist;
const removeSongFromPlaylist = async (userId, playlistId, songId) => {
    const playlist = await playlist_model_1.default.findOne({
        _id: playlistId,
        userId,
        deleted: false,
    });
    if (!playlist) {
        throw new Error("Playlist not found");
    }
    const del = await playlistSong_1.default.deleteOne({
        playlistId: playlist._id,
        songId: songId,
    });
    if (del.deletedCount === 0) {
        throw new Error("Song not found in this playlist");
    }
    const after = await (0, exports.getAddedSongIdsByUserId)(userId);
    return { stillInUserPlaylists: after.includes(songId) };
};
exports.removeSongFromPlaylist = removeSongFromPlaylist;
