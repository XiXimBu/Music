"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongMood = void 0;
const mongoose_1 = require("mongoose");
const songMoodSchema = new mongoose_1.Schema({
    songId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Song",
        required: true
    },
    mood: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
}, { timestamps: true });
songMoodSchema.index({ songId: 1 });
songMoodSchema.index({ mood: 1, songId: 1 });
songMoodSchema.index({ songId: 1, mood: 1 }, { unique: true });
exports.SongMood = (0, mongoose_1.model)("SongMood", songMoodSchema, "song_moods");
exports.default = exports.SongMood;
