import type { PipelineStage } from "mongoose";
import Artist from "../../models/artist.model";
import Album from "../../models/album.model";
import Topic from "../../models/topic.model";
import Song from "../../models/song.model";

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


export default { getFeaturedArtists, getLatestAlbums, getFeaturedTopics, getRandomRankSongs, getLatestSongs };
