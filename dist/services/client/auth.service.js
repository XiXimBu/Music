"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearUserTokenByToken = exports.updateUserPasswordByEmail = exports.findForgotPasswordByResetToken = exports.saveResetTokenByEmail = exports.clearForgotPasswordByEmail = exports.findForgotPasswordByEmail = exports.saveForgotPasswordOTP = exports.updateUserTokenByEmail = exports.findUserByEmail = exports.createUser = void 0;
const user_model_1 = require("../../models/user.model");
const forgotPassword_model_1 = __importDefault(require("../../models/forgotPassword.model"));
const createUser = async ({ name, email, password, token }) => {
    const doc = await user_model_1.User.create({
        fullName: name,
        email,
        password,
        createdAt: new Date(),
        token,
        avatar: "",
        deleted: false,
        status: "active",
    });
    return doc;
};
exports.createUser = createUser;
const findUserByEmail = async (email) => {
    return user_model_1.User.findOne({ email, deleted: false }).exec();
};
exports.findUserByEmail = findUserByEmail;
const updateUserTokenByEmail = async (email, token) => {
    await user_model_1.User.updateOne({ email, deleted: false }, { $set: { token } }).exec();
};
exports.updateUserTokenByEmail = updateUserTokenByEmail;
const saveForgotPasswordOTP = async (email, otpHash, expiresAt) => {
    return forgotPassword_model_1.default.findOneAndUpdate({ email }, { $set: { email, otp: otpHash, expiresAt } }, { new: true, upsert: true, setDefaultsOnInsert: true }).exec();
};
exports.saveForgotPasswordOTP = saveForgotPasswordOTP;
const findForgotPasswordByEmail = async (email) => {
    return forgotPassword_model_1.default.findOne({ email }).sort({ createdAt: -1 }).exec();
};
exports.findForgotPasswordByEmail = findForgotPasswordByEmail;
const clearForgotPasswordByEmail = async (email) => {
    await forgotPassword_model_1.default.deleteMany({ email }).exec();
};
exports.clearForgotPasswordByEmail = clearForgotPasswordByEmail;
const saveResetTokenByEmail = async (email, resetToken, resetTokenExpire) => {
    await forgotPassword_model_1.default.findOneAndUpdate({ email }, {
        $set: {
            resetToken,
            resetTokenExpire,
            otp: "",
            expiresAt: resetTokenExpire,
        },
    }, { new: true }).exec();
};
exports.saveResetTokenByEmail = saveResetTokenByEmail;
const findForgotPasswordByResetToken = async (resetToken) => {
    return forgotPassword_model_1.default.findOne({
        resetToken,
        resetTokenExpire: { $gt: new Date() },
    }).exec();
};
exports.findForgotPasswordByResetToken = findForgotPasswordByResetToken;
const updateUserPasswordByEmail = async (email, hashedPassword) => {
    await user_model_1.User.updateOne({ email, deleted: false }, { $set: { password: hashedPassword } }).exec();
};
exports.updateUserPasswordByEmail = updateUserPasswordByEmail;
const clearUserTokenByToken = async (token) => {
    await user_model_1.User.updateOne({ token, deleted: false }, { $set: { token: "" } }).exec();
};
exports.clearUserTokenByToken = clearUserTokenByToken;
exports.default = {
    createUser: exports.createUser,
    findUserByEmail: exports.findUserByEmail,
    updateUserTokenByEmail: exports.updateUserTokenByEmail,
    saveForgotPasswordOTP: exports.saveForgotPasswordOTP,
    findForgotPasswordByEmail: exports.findForgotPasswordByEmail,
    clearForgotPasswordByEmail: exports.clearForgotPasswordByEmail,
    saveResetTokenByEmail: exports.saveResetTokenByEmail,
    findForgotPasswordByResetToken: exports.findForgotPasswordByResetToken,
    updateUserPasswordByEmail: exports.updateUserPasswordByEmail,
    clearUserTokenByToken: exports.clearUserTokenByToken,
};
