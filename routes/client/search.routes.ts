import { Router } from "express";
import * as searchController from "../../controllers/client/search.controller";


const router: Router = Router();

router.get("/", searchController.searchSuggest);

router.get("/results", searchController.getSearchResult);

export default router;
