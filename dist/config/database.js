"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let connectPromise = null;
let configured = false;
const connect = async () => {
    const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI);
    if (!uri) {
        throw new Error("MongoDB URI is missing! Set MONGOOSE_URL or MONGO_URI.");
    }
    if (!configured) {
        mongoose_1.default.set("bufferCommands", false);
        mongoose_1.default.set("bufferTimeoutMS", 0);
        configured = true;
    }
    if (mongoose_1.default.connection.readyState === 1)
        return mongoose_1.default;
    if (!connectPromise) {
        const options = {
            autoIndex: process.env.NODE_ENV !== "production",
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5_000,
            connectTimeoutMS: 10_000,
        };
        connectPromise = mongoose_1.default.connect(uri, options).catch((err) => {
            connectPromise = null;
            throw err;
        });
    }
    return await connectPromise;
};
exports.connect = connect;
