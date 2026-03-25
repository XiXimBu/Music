"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFollowArtist = exports.postFollowArtist = void 0;
const follow_artist_service_1 = require("../../services/client/follow.artist.service");
const postFollowArtist = async (req, res) => {
    const userId = res.locals.user?.id;
    try {
        if (!userId) {
            res.status(401).json({
                code: 401,
                message: "Bạn cần đăng nhập để theo dõi nghệ sĩ.",
            });
            return;
        }
        const result = await (0, follow_artist_service_1.followArtist)(userId, req.body?.artistId);
        res.status(result.code).json(result);
    }
    catch (error) {
        console.error("postFollowArtist error:", error);
        res.status(500).json({
            code: 500,
            message: "Không thể theo dõi nghệ sĩ. Vui lòng thử lại.",
        });
    }
};
exports.postFollowArtist = postFollowArtist;
const deleteFollowArtist = async (req, res) => {
    const userId = res.locals.user?.id;
    try {
        if (!userId) {
            res.status(401).json({
                code: 401,
                message: "Bạn cần đăng nhập để bỏ theo dõi nghệ sĩ.",
            });
            return;
        }
        const result = await (0, follow_artist_service_1.unfollowArtist)(userId, req.params?.artistId);
        res.status(result.code).json(result);
    }
    catch (error) {
        console.error("deleteFollowArtist error:", error);
        res.status(500).json({
            code: 500,
            message: "Không thể bỏ theo dõi nghệ sĩ. Vui lòng thử lại.",
        });
    }
};
exports.deleteFollowArtist = deleteFollowArtist;
const followArtistController = {
    postFollowArtist: exports.postFollowArtist,
    deleteFollowArtist: exports.deleteFollowArtist,
};
exports.default = followArtistController;
