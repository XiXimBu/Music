import { Types } from "mongoose";
import { User } from "../../models/user.model";
import FollowArtist from "../../models/followArtist.model";
import Playlist from "../../models/playlist.model";
import PlaylistSong from "../../models/playlistSong";
import type { ISong } from "../../models/song.model";
import Song from "../../models/song.model";
import { slugifyTitle } from "../../helpers/slug.helper";

type UserProfile = {
	avatar: string;
	fullName: string;
	description: string;
};

type PlaylistSongItem = {
	_id: string;
	title: string;
	coverImage: string;
	audioUrl: string;
	artistNames: string;
};

export type UserPlaylist = {
	_id: string;
	title: string;
	description: string;
	coverImage: string;
	songs: PlaylistSongItem[];
};

export type FollowedArtistView = {
	_id: string;
	name: string;
	avatar: string;
	slug: string;
};

type PopulatedFollowArtist = {
	_id: Types.ObjectId;
	name: string;
	avatar?: string;
	slug?: string;
	deleted?: boolean;
};

const DEFAULT_AVATAR =
	"https://cdn-icons-png.flaticon.com/512/149/149071.png";

const DEFAULT_ARTIST_AVATAR =
	"https://cdn-icons-png.flaticon.com/512/149/149071.png";

function mapPopulatedArtistToFollowedView(
	artist: PopulatedFollowArtist
): FollowedArtistView {
	return {
		_id: artist._id.toString(),
		name: artist.name,
		avatar: artist.avatar?.trim() || DEFAULT_ARTIST_AVATAR,
		slug: artist.slug?.trim() ?? "",
	};
}

/** Nghệ sĩ user đang follow (cho trang profile). */
export const getFollowedArtistsForUser = async (
	userId: string
): Promise<FollowedArtistView[]> => {
	const followDocs = await FollowArtist.find({ userId })
		.populate<{ artistId: PopulatedFollowArtist | null }>(
			"artistId",
			"name avatar slug deleted"
		)
		.lean();

	return followDocs
		.map((doc) => doc.artistId)
		.filter((a): a is PopulatedFollowArtist => a != null && !a.deleted)
		.map(mapPopulatedArtistToFollowedView);
};

export const getProfile = async (userId: string): Promise<UserProfile> => {
	const user = await User.findOne({
		_id: userId,
		deleted: false,
		status: "active",
	}).select("avatar fullName description");

	if (!user) {
		throw new Error("User not found");
	}

	return {
		avatar: user.avatar?.trim() || DEFAULT_AVATAR,
		fullName: user.fullName,
		description: user.description?.trim() || "",
	};
};

type UpdateProfileInput = {
	fullName?: string;
	description?: string;
	avatar?: string;
};

export const updateProfile = async (
	userId: string,
	input: UpdateProfileInput
): Promise<UserProfile> => {
	const updateData: UpdateProfileInput = {};

	if (typeof input.fullName === "string") {
		const fullName = input.fullName.trim();
		if (fullName) updateData.fullName = fullName;
	}

	if (typeof input.description === "string") {
		updateData.description = input.description.trim();
	}

	if (typeof input.avatar === "string") {
		const avatar = input.avatar.trim();
		if (avatar) updateData.avatar = avatar;
	}

	if (Object.keys(updateData).length > 0) {
		await User.updateOne(
			{
				_id: userId,
				deleted: false,
				status: "active",
			},
			{ $set: updateData }
		);
	}

	return getProfile(userId);
};

export const getPlaylistsByUserId = async (userId: string): Promise<UserPlaylist[]> => {
	// B1: Lấy "kệ" trước: toàn bộ playlist của user.
	const playlists = await Playlist.find({
		userId,
		deleted: false,
	} as any).select("_id title description coverImage");

	if (playlists.length === 0) {
		return [];
	}

	// B2: Tạo cấu trúc kết quả chuẩn ngay từ playlist (mỗi playlist có songs rỗng).
	const playlistMap = new Map<string, UserPlaylist>();
	for (const playlist of playlists) {
		const playlistId = playlist._id.toString();
		playlistMap.set(playlistId, {
			_id: playlistId,
			title: playlist.title,
			description: playlist.description?.trim() || "",
			coverImage: playlist.coverImage?.trim() || "",
			songs: [],
		});
	}

	const playlistIds = Array.from(playlistMap.keys());

	// B3: Lấy "phiếu mượn" (playlistSongs) theo danh sách playlistId và populate bài hát.
	const playlistSongs = await PlaylistSong.find({
		playlistId: { $in: playlistIds },
	} as any)
		.populate<{ songId: ISong }>(
			{
				path: "songId",
				select: "title coverImage audioUrl artists",
				populate: {
					path: "artists",
					select: "name",
				},
			} as any
		)
		.sort({ addedAt: -1 });

	// B4: Nhét từng bài hát vào đúng playlist tương ứng.
	for (const item of playlistSongs) {
		const key = item.playlistId.toString();
		const currentPlaylist = playlistMap.get(key);
		if (!currentPlaylist) continue;

		const songDoc = item.songId;
		if (!songDoc) continue;

		const songItem: PlaylistSongItem = {
			_id: songDoc._id.toString(),
			title: songDoc.title,
			coverImage: songDoc.coverImage?.trim() || "",
			audioUrl: songDoc.audioUrl || "",
			artistNames:
				Array.isArray((songDoc as any).artists) && (songDoc as any).artists.length > 0
					? (songDoc as any).artists.map((artist: { name?: string }) => artist?.name || "")
							.filter(Boolean)
							.join(", ")
					: "Unknown Artist",
		};
		currentPlaylist.songs.push(songItem);
	}

	// Trả về mảng playlist đã có sẵn songs[] bên trong.
	return Array.from(playlistMap.values());
};

export const getAddedSongIdsByUserId = async (userId: string): Promise<string[]> => {
	const playlists = await Playlist.find({ userId, deleted: false } as any).select("_id");
	if (!playlists.length) return [];

	const playlistIds = playlists.map((playlist) => playlist._id);
	const rows = await PlaylistSong.find({ playlistId: { $in: playlistIds } } as any).select("songId");
	return Array.from(new Set(rows.map((row) => row.songId.toString())));
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

export const addSongToUserDefaultPlaylist = async (
	userId: string,
	songId: string,
	selectedPlaylistId?: string
): Promise<{ added: boolean; playlistId: string }> => {
	const song = await Song.findOne({
		_id: songId,
		deleted: false,
		status: "active",
	}).select("_id");

	if (!song) {
		throw new Error("Song not found");
	}

	let targetPlaylist = null as any;

	// Nếu client có chọn playlist, ưu tiên add vào playlist đó (và bắt buộc thuộc về user).
	if (selectedPlaylistId) {
		targetPlaylist = await Playlist.findOne({
			_id: selectedPlaylistId,
			userId,
			deleted: false,
		} as any);
	}

	// Nếu chưa chọn hoặc playlist được chọn không hợp lệ, fallback playlist gần nhất.
	if (!targetPlaylist) {
		targetPlaylist = await Playlist.findOne({ userId, deleted: false } as any).sort({ createdAt: -1 });
	}

	// Nếu user chưa có playlist, tạo playlist mặc định để nhận bài hát từ search.
	if (!targetPlaylist) {
		const baseSlug = slugifyTitle("My Favorites");
		const uniqueSlug = await ensureUniquePlaylistSlug(baseSlug);
		targetPlaylist = await Playlist.create({
			title: "My Favorites",
			description: "Playlist được tạo tự động từ Search.",
			coverImage: "",
			userId: userId as any,
			slug: uniqueSlug,
			deleted: false,
		});
	}

	const existed = await PlaylistSong.findOne({
		playlistId: targetPlaylist._id,
		songId,
	} as any).select("_id");

	if (existed) {
		return { added: false, playlistId: targetPlaylist._id.toString() };
	}

	await PlaylistSong.create({
		playlistId: targetPlaylist._id as any,
		songId: songId as any,
		addedAt: new Date(),
	});

	return { added: true, playlistId: targetPlaylist._id.toString() };
};

/**
 * Gỡ một bài khỏi playlist (junction). Chỉ playlist của user.
 * Trả về bài đó còn nằm trong playlist nào khác của user hay không.
 */
export const removeSongFromPlaylist = async (
	userId: string,
	playlistId: string,
	songId: string
): Promise<{ stillInUserPlaylists: boolean }> => {
	const playlist = await Playlist.findOne({
		_id: playlistId,
		userId,
		deleted: false,
	} as any);

	if (!playlist) {
		throw new Error("Playlist not found");
	}

	const del = await PlaylistSong.deleteOne({
		playlistId: playlist._id,
		songId: songId as any,
	} as any);

	if (del.deletedCount === 0) {
		throw new Error("Song not found in this playlist");
	}

	const after = await getAddedSongIdsByUserId(userId);
	return { stillInUserPlaylists: after.includes(songId) };
};
