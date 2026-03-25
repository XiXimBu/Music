import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISong extends Document {
  title: string;
  duration: number;
  audioUrl: string;
  coverImage?: string;
  artists: Types.ObjectId[];
  album?: Types.ObjectId;
  topics: Types.ObjectId[]; 
  status: string;
  deleted: boolean;
  views: number;
  likes: number;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const songSchema = new Schema<ISong>(
  {
    title: { type: String, required: true },
    duration: { type: Number, required: true },
    audioUrl: { type: String, required: true },
    coverImage: String,

    // Đánh index cho các trường dùng để FILTER (Lọc)
    artists: [{ type: Schema.Types.ObjectId, ref: "Artist" }],
    album: { type: Schema.Types.ObjectId, ref: "Album" },
    topics: [{ type: Schema.Types.ObjectId, ref: "Topic" }],

    slug: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deleted: { type: Boolean, default: false },
    
    // Đánh index cho các trường dùng để SORT (Sắp xếp)
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Query nóng:
// - Song.find({ deleted:false, status:"active", artists? }).sort({ views:-1 }).limit(10)
songSchema.index({ status: 1, deleted: 1, views: -1 });
songSchema.index({ artists: 1, status: 1, deleted: 1, views: -1 });

// Query mới nhất:
songSchema.index({ status: 1, deleted: 1, createdAt: -1 });

// Query theo topic + mới nhất:
songSchema.index({ topics: 1, status: 1, deleted: 1, createdAt: -1 });

// Query lọc theo album trong các flow client/admin:
songSchema.index({ album: 1, status: 1, deleted: 1 });

songSchema.index({ title: 1, status: 1, deleted: 1 });
songSchema.index({ slug: 1, status: 1, deleted: 1 });

const Song = mongoose.model<ISong>("Song", songSchema, "songs");

export default Song;