"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTP = sendOTP;
const nodemailer_1 = __importDefault(require("nodemailer"));
async function sendOTP(to, otp) {
    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS) || 300;
    const ttlMinutes = Math.ceil(ttlSeconds / 60);
    const subject = "Mã OTP đặt lại mật khẩu - MUSIC XI";
    const text = `Mã OTP của bạn là ${otp}. Hiệu lực trong ${ttlMinutes} phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`;
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
      <h2 style="color: #111; margin:0 0 8px 0">GLMen Store</h2>
      <p style="margin:8px 0">Mã xác thực (OTP) của bạn là:</p>
      <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 6px; margin:12px 0">
        ${otp}
      </div>
      <p style="font-size: 13px; color: #666; margin:8px 0">Mã này có hiệu lực trong ${ttlMinutes} phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
    </div>
  `;
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpFrom = process.env.SMTP_FROM?.trim();
    const smtpSecure = (process.env.SMTP_SECURE ?? "").toLowerCase() === "true";
    if (!smtpHost || !smtpUser || !smtpPass) {
        throw new Error("Missing SMTP config (SMTP_HOST/SMTP_USER/SMTP_PASS).");
    }
    const transporter = nodemailer_1.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });
    await transporter.sendMail({
        from: smtpFrom || smtpUser,
        to,
        subject,
        text,
        html,
    });
}
exports.default = { sendOTP };
