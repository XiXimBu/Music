import { NextFunction, Request, Response } from "express";
import { User } from "../../models/user.model";
import { getAddedSongIdsByUserId } from "../../services/client/user.service";
import * as database from "../../config/database";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

type AuthenticatedRequest = Request & {
	user?: {
		userId: string;
	};
};

const wantsJson = (req: Request): boolean => {
	const accept = String(req.headers["accept"] || "").toLowerCase();
	if (accept.includes("application/json")) return true;
	// Các request fetch/xhr thường set header này
	const requestedWith = String(req.headers["x-requested-with"] || "").toLowerCase();
	if (requestedWith === "xmlhttprequest") return true;
	// API routes trong project: /history/*
	if (req.path.startsWith("/history") || req.originalUrl.startsWith("/history")) return true;
	// Non-GET thường là hành động API
	if (req.method && req.method.toUpperCase() !== "GET") return true;
	return false;
};

const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const token = String(req.cookies?.token ?? "").trim();

		// Fast-fail: không có token thì tuyệt đối không gọi DB
		if (!token) {
			if (wantsJson(req)) {
				res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
				return;
			}
			res.redirect("/auth/login");
			return;
		}

		// Serverless/Vercel: đảm bảo đã kết nối trước khi query
		await database.connect();

		const user = await User.findOne({
			token,
			deleted: false,
			status: "active",
		}).select("_id");

		if (!user) {
			if (wantsJson(req)) {
				res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ." });
				return;
			}
			res.redirect("/auth/login");
			return;
		}

		const userId = user._id.toString();
		(req as AuthenticatedRequest).user = { userId };
		res.locals.user = { id: userId };
		next();
	} catch (error) {
		console.error("authMiddleware error:", error);
		if (wantsJson(req)) {
			res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
			return;
		}
		res.redirect("/auth/login");
	}
};

export const attachAuthStatus = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const token = String(req.cookies?.token ?? "").trim();

		if (!token) {
			res.locals.isAuthenticated = false;
			res.locals.userAvatar = DEFAULT_AVATAR;
			res.locals.addedSongIds = [];
			next();
			return;
		}

		// Token có tồn tại → cần DB; đảm bảo connect trước để tránh buffering timeout trên Vercel
		await database.connect();

		const user = await User.findOne({
			token,
			deleted: false,
			status: "active",
		}).select("_id avatar");

		res.locals.isAuthenticated = !!user;
		res.locals.userAvatar = user?.avatar?.trim() || DEFAULT_AVATAR;
		res.locals.user = user ? { id: user._id.toString() } : undefined;
		res.locals.addedSongIds = user ? await getAddedSongIdsByUserId(user._id.toString()) : [];
		next();
	} catch (error) {
		console.error("attachAuthStatus error:", error);
		res.locals.isAuthenticated = false;
		res.locals.userAvatar = DEFAULT_AVATAR;
		res.locals.user = undefined;
		res.locals.addedSongIds = [];
		next();
	}
};

export default authMiddleware;
