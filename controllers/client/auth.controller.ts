import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { isValidEmail } from "../../validations/client/auth.validation";
import AuthService from "../../services/client/auth.service";
import { generateToken } from "../../helpers/generate.helper";
import { sendOTP } from "../../helpers/otp-mail.helper";

type RegisterBody = {
	name?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
};

type LoginBody = {
	email?: string;
	password?: string;
};

type ForgotPasswordBody = {
	email?: string;
};

type VerifyOTPBody = {
	otp?: string;
};

type ResetPasswordBody = {
	resetToken?: string;
	password?: string;
	confirmPassword?: string;
};

const redirectBack = (req: Request, res: Response): void => {
	const ref = req.get("Referrer") || req.get("Referer");
	if (ref) {
		res.redirect(ref);
		return;
	}
	// Fallback khi không có referrer: quay về trang chủ client.
	res.redirect("/");
};


export const getRegister = async (_req: Request, res: Response): Promise<void> => {
	res.render("client/pages/register/index", { pageTitle: "Đăng ký" });
};

export const postRegister = async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as RegisterBody;
		const name = String(body.name ?? "").trim();
		const email = String(body.email ?? "").trim().toLowerCase();
		const password = String(body.password ?? "").trim();
		const confirmPassword = String(body.confirmPassword ?? "").trim();

		// Validate
		const valid =
			!!name &&
			!!email &&
			isValidEmail(email) &&
			!!password &&
			password.length >= 6 &&
			!!confirmPassword &&
			confirmPassword === password;

		if (!valid) {
			req.session.toast = {
				type: "error",
				message: "Thông tin không hợp lệ!",
			};
			redirectBack(req, res);
			return;
		}

		const exists = await AuthService.findUserByEmail(email);
		if (exists) {
			req.session.toast = {
				type: "error",
				message: "Email đã tồn tại!",
			};
			redirectBack(req, res);
			return;
		}

		// Hash password (never store raw password)
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		// Generate token for cookie + save into DB
		const token = generateToken(32);
		// token is hex string of randomBytes(32) => length >= 64
		if (token.length < 32) {
			throw new Error("Generated token is too short");
		}

		// Create user (token is not empty)
		await AuthService.createUser({ name, email, password: hashedPassword, token });

		res.cookie("token", token, {
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		req.session.toast = {
			type: "success",
			message: "Đăng ký thành công 😎",
		};

		// Redirect về trang chủ client sau đăng ký thành công.
		res.redirect("/");
	} catch (error) {
		console.error("postRegister error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

// Login (hiện chỉ stub; route vẫn tồn tại)
export const getLogin = async (_req: Request, res: Response): Promise<void> => {
	// Render trang login
	res.render("client/pages/login/index");
};

export const postLogin = async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as LoginBody;

		// Security: trim + lowercase email; never log password
		const email = String(body.email ?? "").trim().toLowerCase();
		const password = String(body.password ?? "").trim();

		// Validate
		if (!email || !password) {
			req.session.toast = { type: "error", message: "Email và mật khẩu là bắt buộc" };
			redirectBack(req, res);
			return;
		}

		if (!isValidEmail(email)) {
			req.session.toast = { type: "error", message: "Email không hợp lệ" };
			redirectBack(req, res);
			return;
		}

		// Find user
		const user = await AuthService.findUserByEmail(email);
		if (!user) {
			req.session.toast = { type: "error", message: "Email không tồn tại" };
			redirectBack(req, res);
			return;
		}

		// Compare password (bcrypt.compare is async and safe)
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			req.session.toast = { type: "error", message: "Sai mật khẩu" };
			redirectBack(req, res);
			return;
		}

		// Generate & persist token
		const token = generateToken(32);
		if (token.length < 32) {
			throw new Error("Generated token is too short");
		}
		await AuthService.updateUserTokenByEmail(email, token);

		// Set cookie token
		res.cookie("token", token, {
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		req.session.toast = {
			type: "success",
			message: "Đăng nhập thành công 😎",
		};

		// Redirect to home after login
		res.redirect("/home");
	} catch (error) {
		console.error("postLogin error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export const getForgotPassword = async (req: Request, res: Response): Promise<void> => {
	try {
		res.render("client/pages/forgot-password/index", { pageTitle: "Quên mật khẩu" });
	} catch (error) {
		console.error("getForgotPassword error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export const postForgotPassword = async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as ForgotPasswordBody;
		const email = String(body.email ?? "").trim().toLowerCase();

		if (!email) {
			req.session.toast = { type: "error", message: "Email là bắt buộc" };
			redirectBack(req, res);
			return;
		}

		if (!isValidEmail(email)) {
			req.session.toast = { type: "error", message: "Email không hợp lệ" };
			redirectBack(req, res);
			return;
		}

		const user = await AuthService.findUserByEmail(email);
		if (!user) {
			req.session.toast = { type: "error", message: "Email không tồn tại" };
			redirectBack(req, res);
			return;
		}

		// Generate OTP 6 digits theo yêu cầu
		const otp = String(Math.floor(100000 + Math.random() * 900000));
		const otpHash = await bcrypt.hash(otp, 10);
		const otpExpire = new Date(Date.now() + 5 * 60 * 1000);

		await AuthService.saveForgotPasswordOTP(email, otpHash, otpExpire);
		await sendOTP(email, otp);

		// Save reset context into session
		req.session.emailReset = email;
		req.session.isVerifiedOTP = false;
		req.session.otpFailCount = 0;

		req.session.toast = {
			type: "success",
			message: "OTP đã được gửi về email 📩",
		};

		res.redirect("/auth/verify-otp");
	} catch (error) {
		console.error("postForgotPassword error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export const getVerifyOTP = async (req: Request, res: Response): Promise<void> => {
	try {
		if (!req.session.emailReset) {
			req.session.toast = {
				type: "error",
				message: "Vui lòng nhập email trước khi xác thực OTP",
			};
			res.redirect("/auth/forgot-password");
			return;
		}

		res.render("client/pages/verify-otp/index", { pageTitle: "Xác thực OTP" });
	} catch (error) {
		console.error("getVerifyOTP error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export const postVerifyOTP = async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as VerifyOTPBody;
		const otpInput = String(body.otp ?? "").trim();
		const email = req.session.emailReset?.trim().toLowerCase();

		if (!email) {
			req.session.toast = { type: "error", message: "Phiên xác thực không hợp lệ. Vui lòng thử lại." };
			res.redirect("/auth/forgot-password");
			return;
		}

		if (!otpInput || !/^\d{6}$/.test(otpInput)) {
			req.session.toast = { type: "error", message: "OTP phải gồm 6 chữ số" };
			redirectBack(req, res);
			return;
		}

		// Bonus: simple brute-force guard by session
		const failCount = req.session.otpFailCount ?? 0;
		if (failCount >= 5) {
			req.session.toast = { type: "error", message: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới." };
			res.redirect("/auth/forgot-password");
			return;
		}

		const forgotPasswordDoc = await AuthService.findForgotPasswordByEmail(email);
		if (!forgotPasswordDoc || !forgotPasswordDoc.otp || !forgotPasswordDoc.expiresAt) {
			req.session.toast = { type: "error", message: "OTP không hợp lệ hoặc chưa được tạo" };
			redirectBack(req, res);
			return;
		}

		if (new Date(forgotPasswordDoc.expiresAt).getTime() < Date.now()) {
			req.session.toast = { type: "error", message: "OTP đã hết hạn. Vui lòng yêu cầu mã mới." };
			res.redirect("/auth/forgot-password");
			return;
		}

		const isMatch = await bcrypt.compare(otpInput, forgotPasswordDoc.otp);
		if (!isMatch) {
			req.session.otpFailCount = failCount + 1;
			req.session.toast = { type: "error", message: "OTP không chính xác" };
			redirectBack(req, res);
			return;
		}

		req.session.isVerifiedOTP = true;
		req.session.otpFailCount = 0;

		// Tạo reset token có hiệu lực 5 phút và lưu DB
		const resetToken = generateToken(32);
		const resetTokenExpire = new Date(Date.now() + 5 * 60 * 1000);
		await AuthService.saveResetTokenByEmail(email, resetToken, resetTokenExpire);

		req.session.toast = {
			type: "success",
			message: "Xác thực OTP thành công ✅",
		};

		
		res.render("client/pages/reset-password/index", {
			pageTitle: "Đặt lại mật khẩu",
			resetToken,
		});
	} catch (error) {
		console.error("postVerifyOTP error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export const getResetPassword = async (req: Request, res: Response): Promise<void> => {
	try {
		const token = String(req.query.token ?? "").trim();
		res.render("client/pages/reset-password/index", {
			pageTitle: "Đặt lại mật khẩu",
			resetToken: token,
		});
	} catch (error) {
		console.error("getResetPassword error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export const postResetPassword = async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as ResetPasswordBody;
		const resetToken = String(body.resetToken ?? "").trim();
		const password = String(body.password ?? "").trim();
		const confirmPassword = String(body.confirmPassword ?? "").trim();

		if (!resetToken || !password || !confirmPassword) {
			req.session.toast = {
				type: "error",
				message: "Vui lòng nhập đầy đủ thông tin",
			};
			redirectBack(req, res);
			return;
		}

		if (password.length < 6) {
			req.session.toast = {
				type: "error",
				message: "Mật khẩu phải có ít nhất 6 ký tự",
			};
			redirectBack(req, res);
			return;
		}

		if (password !== confirmPassword) {
			req.session.toast = {
				type: "error",
				message: "Mật khẩu xác nhận không khớp",
			};
			redirectBack(req, res);
			return;
		}

		const forgotPasswordDoc = await AuthService.findForgotPasswordByResetToken(resetToken);
		if (!forgotPasswordDoc || !forgotPasswordDoc.email) {
			req.session.toast = {
				type: "error",
				message: "Reset token không hợp lệ hoặc đã hết hạn",
			};
			redirectBack(req, res);
			return;
		}

		const user = await AuthService.findUserByEmail(forgotPasswordDoc.email);
		if (!user) {
			req.session.toast = {
				type: "error",
				message: "Tài khoản không tồn tại",
			};
			redirectBack(req, res);
			return;
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		await AuthService.updateUserPasswordByEmail(forgotPasswordDoc.email, hashedPassword);
		const loginToken = generateToken(32);
		await AuthService.updateUserTokenByEmail(forgotPasswordDoc.email, loginToken);
		await AuthService.clearForgotPasswordByEmail(forgotPasswordDoc.email);

		req.session.isVerifiedOTP = false;
		req.session.emailReset = undefined;
		res.cookie("token", loginToken, {
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});
		req.session.toast = {
			type: "success",
			message: "Đặt lại mật khẩu thành công, bạn đã đăng nhập 🎉",
		};

		// if (req.accepts("json")) {
		// 	res.status(200).json({ message: "Đặt lại mật khẩu thành công" });
		// 	return;
		// }

		res.redirect("/home");
	} catch (error) {
		console.error("postResetPassword error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export const postLogout = async (req: Request, res: Response): Promise<void> => {
	try {
		const token = String(req.cookies?.token ?? "").trim();

		if (token) {
			await AuthService.clearUserTokenByToken(token);
		}

		res.clearCookie("token");
		req.session.toast = {
			type: "success",
			message: "Đăng xuất thành công",
		};
		res.redirect("/home");
	} catch (error) {
		console.error("postLogout error:", error);
		req.session.toast = {
			type: "error",
			message: "Lỗi hệ thống. Vui lòng thử lại.",
		};
		redirectBack(req, res);
	}
};

export default {
	getRegister,
	postRegister,
	getLogin,
	postLogin,
	getForgotPassword,
	postForgotPassword,
	getVerifyOTP,
	postVerifyOTP,
	getResetPassword,
	postResetPassword,
	postLogout,
};