"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDurationSeconds = formatDurationSeconds;
exports.artistNamesFromArtists = artistNamesFromArtists;
exports.formatViewsDisplay = formatViewsDisplay;
exports.buildAddedSongIdSet = buildAddedSongIdSet;
exports.shouldShowAddSongButton = shouldShowAddSongButton;
exports.enrichSongForTrackItem = enrichSongForTrackItem;
exports.enrichSongsForTrackItem = enrichSongsForTrackItem;
function formatDurationSeconds(totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
}
function artistNamesFromArtists(artists) {
    if (!Array.isArray(artists) || artists.length === 0)
        return "Unknown Artist";
    const joined = artists
        .map((a) => a?.name || "")
        .filter(Boolean)
        .join(", ");
    return joined || "Unknown Artist";
}
function formatViewsDisplay(views) {
    return `${new Intl.NumberFormat().format(Number(views) || 0)} views`;
}
function buildAddedSongIdSet(ids) {
    if (!Array.isArray(ids))
        return new Set();
    return new Set(ids.map(String));
}
function shouldShowAddSongButton(songId, isAuthenticated, addedSet) {
    if (!isAuthenticated)
        return false;
    return !addedSet.has(String(songId ?? ""));
}
function enrichSongForTrackItem(song, songIndex, isAuthenticated, addedSet) {
    const row = song;
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
function enrichSongsForTrackItem(songs, isAuthenticated, addedSongIds) {
    const addedSet = buildAddedSongIdSet(addedSongIds);
    return songs.map((song, i) => enrichSongForTrackItem(song, i, isAuthenticated, addedSet));
}
