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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchEditProfile = exports.getProfile = void 0;
const userService = __importStar(require("../../services/client/user.service"));
const listen_history_service_1 = __importDefault(require("../../services/client/listen.history.service"));
const truncateText_helper_1 = require("../../helpers/truncateText.helper");
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.redirect("/login");
            return;
        }
        const [userData, playlists, followedArtists, recentHistory, topSongs] = await Promise.all([
            userService.getProfile(userId),
            userService.getPlaylistsByUserId(userId),
            userService.getFollowedArtistsForUser(userId),
            listen_history_service_1.default.getRecentHistory(userId),
            listen_history_service_1.default.getTopSongs(userId, 5),
        ]);
        res.render("client/pages/user/index", {
            pageTitle: "Tài khoản của tôi",
            showSearch: true,
            user: userData,
            playlists,
            followedArtists,
            recentHistory,
            topSongs,
            truncateText: truncateText_helper_1.truncateText,
        });
    }
    catch (error) {
        console.error("getProfile error:", error);
        res.redirect("/login");
    }
};
exports.getProfile = getProfile;
const patchEditProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Bạn chưa đăng nhập.",
            });
            return;
        }
        const incomingFile = req.file;
        const avatarFromBody = String(req.body?.avatar ?? req.body?.image ?? "").trim();
        const updatedUser = await userService.updateProfile(userId, {
            fullName: req.body?.fullName,
            description: req.body?.description,
            avatar: avatarFromBody,
        });
        res.status(200).json({
            success: true,
            message: "Cập nhật thông tin cá nhân thành công.",
            data: {
                ...updatedUser,
                hasNewFile: !!incomingFile,
            },
        });
    }
    catch (error) {
        console.error("patchEditProfile error:", error);
        res.status(500).json({
            success: false,
            message: "Không thể cập nhật thông tin. Vui lòng thử lại.",
        });
    }
};
exports.patchEditProfile = patchEditProfile;
