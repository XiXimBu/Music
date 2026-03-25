import { Types } from "mongoose";
import Song, { ISong } from "../../models/song.model";
import Artist from "../../models/artist.model";
import Album from "../../models/album.model";
import Topic from "../../models/topic.model";
import paginate from "../../helpers/pagination.helper";
import type { PaginateOptions, PaginateResult } from "../../helpers/pagination.helper";
import type { ParsedCreateSongBody } from "../../validations/admin/createSong.validation";
import { escapeRegex } from "../../validations/admin/createSong.validation";
import { ensureUniqueSongSlug, slugifyTitle } from "../../helpers/slug.helper";

/** Danh sách bài hát (deleted = false). Không select `deleted` để không trả field đó trong docs. */
export const getManageSongService = async (
	options?: PaginateOptions
): Promise<PaginateResult<ISong>> => {
	return paginate<ISong>(Song, { deleted: false }, {
		page: options?.page,
		limit: options?.limit ?? 10,
		search: options?.search,
		sort: options?.sort ?? "desc",
		sortBy: options?.sortBy ?? "createdAt",
		select: "title audioUrl duration slug status artists coverImage views createdAt",
		populate: [{ path: "artists", select: "name" }],
	});
};

/** Topic hiển thị form: không bị xóa; không inactive (khớp dữ liệu cũ thiếu field). */
const topicFilterForForm = (): Record<string, unknown> => ({
	deleted: { $ne: true },
	status: { $ne: "inactive" },
});

export const getCreateSongFormData = async () => {
	const topics = await Topic.find(topicFilterForForm())
		.select("name")
		.sort({ name: 1 })
		.lean();

	return { topics };
};

/** Tìm nghệ sĩ / album theo tên (không phân biệt hoa thường). */
const findArtistIdByName = async (name: string): Promise<Types.ObjectId | null> => {
	const doc = await Artist.findOne({
		deleted: false,
		name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
	})
		.select("_id")
		.lean();
	return doc?._id ? new Types.ObjectId(String(doc._id)) : null;
};

const findAlbumIdByTitle = async (title: string): Promise<Types.ObjectId | null> => {
	const doc = await Album.findOne({
		deleted: false,
		title: { $regex: new RegExp(`^${escapeRegex(title.trim())}$`, "i") },
	})
		.select("_id")
		.lean();
	return doc?._id ? new Types.ObjectId(String(doc._id)) : null;
};

/** Tạo bài hát; slug sinh từ `title` nhờ mongoose-slug-updater (cấu hình trên schema). */
export const createSongService = async (
	parsed: ParsedCreateSongBody
): Promise<ISong> => {
	let artistIds: Types.ObjectId[] = [];
	const name = parsed.artistName?.trim();
	if (name) {
		const artistId = await findArtistIdByName(name);
		if (!artistId) {
			throw new Error(
				"Không tìm thấy nghệ sĩ trùng với tên đã nhập. Hãy dùng đúng tên có trong hệ thống hoặc để trống."
			);
		}
		artistIds = [artistId];
	}

	let albumId: Types.ObjectId | undefined;
	if (parsed.albumTitle?.trim()) {
		const aid = await findAlbumIdByTitle(parsed.albumTitle);
		if (!aid) {
			throw new Error("Không tìm thấy album trùng với tên đã nhập. Để trống hoặc nhập đúng tên album.");
		}
		albumId = aid;
	}

	const baseSlug = slugifyTitle(parsed.title);
	const slug = await ensureUniqueSongSlug(baseSlug);

	if (parsed.topicIds.length) {
		const topicObjectIds = parsed.topicIds.map((id) => new Types.ObjectId(id));
		const topicCount = await Topic.countDocuments({
			_id: { $in: topicObjectIds },
			...topicFilterForForm(),
		});
		if (topicCount !== parsed.topicIds.length) {
			throw new Error(
				"Một hoặc nhiều topic không tồn tại hoặc không khả dụng."
			);
		}
	}

	const topicRefs = parsed.topicIds.map((id) => new Types.ObjectId(id));

	const doc = await Song.create({
		title: parsed.title,
		slug,
		duration: parsed.durationSeconds,
		audioUrl: parsed.audioUrl,
		coverImage: parsed.coverImage,
		artists: artistIds,
		album: albumId,
		topics: topicRefs,
		status: parsed.status,
		deleted: false,
		views: parsed.views,
		likes: 0,
	});

	return doc;
};

export default { getManageSongService, getCreateSongFormData, createSongService };
