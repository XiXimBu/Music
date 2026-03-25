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
exports.attachAuthStatus = void 0;
const user_model_1 = require("../../models/user.model");
const user_service_1 = require("../../services/client/user.service");
const database = __importStar(require("../../config/database"));
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const wantsJson = (req) => {
    const accept = String(req.headers["accept"] || "").toLowerCase();
    if (accept.includes("application/json"))
        return true;
    const requestedWith = String(req.headers["x-requested-with"] || "").toLowerCase();
    if (requestedWith === "xmlhttprequest")
        return true;
    if (req.path.startsWith("/history") || req.originalUrl.startsWith("/history"))
        return true;
    if (req.method && req.method.toUpperCase() !== "GET")
        return true;
    return false;
};
const authMiddleware = async (req, res, next) => {
    try {
        const token = String(req.cookies?.token ?? "").trim();
        if (!token) {
            if (wantsJson(req)) {
                res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
                return;
            }
            res.redirect("/auth/login");
            return;
        }
        await database.connect();
        const user = await user_model_1.User.findOne({
            token,
            deleted: false,
            status: "active",
        }).select("_id");
        if (!user) {
            if (wantsJson(req)) {
                res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ." });
                return;
            }
            res.redirect("/auth/login");
            return;
        }
        const userId = user._id.toString();
        req.user = { userId };
        res.locals.user = { id: userId };
        next();
    }
    catch (error) {
        console.error("authMiddleware error:", error);
        if (wantsJson(req)) {
            res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
            return;
        }
        res.redirect("/auth/login");
    }
};
const attachAuthStatus = async (req, res, next) => {
    try {
        const token = String(req.cookies?.token ?? "").trim();
        if (!token) {
            res.locals.isAuthenticated = false;
            res.locals.userAvatar = DEFAULT_AVATAR;
            res.locals.addedSongIds = [];
            next();
            return;
        }
        await database.connect();
        const user = await user_model_1.User.findOne({
            token,
            deleted: false,
            status: "active",
        }).select("_id avatar");
        res.locals.isAuthenticated = !!user;
        res.locals.userAvatar = user?.avatar?.trim() || DEFAULT_AVATAR;
        res.locals.user = user ? { id: user._id.toString() } : undefined;
        res.locals.addedSongIds = user ? await (0, user_service_1.getAddedSongIdsByUserId)(user._id.toString()) : [];
        next();
    }
    catch (error) {
        console.error("attachAuthStatus error:", error);
        res.locals.isAuthenticated = false;
        res.locals.userAvatar = DEFAULT_AVATAR;
        res.locals.user = undefined;
        res.locals.addedSongIds = [];
        next();
    }
};
exports.attachAuthStatus = attachAuthStatus;
exports.default = authMiddleware;
