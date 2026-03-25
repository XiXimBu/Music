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
exports.getDetailTopic = void 0;
const topicService = __importStar(require("../../services/client/topic.service"));
const track_item_helper_1 = require("../../helpers/track-item.helper");
const getDetailTopic = async (req, res) => {
    try {
        const rawSlug = req.params.slug;
        const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
        if (!slug) {
            res.redirect("/topics");
            return;
        }
        const data = await topicService.getTopicDetailService(slug);
        if (!data) {
            res.redirect("/topics");
            return;
        }
        const songs = (0, track_item_helper_1.enrichSongsForTrackItem)(data.songs, Boolean(res.locals.isAuthenticated), res.locals.addedSongIds);
        res.render("client/pages/topic/index", {
            pageTitle: data.topic.name,
            showSearch: true,
            topic: data.topic,
            songs,
            relatedTopics: data.relatedTopics,
            trendingAlbums: data.trendingAlbums,
        });
    }
    catch (error) {
        console.error(">>> Error in getDetailTopic:", error);
        res.status(500).send("Internal Server Error");
    }
};
exports.getDetailTopic = getDetailTopic;
