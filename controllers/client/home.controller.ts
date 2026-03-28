import { Request, Response } from "express";
import HomeService, {
	resolveHomeMood,
	HOME_FOR_YOU_PERSONALIZED_LIMIT,
	type RankedSong,
} from "../../services/client/home.service";

export const getHome = async (req: Request, res: Response): Promise<void> => {
	try {
		const mood = resolveHomeMood(req.query.mood);
		const userId = res.locals.user?.id;

		const [artists, albums, topics, rankSongs, latestSongs] = await Promise.all([
			HomeService.getFeaturedArtists(),
			HomeService.getLatestAlbums(),
			HomeService.getFeaturedTopics(),
			HomeService.getRandomRankSongs(),
			HomeService.getLatestSongs(),
		]);

		let forYouTopSongs: RankedSong[] = [];
		if (userId) {
			forYouTopSongs = (await HomeService.getPersonalizedForYouRanked(userId, HOME_FOR_YOU_PERSONALIZED_LIMIT)).filter(
				(s) => !!s.audioUrl
			);
		}
		if (!forYouTopSongs.length) {
			const moodSongs = await HomeService.getTopSongsByMood(mood, 5);
			forYouTopSongs = moodSongs.filter((s) => !!s.audioUrl);
		}
		if (!forYouTopSongs.length) {
			forYouTopSongs = await HomeService.getRandomRankSongs();
		}

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
				forYouMood: mood,
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
			forYouMood: resolveHomeMood(undefined),
			error: "Có lỗi xảy ra",
		});
	}
};
