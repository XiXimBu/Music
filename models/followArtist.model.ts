import { Schema, model, Document, Types } from 'mongoose';

// 1. Định nghĩa Interface cho Document
// Interface này đại diện cho cấu trúc dữ liệu của một bản ghi trong Database
export interface IFollowArtist extends Document {
  userId: Types.ObjectId;
  artistId: Types.ObjectId;
  createdAt: Date;
}

// 2. Khởi tạo Schema
const followArtistSchema = new Schema<IFollowArtist>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  artistId: { 
    type: Schema.Types.ObjectId, 
    ref: "Artist", 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});


followArtistSchema.index({ userId: 1, artistId: 1 }, { unique: true });

// 4. Khởi tạo và Export Model
const FollowArtist = model<IFollowArtist>("FollowArtist", followArtistSchema, "followArtists");

export default FollowArtist;