import { Request, Response } from "express";
import ArtistService from "../../services/client/artist.service";
import { isFollowingArtist } from "../../services/client/follow.artist.service";
import { enrichSongsForTrackItem } from "../../helpers/track-item.helper";

const getDetailArtist = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawSlug = req.params.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    const normalizedSlug = typeof slug === "string" ? slug.trim() : "";

    // 1. Kiểm tra slug (Viết gọn)
    if (!normalizedSlug || normalizedSlug === "...") {
      return res.render("client/pages/artist/index", {
        pageTitle: "Lỗi",
        artists: [],
        albums: [],
        songs: [],
        message: "Đường dẫn không hợp lệ."
      });
    }

    // 2. Gọi Service (Service giờ chỉ trả về artist hoặc null)
    const artist = await ArtistService.getArtistBySlug(normalizedSlug);

    // 3. Check artist có tồn tại hay không
    if (!artist) {
      return res.render("client/pages/artist/index", {
        pageTitle: "Không tìm thấy",
        artists: [],
        albums: [],
        songs: [],
        message: "Nghệ sĩ không tồn tại hoặc đã bị xóa."
      });
    }

    const artistId = String(artist._id);
    const userId = res.locals.user?.id;
    const [albums, songs, followed] = await Promise.all([
      ArtistService.getAlbumsByArtist(artistId),
      ArtistService.getAllSongs(artistId),
      userId ? isFollowingArtist(userId, artistId) : Promise.resolve(false),
    ]);

    const popularTracks = enrichSongsForTrackItem(
      songs,
      Boolean(res.locals.isAuthenticated),
      res.locals.addedSongIds
    );

    // 4. Render kết quả (Truyền đúng biến artists là một mảng chứa 1 người để Pug không lỗi)
    res.render("client/pages/artist/index", {
      pageTitle: artist.name,
      showSearch: true,
      artists: [artist],
      albums,
      popularTracks,
      isFollowingArtist: followed,
    });

  } catch (error) {
    console.error(">>> Lỗi Get Detail Artist:", error);
    res.status(500).send("Lỗi hệ thống");
  }
};


export default { getDetailArtist };
