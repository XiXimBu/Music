import { Router } from "express";
import {
  getRecentListenHistory,
  getTopSongsStats,
  postAddListenHistory,
} from "../../controllers/client/listen.history.controller";
import authMiddleware from "../../middlewares/client/auth.middleware";

const router: Router = Router();

router.post("/add", authMiddleware, postAddListenHistory);
router.get("/recent", authMiddleware, getRecentListenHistory);
router.get("/top", authMiddleware, getTopSongsStats);

export default router;