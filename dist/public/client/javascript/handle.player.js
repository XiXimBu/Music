// player-logic.js — queue theo ngữ cảnh + radio khi hết list
import {
  getTrackDataFromButton,
  getPlaylistElements,
  buildQueueFromButton,
  normalizeAudioUrl
} from './handle.track-data.js';

let currentHowl = null;
let currentTrackUrl = '';
/** Danh sách phát hiện tại (metadata từng bài) */
let playerQueue = [];
let queueCurrentIndex = -1;
let playbackContext = { type: 'none', id: '' };
let progressRafId = null;
let isRepeat = false;
let isShuffle = false;
let currentTrackMeta = null;
let hasBoundPlayerEvents = false;

let _lastProgressPercent = -1;
const getPlaylist = () => getPlaylistElements();
let _lastHistoryProgressEmitSecond = -1;

/** Khi true: RAF không đọc seek() để vẽ thanh (tránh race với HTML5). Tắt qua Howler `onseek` hoặc khi thả chuột kéo. */
let suppressProgressFromHowl = false;
/** Đang kéo thanh tiến độ: bỏ qua `onseek` (mỗi lần kéo gọi seek nhiều lần). */
let isPointerScrubbingProgress = false;

const emitPlaybackEvent = (name, detail) => {
  document.dispatchEvent(new CustomEvent(name, { detail }));
};

const getPlayerElements = () => ({
  sticky: document.getElementById('sticky-player'),
  title: document.getElementById('player-title'),
  artist: document.getElementById('player-artist'),
  cover: document.getElementById('player-cover'),
  progressContainer: document.getElementById('player-progress-container'),
  progress: document.getElementById('player-progress-bar'),
  volumeContainer: document.getElementById('player-volume-container'),
  volumeBar: document.getElementById('player-volume-bar'),
  mainPlayPause: document.getElementById('player-main-play-pause'),
  prev: document.getElementById('player-prev-btn'),
  next: document.getElementById('player-next-btn'),
  shuffle: document.getElementById('player-shuffle-btn'),
  repeat: document.getElementById('player-repeat-btn'),
  icon: document.getElementById('player-play-icon')
});

let playerEls = getPlayerElements();


const debug = (...args) => {
  if (window?.__PLAYER_DEBUG__) {
    console.log('[PlayerDebug]', ...args);
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const resetUserSeekState = () => {
  suppressProgressFromHowl = false;
  isPointerScrubbingProgress = false;
};

/** Howler đã đồng bộ seek với audio (sau tua phím / seek không phải lúc đang kéo chuột). */
const clearSuppressAfterHowlSeek = () => {
  if (isPointerScrubbingProgress) return;
  suppressProgressFromHowl = false;
  _lastProgressPercent = -1;
  if (currentHowl) {
    updateProgressBar(Number(currentHowl.seek()) || 0);
  }
};

/** Thả chuột sau kéo thanh: `onseek` bị bỏ qua trong lúc kéo nên tắt suppress tại đây. */
const finishPointerScrubbingProgress = () => {
  isPointerScrubbingProgress = false;
  suppressProgressFromHowl = false;
  _lastProgressPercent = -1;
  if (currentHowl) {
    updateProgressBar(Number(currentHowl.seek()) || 0);
  }
};

function stopProgress() {
  if (progressRafId !== null) {
    cancelAnimationFrame(progressRafId);
    progressRafId = null;
  }
}

const cancelProgressAnimation = stopProgress;

const setPlayIcon = (isPlaying) => {
  if (!playerEls.icon) return;
  playerEls.icon.innerText = isPlaying ? 'pause' : 'play_arrow';
};

const syncStickyInfo = (track) => {
  if (playerEls.title) playerEls.title.innerText = track.title;
  if (playerEls.artist) playerEls.artist.innerText = track.artist;
  if (playerEls.cover) playerEls.cover.src = track.cover;
  if (playerEls.sticky) playerEls.sticky.classList.remove('hidden');
};

const hydratePlayerUI = () => {
  playerEls = getPlayerElements();
  bindPlayerElementEvents();

  if (currentTrackMeta) {
    syncStickyInfo(currentTrackMeta);
  }

  setPlayIcon(Boolean(currentHowl?.playing?.()));
  updateVolumeBar(Howler.volume());
  if (currentHowl) {
    updateProgressBar(Number(currentHowl.seek()) || 0);
  } else {
    updateProgressBar(0);
  }
  updateModeButtons();
};

const updateModeButtons = () => {
  if (playerEls.shuffle) {
    playerEls.shuffle.classList.toggle('text-primary', isShuffle);
    playerEls.shuffle.classList.toggle('text-on-surface-variant', !isShuffle);
  }

  if (playerEls.repeat) {
    playerEls.repeat.classList.toggle('text-primary', isRepeat);
    playerEls.repeat.classList.toggle('text-on-surface-variant', !isRepeat);
  }
};

const updateProgressBar = (seekTime = 0) => {
  const el = playerEls.progress;
  if (!el) return;

  const duration = currentHowl?.duration?.() || 0;
  const safeSeek = clamp(Number(seekTime) || 0, 0, duration || 0);
  const progressPercent = duration > 0 ? (safeSeek / duration) * 100 : 0;

  // Write a single transform style to avoid layout thrashing.
  // Set scaleX on the progress element (assumes container masks overflow).
  el.style.transform = `scaleX(${progressPercent / 100})`;
};

const updateVolumeBar = (volume = Howler.volume()) => {
  if (!playerEls.volumeBar) return;
  playerEls.volumeBar.style.width = `${clamp(volume, 0, 1) * 100}%`;
};

const setVolume = (volume) => {
  const nextVolume = clamp(volume, 0, 1);
  Howler.volume(nextVolume);
  updateVolumeBar(nextVolume);
  return nextVolume;
};

const createRafValueScheduler = (callback) => {
  let rafId = null;
  let latestValue = 0;

  const run = () => {
    rafId = null;
    callback(latestValue);
  };

  return {
    schedule(value) {
      latestValue = value;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(run);
    },
    flush(value) {
      latestValue = value;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      callback(latestValue);
    },
    cancel() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  };
};

const getPointerRatio = (event, container) => {
  if (!container) return 0;

  const rect = container.getBoundingClientRect();
  if (!rect.width) return 0;

  return clamp((event.clientX - rect.left) / rect.width, 0, 1);
};

const isEditableElement = (element) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;

  return Boolean(
    element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
  );
};

const isTypingInFormField = () => isEditableElement(document.activeElement);

const bindPointerDrag = (container, { canStart, onRatioChange, onDragStart, onDragEnd }) => {
  if (!container) return;

  let activePointerId = null;
  const scheduler = createRafValueScheduler(onRatioChange);

  const updateFromPointer = (event) => {
    scheduler.schedule(getPointerRatio(event, container));
  };

  const stopDragging = (event) => {
    if (event.pointerId !== activePointerId) return;

    scheduler.flush(getPointerRatio(event, container));

    if (container.hasPointerCapture?.(activePointerId)) {
      container.releasePointerCapture(activePointerId);
    }

    activePointerId = null;
    onDragEnd?.();
  };

  container.style.touchAction = 'none';

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (canStart && !canStart()) return;

    activePointerId = event.pointerId;
    onDragStart?.();
    container.setPointerCapture?.(activePointerId);
    event.preventDefault();
    scheduler.flush(getPointerRatio(event, container));
  });

  container.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    updateFromPointer(event);
  });

  container.addEventListener('pointerup', stopDragging);
  container.addEventListener('pointercancel', stopDragging);
  container.addEventListener('lostpointercapture', () => {
    activePointerId = null;
    scheduler.cancel();
    onDragEnd?.();
  });
};

function updateProgress() {
  if (!currentHowl) {
    progressRafId = null;
    updateProgressBar(0);
    return;
  }

  const duration = currentHowl.duration() || 0;
  if (!duration) {
    updateProgressBar(0);
    if (currentHowl.playing && currentHowl.playing()) {
      progressRafId = requestAnimationFrame(updateProgress);
    } else {
      progressRafId = null;
    }
    return;
  }

  const current = Number(currentHowl.seek()) || 0;
  const percent = (current / duration) * 100;
  const roundedSecond = Math.floor(current);

  if (!suppressProgressFromHowl) {
    if (currentTrackMeta?.songId && roundedSecond !== _lastHistoryProgressEmitSecond) {
      _lastHistoryProgressEmitSecond = roundedSecond;
      emitPlaybackEvent('music:playback-progress', {
        songId: currentTrackMeta.songId,
        currentTime: current,
        duration
      });
    }

    if (Math.abs(percent - _lastProgressPercent) > 0.2 || percent === 0 || percent === 100) {
      updateProgressBar(current);
      _lastProgressPercent = percent;
    }
  }

  if (currentHowl.playing && currentHowl.playing()) {
    progressRafId = requestAnimationFrame(updateProgress);
  } else {
    progressRafId = null;
  }
}

function startProgress() {
  if (progressRafId !== null) return;
  _lastProgressPercent = -1;
  progressRafId = requestAnimationFrame(updateProgress);
}

const seekTo = (timeInSeconds, options = {}) => {
  const { userInitiated = false } = options;
  if (!currentHowl) return;

  const duration = currentHowl.duration();
  if (!duration) return;

  const nextSeek = clamp(Number(timeInSeconds) || 0, 0, duration);

  if (userInitiated) {
    suppressProgressFromHowl = true;
  }
  currentHowl.seek(nextSeek);
  updateProgressBar(nextSeek);
};

const seekBy = (deltaInSeconds) => {
  if (!currentHowl) return;
  const base = Number(currentHowl.seek()) || 0;
  seekTo(base + deltaInSeconds, { userInitiated: true });
};

const getRandomTrackIndex = (excludedIndex) => {
  if (!playerQueue.length) return -1;
  if (playerQueue.length === 1) return 0;

  let nextIndex = excludedIndex;
  while (nextIndex === excludedIndex) {
    nextIndex = Math.floor(Math.random() * playerQueue.length);
  }

  return nextIndex;
};

const fetchAndAppendRadioThenPlayNext = async () => {
  const meta = currentTrackMeta;
  if (!meta?.songId) {
    debug('Radio: no songId — cannot recommend');
    return;
  }
  const excludeIds = [...new Set(playerQueue.map((t) => t.songId).filter(Boolean))];
  try {
    const params = new URLSearchParams({
      songId: meta.songId,
      excludeIds: excludeIds.join(',')
    });
    const res = await fetch(`/api/songs/recommend-next?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    const songs = data.songs || [];
    if (!songs.length) {
      debug('Radio: empty list');
      return;
    }
    const newTracks = songs.map((s) => ({
      url: normalizeAudioUrl(s.audioUrl),
      songId: String(s._id),
      title: s.title || 'Unknown',
      artist: s.artistNames || 'Unknown',
      cover: s.coverImage || '/images/default-song.png'
    }));
    playerQueue = playerQueue.concat(newTracks);
    debug('Radio: appended', { added: newTracks.length, total: playerQueue.length });
    playTrackAtQueueIndex(queueCurrentIndex + 1);
  } catch (e) {
    console.error('[Player] recommend-next', e);
  }
};

const playTrackAtQueueIndex = (index, options = {}) => {
  const { toggleIfSame = false } = options;

  if (index < 0 || index >= playerQueue.length) {
    debug('Invalid queue index', { index, queueLength: playerQueue.length });
    return;
  }

  const track = playerQueue[index];
  debug('Queue play', { index, context: playbackContext, track });

  if (!track || !track.url) {
    debug('Missing track url', { index, track });
    return;
  }

  if (toggleIfSame && currentHowl && currentTrackUrl === track.url) {
    debug('Toggle same track', { url: track.url, isPlaying: currentHowl.playing() });
    currentHowl.playing() ? currentHowl.pause() : currentHowl.play();
    return;
  }

  if (currentHowl) {
    cancelProgressAnimation();
    resetUserSeekState();
    currentHowl.stop();
    currentHowl.unload();
  }

  queueCurrentIndex = index;
  currentTrackUrl = track.url;
  currentTrackMeta = track;
  _lastHistoryProgressEmitSecond = -1;
  syncStickyInfo(track);
  updateProgressBar(0);
  if (track.songId) {
    emitPlaybackEvent('music:track-start', { songId: track.songId });
  }

  currentHowl = new Howl({
    src: [track.url],
    format: ['mp3'],
    html5: true,
    onplay: () => {
      setPlayIcon(true);
      startProgress();
    },
    onseek: () => {
      clearSuppressAfterHowlSeek();
    },
    onpause: () => {
      stopProgress();
      updateProgressBar(currentHowl ? currentHowl.seek() : 0);
      setPlayIcon(false);
    },
    onloaderror: (id, err) => {
      debug('LOAD ERROR', { id, err, url: track.url });
    },
    onplayerror: (id, err) => {
      debug('PLAY ERROR', { id, err, url: track.url });
    },
    onend: () => {
      debug('Track ended', { isRepeat });
      stopProgress();

      if (isRepeat) {
        seekTo(0);
        currentHowl.play();
        return;
      }

      playNextTrack();
    }
  });

  currentHowl.play();
};

const playNextTrack = () => {
  if (!playerQueue.length) return;

  if (isShuffle) {
    playTrackAtQueueIndex(getRandomTrackIndex(queueCurrentIndex));
    return;
  }

  if (queueCurrentIndex < playerQueue.length - 1) {
    playTrackAtQueueIndex(queueCurrentIndex + 1);
    return;
  }

  void fetchAndAppendRadioThenPlayNext();
};

const playPreviousTrack = () => {
  if (!playerQueue.length) return;

  if (isShuffle) {
    playTrackAtQueueIndex(getRandomTrackIndex(queueCurrentIndex));
    return;
  }

  const previousIndex =
    queueCurrentIndex <= 0 ? playerQueue.length - 1 : queueCurrentIndex - 1;

  playTrackAtQueueIndex(previousIndex);
};

const handleKeyboardShortcuts = (event) => {
  if (isTypingInFormField()) return;

  switch (event.key) {
    case 'ArrowRight':
      if (!currentHowl) return;
      event.preventDefault();
      seekBy(5);
      break;
    case 'ArrowLeft':
      if (!currentHowl) return;
      event.preventDefault();
      seekBy(-5);
      break;
    case 'ArrowUp':
      event.preventDefault();
      setVolume((Howler.volume() || 0) + 0.1);
      break;
    case 'ArrowDown':
      event.preventDefault();
      setVolume((Howler.volume() || 0) - 0.1);
      break;
    default:
      break;
  }
};

const handleMainPlayPauseClick = () => {
  if (!currentHowl) {
    if (!playerQueue.length) return;
    playTrackAtQueueIndex(queueCurrentIndex >= 0 ? queueCurrentIndex : 0);
    return;
  }

  currentHowl.playing() ? currentHowl.pause() : currentHowl.play();
};

const bindPlayerElementEvents = () => {
  if (playerEls.mainPlayPause && playerEls.mainPlayPause.dataset.boundClick !== '1') {
    playerEls.mainPlayPause.dataset.boundClick = '1';
    playerEls.mainPlayPause.addEventListener('click', handleMainPlayPauseClick);
  }

  if (playerEls.prev && playerEls.prev.dataset.boundClick !== '1') {
    playerEls.prev.dataset.boundClick = '1';
    playerEls.prev.addEventListener('click', playPreviousTrack);
  }

  if (playerEls.next && playerEls.next.dataset.boundClick !== '1') {
    playerEls.next.dataset.boundClick = '1';
    playerEls.next.addEventListener('click', playNextTrack);
  }

  if (playerEls.shuffle && playerEls.shuffle.dataset.boundClick !== '1') {
    playerEls.shuffle.dataset.boundClick = '1';
    playerEls.shuffle.addEventListener('click', () => {
      isShuffle = !isShuffle;
      updateModeButtons();
    });
  }

  if (playerEls.repeat && playerEls.repeat.dataset.boundClick !== '1') {
    playerEls.repeat.dataset.boundClick = '1';
    playerEls.repeat.addEventListener('click', () => {
      isRepeat = !isRepeat;
      updateModeButtons();
    });
  }

  if (playerEls.progressContainer && playerEls.progressContainer.dataset.boundDrag !== '1') {
    playerEls.progressContainer.dataset.boundDrag = '1';
    bindPointerDrag(playerEls.progressContainer, {
      canStart: () => {
        if (!currentHowl) return false;
        return Boolean(currentHowl.duration());
      },
      onDragStart: () => {
        isPointerScrubbingProgress = true;
        suppressProgressFromHowl = true;
      },
      onRatioChange: (ratio) => {
        const duration = currentHowl?.duration() || 0;
        if (!duration || !currentHowl) return;
        const nextSeek = duration * clamp(ratio, 0, 1);
        currentHowl.seek(nextSeek);
        updateProgressBar(nextSeek);
      },
      onDragEnd: () => {
        finishPointerScrubbingProgress();
      }
    });
  }

  if (playerEls.volumeContainer && playerEls.volumeContainer.dataset.boundDrag !== '1') {
    playerEls.volumeContainer.dataset.boundDrag = '1';
    bindPointerDrag(playerEls.volumeContainer, {
      onRatioChange: (ratio) => {
        setVolume(clamp(ratio, 0, 1));
      }
    });
  }

};

export const initPlayer = () => {
  hydratePlayerUI();
  const playlist = getPlaylist();

  debug('initPlayer called', {
    playlistLength: playlist.length,
    stickyExists: !!playerEls.sticky,
    mainPlayPauseExists: !!playerEls.mainPlayPause
  });

  if (!playlist.length) {
    debug('No [button-play-track] elements found at init time');
  }

  if (hasBoundPlayerEvents) {
    return;
  }
  hasBoundPlayerEvents = true;

  // Event delegation so tracks rendered later (search results) can still be played.
  document.addEventListener('click', (event) => {
    const playAllBtn = event.target.closest('[button-play-all]');
    if (playAllBtn) {
      event.preventDefault();
      const root =
        playAllBtn.closest('[data-play-queue]') || document.querySelector('main [data-play-queue]');
      if (!root) {
        debug('Play All: no [data-play-queue] on page');
        return;
      }
      const buttons = Array.from(root.querySelectorAll('[button-play-track]'));
      const queue = buttons.map(getTrackDataFromButton).filter((t) => t && t.url);
      if (!queue.length) return;
      playerQueue = queue;
      playbackContext = {
        type: root.getAttribute('data-play-context') || 'list',
        id: root.getAttribute('data-play-context-id') || ''
      };
      queueCurrentIndex = 0;
      debug('Play All', { count: queue.length, playbackContext });
      playTrackAtQueueIndex(0);
      return;
    }

    const btn = event.target.closest('[button-play-track]');
    if (!btn) return;

    event.preventDefault();

    const { queue, index, context } = buildQueueFromButton(btn);
    if (!queue.length) return;

    playerQueue = queue;
    playbackContext = context;
    queueCurrentIndex = index;

    debug('Play click', { index, queueLen: queue.length, playbackContext });

    playTrackAtQueueIndex(index, { toggleIfSame: true });
  });

  // Improve progress element performance and add click-to-seek
  if (playerEls.progress) {
    playerEls.progress.style.width = '100%';
    playerEls.progress.style.transformOrigin = 'left center';
    playerEls.progress.style.willChange = 'transform';
  }

  document.addEventListener('keydown', handleKeyboardShortcuts);

  setVolume(0.67);
  updateProgressBar(0);
  updateModeButtons();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayer, { once: true });
} else {
  initPlayer();
}

// Turbo Drive + data-turbo-permanent: DOM player giữ nguyên; mỗi lần đổi trang chỉ cần đồng bộ UI.
document.addEventListener('app:page-ready', hydratePlayerUI);
window.addEventListener('pageshow', hydratePlayerUI);
window.addEventListener('popstate', hydratePlayerUI);
