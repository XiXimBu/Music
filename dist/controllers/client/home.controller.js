"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHome = void 0;
const home_service_1 = __importDefault(require("../../services/client/home.service"));
const listen_history_service_1 = __importDefault(require("../../services/client/listen.history.service"));
const getHome = async (req, res) => {
    try {
        const userId = res.locals.user?.id;
        const [artists, albums, topics, rankSongs, latestSongs, topFromHistory] = await Promise.all([
            home_service_1.default.getFeaturedArtists(),
            home_service_1.default.getLatestAlbums(),
            home_service_1.default.getFeaturedTopics(),
            home_service_1.default.getRandomRankSongs(),
            home_service_1.default.getLatestSongs(),
            userId ? listen_history_service_1.default.getTopSongs(userId, 5) : Promise.resolve([]),
        ]);
        const forYouTopSongs = (topFromHistory || [])
            .map((row) => row.song)
            .filter((s) => !!s && !!s.audioUrl);
        res.render("client/pages/home/index", {
            pageTitle: "Trang chủ",
            artists,
            albums,
            topics,
            rankSongs,
            latestSongs,
            forYouTopSongs,
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
            error: "Có lỗi xảy ra",
        });
    }
};
exports.getHome = getHome;
