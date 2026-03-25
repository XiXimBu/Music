import type { Request } from "express";
import type { SessionToast } from "../types/toast";

/** Đặt một toast (ghi đè toast đơn trước đó). */
export function setSessionToast(req: Request, toast: SessionToast): void {
	req.session.toast = toast;
}

/** Thêm toast vào stack (nhiều toast cùng lúc). */
export function pushSessionToast(req: Request, toast: SessionToast): void {
	if (!req.session.toasts) {
		req.session.toasts = [];
	}
	req.session.toasts.push(toast);
}
