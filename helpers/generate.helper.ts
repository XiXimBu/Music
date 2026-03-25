import crypto from "crypto";

/**
 * Ensure provided length is a finite integer within allowed bounds.
 */
export const normalizeLength = (value: number, fallback = 6, minimum = 1): number => {
	if (!Number.isFinite(value)) return fallback;
	return Math.max(minimum, Math.floor(value));
};

/**
 * Generate a secure numeric OTP of given length.
 * Uses crypto.randomBytes and maps each byte to 0-9.
 */
export function generateOTP(len = 6): string {
	const length = normalizeLength(len, 6, 1);
	const bytes = crypto.randomBytes(length);
	let otp = "";
	for (let i = 0; i < length; i++) {
		otp += String(bytes[i] % 10);
	}
	return otp;
}

/**
 * Generate a secure random token string.
 * Default length is 32 bytes (=> 64 hex chars). Use smaller values if needed.
 */
export function generateToken(bytesLength = 32): string {
	const length = normalizeLength(bytesLength, 32, 1);
	return crypto.randomBytes(length).toString("hex");
}

export default { generateOTP, normalizeLength, generateToken };