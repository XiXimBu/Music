/**
 * Chuẩn hóa dữ liệu bài hát cho mixin `track-item.pug` — tránh Math/map/includes trong Pug.
 * `addedSongIds` → Set một lần, tra cứu O(1) mỗi bài.
 */

export function formatDurationSeconds(totalSeconds: unknown): string {
	const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
	const m = Math.floor(s / 60);
	const sec = String(s % 60).padStart(2, "0");
	return `${m}:${sec}`;
}

export function artistNamesFromArtists(artists: unknown): string {
	if (!Array.isArray(artists) || artists.length === 0) return "Unknown Artist";
	const joined = artists
		.map((a: { name?: string }) => a?.name || "")
		.filter(Boolean)
		.join(", ");
	return joined || "Unknown Artist";
}

export function formatViewsDisplay(views: unknown): string {
	return `${new Intl.NumberFormat().format(Number(views) || 0)} views`;
}

export function buildAddedSongIdSet(ids: string[] | undefined): Set<string> {
	if (!Array.isArray(ids)) return new Set();
	return new Set(ids.map(String));
}

/** Hiện nút "+" khi đã đăng nhập và bài chưa nằm trong playlist nào. */
export function shouldShowAddSongButton(
	songId: unknown,
	isAuthenticated: boolean,
	addedSet: Set<string>
): boolean {
	if (!isAuthenticated) return false;
	return !addedSet.has(String(songId ?? ""));
}

export type TrackItemSongView = Record<string, unknown> & {
	formattedDuration: string;
	artistNames: string;
	viewsDisplay: string;
	showAddSongBtn: boolean;
	rankLabel: string;
};

export function enrichSongForTrackItem(
	song: object,
	songIndex: number,
	isAuthenticated: boolean,
	addedSet: Set<string>
): TrackItemSongView {
	const row = song as Record<string, unknown>;
	const id = row._id;
	return {
		...row,
		formattedDuration: formatDurationSeconds(row.duration),
		artistNames: artistNamesFromArtists(row.artists),
		viewsDisplay: formatViewsDisplay(row.views),
		showAddSongBtn: shouldShowAddSongButton(id, isAuthenticated, addedSet),
		rankLabel: String(songIndex + 1).padStart(2, "0"),
	};
}

export function enrichSongsForTrackItem(
	songs: readonly object[],
	isAuthenticated: boolean,
	addedSongIds: string[] | undefined
): TrackItemSongView[] {
	const addedSet = buildAddedSongIdSet(addedSongIds);
	return songs.map((song, i) => enrichSongForTrackItem(song, i, isAuthenticated, addedSet));
}
