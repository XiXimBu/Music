import { Router } from "express";
import * as topicController from "../../controllers/client/topic.controller";

const router: Router = Router();

router.get("/detail/:slug", topicController.getDetailTopic);

export default router;
