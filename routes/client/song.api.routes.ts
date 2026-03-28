import { Router } from "express";
import { getRecommendNext } from "../../controllers/client/recommend.next.controller";

const router = Router();

router.get("/recommend-next", getRecommendNext);

export default router;
