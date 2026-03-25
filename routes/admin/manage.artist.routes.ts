import { Router } from "express";
import * as manageArtistController from "../../controllers/admin/manage.artist.controller";
import { uploadSingleImage } from "../../middlewares/admin/upload.middleware";
import * as uploadCloudMiddleware from "../../middlewares/admin/uploadCloud.middleware";

const router: Router = Router();

router.get("/", manageArtistController.getManageArtist);

router.get("/create", manageArtistController.getCreateArtist);

router.post(
	"/create",
	uploadSingleImage("image"),
	uploadCloudMiddleware.uploadSingleImageToCloudinary,
	manageArtistController.postCreateArtist
);

export default router;