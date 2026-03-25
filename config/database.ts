import mongoose from 'mongoose';

// Sử dụng kiểu dữ liệu để quản lý cache kết nối
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Lưu trữ kết nối vào biến global để không bị khởi tạo lại khi serverless "vừa ngủ dậy"
let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connect = async (): Promise<void> => {
  const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI) as string | undefined;

  if (!uri) {
    console.error('MongoDB URI is missing!');
    return;
  }

  // 1. Nếu đã có kết nối sẵn, dùng luôn
  if (cached.conn) {
    return;
  }

  // 2. Nếu đang có một tiến trình kết nối đang chạy, đợi tiến trình đó
  if (!cached.promise) {
    const options = {
      autoIndex: true,
      // Tăng thời gian chờ lên để tránh lỗi Socket Timeout khi mạng chậm
      serverSelectionTimeoutMS: 20000, // Đợi 20s để chọn server
      connectTimeoutMS: 20000,         // Đợi 20s để thiết lập kết nối ban đầu
      socketTimeoutMS: 45000,          // Giữ socket sống lâu hơn cho các query nặng
    };

    console.log('Đang thiết lập kết nối mới tới MongoDB...');
    cached.promise = mongoose.connect(uri, options).then((m) => {
      console.log('Kết nối MongoDB thành công!');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null; // Reset promise nếu lỗi để lần sau có thể thử lại
    console.error('Lỗi kết nối MongoDB:', error);
    throw error; 
  }
};