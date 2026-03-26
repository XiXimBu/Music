import { Request, Response } from "express";

export const getExplore = async (req: Request, res: Response): Promise<void> => {
    try {
        res.render("client/pages/explore/index", {
            pageTitle: "Khám phá",
            showSearch: true,
        });
    } catch (error) {
        console.error("Explore Error:", error);
        res.status(500).render("client/pages/error/500", { pageTitle: "Lỗi" });
    }
};
