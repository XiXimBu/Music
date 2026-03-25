import paginate from "../../helpers/pagination.helper";
import Artist, { IArtist } from "../../models/artist.model";

const ARTIST_PAGE_LIMIT = 5;

/** Dữ liệu tạo nghệ sĩ (avatar là URL sau upload — Cloudinary). */
export type CreateArtistInput = {
	name: string;
	description?: string;
	avatar: string;
	slug: string;
};

/**
 * Tạo document Artist: name, description (optional), avatar, slug, deleted: false.
 */
export const createArtist = async (input: CreateArtistInput): Promise<IArtist> => {
	const doc = await Artist.create({
		name: input.name,
		description: input.description,
		avatar: input.avatar,
		slug: input.slug,
		deleted: false,
		followers: 0,
	});
	return doc;
};

/** Kết quả phân trang danh sách nghệ sĩ (chưa xóa mềm). */
export type ArtistsPaginatedResult = {
	artists: IArtist[];
	total: number;
	currentPage: number;
	totalPages: number;
	limit: number;
};

/**
 * Lấy danh sách artist: chỉ `deleted = false`, sắp xếp `createdAt` mới nhất trước,
 * phân trang với `limit = 5`, `skip` do helper `paginate` tính `(page - 1) * limit`.
 */
export const getArtistsPaginated = async (page: number): Promise<ArtistsPaginatedResult> => {
	const result = await paginate<IArtist>(Artist, { deleted: false }, {
		page,
		limit: ARTIST_PAGE_LIMIT,
		sortBy: "createdAt",
		sort: "desc",
	});

	return {
		artists: result.docs,
		total: result.total,
		currentPage: result.page,
		totalPages: result.totalPages,
		limit: ARTIST_PAGE_LIMIT,
	};
};
