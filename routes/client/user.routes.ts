import { Router } from "express";
import * as userController from "../../controllers/client/user.controller";
import authMiddleware from "../../middlewares/client/auth.middleware";
import { uploadSingleImage } from "../../middlewares/admin/upload.middleware";
import { uploadSingleImageToCloudinary } from "../../middlewares/admin/uploadCloud.middleware";

const router: Router = Router();

router.get("/profile", authMiddleware, userController.getProfile);

router.patch(
	"/edit-profile",
	authMiddleware,
	uploadSingleImage("avatar"),
	uploadSingleImageToCloudinary,
	userController.patchEditProfile
);


export default router;
