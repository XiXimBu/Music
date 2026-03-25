import "express-session";
import type { SessionToast } from "./toast";

declare module "express-session" {
	interface SessionData {
		/** Một toast (flash đơn). */
		toast?: SessionToast;
		/** Nhiều toast xếp chồng (bonus). */
		toasts?: SessionToast[];
		/** Email đang thực hiện flow quên mật khẩu. */
		emailReset?: string;
		/** Đánh dấu OTP đã xác minh thành công. */
		isVerifiedOTP?: boolean;
		/** Số lần nhập OTP sai trong phiên hiện tại. */
		otpFailCount?: number;
	}
}

export {};
