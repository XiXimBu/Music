import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Dùng cho trường hợp chỉ có 1 ảnh (ví dụ: Avatar Artist, Cover Album)
export const uploadSingleImage = (fieldName: string) => upload.single(fieldName);

// Dùng cho trường hợp có nhiều loại file (ví dụ: Song = thumbnail + audio)
export const uploadSongFiles = upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "audio", maxCount: 1 },
]);

