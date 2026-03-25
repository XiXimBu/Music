"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const album_model_1 = __importDefault(require("../../models/album.model"));
const pagination_helper_1 = __importDefault(require("../../helpers/pagination.helper"));
const getDashboardAlbums = async (options) => {
    return (0, pagination_helper_1.default)(album_model_1.default, { deleted: false }, {
        page: options?.page,
        limit: options?.limit ?? 2,
        search: options?.search,
        sort: options?.sort ?? "desc",
        sortBy: options?.sortBy ?? "createdAt",
        select: "title thumbnail artist status",
        populate: [{ path: "artist", select: "name" }],
    });
};
exports.default = { getDashboardAlbums };
