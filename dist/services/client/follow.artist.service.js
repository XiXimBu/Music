"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFollowingArtist = exports.unfollowArtist = exports.followArtist = void 0;
const mongoose_1 = require("mongoose");
const followArtist_model_1 = __importDefault(require("../../models/followArtist.model"));
const artist_model_1 = __importDefault(require("../../models/artist.model"));
const followArtist = async (userId, rawArtistId) => {
    if (typeof rawArtistId !== "string" || !rawArtistId.trim()) {
        return {
            code: 400,
            message: "Thiếu hoặc không hợp lệ artistId.",
        };
    }
    const artistId = rawArtistId.trim();
    if (!mongoose_1.Types.ObjectId.isValid(artistId)) {
        return {
            code: 400,
            message: "artistId không đúng định dạng.",
        };
    }
    const artistExists = await artist_model_1.default.exists({
        _id: artistId,
        deleted: { $ne: true },
    });
    if (!artistExists) {
        return {
            code: 404,
            message: "Không tìm thấy nghệ sĩ.",
        };
    }
    const already = await followArtist_model_1.default.exists({ userId, artistId });
    if (already) {
        return {
            code: 200,
            message: "Bạn đã theo dõi nghệ sĩ này rồi.",
        };
    }
    try {
        await followArtist_model_1.default.create({ userId, artistId });
        return {
            code: 200,
            message: "Đã theo dõi nghệ sĩ thành công.",
        };
    }
    catch (error) {
        if (error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === 11000) {
            return {
                code: 200,
                message: "Bạn đã theo dõi nghệ sĩ này rồi.",
            };
        }
        throw error;
    }
};
exports.followArtist = followArtist;
const unfollowArtist = async (userId, rawArtistId) => {
    if (typeof rawArtistId !== "string" || !rawArtistId.trim()) {
        return {
            code: 400,
            message: "Thiếu hoặc không hợp lệ artistId.",
        };
    }
    const artistId = rawArtistId.trim();
    if (!mongoose_1.Types.ObjectId.isValid(artistId)) {
        return {
            code: 400,
            message: "artistId không đúng định dạng.",
        };
    }
    const deleted = await followArtist_model_1.default.findOneAndDelete({ userId, artistId });
    if (!deleted) {
        return {
            code: 404,
            message: "Bạn chưa theo dõi nghệ sĩ này.",
        };
    }
    return {
        code: 200,
        message: "Đã bỏ theo dõi thành công.",
    };
};
exports.unfollowArtist = unfollowArtist;
const isFollowingArtist = async (userId, artistId) => {
    if (!userId || !artistId)
        return false;
    if (!mongoose_1.Types.ObjectId.isValid(artistId))
        return false;
    const followed = await followArtist_model_1.default.exists({ userId, artistId });
    return Boolean(followed);
};
exports.isFollowingArtist = isFollowingArtist;
