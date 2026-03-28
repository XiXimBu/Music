import { Types } from "mongoose";
import Song from "../../models/song.model";

export type RecommendNextSong = {
	_id: string;
	title: string;
	audioUrl: string;
	coverImage: string;
	artistNames: string;
	duration?: number;
};

/**
 * Radio / autoplay sau khi hết queue: bài cùng ca sĩ hoặc cùng topic với bài vừa phát,
 * loại các id đã nghe; nếu bài gốc không có artist/topic thì gợi ý theo views.
 */
export const getRecommendNextSongs = async (
	songId: string,
	excludeIds: string[] = [],
	limit = 10
): Promise<RecommendNextSong[]> => {
	const lim = Math.min(20, Math.max(1, limit));
	if (!Types.ObjectId.isValid(songId)) return [];

	const song = await Song.findOne({
		_id: new Types.ObjectId(songId),
		status: "active",
		deleted: false,
	})
		.select("artists topics")
		.lean();

	if (!song) return [];

	const exclude = excludeIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

	const ors: object[] = [];
	const a0 = song.artists?.[0];
	const t0 = song.topics?.[0];
	if (a0) ors.push({ artists: a0 });
	if (t0) ors.push({ topics: t0 });

	const baseMatch: Record<string, unknown> = {
		status: "active",
		deleted: false,
		_id: { $nin: exclude },
	};

	const filter = ors.length ? { ...baseMatch, $or: ors } : baseMatch;

	const rows = await Song.find(filter)
		.sort({ views: -1, createdAt: -1 })
		.limit(lim)
		.populate({ path: "artists", select: "name" })
		.lean()
		.exec();

	return (rows || []).map((s: any) => {
		const names = Array.isArray(s.artists)
			? s.artists.map((x: { name?: string }) => x?.name || "").filter(Boolean).join(", ")
			: "";
		return {
			_id: String(s._id),
			title: s.title || "",
			audioUrl: s.audioUrl || "",
			coverImage: s.coverImage || "",
			artistNames: names || "Unknown Artist",
			duration: Number(s.duration || 0),
		};
	});
};
