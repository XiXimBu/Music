import mongoose from "mongoose";
import generateHelper from "../helpers/generate.helper";

export interface IForgotPassword {
  email: string;
  otp?: string;
  expiresAt: Date;
  resetTokenExpire?: Date;
  createdAt: Date;
  updatedAt: Date;
  resetToken?: string;
}

const forgotPasswordSchema = new mongoose.Schema<IForgotPassword>(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    resetToken: { 
      type: String,
      default: () => {
        return generateHelper.generateToken(32); // 32 bytes = 64 hex chars
      } 
    },
    resetTokenExpire: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL index: documents will be removed once `expiresAt` is reached
forgotPasswordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ForgotPassword = mongoose.model<IForgotPassword>("ForgotPassword", forgotPasswordSchema, "forgot-password");

export default ForgotPassword;
