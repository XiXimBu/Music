import Topic from "../../models/topic.model";
import Song from "../../models/song.model";
import Album from "../../models/album.model";

export const getTopicDetailService = async (slug: string) => {
  try {
    const normalizedSlug = decodeURIComponent(slug).trim();

    if (!normalizedSlug || normalizedSlug === "...") {
      return null;
    }

    const topic = await Topic.findOne({
      slug: normalizedSlug,
      status: "active",
      deleted: { $ne: true },
    }).lean();

    if (!topic) {
      return null;
    }

    const songs = await Song.find({
      topics: topic._id,
    })
      .populate("artists", "name")
      .sort({ createdAt: -1 })
      .lean();

    const relatedTopics = await Topic.aggregate([
      {
        $match: {
          status: "active",
          deleted: { $ne: true },
          _id: { $ne: topic._id },
        },
      },
      { $sample: { size: 3 } },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          thumbnail: 1,
          description: 1,
        },
      },
    ]);

    const trendingAlbums = await Album.aggregate([
      {
        $match: {
          status: "active",
          deleted: { $ne: true },
        },
      },
      { $sample: { size: 2 } },
      {
        $lookup: {
          from: "artists",
          localField: "artist",
          foreignField: "_id",
          as: "artistDoc",
        },
      },
      { $unwind: { path: "$artistDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          artistName: "$artistDoc.name",
        },
      },
    ]);

    return { topic, songs, relatedTopics, trendingAlbums };
  } catch (error) {
    console.error(">>> Error in getTopicDetailService:", error);
    throw error;
  }
};
