"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const followArtistSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    artistId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Artist",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
followArtistSchema.index({ userId: 1, artistId: 1 }, { unique: true });
const FollowArtist = (0, mongoose_1.model)("FollowArtist", followArtistSchema, "followArtists");
exports.default = FollowArtist;
