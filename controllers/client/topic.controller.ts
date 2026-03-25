import { Request, Response } from "express";
import * as topicService from "../../services/client/topic.service";
import { enrichSongsForTrackItem } from "../../helpers/track-item.helper";

export const getDetailTopic = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawSlug = req.params.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

    if (!slug) {
      res.redirect("/topics");
      return;
    }

    const data = await topicService.getTopicDetailService(slug);

    if (!data) {
      res.redirect("/topics");
      return;
    }

    const songs = enrichSongsForTrackItem(
      data.songs,
      Boolean(res.locals.isAuthenticated),
      res.locals.addedSongIds
    );

    res.render("client/pages/topic/index", {
      pageTitle: data.topic.name,
      showSearch: true,
      topic: data.topic,
      songs,
      relatedTopics: data.relatedTopics,
      trendingAlbums: data.trendingAlbums,
    });
  } catch (error) {
    console.error(">>> Error in getDetailTopic:", error);
    res.status(500).send("Internal Server Error");
  }
};
