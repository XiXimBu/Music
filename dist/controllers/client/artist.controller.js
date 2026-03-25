"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const artist_service_1 = __importDefault(require("../../services/client/artist.service"));
const follow_artist_service_1 = require("../../services/client/follow.artist.service");
const track_item_helper_1 = require("../../helpers/track-item.helper");
const getDetailArtist = async (req, res) => {
    try {
        const rawSlug = req.params.slug;
        const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
        const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
        if (!normalizedSlug || normalizedSlug === "...") {
            return res.render("client/pages/artist/index", {
                pageTitle: "Lỗi",
                artists: [],
                albums: [],
                songs: [],
                message: "Đường dẫn không hợp lệ."
            });
        }
        const artist = await artist_service_1.default.getArtistBySlug(normalizedSlug);
        if (!artist) {
            return res.render("client/pages/artist/index", {
                pageTitle: "Không tìm thấy",
                artists: [],
                albums: [],
                songs: [],
                message: "Nghệ sĩ không tồn tại hoặc đã bị xóa."
            });
        }
        const artistId = String(artist._id);
        const userId = res.locals.user?.id;
        const [albums, songs, followed] = await Promise.all([
            artist_service_1.default.getAlbumsByArtist(artistId),
            artist_service_1.default.getAllSongs(artistId),
            userId ? (0, follow_artist_service_1.isFollowingArtist)(userId, artistId) : Promise.resolve(false),
        ]);
        const popularTracks = (0, track_item_helper_1.enrichSongsForTrackItem)(songs, Boolean(res.locals.isAuthenticated), res.locals.addedSongIds);
        res.render("client/pages/artist/index", {
            pageTitle: artist.name,
            showSearch: true,
            artists: [artist],
            albums,
            popularTracks,
            isFollowingArtist: followed,
        });
    }
    catch (error) {
        console.error(">>> Lỗi Get Detail Artist:", error);
        res.status(500).send("Lỗi hệ thống");
    }
};
exports.default = { getDetailArtist };
