"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
const connect = async () => {
    const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI);
    if (!uri) {
        console.error('MongoDB URI is missing!');
        return;
    }
    if (cached.conn) {
        return;
    }
    if (!cached.promise) {
        const options = {
            autoIndex: true,
            serverSelectionTimeoutMS: 20000,
            connectTimeoutMS: 20000,
            socketTimeoutMS: 45000,
        };
        console.log('Đang thiết lập kết nối mới tới MongoDB...');
        cached.promise = mongoose_1.default.connect(uri, options).then((m) => {
            console.log('Kết nối MongoDB thành công!');
            return m;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (error) {
        cached.promise = null;
        console.error('Lỗi kết nối MongoDB:', error);
        throw error;
    }
};
exports.connect = connect;
