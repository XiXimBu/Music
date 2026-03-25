"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
let isConnected = false;
const connect = async () => {
    if (isConnected) {
        return;
    }
    const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI);
    if (!uri) {
        console.error('MongoDB URI is missing!');
        return;
    }
    try {
        const options = {
            autoIndex: true,
            connectTimeoutMS: 10000,
        };
        await mongoose_1.default.connect(uri, options);
        isConnected = true;
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
};
exports.connect = connect;
