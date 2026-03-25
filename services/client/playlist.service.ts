import Playlist from "../../models/playlist.model";
import { slugifyTitle } from "../../helpers/slug.helper";

type PlaylistPayload = {
	title: string;
	description?: string;
};

export type PlaylistDTO = {
	_id: string;
	title: string;
	description: string;
	coverImage: string;
};

const ensureUniquePlaylistSlug = async (base: string): Promise<string> => {
	let candidate = base || "playlist";
	let count = 0;
	for (;;) {
		const exists = await Playlist.exists({ slug: candidate });
		if (!exists) return candidate;
		count += 1;
		candidate = `${base}-${count}`;
	}
};

const toDTO = (playlist: any): PlaylistDTO => ({
	_id: playlist._id.toString(),
	title: playlist.title,
	description: playlist.description?.trim() || "",
	coverImage: playlist.coverImage?.trim() || "",
});

export const createPlaylist = async (userId: string, payload: PlaylistPayload): Promise<PlaylistDTO> => {
	const title = String(payload.title || "").trim();
	const description = String(payload.description || "").trim();
	if (!title) {
		throw new Error("Playlist title is required");
	}

	const baseSlug = slugifyTitle(title);
	const uniqueSlug = await ensureUniquePlaylistSlug(baseSlug);
	const playlist = await Playlist.create({
		title,
		description,
		coverImage: "",
		userId: userId as any,
		slug: uniqueSlug,
		deleted: false,
	});

	return toDTO(playlist);
};

export const updatePlaylist = async (
	userId: string,
	playlistId: string,
	payload: PlaylistPayload
): Promise<PlaylistDTO> => {
	const title = String(payload.title || "").trim();
	const description = String(payload.description || "").trim();
	if (!title) {
		throw new Error("Playlist title is required");
	}

	const playlist = await Playlist.findOne({
		_id: playlistId,
		userId,
		deleted: false,
	} as any);

	if (!playlist) {
		throw new Error("Playlist not found");
	}

	playlist.title = title;
	playlist.description = description;
	await playlist.save();

	return toDTO(playlist);
};

export const softDeletePlaylist = async (userId: string, playlistId: string): Promise<void> => {
	const playlist = await Playlist.findOne({
		_id: playlistId,
		userId,
		deleted: false,
	} as any);

	if (!playlist) {
		throw new Error("Playlist not found");
	}

	playlist.deleted = true;
	await playlist.save();
};
