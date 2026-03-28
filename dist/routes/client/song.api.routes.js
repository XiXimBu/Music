"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recommend_next_controller_1 = require("../../controllers/client/recommend.next.controller");
const router = (0, express_1.Router)();
router.get("/recommend-next", recommend_next_controller_1.getRecommendNext);
exports.default = router;
