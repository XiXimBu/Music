import { Request, Response, NextFunction } from "express";

// Validation middlewares for auth routes (register, login)
// Each function is Express middleware: (req, res, next)
export const isValidEmail = (email: string): boolean => {
	// Simple RFC-ish email regex
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { fullName, email, password } = (req.body || {}) as { fullName?: string; email?: string; password?: string };

  if (!email || typeof email !== "string" || !email.trim()) {
    res.status(400).json({ message: "Email là trường bắt buộc" });
    return;
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    return;
  }

  // optional: trim fields
  req.body.email = String(email).trim().toLowerCase();
  if (typeof fullName === "string") req.body.fullName = fullName.trim();

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: "Email và mật khẩu là bắt buộc" });
    return;
  }

  req.body.email = String(email).trim().toLowerCase();
  next();
};
