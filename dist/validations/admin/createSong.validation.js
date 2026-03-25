"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCreateSongBody = exports.parseDurationToSeconds = exports.escapeRegex = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
exports.escapeRegex = escapeRegex;
const normalizeTopicIds = (body) => {
    const raw = body.topics;
    if (raw === undefined || raw === null || raw === "") {
        return [];
    }
    const list = Array.isArray(raw) ? raw : [raw];
    const ids = list.map((x) => String(x).trim()).filter(Boolean);
    for (const id of ids) {
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return { error: "Một hoặc nhiều topic không hợp lệ" };
        }
    }
    return ids;
};
const parseDurationToSeconds = (raw) => {
    const s = raw.trim();
    const m = /^(\d+):(\d{1,2})$/.exec(s);
    if (!m)
        return null;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    if (sec >= 60 || min < 0)
        return null;
    const total = min * 60 + sec;
    return total > 0 ? total : null;
};
exports.parseDurationToSeconds = parseDurationToSeconds;
const parseCreateSongBody = (body) => {
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
    const durationSeconds = (0, exports.parseDurationToSeconds)(durationRaw);
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
exports.parseCreateSongBody = parseCreateSongBody;
