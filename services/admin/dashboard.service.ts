import Album, { IAlbum } from "../../models/album.model";
import paginate from "../../helpers/pagination.helper";
import type { PaginateOptions, PaginateResult } from "../../helpers/pagination.helper";

const getDashboardAlbums = async (
	options?: PaginateOptions
): Promise<PaginateResult<IAlbum>> => {
	return paginate<IAlbum>(Album, { deleted: false }, {
		page: options?.page,
		limit: options?.limit ?? 2,
		search: options?.search,
		sort: options?.sort ?? "desc",
		sortBy: options?.sortBy ?? "createdAt",
		select: "title thumbnail artist status",
		populate: [{ path: "artist", select: "name" }],
	});
};

export default { getDashboardAlbums };
