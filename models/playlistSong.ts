import { Schema, model } from "mongoose";

export interface IPlaylistSong extends Document {
    playlistId: Schema.Types.ObjectId;
    songId: Schema.Types.ObjectId;
    addedAt: Date;
  }
  
  const playlistSongSchema = new Schema<IPlaylistSong>(
    {
      playlistId: { type: Schema.Types.ObjectId, ref: "Playlist", required: true },
      songId: { type: Schema.Types.ObjectId, ref: "Song", required: true },
      addedAt: { type: Date, default: Date.now },
    },
    { timestamps: false } 
  );
  
  // Tạo index để tìm kiếm nhanh hơn
  playlistSongSchema.index({ playlistId: 1, songId: 1 }, { unique: true });
  
 export const PlaylistSong = model<IPlaylistSong>("PlaylistSong", playlistSongSchema, "playlistSongs");

  export default PlaylistSong;