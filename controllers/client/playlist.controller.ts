import { Request, Response } from "express";
import * as playlistService from "../../services/client/playlist.service";
import * as userService from "../../services/client/user.service";

type AuthenticatedRequest = Request & {
	user?: {
		userId: string;
	};
};

export const postCreatePlaylist = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthenticatedRequest).user?.userId;
		if (!userId) {
			res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
			return;
		}

		const playlist = await playlistService.createPlaylist(userId, {
			title: req.body?.title,
			description: req.body?.description,
		});

		res.status(201).json({
			success: true,
			message: "Tạo playlist thành công.",
			data: playlist,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Không thể tạo playlist.";
		res.status(400).json({ success: false, message });
	}
};

export const patchUpdatePlaylist = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthenticatedRequest).user?.userId;
		const playlistId = String(req.params?.id || "").trim();

		if (!userId) {
			res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
			return;
		}
		if (!playlistId) {
			res.status(400).json({ success: false, message: "Thiếu playlistId." });
			return;
		}

		const playlist = await playlistService.updatePlaylist(userId, playlistId, {
			title: req.body?.title,
			description: req.body?.description,
		});

		res.status(200).json({
			success: true,
			message: "Cập nhật playlist thành công.",
			data: playlist,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Không thể cập nhật playlist.";
		res.status(400).json({ success: false, message });
	}
};

export const deletePlaylist = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthenticatedRequest).user?.userId;
		const playlistId = String(req.params?.id || "").trim();

		if (!userId) {
			res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
			return;
		}
		if (!playlistId) {
			res.status(400).json({ success: false, message: "Thiếu playlistId." });
			return;
		}

		await playlistService.softDeletePlaylist(userId, playlistId);
		res.status(200).json({ success: true, message: "Đã xóa playlist." });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Không thể xóa playlist.";
		res.status(400).json({ success: false, message });
	}
};

export const postAddSongToPlaylist = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthenticatedRequest).user?.userId;
		const songId = String(req.body?.songId || "").trim();
		const playlistId = String(req.body?.playlistId || "").trim();

		if (!userId) {
			res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
			return;
		}
		if (!songId) {
			res.status(400).json({ success: false, message: "Thiếu songId." });
			return;
		}

		const result = await userService.addSongToUserDefaultPlaylist(
			userId,
			songId,
			playlistId || undefined
		);
		res.status(200).json({
			success: true,
			message: result.added ? "Đã thêm bài hát vào playlist của bạn." : "Bài hát đã có sẵn trong playlist.",
			data: result,
		});
	} catch (error) {
		console.error("postAddSongToPlaylist error:", error);
		res.status(500).json({
			success: false,
			message: "Không thể thêm bài hát vào playlist.",
		});
	}
};

export const postRemoveSongFromPlaylist = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as AuthenticatedRequest).user?.userId;
		const playlistId = String(req.body?.playlistId || "").trim();
		const songId = String(req.body?.songId || "").trim();

		if (!userId) {
			res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
			return;
		}
		if (!playlistId || !songId) {
			res.status(400).json({ success: false, message: "Thiếu playlistId hoặc songId." });
			return;
		}

		const result = await userService.removeSongFromPlaylist(userId, playlistId, songId);
		res.status(200).json({
			success: true,
			message: "Đã gỡ bài hát khỏi playlist.",
			data: { songId, stillInUserPlaylists: result.stillInUserPlaylists },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Không thể gỡ bài hát.";
		console.error("postRemoveSongFromPlaylist error:", error);
		res.status(400).json({ success: false, message });
	}
};
