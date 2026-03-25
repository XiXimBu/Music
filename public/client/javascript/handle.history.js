let currentSongId = '';
let isSavedForCurrentPlayback = false;
let isRequestInFlight = false;

const isUserLoggedIn = () =>
  typeof document !== 'undefined' &&
  document.body?.getAttribute('data-user-authenticated') === '1';

const shouldSaveHistory = ({ currentTime, duration }) => {
  const listenedEnoughByTime = Number(currentTime) >= 30;
  const listenedEnoughByPercent =
    Number(duration) > 0 && Number(currentTime) / Number(duration) >= 0.5;
  return listenedEnoughByTime || listenedEnoughByPercent;
};

const saveHistory = async (songId) => {
  if (!songId || isRequestInFlight || !isUserLoggedIn()) return;
  isRequestInFlight = true;
  try {
    const response = await fetch('/history/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ songId })
    });
    if (!response.ok) return;
    isSavedForCurrentPlayback = true;
  } catch (error) {
    // Keep silent to avoid affecting UX when network is unstable.
    console.error('saveHistory error:', error);
  } finally {
    isRequestInFlight = false;
  }
};

document.addEventListener('music:track-start', (event) => {
  const songId = String(event?.detail?.songId || '').trim();
  if (!songId) return;
  currentSongId = songId;
  isSavedForCurrentPlayback = false;
});

document.addEventListener('music:playback-progress', (event) => {
  if (!isUserLoggedIn() || !currentSongId || isSavedForCurrentPlayback) return;

  const payload = {
    currentTime: Number(event?.detail?.currentTime || 0),
    duration: Number(event?.detail?.duration || 0)
  };

  if (!shouldSaveHistory(payload)) return;
  saveHistory(currentSongId);
});
