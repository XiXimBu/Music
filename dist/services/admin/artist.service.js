"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtistsPaginated = exports.createArtist = void 0;
const pagination_helper_1 = __importDefault(require("../../helpers/pagination.helper"));
const artist_model_1 = __importDefault(require("../../models/artist.model"));
const ARTIST_PAGE_LIMIT = 5;
const createArtist = async (input) => {
    const doc = await artist_model_1.default.create({
        name: input.name,
        description: input.description,
        avatar: input.avatar,
        slug: input.slug,
        deleted: false,
        followers: 0,
    });
    return doc;
};
exports.createArtist = createArtist;
const getArtistsPaginated = async (page) => {
    const result = await (0, pagination_helper_1.default)(artist_model_1.default, { deleted: false }, {
        page,
        limit: ARTIST_PAGE_LIMIT,
        sortBy: "createdAt",
        sort: "desc",
    });
    return {
        artists: result.docs,
        total: result.total,
        currentPage: result.page,
        totalPages: result.totalPages,
        limit: ARTIST_PAGE_LIMIT,
    };
};
exports.getArtistsPaginated = getArtistsPaginated;
