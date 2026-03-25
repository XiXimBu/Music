const bindCarousel = (containerId, prevId, nextId, boundKey) => {
  const container = document.getElementById(containerId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);

  if (!container || !prevBtn || !nextBtn) return;
  if (container.dataset[boundKey] === '1') return;
  container.dataset[boundKey] = '1';

  // Arrow function lấy độ rộng item và gap
  const getScrollStep = () => {
    const firstItem = container.firstElementChild;
    if (!firstItem) return container.clientWidth;
    
    const style = window.getComputedStyle(container);
    const gap = parseFloat(style.gap) || 0;
    return firstItem.offsetWidth + gap;
  };

  // Arrow function cập nhật trạng thái nút
  const updateButtons = () => {
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    // Dùng Math.ceil để tránh lỗi làm tròn trên màn hình Retina
    prevBtn.disabled = scrollLeft <= 5; 
    nextBtn.disabled = Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 5;
    
    // Thêm hiệu ứng mờ cho nút khi bị disabled
    [prevBtn, nextBtn].forEach(btn => {
      btn.style.opacity = btn.disabled ? "0.3" : "1";
      btn.style.cursor = btn.disabled ? "not-allowed" : "pointer";
    });
  };

  // Click handlers
  nextBtn.addEventListener('click', () => {
    container.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
  });

  prevBtn.addEventListener('click', () => {
    container.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
  });

  // Lắng nghe sự kiện
  container.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);

  // Khởi tạo trạng thái ban đầu
  updateButtons();
};

const initTopicCarousel = () => {
  bindCarousel('topic-container', 'topic-prev', 'topic-next', 'topicBound');
  bindCarousel('latest-container', 'latest-prev', 'latest-next', 'latestBound');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTopicCarousel, { once: true });
} else {
  initTopicCarousel();
}
document.addEventListener('app:page-ready', initTopicCarousel);