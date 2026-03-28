/** Turbo Drive: carousel bị gắn lại mỗi lần vào trang; cleanup trước khi cache để không bỏ sót listener / cờ data-* */
const carouselCleanups = new Map();

const bindCarousel = (containerId, prevId, nextId) => {
  const prevCleanup = carouselCleanups.get(containerId);
  if (prevCleanup) {
    prevCleanup();
    carouselCleanups.delete(containerId);
  }

  const container = document.getElementById(containerId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);

  if (!container || !prevBtn || !nextBtn) return;

  const getScrollStep = () => {
    const firstItem = container.firstElementChild;
    if (!firstItem) return container.clientWidth;

    const style = window.getComputedStyle(container);
    const gap = parseFloat(style.gap) || 0;
    return firstItem.offsetWidth + gap;
  };

  const updateButtons = () => {
    const { scrollLeft, scrollWidth, clientWidth } = container;

    prevBtn.disabled = scrollLeft <= 5;
    nextBtn.disabled = Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 5;

    [prevBtn, nextBtn].forEach((btn) => {
      btn.style.opacity = btn.disabled ? '0.3' : '1';
      btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer';
    });
  };

  const onNextClick = () => {
    container.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
  };

  const onPrevClick = () => {
    container.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
  };

  const onScroll = () => updateButtons();

  nextBtn.addEventListener('click', onNextClick);
  prevBtn.addEventListener('click', onPrevClick);
  container.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateButtons);

  updateButtons();

  carouselCleanups.set(containerId, () => {
    nextBtn.removeEventListener('click', onNextClick);
    prevBtn.removeEventListener('click', onPrevClick);
    container.removeEventListener('scroll', onScroll, { passive: true });
    window.removeEventListener('resize', updateButtons);
  });
};

const teardownCarousels = () => {
  carouselCleanups.forEach((fn) => fn());
  carouselCleanups.clear();
};

const initTopicCarousel = () => {
  bindCarousel('topic-container', 'topic-prev', 'topic-next');
  bindCarousel('latest-container', 'latest-prev', 'latest-next');
  bindCarousel('for-you-container', 'for-you-prev', 'for-you-next');
  bindCarousel('artist-container', 'artist-prev', 'artist-next');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTopicCarousel, { once: true });
} else {
  initTopicCarousel();
}

document.addEventListener('app:page-ready', initTopicCarousel);
document.addEventListener('turbo:before-cache', teardownCarousels);
