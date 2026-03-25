"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchResult = exports.searchSuggest = void 0;
const search_service_1 = require("../../services/client/search.service");
const track_item_helper_1 = require("../../helpers/track-item.helper");
const user_model_1 = require("../../models/user.model");
const user_service_1 = require("../../services/client/user.service");
const queryString = (value) => {
    if (value === undefined || value === null)
        return "";
    if (Array.isArray(value))
        return String(value[0] ?? "");
    return String(value);
};
const searchSuggest = async (req, res) => {
    try {
        const keyword = queryString(req.query.keyword).trim();
        if (!keyword) {
            return res.json({
                code: 200,
                songs: [],
                artists: [],
            });
        }
        const result = await (0, search_service_1.searchSuggestService)(keyword);
        let addedSongIds = [];
        const token = String(req.cookies?.token ?? "").trim();
        if (token) {
            const user = await user_model_1.User.findOne({ token, deleted: false, status: "active" }).select("_id");
            if (user) {
                addedSongIds = await (0, user_service_1.getAddedSongIdsByUserId)(user._id.toString());
            }
        }
        return res.json({
            code: 200,
            ...result,
            addedSongIds,
        });
    }
    catch (error) {
        console.error("Search Suggest Error:", error);
        return res.status(500).json({
            code: 500,
            message: "Internal Server Error",
        });
    }
};
exports.searchSuggest = searchSuggest;
const getSearchResult = async (req, res) => {
    try {
        const keyword = req.query.keyword || "";
        const [{ topArtist }, rawSongs] = await Promise.all([
            (0, search_service_1.getSearchResultService)(keyword),
            (0, search_service_1.getSearchResultServiceSongs)(keyword),
        ]);
        const songs = (0, track_item_helper_1.enrichSongsForTrackItem)(rawSongs, Boolean(res.locals.isAuthenticated), res.locals.addedSongIds);
        return res.render("client/pages/search/index", {
            pageTitle: "Search Results",
            keyword,
            topArtist,
            songs,
        });
    }
    catch (error) {
        console.error("Search Result Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};
exports.getSearchResult = getSearchResult;
