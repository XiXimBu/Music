"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUniqueArtistSlug = exports.ensureUniqueSongSlug = exports.slugifyArtistName = exports.slugifyTitle = void 0;
const speakingurl_1 = __importDefault(require("speakingurl"));
const song_model_1 = __importDefault(require("../models/song.model"));
const artist_model_1 = __importDefault(require("../models/artist.model"));
const slugifyTitle = (title) => {
    const s = String(title || "").trim();
    if (!s)
        return "song";
    return (0, speakingurl_1.default)(s, { lang: "vn" });
};
exports.slugifyTitle = slugifyTitle;
const slugifyArtistName = (name) => {
    const s = String(name || "").trim();
    if (!s)
        return "artist";
    return (0, speakingurl_1.default)(s, { lang: "vn" });
};
exports.slugifyArtistName = slugifyArtistName;
const ensureUniqueSongSlug = async (base) => {
    let candidate = base || "song";
    let n = 0;
    for (;;) {
        const exists = await song_model_1.default.exists({ slug: candidate });
        if (!exists)
            return candidate;
        n += 1;
        candidate = `${base}-${n}`;
    }
};
exports.ensureUniqueSongSlug = ensureUniqueSongSlug;
const ensureUniqueArtistSlug = async (base) => {
    let candidate = base || "artist";
    let n = 0;
    for (;;) {
        const exists = await artist_model_1.default.exists({ slug: candidate });
        if (!exists)
            return candidate;
        n += 1;
        candidate = `${base}-${n}`;
    }
};
exports.ensureUniqueArtistSlug = ensureUniqueArtistSlug;
