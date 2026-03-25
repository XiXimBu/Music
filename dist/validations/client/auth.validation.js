"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLogin = exports.validateRegister = exports.isValidEmail = void 0;
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
exports.isValidEmail = isValidEmail;
const validateRegister = (req, res, next) => {
    const { fullName, email, password } = (req.body || {});
    if (!email || typeof email !== "string" || !email.trim()) {
        res.status(400).json({ message: "Email là trường bắt buộc" });
        return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
        res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
        return;
    }
    req.body.email = String(email).trim().toLowerCase();
    if (typeof fullName === "string")
        req.body.fullName = fullName.trim();
    next();
};
exports.validateRegister = validateRegister;
const validateLogin = (req, res, next) => {
    const { email, password } = (req.body || {});
    if (!email || !password) {
        res.status(400).json({ message: "Email và mật khẩu là bắt buộc" });
        return;
    }
    req.body.email = String(email).trim().toLowerCase();
    next();
};
exports.validateLogin = validateLogin;
