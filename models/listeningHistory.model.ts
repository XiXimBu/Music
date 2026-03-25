import { Schema, model, Document, Types } from "mongoose";

export interface IListeningHistory extends Document {
  userId: Types.ObjectId;
  songId: Types.ObjectId;
  listenedAt: Date;
}

const listeningHistorySchema = new Schema<IListeningHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    songId: { type: Schema.Types.ObjectId, ref: "Song", required: true },
    listenedAt: { type: Date, default: Date.now },
  },
  { 
    timestamps: false 
  }
);

/**
 * Indexes (collection `listening-histories`) — Atlas / high latency:
 *
 * 1. `{ userId: 1, listenedAt: -1 }` — Danh sách mới nhất theo user (`getRecentHistory`),
 *    sort theo thời gian giảm; Mongo có thể dùng index này (scan ngược) cho sort `listenedAt: 1`
 *    khi có filter `userId` bằng (prune “cũ nhất”).
 * 2. `{ userId: 1, songId: 1 }` — Hỗ trợ `$match` theo user rồi `$group` theo `songId` (top bài / thống kê),
 *    giảm scan trong aggregate.
 *
 * Giữ tập index nhỏ: mỗi document ghi ~2 index entries. Mục tiêu <5ms phụ thuộc tier Atlas,
 * RAM (working set), và kích thước dữ liệu — sau khi cap ~20 bản ghi/user, volume nhỏ, truy vấn indexed thường rất nhanh.
 */
listeningHistorySchema.index({ userId: 1, listenedAt: -1 });
listeningHistorySchema.index({ userId: 1, songId: 1 });

export const ListeningHistory = model<IListeningHistory>(
  "ListeningHistory", 
  listeningHistorySchema, 
  "listening-histories"
);