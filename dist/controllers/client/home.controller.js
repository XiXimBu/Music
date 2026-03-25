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
const home_service_1 = __importDefault(require("../../services/client/home.service"));
const listen_history_service_1 = __importDefault(require("../../services/client/listen.history.service"));
const database = __importStar(require("../../config/database"));
const getHome = async (req, res) => {
    try {
        await database.connect();
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
exports.default = { getHome };
