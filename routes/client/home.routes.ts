import { Router } from "express";
import HomeController from "../../controllers/client/home.controller";

const router: Router = Router();

router.get("/", HomeController.getHome);

export default router;

