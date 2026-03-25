import { Request, Response } from "express";
import HomeService from "../../services/client/home.service";
import listenHistoryService from "../../services/client/listen.history.service";

const getHome = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = res.locals.user?.id;

		const [artists, albums, topics, rankSongs, latestSongs, topFromHistory] = await Promise.all([
			HomeService.getFeaturedArtists(),
			HomeService.getLatestAlbums(),
			HomeService.getFeaturedTopics(),
			HomeService.getRandomRankSongs(),
			HomeService.getLatestSongs(),
			userId ? listenHistoryService.getTopSongs(userId, 5) : Promise.resolve([]),
		]);

		const forYouTopSongs = (topFromHistory || [])
			.map((row) => row.song)
			.filter((s): s is NonNullable<typeof s> => !!s && !!s.audioUrl);

		res.render(
			"client/pages/home/index",
			{
				pageTitle: "Trang chủ",
				artists,
				albums,
				topics,
				rankSongs,
				latestSongs,
				forYouTopSongs,
			},
			(err, html) => {
				if (err) {
					console.error("Pug Render Error:", err);
					res.status(500).send("Lỗi hiển thị giao diện");
					return;
				}
				res.send(html);
			}
		);
	} catch (error) {
		console.error("getHome error:", error);
		res.status(500).render("client/pages/home/index", {
			pageTitle: "Trang chủ",
			artists: [],
			albums: [],
			topics: [],
			rankSongs: [],
			latestSongs: [],
			forYouTopSongs: [],
			error: "Có lỗi xảy ra",
		});
	}
};

export default { getHome };
