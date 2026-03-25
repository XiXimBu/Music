import type { SessionToast } from "./toast";

declare global {
	namespace Express {
		interface Locals {
			/** Đã flash từ session; luôn là mảng (có thể rỗng). */
			toasts: SessionToast[];
			isAuthenticated?: boolean;
			userAvatar?: string;
			/** User đăng nhập (sau auth middleware bảo vệ route). */
			user?: { id: string };
			/** ID bài hát đã có trong bất kỳ playlist nào của user (để ẩn nút + trên track-item). */
			addedSongIds?: string[];
		}
	}
}

declare module "express-serve-static-core" {
	interface Request {
		user?: {
			userId: string;
		};
	}
}

export {};
