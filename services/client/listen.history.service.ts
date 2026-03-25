import { PipelineStage, Types } from "mongoose";
import { ListeningHistory } from "../../models/listeningHistory.model";
import { formatFromNow } from "../../helpers/helpertime";

const RECENT_HISTORY_LIMIT = 5;

/** Mỗi user chỉ giữ tối đa số bản ghi lịch sử gần nhất (capped). */
const USER_HISTORY_CAP = 20;

/** Mỗi lần xóa tối đa bao nhiêu bản ghi (tránh một deleteMany quá lớn khi backlog cũ chưa từng cap). */
const PRUNE_BATCH_SIZE = 1000;

type RawSong = {
  _id: Types.ObjectId | string;
  title?: string;
  coverImage?: string;
  artists?: Array<{ name?: string }>;
  duration?: number;
};

export type RecentHistoryItem = {
  _id: string;
  listenedAt: Date;
  listenedAtFromNow: string;
  song: {
    _id: string;
    title: string;
    coverImage: string;
    artistNames: string;
    duration: number;
  } | null;
};

export type TopSongItem = {
  songId: string;
  count: number;
  song: {
    _id: string;
    title: string;
    coverImage: string;
    artistNames: string;
    duration: number;
    audioUrl: string;
    views: number;
    artists: Array<{ name: string }>;
  } | null;
};

const mapSong = (song: RawSong | null | undefined): RecentHistoryItem["song"] => {
  if (!song?._id) return null;
  const artistNames = Array.isArray(song.artists)
    ? song.artists.map((artist) => artist?.name || "").filter(Boolean).join(", ")
    : "";

  return {
    _id: String(song._id),
    title: song.title || "Unknown title",
    coverImage: song.coverImage || "",
    artistNames: artistNames || "Unknown artist",
    duration: Number(song.duration || 0),
  };
};

/**
 * Ghi lịch sử nghe (1 round-trip insert qua bulkWrite) rồi lên lịch prune nền —
 * không chờ xóa, phản hồi “Play” chỉ phụ thuộc insert.
 *
 * Capped: mỗi user tối đa `USER_HISTORY_CAP` bản ghi mới nhất; bản cũ bị xóa trong background (theo batch).
 */
export const syncUserHistory = async (userId: string, songId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(songId)) return;

  const uid = new Types.ObjectId(userId);
  const sid = new Types.ObjectId(songId);
  const listenedAt = new Date();

  await ListeningHistory.bulkWrite(
    [
      {
        insertOne: {
          document: {
            userId: uid,
            songId: sid,
            listenedAt,
          },
        },
      },
    ],
    { ordered: true }
  );

  setImmediate(() => {
    pruneExcessForUser(userId).catch((err) => {
      console.error("pruneExcessForUser (background):", err);
    });
  });
};

/**
 * Xóa bản ghi cũ nhất cho đến khi còn ≤ USER_HISTORY_CAP.
 * Dùng .lean() trên find; xử lý _id bằng Types.ObjectId.
 * Vòng lặp + batch: an toàn khi dữ liệu cũ chưa cap (hàng trăm nghìn dòng).
 */
async function pruneExcessForUser(userId: string): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) return;
  const uid = new Types.ObjectId(userId);

  for (;;) {
    const count = await ListeningHistory.countDocuments({ userId: uid }).exec();
    if (count <= USER_HISTORY_CAP) return;

    const excess = count - USER_HISTORY_CAP;
    const take = Math.min(excess, PRUNE_BATCH_SIZE);

    const oldest = await ListeningHistory.find({ userId: uid })
      .sort({ listenedAt: 1 })
      .limit(take)
      .select({ _id: 1 })
      .lean()
      .exec();

    if (oldest.length === 0) return;

    const ids = oldest.map((d) => d._id as Types.ObjectId);
    await ListeningHistory.deleteMany({ _id: { $in: ids } }).exec();
  }
}

/** Alias của `syncUserHistory` — giữ tên cho controller/routes hiện tại. */
export const saveHistory = syncUserHistory;

/** 5 bài gần nhất — một round-trip aggregate thay vì find + populate */
export const getRecentHistory = async (userId: string): Promise<RecentHistoryItem[]> => {
  if (!Types.ObjectId.isValid(userId)) return [];

  const uid = new Types.ObjectId(userId);

  const pipeline: PipelineStage[] = [
    { $match: { userId: uid } },
    { $sort: { listenedAt: -1 as const } },
    { $limit: RECENT_HISTORY_LIMIT },
    {
      $lookup: {
        from: "songs",
        localField: "songId",
        foreignField: "_id",
        pipeline: [{ $project: { title: 1, coverImage: 1, duration: 1, artists: 1 } }],
        as: "songMatches",
      },
    },
    {
      $set: {
        songRaw: { $arrayElemAt: ["$songMatches", 0] },
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "songRaw.artists",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1 } }],
        as: "songArtists",
      },
    },
    {
      $project: {
        _id: 1,
        listenedAt: 1,
        songPopulated: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$songMatches", []] } }, 0] },
            { $mergeObjects: ["$songRaw", { artists: "$songArtists" }] },
            null,
          ],
        },
      },
    },
  ];

  const rows = await ListeningHistory.aggregate(pipeline).exec();

  return rows.map((item: any) => ({
    _id: String(item._id),
    listenedAt: item.listenedAt,
    listenedAtFromNow: formatFromNow(item.listenedAt),
    song: mapSong(item.songPopulated),
  }));
};

export const getTopSongs = async (userId: string, limit = 5): Promise<TopSongItem[]> => {
  if (!Types.ObjectId.isValid(userId)) return [];
  const topLimit = Math.max(1, Math.min(Number(limit) || 5, 50));

  const pipeline: PipelineStage[] = [
    { $match: { userId: new Types.ObjectId(userId) } },
    { $group: { _id: "$songId", count: { $sum: 1 } } },
    { $sort: { count: -1 as const } },
    { $limit: topLimit },
    {
      $lookup: {
        from: "songs",
        localField: "_id",
        foreignField: "_id",
        as: "song",
      },
    },
    { $unwind: { path: "$song", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "artists",
        localField: "song.artists",
        foreignField: "_id",
        as: "artistDocs",
      },
    },
    {
      $project: {
        _id: 0,
        songId: "$_id",
        count: 1,
        song: {
          _id: "$song._id",
          title: "$song.title",
          coverImage: "$song.coverImage",
          duration: "$song.duration",
          audioUrl: "$song.audioUrl",
          views: { $ifNull: ["$song.views", 0] },
          artistNames: {
            $reduce: {
              input: "$artistDocs.name",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] },
                ],
              },
            },
          },
          artists: {
            $map: {
              input: { $ifNull: ["$artistDocs", []] },
              as: "a",
              in: { name: { $ifNull: ["$$a.name", ""] } },
            },
          },
        },
      },
    },
  ];

  const rows = await ListeningHistory.aggregate(pipeline).exec();
  return rows.map((item: any) => ({
    songId: String(item.songId),
    count: Number(item.count || 0),
    song: item.song?._id
      ? {
          _id: String(item.song._id),
          title: item.song.title || "Unknown title",
          coverImage: item.song.coverImage || "",
          artistNames: item.song.artistNames || "Unknown artist",
          duration: Number(item.song.duration || 0),
          audioUrl: String(item.song.audioUrl || ""),
          views: Number(item.song.views || 0),
          artists: Array.isArray(item.song.artists)
            ? item.song.artists.map((a: { name?: string }) => ({ name: a?.name || "Unknown Artist" }))
            : [],
        }
      : null,
  }));
};

export default { saveHistory, syncUserHistory, getRecentHistory, getTopSongs };
