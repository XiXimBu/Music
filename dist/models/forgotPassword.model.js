"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const generate_helper_1 = __importDefault(require("../helpers/generate.helper"));
const forgotPasswordSchema = new mongoose_1.default.Schema({
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    resetToken: {
        type: String,
        default: () => {
            return generate_helper_1.default.generateToken(32);
        }
    },
    resetTokenExpire: { type: Date, default: null },
}, { timestamps: true });
forgotPasswordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const ForgotPassword = mongoose_1.default.model("ForgotPassword", forgotPasswordSchema, "forgot-password");
exports.default = ForgotPassword;
