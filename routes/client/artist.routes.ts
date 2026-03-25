import { Router } from "express";
import artistController from "../../controllers/client/artist.controller";

const router: Router = Router();

router.get("/detail/:slug", artistController.getDetailArtist);

export default router;

