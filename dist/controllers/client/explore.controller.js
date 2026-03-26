"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExplore = void 0;
const getExplore = async (req, res) => {
    try {
        res.render("client/pages/explore/index", {
            pageTitle: "Khám phá",
            showSearch: true,
        });
    }
    catch (error) {
        console.error("Explore Error:", error);
        res.status(500).render("client/pages/error/500", { pageTitle: "Lỗi" });
    }
};
exports.getExplore = getExplore;
