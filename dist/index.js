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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./types/express-session");
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const toast_middleware_1 = require("./middlewares/admin/toast.middleware");
const auth_middleware_1 = require("./middlewares/client/auth.middleware");
const index_routes_1 = __importDefault(require("./routes/client/index.routes"));
const database = __importStar(require("./config/database"));
const system_1 = require("./config/system");
const index_routes_2 = __importDefault(require("./routes/admin/index.routes"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_slug_updater_1 = __importDefault(require("mongoose-slug-updater"));
const app = (0, express_1.default)();
app.use(express_1.default.static(`${__dirname}/public`));
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(auth_middleware_1.attachAuthStatus);
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "music-dev-toast-secret",
    resave: false,
    saveUninitialized: false,
    name: "music.sid",
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    },
}));
app.use(toast_middleware_1.flashToastMiddleware);
mongoose_1.default.plugin(mongoose_slug_updater_1.default);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true,
}));
database.connect();
(0, index_routes_1.default)(app);
(0, index_routes_2.default)(app);
app.locals.PrefixAdmin = system_1.systemConfig.prefixAdmin;
app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    if (res.headersSent) {
        next(error);
        return;
    }
    res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
    });
});
app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});
