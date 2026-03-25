import { v2 as cloudinary } from 'cloudinary';

// Cấu hình cho tài khoản lưu Ảnh
const cloudinaryImage = cloudinary;
cloudinaryImage.config({ 
  cloud_name: process.env.IMG_CLOUD_NAME, 
  api_key: process.env.IMG_API_KEY, 
  api_secret: process.env.IMG_API_SECRET 
});

// Cấu hình cho tài khoản lưu Nhạc 
const cloudinaryMusic = require('cloudinary').v2; 
cloudinaryMusic.config({ 
  cloud_name: process.env.MUSIC_CLOUD_NAME, 
  api_key: process.env.MUSIC_API_KEY, 
  api_secret: process.env.MUSIC_API_SECRET 
});

export { cloudinaryImage, cloudinaryMusic };