import { Schema, model } from "mongoose";

export interface IPlaylist extends Document {
    title: string;
    description?: string;
    coverImage?: string;
    userId: Schema.Types.ObjectId; // Chủ sở hữu
    slug: string;
    deleted: boolean;
  }
  
  const playlistSchema = new Schema<IPlaylist>(
    {
      title: { type: String, required: true },
      description: { type: String },
      coverImage: { type: String },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      slug: { type: String, unique: true },
      deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
  );


  playlistSchema.index({ userId: 1, deleted: 1, createdAt: -1 });
  playlistSchema.index({ userId: 1, deleted: 1 });

  const Playlist = model<IPlaylist>("Playlist", playlistSchema, "playlists");

  export default Playlist;
