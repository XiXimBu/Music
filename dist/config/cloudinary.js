"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryMusic = exports.cloudinaryImage = void 0;
const cloudinary_1 = require("cloudinary");
const cloudinaryImage = cloudinary_1.v2;
exports.cloudinaryImage = cloudinaryImage;
cloudinaryImage.config({
    cloud_name: process.env.IMG_CLOUD_NAME,
    api_key: process.env.IMG_API_KEY,
    api_secret: process.env.IMG_API_SECRET
});
const cloudinaryMusic = require('cloudinary').v2;
exports.cloudinaryMusic = cloudinaryMusic;
cloudinaryMusic.config({
    cloud_name: process.env.MUSIC_CLOUD_NAME,
    api_key: process.env.MUSIC_API_KEY,
    api_secret: process.env.MUSIC_API_SECRET
});
