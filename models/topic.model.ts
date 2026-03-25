import mongoose, { Schema, Document } from "mongoose";

export interface ITopic extends Document {
  name: string;
  description?: string;
  slug?: string;
  thumbnail?: string;
  status?: "active" | "inactive";
  deleted?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

const topicSchema = new Schema<ITopic>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    slug: { type: String, unique: true, sparse: true },
    thumbnail: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

topicSchema.index({ name: 1, deleted: 1 });
topicSchema.index({ slug: 1, deleted: 1 });

const Topic = mongoose.model<ITopic>("Topic", topicSchema, "topics");

export default Topic;