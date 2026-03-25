"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let connectPromise = null;
const connect = async () => {
    const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI);
    if (!uri) {
        throw new Error("MongoDB URI is missing! Set MONGOOSE_URL or MONGO_URI.");
    }
    if (mongoose_1.default.connection.readyState === 1)
        return mongoose_1.default;
    if (!connectPromise) {
        const options = {
            autoIndex: process.env.NODE_ENV !== "production",
            connectTimeoutMS: 10_000,
            serverSelectionTimeoutMS: 10_000,
            maxPoolSize: 10,
        };
        connectPromise = mongoose_1.default.connect(uri, options).catch((err) => {
            connectPromise = null;
            throw err;
        });
    }
    return await connectPromise;
};
exports.connect = connect;
