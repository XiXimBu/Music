import Song from "../../models/song.model";
import Artist from "../../models/artist.model";

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchSuggestService = async (keyword: string) => {
  if (!keyword || keyword.trim() === "") {
    return { songs: [], artists: [] };
  }

  const trimmedKw = keyword.trim();
  const keywordRegex = new RegExp(escapeRegex(trimmedKw), "i");

  // Chỉ bài còn hiển thị công khai: chưa xóa và đang active
  const songs = await Song.find({
    deleted: false,
    status: "active",
    $or: [{ title: keywordRegex }, { slug: keywordRegex }],
  })
    .select("_id title audioUrl coverImage artists slug")
    .populate({
      path: "artists",
      select: "name slug",
    })
    .limit(6);

  //Tìm nghệ sĩ
  const artists = await Artist.find({
    name: keywordRegex,
    deleted: false
  })
    .select("name avatar slug")
    .limit(3);

  // Định dạng kết quả bài hát
  const formattedSongs = songs.map(song => {
    const artistNames =
      song.artists && song.artists.length > 0
        ? (song.artists as any).map((a: any) => a.name).join(", ")
        : "Unknown Artist";

    return {
      _id: song._id,
      title: song.title,
      audioUrl: song.audioUrl,
      coverImage: song.coverImage || "/images/default-cover.png",
      artistName: artistNames,
      slug: song.slug,
    };
  });

  return {
    songs: formattedSongs,
    artists
  };
};

export type TopSearchArtist = {
  name: string;
  avatar: string | null;
  slug?: string;
  followers: number;
};

export const getSearchResultService = async (
  keyword: string
): Promise<{ topArtist: TopSearchArtist | null }> => {
  if (!keyword || keyword.trim() === "") {
    return { topArtist: null };
  }

  const trimmed = keyword.trim();
  const keywordRegex = new RegExp(escapeRegex(trimmed), "i");

  const artists = await Artist.find({
    name: keywordRegex,
    deleted: false,
  })
    .select("name avatar slug followers")
    .lean();

  if (artists.length === 0) {
    return { topArtist: null };
  }

  const lower = trimmed.toLowerCase();
  const matchScore = (name: string): number => {
    const n = name.toLowerCase();
    if (n === lower) return 3;
    if (n.startsWith(lower)) return 2;
    return 1;
  };

  artists.sort((a, b) => {
    const diff = matchScore(b.name) - matchScore(a.name);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  const top = artists[0];
  return {
    topArtist: {
      name: top.name,
      avatar: top.avatar ?? null,
      slug: top.slug,
      followers: top.followers ?? 0,
    },
  };
};

export const searchSongs = async (keyword: string) => {
  if (!keyword || keyword.trim() === "") {
    return [];
  }

  const trimmed = keyword.trim();
  const keywordRegex = new RegExp(escapeRegex(trimmed), "i");

  const songs = await Song.find({
    deleted: false,
    status: "active",
    title: keywordRegex,
  })
    .select("_id title audioUrl coverImage artists slug duration views")
    .populate({
      path: "artists",
      select: "name slug",
    })
    .lean();

  return songs;
};

export const getSearchResultServiceSongs = async (keyword: string) => {
  return searchSongs(keyword);
};