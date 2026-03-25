import mongoose from "mongoose";

export const escapeRegex = (str: string): string =>
	str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type ParsedCreateSongBody = {
	title: string;
	durationSeconds: number;
	audioUrl: string;
	coverImage?: string;
	/** Có thể bỏ trống (bài chỉ gắn topic). Nếu có thì phải trùng nghệ sĩ trong hệ thống. */
	artistName?: string;
	albumTitle?: string;
	/** ObjectId dạng chuỗi, đã kiểm tra hợp lệ */
	topicIds: string[];
	status: "active" | "inactive";
	views: number;
};

const normalizeTopicIds = (
	body: Record<string, unknown>
): string[] | { error: string } => {
	const raw = body.topics;
	if (raw === undefined || raw === null || raw === "") {
		return [];
	}
	const list = Array.isArray(raw) ? raw : [raw];
	const ids = list.map((x) => String(x).trim()).filter(Boolean);
	for (const id of ids) {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return { error: "Một hoặc nhiều topic không hợp lệ" };
		}
	}
	return ids;
};

/** Chuyển "mm:ss" hoặc "m:ss" thành giây; null nếu sai định dạng. */
export const parseDurationToSeconds = (raw: string): number | null => {
	const s = raw.trim();
	const m = /^(\d+):(\d{1,2})$/.exec(s);
	if (!m) return null;
	const min = parseInt(m[1], 10);
	const sec = parseInt(m[2], 10);
	if (sec >= 60 || min < 0) return null;
	const total = min * 60 + sec;
	return total > 0 ? total : null;
};

/**
 * Kiểm tra body sau khi đã qua Multer + upload Cloudinary (audio/thumbnail là URL).
 * Artist / album là chuỗi tên; service sẽ tra ObjectId trong DB.
 */
export const parseCreateSongBody = (
	body: Record<string, unknown>
): { ok: false; error: string } | { ok: true; data: ParsedCreateSongBody } => {
	const title = String(body.title ?? "").trim();
	if (!title) {
		return { ok: false, error: "Tiêu đề không được để trống" };
	}

	const artistRaw = String(body.artist ?? "").trim();
	const artistName = artistRaw || undefined;

	const durationRaw = String(body.duration ?? "").trim();
	if (!durationRaw) {
		return { ok: false, error: "Thời lượng là bắt buộc (định dạng mm:ss)" };
	}
	const durationSeconds = parseDurationToSeconds(durationRaw);
	if (durationSeconds === null) {
		return { ok: false, error: "Thời lượng phải có dạng mm:ss (ví dụ 3:45)" };
	}

	const audioUrl = String(body.audio ?? "").trim();
	if (!audioUrl.startsWith("http")) {
		return { ok: false, error: "Thiếu file nhạc hoặc upload audio thất bại" };
	}

	const coverRaw = String(body.thumbnail ?? "").trim();
	const coverImage = coverRaw.startsWith("http") ? coverRaw : undefined;

	const statusRaw = String(body.status ?? "active").toLowerCase();
	if (statusRaw !== "active" && statusRaw !== "inactive") {
		return { ok: false, error: "Trạng thái không hợp lệ" };
	}

	const plays = Number(body.plays ?? 0);
	if (Number.isNaN(plays) || plays < 0 || !Number.isFinite(plays)) {
		return { ok: false, error: "Lượt phát ban đầu không hợp lệ" };
	}

	const albumTitleRaw = String(body.album ?? "").trim();
	const albumTitle = albumTitleRaw || undefined;

	const topicIdsNorm = normalizeTopicIds(body);
	if (!Array.isArray(topicIdsNorm)) {
		return { ok: false, error: topicIdsNorm.error };
	}
	const topicIds = topicIdsNorm;

	return {
		ok: true,
		data: {
			title,
			durationSeconds,
			audioUrl,
			coverImage,
			artistName,
			albumTitle,
			topicIds,
			status: statusRaw,
			views: Math.floor(plays),
		},
	};
};
