import getSlug from "speakingurl";
import Song from "../models/song.model";
import Artist from "../models/artist.model";

/** Slug ASCII từ tiêu đề (thư viện speakingurl — cùng họ với mongoose-slug-updater). */
export const slugifyTitle = (title: string): string => {
	const s = String(title || "").trim();
	if (!s) return "song";
	return getSlug(s, { lang: "vn" });
};

/** Slug ASCII từ tên nghệ sĩ (tiếng Việt → ASCII). */
export const slugifyArtistName = (name: string): string => {
	const s = String(name || "").trim();
	if (!s) return "artist";
	return getSlug(s, { lang: "vn" });
};

/**
 * Đảm bảo slug duy nhất trong collection songs (thêm -2, -3 nếu trùng).
 */
export const ensureUniqueSongSlug = async (base: string): Promise<string> => {
	let candidate = base || "song";
	let n = 0;
	for (;;) {
		const exists = await Song.exists({ slug: candidate });
		if (!exists) return candidate;
		n += 1;
		candidate = `${base}-${n}`;
	}
};

/**
 * Đảm bảo slug duy nhất trong collection artists (thêm -2, -3 nếu trùng).
 */
export const ensureUniqueArtistSlug = async (base: string): Promise<string> => {
	let candidate = base || "artist";
	let n = 0;
	for (;;) {
		const exists = await Artist.exists({ slug: candidate });
		if (!exists) return candidate;
		n += 1;
		candidate = `${base}-${n}`;
	}
};
