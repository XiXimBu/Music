import mongoose, { Schema, Document } from "mongoose";

export interface IArtist extends Document {
  name: string;
  avatar?: string;
  description?: string;
  followers: number;
  slug?: string;
  deleted?: boolean;
  createdAt: Date;
}

const artistSchema = new Schema<IArtist>(
  {
    name: { type: String, required: true },
    avatar: String,
    description: String,
    followers: { type: Number, default: 0 },
    slug: { type: String, unique: true, sparse: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Query patterns hiện tại:
// - findOne({ slug, deleted })
// - find({ deleted }).sort({ createdAt: -1 })
// - find({ name: /keyword/i, deleted })
artistSchema.index({ slug: 1, deleted: 1 });
artistSchema.index({ deleted: 1, createdAt: -1 });
artistSchema.index({ name: 1, deleted: 1 });

const Artist = mongoose.model<IArtist>("Artist", artistSchema, "artists");

export default Artist;