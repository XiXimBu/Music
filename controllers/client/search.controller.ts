import { Request, Response } from "express";
import {
  getSearchResultService,
  getSearchResultServiceSongs,
  searchSuggestService,
} from "../../services/client/search.service";
import { enrichSongsForTrackItem } from "../../helpers/track-item.helper";
import { User } from "../../models/user.model";
import { getAddedSongIdsByUserId } from "../../services/client/user.service";

const queryString = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value);
};

export const searchSuggest = async (req: Request, res: Response) => {
  try {
    const keyword = queryString(req.query.keyword).trim();

    if (!keyword) {
      return res.json({
        code: 200,
        songs: [],
        artists: [],
      });
    }

    const result = await searchSuggestService(keyword);
    let addedSongIds: string[] = [];

    // Nếu đã đăng nhập, trả kèm danh sách bài đã có trong playlist để ẩn nút "+".
    const token = String(req.cookies?.token ?? "").trim();
    if (token) {
      const user = await User.findOne({ token, deleted: false, status: "active" }).select("_id");
      if (user) {
        addedSongIds = await getAddedSongIdsByUserId(user._id.toString());
      }
    }

    return res.json({
      code: 200,
      ...result,
      addedSongIds,
    });
  } catch (error) {
    console.error("Search Suggest Error:", error);

    return res.status(500).json({
      code: 500,
      message: "Internal Server Error",
    });
  }
};

export const getSearchResult = async (req: Request, res: Response) => {
  try {
    const keyword = (req.query.keyword as string) || "";
    const [{ topArtist }, rawSongs] = await Promise.all([
      getSearchResultService(keyword),
      getSearchResultServiceSongs(keyword),
    ]);

    const songs = enrichSongsForTrackItem(
      rawSongs,
      Boolean(res.locals.isAuthenticated),
      res.locals.addedSongIds
    );

    return res.render("client/pages/search/index", {
      pageTitle: "Search Results",
      keyword,
      topArtist,
      songs,
    });
  } catch (error) {
    console.error("Search Result Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
