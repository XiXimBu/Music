// player-logic.js
import { getTrackDataFromButton, getPlaylistElements } from './handle.track-data.js';

let currentHowl = null;
let currentTrackUrl = '';
let currentIndex = -1;
let progressRafId = null;
let isRepeat = false;
let isShuffle = false;
let currentTrackMeta = null;
let hasBoundPlayerEvents = false;

let _lastProgressPercent = -1;
const getPlaylist = () => getPlaylistElements();
let _lastHistoryProgressEmitSecond = -1;

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

const bindPointerDrag = (container, { canStart, onRatioChange }) => {
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
  };

  container.style.touchAction = 'none';

  container.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (canStart && !canStart()) return;

    activePointerId = event.pointerId;
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
    // Not loaded yet — set to 0 and try again only while playing.
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

  if (currentTrackMeta?.songId && roundedSecond !== _lastHistoryProgressEmitSecond) {
    _lastHistoryProgressEmitSecond = roundedSecond;
    emitPlaybackEvent('music:playback-progress', {
      songId: currentTrackMeta.songId,
      currentTime: current,
      duration
    });
  }

  // Only update DOM when percent moves enough to avoid excessive writes.
  if (Math.abs(percent - _lastProgressPercent) > 0.2 || percent === 0 || percent === 100) {
    updateProgressBar(current);
    _lastProgressPercent = percent;
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

const handleSeek = (event) => {
  if (!currentHowl) return;
  const container = playerEls.progressContainer;
  if (!container) return;

  const ratio = getPointerRatio(event, container);
  const duration = currentHowl.duration() || 0;
  if (!duration) return;

  const newTime = clamp(ratio, 0, 1) * duration;
  currentHowl.seek(newTime);
  // Reflect immediately in UI
  updateProgressBar(newTime);
};

const seekTo = (timeInSeconds) => {
  if (!currentHowl) return;

  const duration = currentHowl.duration();
  if (!duration) return;

  const nextSeek = clamp(Number(timeInSeconds) || 0, 0, duration);
  currentHowl.seek(nextSeek);
  updateProgressBar(nextSeek);
};

const seekBy = (deltaInSeconds) => {
  if (!currentHowl) return;
  seekTo((Number(currentHowl.seek()) || 0) + deltaInSeconds);
};

const getRandomTrackIndex = (excludedIndex) => {
  const playlist = getPlaylist();
  if (!playlist.length) return -1;
  if (playlist.length === 1) return 0;

  let nextIndex = excludedIndex;
  while (nextIndex === excludedIndex) {
    nextIndex = Math.floor(Math.random() * playlist.length);
  }

  return nextIndex;
};

const playTrackByIndex = (index, options = {}) => {
  const { toggleIfSame = false } = options;
  const playlist = getPlaylist();

  if (index < 0 || index >= playlist.length) {
    debug('Invalid index or empty playlist', { index, playlistLength: playlist.length });
    return;
  }

  const btn = playlist[index];
  const track = getTrackDataFromButton(btn);
  debug('Step 2 - Track data', { index, track, button: btn });

  if (!track || !track.url) {
    debug('Step 2 FAIL - Missing track url', { index, track });
    return;
  }

  if (toggleIfSame && currentHowl && currentTrackUrl === track.url) {
    debug('Toggle same track', { url: track.url, isPlaying: currentHowl.playing() });
    currentHowl.playing() ? currentHowl.pause() : currentHowl.play();
    return;
  }

  if (currentHowl) {
    cancelProgressAnimation();
    currentHowl.stop();
    currentHowl.unload();
  }

  currentIndex = index;
  currentTrackUrl = track.url;
  currentTrackMeta = track;
  _lastHistoryProgressEmitSecond = -1;
  syncStickyInfo(track);
  updateProgressBar(0);
  debug('Step 3 - Create Howl', { src: track.url });
  if (track.songId) {
    emitPlaybackEvent('music:track-start', { songId: track.songId });
  }

  currentHowl = new Howl({
    src: [track.url],
    format: ['mp3'],
    html5: true,
    onplay: () => {
      debug('Step 4 - onplay fired', { url: track.url });
      setPlayIcon(true);
      // Start smooth RAF-driven progress updates
      startProgress();
    },
    onpause: () => {
      debug('onpause fired', { url: track.url });
      // Stop updates when paused and reflect current position
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
      debug('Track ended', { url: track.url, isRepeat });
      stopProgress();

      if (isRepeat) {
        seekTo(0);
        currentHowl.play();
        return;
      }

      playNextTrack();
    }
  });

  debug('Step 4 - Call play()', { url: track.url });
  currentHowl.play();
};

const playNextTrack = () => {
  const playlist = getPlaylist();
  if (!playlist.length) return;

  const nextIndex = isShuffle
    ? getRandomTrackIndex(currentIndex)
    : (currentIndex + 1) % playlist.length;

  playTrackByIndex(nextIndex);
};

const playPreviousTrack = () => {
  const playlist = getPlaylist();
  if (!playlist.length) return;

  const previousIndex = isShuffle
    ? getRandomTrackIndex(currentIndex)
    : currentIndex <= 0
      ? playlist.length - 1
      : currentIndex - 1;

  playTrackByIndex(previousIndex);
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
    const currentPlaylist = getPlaylist();
    if (!currentPlaylist.length) return;
    playTrackByIndex(currentIndex >= 0 ? currentIndex : 0);
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
      onRatioChange: (ratio) => {
        const duration = currentHowl?.duration() || 0;
        if (!duration) return;
        seekTo(duration * clamp(ratio, 0, 1));
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

  if (playerEls.progressContainer && playerEls.progressContainer.dataset.boundSeekClick !== '1') {
    playerEls.progressContainer.dataset.boundSeekClick = '1';
    playerEls.progressContainer.addEventListener('click', (event) => {
      if (isTypingInFormField()) return;
      handleSeek(event);
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
      const currentPlaylist = getPlaylist();
      if (!currentPlaylist.length) {
        debug('Play All: no [button-play-track] in page');
        return;
      }
      debug('Play All: start from index 0', { count: currentPlaylist.length });
      playTrackByIndex(0);
      return;
    }

    const btn = event.target.closest('[button-play-track]');
    if (!btn) return;

    event.preventDefault();

    const currentPlaylist = getPlaylist();
    const idx = currentPlaylist.indexOf(btn);
    if (idx < 0) return;

    const computedStyle = window.getComputedStyle(btn);
    debug('Step 1 - Click received', {
      idx,
      pointerEvents: computedStyle.pointerEvents,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      rect: btn.getBoundingClientRect(),
      attributes: {
        buttonPlayTrack: btn.getAttribute('button-play-track'),
        dataAudioUrl: btn.getAttribute('data-audio-url'),
        dataSongTitle: btn.getAttribute('data-song-title'),
        dataSongArtist: btn.getAttribute('data-song-artist'),
        dataSongCover: btn.getAttribute('data-song-cover')
      }
    });

    playTrackByIndex(idx, { toggleIfSame: true });
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
