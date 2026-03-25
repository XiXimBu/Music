"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const playlistSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String },
    coverImage: { type: String },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    slug: { type: String, unique: true },
    deleted: { type: Boolean, default: false },
}, { timestamps: true });
playlistSchema.index({ userId: 1, deleted: 1, createdAt: -1 });
playlistSchema.index({ userId: 1, deleted: 1 });
const Playlist = (0, mongoose_1.model)("Playlist", playlistSchema, "playlists");
exports.default = Playlist;
