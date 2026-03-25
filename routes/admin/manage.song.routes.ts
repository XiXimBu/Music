import { Router } from "express";
import * as manageSongController from "../../controllers/admin/manage.song.controller";
import * as uploadCloudMiddleware from "../../middlewares/admin/uploadCloud.middleware";
import { uploadSongFiles } from "../../middlewares/admin/upload.middleware";

const router: Router = Router();

router.get("/", manageSongController.getManageSong);

router.patch("/change-status/:status/:id", manageSongController.changeStatusSong);

router.get("/create", manageSongController.getCreateSong);

router.post(
	"/create",
	uploadSongFiles,
	uploadCloudMiddleware.uploadFields,
	manageSongController.createSong
);



export default router;

