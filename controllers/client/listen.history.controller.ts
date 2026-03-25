import { Request, Response } from "express";
import listenHistoryService from "../../services/client/listen.history.service";

type AuthenticatedRequest = Request & {
  user?: { userId: string };
};

export const postAddListenHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    const songId = String(req.body?.songId || "").trim();

    if (!userId || !songId) {
      res.status(400).json({ success: false, message: "Thiếu userId hoặc songId." });
      return;
    }

    await listenHistoryService.saveHistory(userId, songId);
    res.status(201).json({ success: true, message: "Đã lưu lịch sử nghe nhạc." });
  } catch (error) {
    console.error("postAddListenHistory error:", error);
    res.status(500).json({ success: false, message: "Không thể lưu lịch sử." });
  }
};

export const getRecentListenHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
      return;
    }

    const recentHistory = await listenHistoryService.getRecentHistory(userId);
    res.status(200).json({ success: true, data: recentHistory });
  } catch (error) {
    console.error("getRecentListenHistory error:", error);
    res.status(500).json({ success: false, message: "Không thể lấy lịch sử nghe nhạc." });
  }
};

export const getTopSongsStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;
    const limit = Number(req.query?.limit || 5);

    if (!userId) {
      res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
      return;
    }

    const topSongs = await listenHistoryService.getTopSongs(userId, limit);
    res.status(200).json({ success: true, data: topSongs });
  } catch (error) {
    console.error("getTopSongsStats error:", error);
    res.status(500).json({ success: false, message: "Không thể lấy thống kê top songs." });
  }
};