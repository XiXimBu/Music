"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const follow_artist_controller_1 = __importDefault(require("../../controllers/client/follow.artist.controller"));
const auth_middleware_1 = __importDefault(require("../../middlewares/client/auth.middleware"));
const router = (0, express_1.Router)();
router.post("/follow-artist", auth_middleware_1.default, follow_artist_controller_1.default.postFollowArtist);
router.delete("/follow-artist/:artistId", auth_middleware_1.default, follow_artist_controller_1.default.deleteFollowArtist);
exports.default = router;
