// Xử lý video hero trang home — Turbo: teardown trước khi cache, init lại mỗi lần vào trang (không dùng data-* chặn bind).
let homeHeroVideoCleanup = null;

const teardownHomeHeroVideo = () => {
  if (typeof homeHeroVideoCleanup === 'function') {
    homeHeroVideoCleanup();
    homeHeroVideoCleanup = null;
  }
};

const initHomeHeroVideo = () => {
  teardownHomeHeroVideo();

  const video = document.getElementById('hero-video');
  if (!video) return;

  const DEBOUNCE_MS = 150;
  const IN_VIEW_RATIO = 0.25;

  let hasUserInteracted = false;
  let isInView = false;
  let playPromise = null;
  let pendingActionId = 0;
  let scrollDebounceTimer = null;

  video.muted = true;
  video.playsInline = true;

  const isVideoInViewport = () => {
    const rect = video.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0));
    const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
    return ratio >= IN_VIEW_RATIO;
  };

  const safePlay = async (actionId) => {
    if (actionId !== pendingActionId) return;
    if (!video.paused) return;
    if (playPromise) return;

    try {
      playPromise = video.play();
      await playPromise;
    } catch {
      // Autoplay policy — lần sync sau thử lại
    } finally {
      playPromise = null;
    }
  };

  const safePause = (actionId) => {
    if (actionId !== pendingActionId) return;
    if (playPromise) return;
    if (!video.paused) {
      video.pause();
    }
  };

  const syncVideoState = async () => {
    const actionId = ++pendingActionId;

    if (document.hidden) {
      safePause(actionId);
      return;
    }

    if (isInView) {
      video.muted = !hasUserInteracted;
      await safePlay(actionId);
      return;
    }

    safePause(actionId);
  };

  const syncVideoStateDebounced = () => {
    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer);
    }

    scrollDebounceTimer = window.setTimeout(async () => {
      scrollDebounceTimer = null;
      isInView = isVideoInViewport();
      await syncVideoState();
    }, DEBOUNCE_MS);
  };

  const markUserInteraction = async () => {
    if (hasUserInteracted) return;
    hasUserInteracted = true;

    window.removeEventListener('click', markUserInteraction);
    window.removeEventListener('touchstart', markUserInteraction);

    if (isInView) {
      await syncVideoState();
    }
  };

  const onVisibilityChange = async () => {
    if (document.hidden) {
      safePause(++pendingActionId);
      return;
    }

    isInView = isVideoInViewport();
    await syncVideoState();
  };

  isInView = isVideoInViewport();
  syncVideoState();

  const observer = new IntersectionObserver(
    async (entries) => {
      const entry = entries[0];
      isInView = entry.isIntersecting && entry.intersectionRatio >= IN_VIEW_RATIO;
      await syncVideoState();
    },
    {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    }
  );

  observer.observe(video);

  window.addEventListener('scroll', syncVideoStateDebounced, { passive: true });
  window.addEventListener('resize', syncVideoStateDebounced, { passive: true });
  window.addEventListener('click', markUserInteraction, { passive: true });
  window.addEventListener('touchstart', markUserInteraction, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  homeHeroVideoCleanup = () => {
    pendingActionId += 1;
    if (scrollDebounceTimer) {
      clearTimeout(scrollDebounceTimer);
      scrollDebounceTimer = null;
    }
    observer.disconnect();
    window.removeEventListener('scroll', syncVideoStateDebounced, { passive: true });
    window.removeEventListener('resize', syncVideoStateDebounced, { passive: true });
    window.removeEventListener('click', markUserInteraction, { passive: true });
    window.removeEventListener('touchstart', markUserInteraction, { passive: true });
    document.removeEventListener('visibilitychange', onVisibilityChange);
    try {
      video.pause();
    } catch {
      // ignore
    }
  };
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomeHeroVideo, { once: true });
} else {
  initHomeHeroVideo();
}

document.addEventListener('app:page-ready', initHomeHeroVideo);
document.addEventListener('turbo:before-cache', teardownHomeHeroVideo);
