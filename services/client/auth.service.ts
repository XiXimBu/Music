import type { IUser } from "../../models/user.model";
import { User } from "../../models/user.model";
import ForgotPassword, { type IForgotPassword } from "../../models/forgotPassword.model";

export type CreateUserInput = {
	name: string;
	email: string;
	password: string; // already hashed
	token: string;
};

/**
 * Create new user document (password must already be hashed).
 */
export const createUser = async ({ name, email, password, token }: CreateUserInput): Promise<IUser> => {
	// Model field is `fullName`, but controller spec uses `name`.
	const doc = await User.create({
		fullName: name,
		email,
		password,
		createdAt: new Date(),
		token,
		avatar: "",
		deleted: false,
		status: "active",
	});

	return doc as IUser;
};

/**
 * Find a non-deleted user by email.
 * @returns user document or null
 */
export const findUserByEmail = async (email: string): Promise<IUser | null> => {
	return User.findOne({ email, deleted: false }).exec();
};

/**
 * Persist login token to the user's document.
 */
export const updateUserTokenByEmail = async (email: string, token: string): Promise<void> => {
	await User.updateOne({ email, deleted: false }, { $set: { token } }).exec();
};

/**
 * Save OTP into forgot-password collection (upsert by email).
 */
export const saveForgotPasswordOTP = async (
	email: string,
	otpHash: string,
	expiresAt: Date
): Promise<IForgotPassword> => {
	return ForgotPassword.findOneAndUpdate(
		{ email },
		{ $set: { email, otp: otpHash, expiresAt } },
		{ new: true, upsert: true, setDefaultsOnInsert: true }
	).exec() as Promise<IForgotPassword>;
};

/**
 * Get latest forgot-password OTP document by email.
 */
export const findForgotPasswordByEmail = async (email: string): Promise<IForgotPassword | null> => {
	return ForgotPassword.findOne({ email }).sort({ createdAt: -1 }).exec() as Promise<IForgotPassword | null>;
};

/**
 * Remove forgot-password OTP documents for email.
 */
export const clearForgotPasswordByEmail = async (email: string): Promise<void> => {
	await ForgotPassword.deleteMany({ email }).exec();
};

/**
 * Store reset token after OTP verification.
 */
export const saveResetTokenByEmail = async (
	email: string,
	resetToken: string,
	resetTokenExpire: Date
): Promise<void> => {
	await ForgotPassword.findOneAndUpdate(
		{ email },
		{
			$set: {
				resetToken,
				resetTokenExpire,
				otp: "",
				expiresAt: resetTokenExpire,
			},
		},
		{ new: true }
	).exec();
};

/**
 * Find forgot-password record by reset token (not expired).
 */
export const findForgotPasswordByResetToken = async (resetToken: string): Promise<IForgotPassword | null> => {
	return ForgotPassword.findOne({
		resetToken,
		resetTokenExpire: { $gt: new Date() },
	}).exec() as Promise<IForgotPassword | null>;
};

/**
 * Update user password by email (hashed password).
 */
export const updateUserPasswordByEmail = async (email: string, hashedPassword: string): Promise<void> => {
	await User.updateOne({ email, deleted: false }, { $set: { password: hashedPassword } }).exec();
};

export const clearUserTokenByToken = async (token: string): Promise<void> => {
	await User.updateOne({ token, deleted: false }, { $set: { token: "" } }).exec();
};

export default {
	createUser,
	findUserByEmail,
	updateUserTokenByEmail,
	saveForgotPasswordOTP,
	findForgotPasswordByEmail,
	clearForgotPasswordByEmail,
	saveResetTokenByEmail,
	findForgotPasswordByResetToken,
	updateUserPasswordByEmail,
	clearUserTokenByToken,
};