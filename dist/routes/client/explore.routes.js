"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const explore_controller_1 = require("../../controllers/client/explore.controller");
const router = (0, express_1.Router)();
router.get("/", explore_controller_1.getExplore);
exports.default = router;
