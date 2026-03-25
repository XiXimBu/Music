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
 * Trả về danh sách tất cả các nút bài hát hiện có
 */
export const getPlaylistElements = () => {
  return Array.from(document.querySelectorAll('[button-play-track]'));
};

