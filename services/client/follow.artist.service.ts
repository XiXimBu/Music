import { Types } from "mongoose";
import FollowArtist from "../../models/followArtist.model";
import Artist from "../../models/artist.model";

export type FollowArtistServiceResult = {
	code: number;
	message: string;
};

export const followArtist = async (
	userId: string,
	rawArtistId: string | undefined
): Promise<FollowArtistServiceResult> => {
	if (typeof rawArtistId !== "string" || !rawArtistId.trim()) {
		return {
			code: 400,
			message: "Thiếu hoặc không hợp lệ artistId.",
		};
	}

	const artistId = rawArtistId.trim();
	if (!Types.ObjectId.isValid(artistId)) {
		return {
			code: 400,
			message: "artistId không đúng định dạng.",
		};
	}

	const artistExists = await Artist.exists({
		_id: artistId,
		deleted: { $ne: true },
	});

	if (!artistExists) {
		return {
			code: 404,
			message: "Không tìm thấy nghệ sĩ.",
		};
	}

	const already = await FollowArtist.exists({ userId, artistId });
	if (already) {
		return {
			code: 200,
			message: "Bạn đã theo dõi nghệ sĩ này rồi.",
		};
	}

	try {
		await FollowArtist.create({ userId, artistId });
		return {
			code: 200,
			message: "Đã theo dõi nghệ sĩ thành công.",
		};
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			(error as { code?: number }).code === 11000
		) {
			return {
				code: 200,
				message: "Bạn đã theo dõi nghệ sĩ này rồi.",
			};
		}
		throw error;
	}
};
 
export const unfollowArtist = async (
	userId: string,
	rawArtistId: string | undefined
): Promise<FollowArtistServiceResult> => {
	if (typeof rawArtistId !== "string" || !rawArtistId.trim()) {
		return {
			code: 400,
			message: "Thiếu hoặc không hợp lệ artistId.",
		};
	}

	const artistId = rawArtistId.trim();
	if (!Types.ObjectId.isValid(artistId)) {
		return {
			code: 400,
			message: "artistId không đúng định dạng.",
		};
	}

	const deleted = await FollowArtist.findOneAndDelete({ userId, artistId });
	if (!deleted) {
		return {
			code: 404,
			message: "Bạn chưa theo dõi nghệ sĩ này.",
		};
	}

	return {
		code: 200,
		message: "Đã bỏ theo dõi thành công.",
	};
};

export const isFollowingArtist = async (
	userId: string,
	artistId: string
): Promise<boolean> => {
	if (!userId || !artistId) return false;
	if (!Types.ObjectId.isValid(artistId)) return false;
	const followed = await FollowArtist.exists({ userId, artistId });
	return Boolean(followed);
};