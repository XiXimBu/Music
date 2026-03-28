import { Request, Response } from "express";
import { getRecommendNextSongs } from "../../services/client/recommend.next.service";

/** GET /api/songs/recommend-next?songId=&excludeIds=id1,id2&limit=10 */
export const getRecommendNext = async (req: Request, res: Response): Promise<void> => {
	try {
		const songId = String(req.query.songId || "").trim();
		const excludeRaw = String(req.query.excludeIds || "").trim();
		const excludeIds = excludeRaw
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));

		const songs = await getRecommendNextSongs(songId, excludeIds, limit);
		res.json({ success: true, songs });
	} catch (error) {
		console.error("getRecommendNext:", error);
		res.status(500).json({ success: false, songs: [] });
	}
};
