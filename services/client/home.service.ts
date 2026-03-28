import type { PipelineStage } from "mongoose";
import { Types } from "mongoose";
import Artist from "../../models/artist.model";
import Album from "../../models/album.model";
import Topic from "../../models/topic.model";
import Song from "../../models/song.model";
import SongMood from "../../models/songMood.model";
import { getUserTasteProfile } from "./listen.history.service";

export interface ArtistShort {
	name: string;
	avatar?: string;
	description?: string;
	followers: number;
	slug?: string;
	deleted?: boolean;
}

export interface AlbumShort {
	title: string;
	thumbnail: string;
	/** Flatten từ aggregate (trang chủ) */
	artistName?: string;
	artistId?: string | null;
	artist?: { _id?: string; name?: string } | string;
	slug?: string;
	releaseDate?: Date;
}

export interface TopicShort {
    name: string;
    slug?: string;
    thumbnail?: string;
}

export type RankedSong = {
  _id: string;
  title: string;
  duration: number;
  /** mm:ss — tính sẵn ở service cho Pug */
  formattedDuration: string;
  audioUrl: string;
  coverImage?: string;
  views?: number;
  /** Chuỗi tên nghệ sĩ — tính sẵn ở service */
  artistNames: string;
};

export type LatestSongCard = {
  _id: string;
  title: string;
  audioUrl: string;
  coverImage?: string;
  /** Chuỗi nối tên nghệ sĩ — tính sẵn ở DB, Pug chỉ in */
  artistNames: string;
  createdAt?: Date;
};

/** Giới hạn bản ghi trên trang chủ — tránh quét/covered projection quá nặng */
const HOME_ALBUMS_LIMIT = 12;
const HOME_TOPICS_LIMIT = 24;
const HOME_FOR_YOU_BY_MOOD_LIMIT = 5;
/** Số bài “Dành cho bạn” khi đề xuất theo gu (lịch sử 7 ngày). */
export const HOME_FOR_YOU_PERSONALIZED_LIMIT = 14;

/** Slug mood trong DB (song_moods.mood, lowercase). Mặc định gợi ý: chill. */
export const DEFAULT_HOME_MOOD = "chill";

/** Chuẩn hóa `?mood=` — chỉ chữ thường, số, gạch ngang; tránh chuỗi lạ. */
export function resolveHomeMood(query: unknown): string {
	const s = String(query ?? "")
		.trim()
		.toLowerCase();
	if (/^[a-z0-9-]{1,48}$/.test(s)) return s;
	return DEFAULT_HOME_MOOD;
}

/** Filter khớp index compound (status + deleted) — tránh `$ne` khi có thể */
const activeFilter = { status: "active" as const, deleted: false };

/**
 * Chủ đề trên trang chủ: không dùng `activeFilter` nghiêm — document cũ có thể thiếu `status`
 * hoặc `deleted` chưa set; `status: "active" && deleted: false` sẽ loại hết → không còn card.
 */
const topicHomeFilter = {
	deleted: { $ne: true },
	status: { $ne: "inactive" },
} as const;

const mapRankedRow = (song: any): RankedSong => {
	const durationNum = Number(song.duration || 0);
	const artistNames =
		Array.isArray(song.artists) && song.artists.length > 0
			? song.artists
					.map((artist: any) => artist?.name || "Unknown Artist")
					.join(", ")
			: "Unknown Artist";
	const formattedDuration = `${Math.floor(durationNum / 60)}:${String(durationNum % 60).padStart(2, "0")}`;

	return {
		_id: String(song._id),
		title: song.title,
		duration: durationNum,
		formattedDuration,
		audioUrl: song.audioUrl || "",
		coverImage: song.coverImage || "",
		views: Number(song.views || 0),
		artistNames,
	};
};

const songLookupArtists: PipelineStage = {
	$lookup: {
		from: "artists",
		localField: "artists",
		foreignField: "_id",
		pipeline: [{ $project: { _id: 1, name: 1 } }],
		as: "artists",
	},
};

/**
 * Nghệ sĩ hiển thị trên trang chủ (tối đa 6).
 * Phải sort theo `createdAt` mới nhất — không sort thì MongoDB không đảm bảo thứ tự,
 * nghệ sĩ vừa tạo ở admin có thể không nằm trong 6 bản ghi trả về.
 */
export const getFeaturedArtists = async (): Promise<ArtistShort[]> => {
	return (await Artist.find(
		{ deleted: false, slug: { $regex: /.+/ } },
		{ name: 1, avatar: 1, slug: 1, _id: 0 }
	)
		.sort({ createdAt: -1 })
		.limit(6)
		.lean()
		.exec()) as ArtistShort[];
};

export const getLatestAlbums = async (): Promise<AlbumShort[]> => {
	const pipeline: PipelineStage[] = [
		{ $match: activeFilter },
		{ $sort: { createdAt: -1 as const } },
		{ $limit: HOME_ALBUMS_LIMIT },
		{
			$lookup: {
				from: "artists",
				localField: "artist",
				foreignField: "_id",
				pipeline: [{ $project: { _id: 1, name: 1 } }],
				as: "artistDoc",
			},
		},
		{
			$addFields: {
				_artist: { $arrayElemAt: ["$artistDoc", 0] },
			},
		},
		{
			$project: {
				title: 1,
				thumbnail: 1,
				slug: 1,
				releaseDate: 1,
				artistName: "$_artist.name",
				artistId: {
					$cond: [
						{ $ne: ["$_artist", null] },
						{ $toString: "$_artist._id" },
						null,
					],
				},
			},
		},
	];

	const albumsRaw = await Album.aggregate(pipeline).exec();
	return (albumsRaw || []) as AlbumShort[];
};

export const getFeaturedTopics = async (): Promise<TopicShort[]> => {
	const topics = await Topic.find(
		topicHomeFilter,
		{ name: 1, slug: 1, thumbnail: 1, _id: 0 }
	)
		.sort({ createdAt: -1 })
		.limit(HOME_TOPICS_LIMIT)
		.lean()
		.exec();

	return topics as TopicShort[];
};

export const getRandomRankSongs = async (): Promise<RankedSong[]> => {
	const pipeline: PipelineStage[] = [
		{ $match: activeFilter },
		{ $sample: { size: 3 } },
		songLookupArtists,
		{
			$project: {
				_id: 1,
				title: 1,
				duration: 1,
				audioUrl: 1,
				coverImage: 1,
				views: 1,
				artists: 1,
			},
		},
	];

	const rows = await Song.aggregate(pipeline).exec();
	return (rows as any[]).map(mapRankedRow);
};

/**
 * Đề xuất theo tâm trạng: bài có nhãn mood trong `song_moods`, sắp xếp nhiều view trước.
 * (Cùng mô hình SongMood — nhiều người nghe cùng mood → ưu tiên bài nổi trong nhóm đó.)
 */
export const getTopSongsByMood = async (
	mood: string,
	limit = HOME_FOR_YOU_BY_MOOD_LIMIT
): Promise<RankedSong[]> => {
	const m = String(mood || "")
		.trim()
		.toLowerCase();
	if (!m) return [];

	const pipeline: PipelineStage[] = [
		{ $match: { mood: m } },
		{
			$lookup: {
				from: "songs",
				localField: "songId",
				foreignField: "_id",
				as: "songInfo",
			},
		},
		{ $unwind: "$songInfo" },
		{
			$match: {
				"songInfo.status": "active",
				"songInfo.deleted": false,
			},
		},
		{ $sort: { "songInfo.views": -1 } },
		{ $limit: limit },
		{ $replaceRoot: { newRoot: "$songInfo" } },
		songLookupArtists,
		{
			$project: {
				_id: 1,
				title: 1,
				duration: 1,
				audioUrl: 1,
				coverImage: 1,
				views: 1,
				artists: 1,
			},
		},
	];

	const rows = await SongMood.aggregate(pipeline).exec();
	return (rows as any[]).map(mapRankedRow);
};

const rankedSongProject: PipelineStage = {
	$project: {
		_id: 1,
		title: 1,
		duration: 1,
		audioUrl: 1,
		coverImage: 1,
		views: 1,
		artists: 1,
	},
};

/** Lấy lần lượt từ mỗi pool theo vòng — tránh một nghệ sĩ / một mood chiếm cả đầu danh sách. */
function roundRobinTakeUnique(pools: RankedSong[][], maxTotal: number): RankedSong[] {
	if (maxTotal <= 0 || !pools.length) return [];
	const out: RankedSong[] = [];
	const seen = new Set<string>();
	const idx = pools.map(() => 0);
	for (;;) {
		let progressed = false;
		for (let p = 0; p < pools.length; p++) {
			if (out.length >= maxTotal) return out;
			const pool = pools[p];
			while (idx[p] < pool.length) {
				const row = pool[idx[p]++];
				if (!seen.has(row._id)) {
					seen.add(row._id);
					out.push(row);
					progressed = true;
					break;
				}
			}
		}
		if (!progressed) break;
	}
	return out;
}

/** Xen kẽ nhánh “theo ca sĩ” và nhánh “tâm trạng / chủ đề” — không kiểu hết cụm này mới tới cụm kia. */
function interleaveTwoBranches(a: RankedSong[], b: RankedSong[]): RankedSong[] {
	const out: RankedSong[] = [];
	const seen = new Set<string>();
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		if (i < a.length) {
			const x = a[i++];
			if (!seen.has(x._id)) {
				seen.add(x._id);
				out.push(x);
			}
		}
		if (j < b.length) {
			const y = b[j++];
			if (!seen.has(y._id)) {
				seen.add(y._id);
				out.push(y);
			}
		}
	}
	return out;
}

async function fetchRankedForArtist(
	artistId: Types.ObjectId,
	excludeIds: Types.ObjectId[],
	cap: number
): Promise<RankedSong[]> {
	if (cap <= 0) return [];
	const pipeline: PipelineStage[] = [
		{ $match: { ...activeFilter, _id: { $nin: excludeIds }, artists: artistId } },
		{ $sort: { views: -1 as const, createdAt: -1 as const } },
		{ $limit: cap },
		songLookupArtists,
		rankedSongProject,
	];
	const rows = await Song.aggregate(pipeline).exec();
	return (rows as any[]).map(mapRankedRow);
}

async function fetchRankedForTopic(
	topicId: Types.ObjectId,
	excludeIds: Types.ObjectId[],
	cap: number
): Promise<RankedSong[]> {
	if (cap <= 0) return [];
	const pipeline: PipelineStage[] = [
		{ $match: { ...activeFilter, _id: { $nin: excludeIds }, topics: topicId } },
		{ $sort: { views: -1 as const, createdAt: -1 as const } },
		{ $limit: cap },
		songLookupArtists,
		rankedSongProject,
	];
	const rows = await Song.aggregate(pipeline).exec();
	return (rows as any[]).map(mapRankedRow);
}

async function fetchRankedForMoodSlug(
	mood: string,
	excludeIds: Types.ObjectId[],
	cap: number
): Promise<RankedSong[]> {
	const m = String(mood || "")
		.trim()
		.toLowerCase();
	if (!m || cap <= 0) return [];
	const pipeline: PipelineStage[] = [
		{ $match: { mood: m } },
		{
			$lookup: {
				from: "songs",
				localField: "songId",
				foreignField: "_id",
				as: "songInfo",
			},
		},
		{ $unwind: "$songInfo" },
		{
			$match: {
				"songInfo.status": "active",
				"songInfo.deleted": false,
				"songInfo._id": { $nin: excludeIds },
			},
		},
		{ $sort: { "songInfo.views": -1 } },
		{ $limit: cap },
		{ $replaceRoot: { newRoot: "$songInfo" } },
		songLookupArtists,
		rankedSongProject,
	];
	const rows = await SongMood.aggregate(pipeline).exec();
	return (rows as any[]).map(mapRankedRow);
}

const capPerPool = (poolCount: number, target: number) =>
	Math.max(3, Math.ceil(target / Math.max(1, poolCount)) + 4);

/**
 * Đề xuất theo gu 7 ngày: ưu tiên **đồng đều** —
 * round-robin theo từng ca sĩ hay nghe, xen kẽ với round-robin theo **tâm trạng** (song_moods);
 * không có mood thì dùng chủ đề. Loại bài đã nghe gần (capped); thiếu slot → bổ sung bài xem nhiều.
 */
export const getPersonalizedForYouRanked = async (
	userId: string,
	limit = HOME_FOR_YOU_PERSONALIZED_LIMIT
): Promise<RankedSong[]> => {
	if (!String(userId || "").trim()) return [];

	const { topArtistIds, topTopicIds, topMoodSlugs, playedSongIds } = await getUserTasteProfile(userId);
	const excludeBase = playedSongIds;

	const hasArtists = topArtistIds.length > 0;
	const hasMoods = topMoodSlugs.length > 0;
	const hasTopics = topTopicIds.length > 0;
	const useMoodsForBranchB = hasMoods;
	const branchBReady = useMoodsForBranchB ? hasMoods : hasTopics;

	const halfA = Math.ceil(limit / 2);
	const halfB = limit - halfA;

	let merged: RankedSong[] = [];

	if (hasArtists && branchBReady) {
		const ca = capPerPool(topArtistIds.length, halfA);
		const artistPools = await Promise.all(
			topArtistIds.map((id) => fetchRankedForArtist(id, excludeBase, ca))
		);
		const seqA = roundRobinTakeUnique(artistPools, halfA);

		const bCount = useMoodsForBranchB ? topMoodSlugs.length : topTopicIds.length;
		const cb = capPerPool(bCount, halfB);
		let seqB: RankedSong[] = [];
		if (useMoodsForBranchB) {
			const moodPools = await Promise.all(
				topMoodSlugs.map((m) => fetchRankedForMoodSlug(m, excludeBase, cb))
			);
			seqB = roundRobinTakeUnique(moodPools, halfB);
		} else {
			const topicPools = await Promise.all(
				topTopicIds.map((tid) => fetchRankedForTopic(tid, excludeBase, cb))
			);
			seqB = roundRobinTakeUnique(topicPools, halfB);
		}

		merged = interleaveTwoBranches(seqA, seqB);
	} else if (hasArtists) {
		const ca = capPerPool(topArtistIds.length, limit);
		const artistPools = await Promise.all(
			topArtistIds.map((id) => fetchRankedForArtist(id, excludeBase, ca))
		);
		merged = roundRobinTakeUnique(artistPools, limit);
	} else if (useMoodsForBranchB && topMoodSlugs.length > 0) {
		const cb = capPerPool(topMoodSlugs.length, limit);
		const moodPools = await Promise.all(
			topMoodSlugs.map((m) => fetchRankedForMoodSlug(m, excludeBase, cb))
		);
		merged = roundRobinTakeUnique(moodPools, limit);
	} else if (hasTopics) {
		const cb = capPerPool(topTopicIds.length, limit);
		const topicPools = await Promise.all(
			topTopicIds.map((tid) => fetchRankedForTopic(tid, excludeBase, cb))
		);
		merged = roundRobinTakeUnique(topicPools, limit);
	}

	if (merged.length === 0 && (hasArtists || hasTopics)) {
		const orClause: object[] = [];
		if (topArtistIds.length) orClause.push({ artists: { $in: topArtistIds } });
		if (topTopicIds.length) orClause.push({ topics: { $in: topTopicIds } });

		const match: Record<string, unknown> = {
			...activeFilter,
			_id: { $nin: excludeBase },
		};
		if (orClause.length) {
			match.$or = orClause;
		}

		const pipeline: PipelineStage[] = [
			{ $match: match },
			{ $sort: { createdAt: -1 as const, views: -1 as const } },
			{ $limit: limit },
			songLookupArtists,
			rankedSongProject,
		];
		const rows = await Song.aggregate(pipeline).exec();
		merged = (rows as any[]).map(mapRankedRow);
	}

	const seen = new Set<string>();
	merged = merged
		.filter((s) => {
			if (seen.has(s._id)) return false;
			seen.add(s._id);
			return true;
		})
		.slice(0, limit);

	if (merged.length < limit) {
		const have = new Set(merged.map((s) => s._id));
		const excludeIds: Types.ObjectId[] = [...playedSongIds];
		for (const id of have) {
			if (Types.ObjectId.isValid(id)) excludeIds.push(new Types.ObjectId(id));
		}
		const need = limit - merged.length;
		const fillPipeline: PipelineStage[] = [
			{
				$match: {
					...activeFilter,
					_id: { $nin: excludeIds },
				},
			},
			{ $sort: { views: -1 as const, createdAt: -1 as const } },
			{ $limit: need },
			songLookupArtists,
			rankedSongProject,
		];
		const fillRows = await Song.aggregate(fillPipeline).exec();
		merged = merged.concat((fillRows as any[]).map(mapRankedRow));
	}

	return merged.slice(0, limit);
};

export const getLatestSongs = async (): Promise<LatestSongCard[]> => {
	const pipeline: PipelineStage[] = [
		{ $match: activeFilter },
		{ $sort: { createdAt: -1 as const } },
		{ $limit: 10 },
		songLookupArtists,
		{
			$project: {
				_id: { $toString: "$_id" },
				title: 1,
				audioUrl: 1,
				coverImage: 1,
				createdAt: 1,
				artistNames: {
					$cond: [
						{ $eq: [{ $size: { $ifNull: ["$artists", []] } }, 0] },
						"Unknown Artist",
						{
							$reduce: {
								input: {
									$map: {
										input: "$artists",
										as: "ar",
										in: { $ifNull: ["$$ar.name", "Unknown Artist"] },
									},
								},
								initialValue: "",
								in: {
									$cond: [
										{ $eq: ["$$value", ""] },
										"$$this",
										{ $concat: ["$$value", ", ", "$$this"] },
									],
								},
							},
						},
					],
				},
			},
		},
	];

	const rows = await Song.aggregate(pipeline).exec();
	return (rows || []) as LatestSongCard[];
};


export default {
	getFeaturedArtists,
	getLatestAlbums,
	getFeaturedTopics,
	getRandomRankSongs,
	getTopSongsByMood,
	getPersonalizedForYouRanked,
	getLatestSongs,
};
