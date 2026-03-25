"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postLogout = exports.postResetPassword = exports.getResetPassword = exports.postVerifyOTP = exports.getVerifyOTP = exports.postForgotPassword = exports.getForgotPassword = exports.postLogin = exports.getLogin = exports.postRegister = exports.getRegister = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_validation_1 = require("../../validations/client/auth.validation");
const auth_service_1 = __importDefault(require("../../services/client/auth.service"));
const generate_helper_1 = require("../../helpers/generate.helper");
const otp_mail_helper_1 = require("../../helpers/otp-mail.helper");
const redirectBack = (req, res) => {
    const ref = req.get("Referrer") || req.get("Referer");
    if (ref) {
        res.redirect(ref);
        return;
    }
    res.redirect("/");
};
const getRegister = async (_req, res) => {
    res.render("client/pages/register/index", { pageTitle: "Đăng ký" });
};
exports.getRegister = getRegister;
const postRegister = async (req, res) => {
    try {
        const body = req.body;
        const name = String(body.name ?? "").trim();
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "").trim();
        const confirmPassword = String(body.confirmPassword ?? "").trim();
        const valid = !!name &&
            !!email &&
            (0, auth_validation_1.isValidEmail)(email) &&
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
        const exists = await auth_service_1.default.findUserByEmail(email);
        if (exists) {
            req.session.toast = {
                type: "error",
                message: "Email đã tồn tại!",
            };
            redirectBack(req, res);
            return;
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        const token = (0, generate_helper_1.generateToken)(32);
        if (token.length < 32) {
            throw new Error("Generated token is too short");
        }
        await auth_service_1.default.createUser({ name, email, password: hashedPassword, token });
        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        req.session.toast = {
            type: "success",
            message: "Đăng ký thành công 😎",
        };
        res.redirect("/");
    }
    catch (error) {
        console.error("postRegister error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.postRegister = postRegister;
const getLogin = async (_req, res) => {
    res.render("client/pages/login/index");
};
exports.getLogin = getLogin;
const postLogin = async (req, res) => {
    try {
        const body = req.body;
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "").trim();
        if (!email || !password) {
            req.session.toast = { type: "error", message: "Email và mật khẩu là bắt buộc" };
            redirectBack(req, res);
            return;
        }
        if (!(0, auth_validation_1.isValidEmail)(email)) {
            req.session.toast = { type: "error", message: "Email không hợp lệ" };
            redirectBack(req, res);
            return;
        }
        const user = await auth_service_1.default.findUserByEmail(email);
        if (!user) {
            req.session.toast = { type: "error", message: "Email không tồn tại" };
            redirectBack(req, res);
            return;
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            req.session.toast = { type: "error", message: "Sai mật khẩu" };
            redirectBack(req, res);
            return;
        }
        const token = (0, generate_helper_1.generateToken)(32);
        if (token.length < 32) {
            throw new Error("Generated token is too short");
        }
        await auth_service_1.default.updateUserTokenByEmail(email, token);
        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        req.session.toast = {
            type: "success",
            message: "Đăng nhập thành công 😎",
        };
        res.redirect("/home");
    }
    catch (error) {
        console.error("postLogin error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.postLogin = postLogin;
const getForgotPassword = async (req, res) => {
    try {
        res.render("client/pages/forgot-password/index", { pageTitle: "Quên mật khẩu" });
    }
    catch (error) {
        console.error("getForgotPassword error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.getForgotPassword = getForgotPassword;
const postForgotPassword = async (req, res) => {
    try {
        const body = req.body;
        const email = String(body.email ?? "").trim().toLowerCase();
        if (!email) {
            req.session.toast = { type: "error", message: "Email là bắt buộc" };
            redirectBack(req, res);
            return;
        }
        if (!(0, auth_validation_1.isValidEmail)(email)) {
            req.session.toast = { type: "error", message: "Email không hợp lệ" };
            redirectBack(req, res);
            return;
        }
        const user = await auth_service_1.default.findUserByEmail(email);
        if (!user) {
            req.session.toast = { type: "error", message: "Email không tồn tại" };
            redirectBack(req, res);
            return;
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await bcrypt_1.default.hash(otp, 10);
        const otpExpire = new Date(Date.now() + 5 * 60 * 1000);
        await auth_service_1.default.saveForgotPasswordOTP(email, otpHash, otpExpire);
        await (0, otp_mail_helper_1.sendOTP)(email, otp);
        req.session.emailReset = email;
        req.session.isVerifiedOTP = false;
        req.session.otpFailCount = 0;
        req.session.toast = {
            type: "success",
            message: "OTP đã được gửi về email 📩",
        };
        res.redirect("/auth/verify-otp");
    }
    catch (error) {
        console.error("postForgotPassword error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.postForgotPassword = postForgotPassword;
const getVerifyOTP = async (req, res) => {
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
    }
    catch (error) {
        console.error("getVerifyOTP error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.getVerifyOTP = getVerifyOTP;
const postVerifyOTP = async (req, res) => {
    try {
        const body = req.body;
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
        const failCount = req.session.otpFailCount ?? 0;
        if (failCount >= 5) {
            req.session.toast = { type: "error", message: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới." };
            res.redirect("/auth/forgot-password");
            return;
        }
        const forgotPasswordDoc = await auth_service_1.default.findForgotPasswordByEmail(email);
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
        const isMatch = await bcrypt_1.default.compare(otpInput, forgotPasswordDoc.otp);
        if (!isMatch) {
            req.session.otpFailCount = failCount + 1;
            req.session.toast = { type: "error", message: "OTP không chính xác" };
            redirectBack(req, res);
            return;
        }
        req.session.isVerifiedOTP = true;
        req.session.otpFailCount = 0;
        const resetToken = (0, generate_helper_1.generateToken)(32);
        const resetTokenExpire = new Date(Date.now() + 5 * 60 * 1000);
        await auth_service_1.default.saveResetTokenByEmail(email, resetToken, resetTokenExpire);
        req.session.toast = {
            type: "success",
            message: "Xác thực OTP thành công ✅",
        };
        res.render("client/pages/reset-password/index", {
            pageTitle: "Đặt lại mật khẩu",
            resetToken,
        });
    }
    catch (error) {
        console.error("postVerifyOTP error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.postVerifyOTP = postVerifyOTP;
const getResetPassword = async (req, res) => {
    try {
        const token = String(req.query.token ?? "").trim();
        res.render("client/pages/reset-password/index", {
            pageTitle: "Đặt lại mật khẩu",
            resetToken: token,
        });
    }
    catch (error) {
        console.error("getResetPassword error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.getResetPassword = getResetPassword;
const postResetPassword = async (req, res) => {
    try {
        const body = req.body;
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
        const forgotPasswordDoc = await auth_service_1.default.findForgotPasswordByResetToken(resetToken);
        if (!forgotPasswordDoc || !forgotPasswordDoc.email) {
            req.session.toast = {
                type: "error",
                message: "Reset token không hợp lệ hoặc đã hết hạn",
            };
            redirectBack(req, res);
            return;
        }
        const user = await auth_service_1.default.findUserByEmail(forgotPasswordDoc.email);
        if (!user) {
            req.session.toast = {
                type: "error",
                message: "Tài khoản không tồn tại",
            };
            redirectBack(req, res);
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await auth_service_1.default.updateUserPasswordByEmail(forgotPasswordDoc.email, hashedPassword);
        const loginToken = (0, generate_helper_1.generateToken)(32);
        await auth_service_1.default.updateUserTokenByEmail(forgotPasswordDoc.email, loginToken);
        await auth_service_1.default.clearForgotPasswordByEmail(forgotPasswordDoc.email);
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
        res.redirect("/home");
    }
    catch (error) {
        console.error("postResetPassword error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.postResetPassword = postResetPassword;
const postLogout = async (req, res) => {
    try {
        const token = String(req.cookies?.token ?? "").trim();
        if (token) {
            await auth_service_1.default.clearUserTokenByToken(token);
        }
        res.clearCookie("token");
        req.session.toast = {
            type: "success",
            message: "Đăng xuất thành công",
        };
        res.redirect("/home");
    }
    catch (error) {
        console.error("postLogout error:", error);
        req.session.toast = {
            type: "error",
            message: "Lỗi hệ thống. Vui lòng thử lại.",
        };
        redirectBack(req, res);
    }
};
exports.postLogout = postLogout;
exports.default = {
    getRegister: exports.getRegister,
    postRegister: exports.postRegister,
    getLogin: exports.getLogin,
    postLogin: exports.postLogin,
    getForgotPassword: exports.getForgotPassword,
    postForgotPassword: exports.postForgotPassword,
    getVerifyOTP: exports.getVerifyOTP,
    postVerifyOTP: exports.postVerifyOTP,
    getResetPassword: exports.getResetPassword,
    postResetPassword: exports.postResetPassword,
    postLogout: exports.postLogout,
};
