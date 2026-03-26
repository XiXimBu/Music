"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const home_routes_1 = __importDefault(require("./home.routes"));
const artist_routes_1 = __importDefault(require("./artist.routes"));
const topic_routes_1 = __importDefault(require("./topic.routes"));
const search_routes_1 = __importDefault(require("./search.routes"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const playlist_routes_1 = __importDefault(require("./playlist.routes"));
const follow_artist_routes_1 = __importDefault(require("./follow.artist.routes"));
const listen_history_routes_1 = __importDefault(require("./listen.history.routes"));
const explore_routes_1 = __importDefault(require("./explore.routes"));
const clientRoutes = (app) => {
    app.use(`/auth`, auth_routes_1.default);
    app.use(`/artist`, artist_routes_1.default);
    app.use(`/topics`, topic_routes_1.default);
    app.use(`/home`, home_routes_1.default);
    app.use(`/explore`, explore_routes_1.default);
    app.use(`/`, home_routes_1.default);
    app.use(`/search`, search_routes_1.default);
    app.use(`/user`, user_routes_1.default);
    app.use(`/playlist`, playlist_routes_1.default);
    app.use(`/history`, listen_history_routes_1.default);
    app.use(`/`, follow_artist_routes_1.default);
};
exports.default = clientRoutes;
