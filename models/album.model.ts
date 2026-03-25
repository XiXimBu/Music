import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAlbum extends Document {
  title: string;
  thumbnail: string;
  artist: Types.ObjectId; 
  slug?: string;
  releaseDate?: Date;
  deleted: boolean;
  status?: string;
}

const albumSchema = new Schema<IAlbum>(
  {
    title: { type: String, required: true },
    thumbnail: { type: String, required: true },
    
    // 1. Index đơn cho Artist: Cực kỳ quan trọng để lấy album theo ca sĩ
    artist: { 
      type: Schema.Types.ObjectId, 
      ref: "Artist", 
      required: true, 
      index: true 
    },

    // Slug đã có unique: true nên Mongoose tự tạo index rồi, không cần thêm.
    slug: { type: String, unique: true },

    // 2. Index cho các trường lọc (Filter)
    status: { 
      type: String, 
      enum: ["active", "inactive"], 
      default: "active", 
      index: true 
    },
    deleted: { type: Boolean, default: false, index: true },

    // 3. Index cho ngày phát hành để Sort (Mới nhất lên đầu)
    releaseDate: { type: Date, index: true },
  },
  { timestamps: true }
);


albumSchema.index({ artist: 1, status: 1, deleted: 1, releaseDate: -1 });

const Album = mongoose.model<IAlbum>("Album", albumSchema, "albums");

export default Album;