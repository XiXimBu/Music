import mongoose from "mongoose";

/**
 * Serverless-safe Mongoose connection cache.
 * - Vercel functions có thể cold start liên tục → cần reuse connection/promise nếu có.
 * - Mọi query phải chạy sau khi `await connect()` hoàn tất để tránh buffering timeout.
 */

let connectPromise: Promise<typeof mongoose> | null = null;

export const connect = async (): Promise<typeof mongoose> => {
	const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI) as string | undefined;
	if (!uri) {
		throw new Error("MongoDB URI is missing! Set MONGOOSE_URL or MONGO_URI.");
	}

	// Nếu đã connected thì trả về ngay (no round-trip).
	if (mongoose.connection.readyState === 1) return mongoose;

	// Nếu đang connect dở, reuse promise để tránh mở nhiều connection song song.
	if (!connectPromise) {
		const options = {
			autoIndex: process.env.NODE_ENV !== "production",
			connectTimeoutMS: 10_000,
			serverSelectionTimeoutMS: 10_000,
			maxPoolSize: 10,
		};

		connectPromise = mongoose.connect(uri, options).catch((err) => {
			// Nếu connect fail, reset promise để request sau còn retry.
			connectPromise = null;
			throw err;
		});
	}

	return await connectPromise;
};