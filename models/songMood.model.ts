import { Document, Schema, model, Types } from "mongoose";

/**
 * Interface cho SongMood
 */
export interface ISongMood extends Document {
  songId: Types.ObjectId;
  mood: string; // 'sad', 'happy', 'chill', 'focus', 'in-love'...
  createdAt: Date;
  updatedAt: Date;
}

const songMoodSchema = new Schema<ISongMood>(
  {
    songId: { 
      type: Schema.Types.ObjectId, 
      ref: "Song", 
      required: true 
    },
    mood: { 
      type: String, 
      required: true,
      lowercase: true, // Tự động chuyển về chữ thường để tránh 'Sad' vs 'sad'
      trim: true 
    },
  },
  { timestamps: true }
);

/**
 * ĐÁNH INDEX TỐI ƯU
 */

// 1. Query: Tìm tất cả các mood của 1 bài hát (Ví dụ: Bài này vừa 'sad' vừa 'chill')
songMoodSchema.index({ songId: 1 });

// 2. Query: Lấy tất cả bài hát thuộc 1 tâm trạng (Phục vụ tính năng Đề xuất)
// Sắp xếp theo mood trước, sau đó là songId
songMoodSchema.index({ mood: 1, songId: 1 });

// 3. Ràng buộc: Một bài hát không nên bị trùng lặp 1 nhãn mood nhiều lần
// Ví dụ: Không thể có 2 bản ghi đều là { bài_A, mood: 'sad' }
songMoodSchema.index({ songId: 1, mood: 1 }, { unique: true });

export const SongMood = model<ISongMood>("SongMood", songMoodSchema, "song_moods");

export default SongMood;