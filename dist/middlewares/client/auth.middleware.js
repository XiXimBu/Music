"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachAuthStatus = void 0;
const user_model_1 = require("../../models/user.model");
const user_service_1 = require("../../services/client/user.service");
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const authMiddleware = async (req, res, next) => {
    try {
        const token = String(req.cookies?.token ?? "").trim();
        if (!token) {
            res.redirect("/login");
            return;
        }
        const user = await user_model_1.User.findOne({
            token,
            deleted: false,
            status: "active",
        }).select("_id");
        if (!user) {
            res.redirect("/login");
            return;
        }
        const userId = user._id.toString();
        req.user = { userId };
        res.locals.user = { id: userId };
        next();
    }
    catch (error) {
        console.error("authMiddleware error:", error);
        res.redirect("/login");
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
