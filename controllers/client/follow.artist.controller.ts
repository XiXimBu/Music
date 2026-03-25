import { Request, Response } from "express";
import {
	followArtist,
	unfollowArtist,
} from "../../services/client/follow.artist.service";

/** Payload JSON cho POST follow (thống nhất với frontend). */
export interface FollowArtistJsonBody {
	code: number;
	message: string;
}

interface PostFollowArtistBody {
	artistId?: string;
}

type PostFollowArtistRequest = Request<
	unknown,
	FollowArtistJsonBody,
	PostFollowArtistBody
>;

type DeleteFollowArtistRequest = Request<{ artistId?: string }, FollowArtistJsonBody>;

export const postFollowArtist = async (
	req: PostFollowArtistRequest,
	res: Response<FollowArtistJsonBody>
): Promise<void> => {
	const userId = res.locals.user?.id;

	try {
		if (!userId) {
			res.status(401).json({
				code: 401,
				message: "Bạn cần đăng nhập để theo dõi nghệ sĩ.",
			});
			return;
		}

		const result = await followArtist(userId, req.body?.artistId);
		res.status(result.code).json(result);
	} catch (error) {
		console.error("postFollowArtist error:", error);
		res.status(500).json({
			code: 500,
			message: "Không thể theo dõi nghệ sĩ. Vui lòng thử lại.",
		});
	}
};

export const deleteFollowArtist = async (
	req: DeleteFollowArtistRequest,
	res: Response<FollowArtistJsonBody>
): Promise<void> => {
	const userId = res.locals.user?.id;

	try {
		if (!userId) {
			res.status(401).json({
				code: 401,
				message: "Bạn cần đăng nhập để bỏ theo dõi nghệ sĩ.",
			});
			return;
		}

		const result = await unfollowArtist(userId, req.params?.artistId);
		res.status(result.code).json(result);
	} catch (error) {
		console.error("deleteFollowArtist error:", error);
		res.status(500).json({
			code: 500,
			message: "Không thể bỏ theo dõi nghệ sĩ. Vui lòng thử lại.",
		});
	}
};

const followArtistController = {
	postFollowArtist,
	deleteFollowArtist,
};

export default followArtistController;
