import "../../types/express-session";
import { NextFunction, Request, Response } from "express";
import type { SessionToast } from "../../types/toast";

/**
 * Gom toast từ session: `toasts[]` (stack) trước, sau đó `toast` (đơn).
 * Gán vào res.locals.toasts, rồi xóa khỏi session để chỉ hiện một lần (sau render).
 */
function collectFromSession(session: Request["session"]): SessionToast[] {
	const out: SessionToast[] = [];
	if (session.toasts?.length) {
		out.push(...session.toasts);
	}
	if (session.toast) {
		out.push(session.toast);
	}
	return out;
}

export function flashToastMiddleware(req: Request, res: Response, next: NextFunction): void {
	const fromSession = collectFromSession(req.session);
	res.locals.toasts = fromSession;
	delete req.session.toast;
	delete req.session.toasts;
	next();
}
