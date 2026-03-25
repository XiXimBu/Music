"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../../config/system");
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const manage_song_routes_1 = __importDefault(require("./manage.song.routes"));
const manage_artist_routes_1 = __importDefault(require("./manage.artist.routes"));
const adminRoutes = (app) => {
    const PATH_ADMIN = `/${system_1.systemConfig.prefixAdmin}`;
    app.use(`${PATH_ADMIN}/dashboard`, dashboard_routes_1.default);
    app.use(`${PATH_ADMIN}/song`, manage_song_routes_1.default);
    app.use(`${PATH_ADMIN}/artist`, manage_artist_routes_1.default);
};
exports.default = adminRoutes;
