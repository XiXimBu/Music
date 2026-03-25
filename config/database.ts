import mongoose from "mongoose";

/**
 * Serverless-safe Mongoose connection cache.
 * - Vercel functions có thể cold start liên tục → cần reuse connection/promise nếu có.
 * - Mọi query phải chạy sau khi `await connect()` hoàn tất để tránh buffering timeout.
 */

let connectPromise: Promise<typeof mongoose> | null = null;
let configured = false;

export const connect = async (): Promise<typeof mongoose> => {
	const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI) as string | undefined;
	if (!uri) {
		throw new Error("MongoDB URI is missing! Set MONGOOSE_URL or MONGO_URI.");
	}

	// Cấu hình mongoose 1 lần cho toàn app (trước khi query/connect).
	// Tắt buffering để nếu chưa connect thì fail-fast (tránh treo 10s trên serverless).
	if (!configured) {
		mongoose.set("bufferCommands", false);
		// 0ms: không chờ buffering; lỗi ngay để handler có thể retry/return sớm
		mongoose.set("bufferTimeoutMS", 0);
		configured = true;
	}

	// Nếu đã connected thì trả về ngay (no round-trip).
	if (mongoose.connection.readyState === 1) return mongoose;

	// Nếu đang connect dở, reuse promise để tránh mở nhiều connection song song.
	if (!connectPromise) {
		const options = {
			autoIndex: process.env.NODE_ENV !== "production",
			// Mở rộng pool để chịu được Promise.all nhiều query lúc cold start
			maxPoolSize: 10,
			// Timeout chọn server nhanh hơn để tránh “kẹt 10s”
			serverSelectionTimeoutMS: 5_000,
			connectTimeoutMS: 10_000,
		};

		connectPromise = mongoose.connect(uri, options).catch((err) => {
			// Nếu connect fail, reset promise để request sau còn retry.
			connectPromise = null;
			throw err;
		});
	}

	return await connectPromise;
};