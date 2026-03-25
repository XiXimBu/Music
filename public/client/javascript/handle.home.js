//Xử lí video đầu home
const initHomeHeroVideo = () => {
  const video = document.getElementById('hero-video');
  if (!video) return;
  if (video.dataset.homeVideoBound === '1') return;
  video.dataset.homeVideoBound = '1';

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
    } catch (error) {
      // Một số trình duyệt vẫn có thể chặn play tạm thời; bỏ qua để lần sync tiếp theo thử lại.
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
      // Theo autoplay policy: chỉ unmute sau click/touch thật.
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

  // Khởi tạo: muted + play ngay để có khung hình sớm, tránh màn hình rỗng.
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

  // Debounce scroll để không bắn play/pause liên tục khi cuộn nhanh.
  window.addEventListener('scroll', syncVideoStateDebounced, { passive: true });
  window.addEventListener('resize', syncVideoStateDebounced, { passive: true });

  // Chỉ click/touch mới được xem là user gesture hợp lệ cho bật tiếng.
  window.addEventListener('click', markUserInteraction, { passive: true });
  window.addEventListener('touchstart', markUserInteraction, { passive: true });

  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      safePause(++pendingActionId);
      return;
    }

    isInView = isVideoInViewport();
    await syncVideoState();
  });
};

if (document.readyState === 'complete') {
  initHomeHeroVideo();
} else {
  window.addEventListener('load', initHomeHeroVideo, { once: true });
}
document.addEventListener('app:page-ready', initHomeHeroVideo);
//End Xử lí video đầu home


