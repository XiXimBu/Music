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
exports.getHome = void 0;
const home_service_1 = __importStar(require("../../services/client/home.service"));
const getHome = async (req, res) => {
    try {
        const mood = (0, home_service_1.resolveHomeMood)(req.query.mood);
        const userId = res.locals.user?.id;
        const [artists, albums, topics, rankSongs, latestSongs] = await Promise.all([
            home_service_1.default.getFeaturedArtists(),
            home_service_1.default.getLatestAlbums(),
            home_service_1.default.getFeaturedTopics(),
            home_service_1.default.getRandomRankSongs(),
            home_service_1.default.getLatestSongs(),
        ]);
        let forYouTopSongs = [];
        if (userId) {
            forYouTopSongs = (await home_service_1.default.getPersonalizedForYouRanked(userId, home_service_1.HOME_FOR_YOU_PERSONALIZED_LIMIT)).filter((s) => !!s.audioUrl);
        }
        if (!forYouTopSongs.length) {
            const moodSongs = await home_service_1.default.getTopSongsByMood(mood, 5);
            forYouTopSongs = moodSongs.filter((s) => !!s.audioUrl);
        }
        if (!forYouTopSongs.length) {
            forYouTopSongs = await home_service_1.default.getRandomRankSongs();
        }
        res.render("client/pages/home/index", {
            pageTitle: "Trang chủ",
            artists,
            albums,
            topics,
            rankSongs,
            latestSongs,
            forYouTopSongs,
            forYouMood: mood,
        }, (err, html) => {
            if (err) {
                console.error("Pug Render Error:", err);
                res.status(500).send("Lỗi hiển thị giao diện");
                return;
            }
            res.send(html);
        });
    }
    catch (error) {
        console.error("getHome error:", error);
        res.status(500).render("client/pages/home/index", {
            pageTitle: "Trang chủ",
            artists: [],
            albums: [],
            topics: [],
            rankSongs: [],
            latestSongs: [],
            forYouTopSongs: [],
            forYouMood: (0, home_service_1.resolveHomeMood)(undefined),
            error: "Có lỗi xảy ra",
        });
    }
};
exports.getHome = getHome;
