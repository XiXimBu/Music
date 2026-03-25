import { Router } from "express";
import followArtistController from "../../controllers/client/follow.artist.controller";
import authMiddleware from "../../middlewares/client/auth.middleware";

const router: Router = Router();


router.post("/follow-artist", authMiddleware, followArtistController.postFollowArtist);
router.delete("/follow-artist/:artistId", authMiddleware, followArtistController.deleteFollowArtist);

export default router;