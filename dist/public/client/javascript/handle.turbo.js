(() => {
  const emitPageReady = () => {
    document.dispatchEvent(new CustomEvent('app:page-ready'));
  };

  document.addEventListener('turbo:load', emitPageReady);

  document.addEventListener('turbo:before-visit', (event) => {
    const urlRaw = event.detail?.url;
    if (typeof urlRaw !== 'string') return;
    let pathname;
    try {
      pathname = new URL(urlRaw, window.location.origin).pathname;
    } catch {
      return;
    }
    if (pathname.indexOf('/auth/') === 0) {
      event.preventDefault();
      window.location.assign(urlRaw);
    }
  });
})();
