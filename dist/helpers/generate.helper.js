"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLength = void 0;
exports.generateOTP = generateOTP;
exports.generateToken = generateToken;
const crypto_1 = __importDefault(require("crypto"));
const normalizeLength = (value, fallback = 6, minimum = 1) => {
    if (!Number.isFinite(value))
        return fallback;
    return Math.max(minimum, Math.floor(value));
};
exports.normalizeLength = normalizeLength;
function generateOTP(len = 6) {
    const length = (0, exports.normalizeLength)(len, 6, 1);
    const bytes = crypto_1.default.randomBytes(length);
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += String(bytes[i] % 10);
    }
    return otp;
}
function generateToken(bytesLength = 32) {
    const length = (0, exports.normalizeLength)(bytesLength, 32, 1);
    return crypto_1.default.randomBytes(length).toString("hex");
}
exports.default = { generateOTP, normalizeLength: exports.normalizeLength, generateToken };
