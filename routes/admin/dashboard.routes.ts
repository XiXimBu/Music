import { Router } from "express";
import * as dashboardController from "../../controllers/admin/dashboard.controller";

const router: Router = Router();

router.get("/", dashboardController.getDashboard);

router.patch("/change-status/:status/:id", dashboardController.changeStatus);

export default router;

