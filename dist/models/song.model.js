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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const songSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    duration: { type: Number, required: true },
    audioUrl: { type: String, required: true },
    coverImage: String,
    artists: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Artist" }],
    album: { type: mongoose_1.Schema.Types.ObjectId, ref: "Album" },
    topics: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Topic" }],
    slug: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deleted: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
}, { timestamps: true });
songSchema.index({ status: 1, deleted: 1, views: -1 });
songSchema.index({ artists: 1, status: 1, deleted: 1, views: -1 });
songSchema.index({ status: 1, deleted: 1, createdAt: -1 });
songSchema.index({ topics: 1, status: 1, deleted: 1, createdAt: -1 });
songSchema.index({ album: 1, status: 1, deleted: 1 });
songSchema.index({ title: 1, status: 1, deleted: 1 });
songSchema.index({ slug: 1, status: 1, deleted: 1 });
const Song = mongoose_1.default.model("Song", songSchema, "songs");
exports.default = Song;
