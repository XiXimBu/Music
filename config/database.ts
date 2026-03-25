import mongoose from 'mongoose';

// Biến toàn cục để lưu trạng thái kết nối
let isConnected = false; 

export const connect = async (): Promise<void> => {
  // Nếu đã kết nối rồi thì thoát luôn, không làm gì cả
  if (isConnected) {
    return;
  }

  const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI) as string | undefined;
  
  if (!uri) {
    console.error('MongoDB URI is missing!');
    return;
  }

  try {
    // Cấu hình để Mongoose không log linh tinh và tối ưu kết nối
    const options = {
      autoIndex: true, // Tự động tạo index từ Schema (tốt cho dev)
      connectTimeoutMS: 10000, // Timeout sau 10s nếu mạng quá lởm
    };

    await mongoose.connect(uri, options);
    
    isConnected = true; // Đánh dấu đã kết nối thành công
    console.log('Connected to MongoDB');
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    // Không set isConnected = true để lần sau nó còn thử lại
  }
};