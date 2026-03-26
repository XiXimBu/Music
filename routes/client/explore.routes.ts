import { Router } from "express";
import { getExplore } from "../../controllers/client/explore.controller";

const router: Router = Router();

router.get("/", getExplore);

export default router;

