"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const listen_history_controller_1 = require("../../controllers/client/listen.history.controller");
const auth_middleware_1 = __importDefault(require("../../middlewares/client/auth.middleware"));
const router = (0, express_1.Router)();
router.post("/add", auth_middleware_1.default, listen_history_controller_1.postAddListenHistory);
router.get("/recent", auth_middleware_1.default, listen_history_controller_1.getRecentListenHistory);
router.get("/top", auth_middleware_1.default, listen_history_controller_1.getTopSongsStats);
exports.default = router;
