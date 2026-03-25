import { Router } from "express";
import authMiddleware from "../../middlewares/client/auth.middleware";
import * as playlistController from "../../controllers/client/playlist.controller";

const router: Router = Router();

router.post("/", authMiddleware, playlistController.postCreatePlaylist);
router.post("/add-song", authMiddleware, playlistController.postAddSongToPlaylist);
router.post("/remove-song", authMiddleware, playlistController.postRemoveSongFromPlaylist);
router.patch("/:id", authMiddleware, playlistController.patchUpdatePlaylist);
router.delete("/:id", authMiddleware, playlistController.deletePlaylist);

export default router;
