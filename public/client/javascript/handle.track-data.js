// track-data.js

/**
 * Chuẩn hóa URL để đảm bảo chạy trên HTTPS và xử lý các lỗi định dạng nhẹ
 */
export const normalizeAudioUrl = (url) => {
  if (!url) return '';
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('//')) return `https:${trimmedUrl}`;
  if (trimmedUrl.startsWith('http://')) return trimmedUrl.replace('http://', 'https://');
  return trimmedUrl;
};

/**
 * Trích xuất dữ liệu bài hát từ một phần tử DOM (nút play)
 */
export const getTrackDataFromButton = (btn) => {
  if (!btn) return null;
  
  const rawUrl =  btn.getAttribute('data-audio-url') || '';
  const url = normalizeAudioUrl(rawUrl);

  return {
    url,
    songId: btn.getAttribute('data-song-id') || '',
    title: btn.getAttribute('data-song-title') || 'Unknown Title',
    artist: btn.getAttribute('data-song-artist') || 'Unknown Artist',
    cover: btn.getAttribute('data-song-cover') || '/images/default-song.png'
  };
};

/**
 * Trả về danh sách tất cả các nút bài hát hiện có (toàn trang — chỉ dùng khi không có queue cục bộ).
 */
export const getPlaylistElements = () => {
  return Array.from(document.querySelectorAll('[button-play-track]'));
};

/**
 * Xây queue từ ngữ cảnh: nếu có ancestor [data-play-queue] thì chỉ các bài trong khối đó;
 * không thì queue 1 bài (vừa bấm).
 */
export const buildQueueFromButton = (btn) => {
  if (!btn) {
    return { queue: [], index: 0, context: { type: 'none', id: '' } };
  }
  const root = btn.closest('[data-play-queue]');
  const buttons = root
    ? Array.from(root.querySelectorAll('[button-play-track]'))
    : [btn];
  const queue = buttons.map(getTrackDataFromButton).filter((t) => t && t.url);
  const rawIndex = buttons.indexOf(btn);
  const index = rawIndex >= 0 ? rawIndex : 0;
  const context = root
    ? {
        type: root.getAttribute('data-play-context') || 'list',
        id: root.getAttribute('data-play-context-id') || ''
      }
    : { type: 'single', id: '' };
  return { queue, index, context };
};

