import { Router } from "express";
import * as authController from "../../controllers/client/auth.controller";
import { validateLogin, validateRegister } from "../../validations/client/auth.validation";


const router: Router = Router();

router.get("/register", authController.getRegister);
router.post("/register",validateRegister, authController.postRegister);
router.get("/login", authController.getLogin);
router.post("/login", validateLogin, authController.postLogin);
router.get("/forgot-password", authController.getForgotPassword);
router.post("/forgot-password", authController.postForgotPassword);
router.get("/verify-otp", authController.getVerifyOTP);
router.post("/verify-otp", authController.postVerifyOTP);
router.get("/reset-password", authController.getResetPassword);
router.post("/reset-password", authController.postResetPassword);
router.post("/logout", authController.postLogout);


export default router;