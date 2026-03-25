import { Request, Response } from "express";
import * as userService from "../../services/client/user.service";
import listenHistoryService from "../../services/client/listen.history.service";
import { truncateText } from "../../helpers/truncateText.helper";

type AuthenticatedRequest = Request & {
	user?: {
		userId: string;
	};
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthenticatedRequest).user?.userId;

		if (!userId) {
			res.redirect("/login");
			return;
		}

		const [userData, playlists, followedArtists, recentHistory, topSongs] = await Promise.all([
			userService.getProfile(userId),
			userService.getPlaylistsByUserId(userId),
			userService.getFollowedArtistsForUser(userId),
			listenHistoryService.getRecentHistory(userId),
			listenHistoryService.getTopSongs(userId, 5),
		]);

		res.render("client/pages/user/index", {
			pageTitle: "Tài khoản của tôi",
			showSearch: true,
			user: userData,
			playlists,
			followedArtists,
			recentHistory,
			topSongs,
			truncateText,
		});
	} catch (error) {
		console.error("getProfile error:", error);
		res.redirect("/login");
	}
};

export const patchEditProfile = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthenticatedRequest).user?.userId;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: "Bạn chưa đăng nhập.",
			});
			return;
		}

		const incomingFile = (req as Request & { file?: Express.Multer.File }).file;
		const avatarFromBody = String(req.body?.avatar ?? req.body?.image ?? "").trim();

		const updatedUser = await userService.updateProfile(userId, {
			fullName: req.body?.fullName,
			description: req.body?.description,
			avatar: avatarFromBody,
		});

		res.status(200).json({
			success: true,
			message: "Cập nhật thông tin cá nhân thành công.",
			data: {
				...updatedUser,
				hasNewFile: !!incomingFile,
			},
		});
	} catch (error) {
		console.error("patchEditProfile error:", error);
		res.status(500).json({
			success: false,
			message: "Không thể cập nhật thông tin. Vui lòng thử lại.",
		});
	}
};
