"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const artist_controller_1 = __importDefault(require("../../controllers/client/artist.controller"));
const router = (0, express_1.Router)();
router.get("/detail/:slug", artist_controller_1.default.getDetailArtist);
exports.default = router;
