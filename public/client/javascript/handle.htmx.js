(() => {
  const emitPageReady = () => {
    document.dispatchEvent(new CustomEvent("app:page-ready"));
  };

  const onBeforeRequest = (event) => {
    const verb = event.detail && event.detail.requestConfig && event.detail.requestConfig.verb;
    const path = event.detail && event.detail.pathInfo && event.detail.pathInfo.requestPath;
    if (!path) return;

    // Route auth should be full navigation (sync cookie/session/header state).
    if (verb === "get" && path.indexOf("/auth/") === 0) {
      event.preventDefault();
      window.location.assign(path);
    }
  };

  const onAfterSwap = (event) => {
    const target = event.detail && event.detail.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id !== "app-shell" && target.id !== "main-content") return;
    emitPageReady();
  };

  document.body.addEventListener("htmx:beforeRequest", onBeforeRequest);
  document.body.addEventListener("htmx:afterSwap", onAfterSwap);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", emitPageReady, { once: true });
    return;
  }

  emitPageReady();
})();