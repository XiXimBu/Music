"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistSong = void 0;
const mongoose_1 = require("mongoose");
const playlistSongSchema = new mongoose_1.Schema({
    playlistId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Playlist", required: true },
    songId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Song", required: true },
    addedAt: { type: Date, default: Date.now },
}, { timestamps: false });
playlistSongSchema.index({ playlistId: 1, songId: 1 }, { unique: true });
exports.PlaylistSong = (0, mongoose_1.model)("PlaylistSong", playlistSongSchema, "playlistSongs");
exports.default = exports.PlaylistSong;
