import { NextFunction, Request, Response } from "express";
import { User } from "../../models/user.model";
import { getAddedSongIdsByUserId } from "../../services/client/user.service";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

type AuthenticatedRequest = Request & {
	user?: {
		userId: string;
	};
};

const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const token = String(req.cookies?.token ?? "").trim();

		if (!token) {
			res.redirect("/login");
			return;
		}

		const user = await User.findOne({
			token,
			deleted: false,
			status: "active",
		}).select("_id");

		if (!user) {
			res.redirect("/login");
			return;
		}

		const userId = user._id.toString();
		(req as AuthenticatedRequest).user = { userId };
		res.locals.user = { id: userId };
		next();
	} catch (error) {
		console.error("authMiddleware error:", error);
		res.redirect("/login");
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
