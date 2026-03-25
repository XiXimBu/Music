"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListeningHistory = void 0;
const mongoose_1 = require("mongoose");
const listeningHistorySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    songId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Song", required: true },
    listenedAt: { type: Date, default: Date.now },
}, {
    timestamps: false
});
listeningHistorySchema.index({ userId: 1, listenedAt: -1 });
listeningHistorySchema.index({ userId: 1, songId: 1 });
exports.ListeningHistory = (0, mongoose_1.model)("ListeningHistory", listeningHistorySchema, "listening-histories");
