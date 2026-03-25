/**
 * Highlight mục sidebar theo URL hiện tại (pathname).
 * Thứ tự kiểm tra: /admin/song/create trước /admin/song; /admin/dashboard; /admin/artist.
 */
(function () {
	"use strict";

	var NAV_ACTIVE =
		"flex items-center gap-3 px-4 py-3 bg-zinc-800 text-blue-400 rounded-full shadow-[0_0_20px_rgba(166,197,250,0.15)] transition-all duration-300 group";
	var NAV_INACTIVE =
		"flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-full transition-all duration-300 group";

	var FOOTER_CTA_INACTIVE =
		"w-full mb-4 py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2";

	function resolveActiveKey(pathname) {
		if (pathname === "/admin/dashboard" || pathname.indexOf("/admin/dashboard/") === 0) {
			return "dashboard";
		}
		if (pathname.indexOf("/admin/song/create") === 0) {
			return "song-create";
		}
		if (pathname.indexOf("/admin/song") === 0) {
			return "songs";
		}
		if (pathname.indexOf("/admin/artist") === 0) {
			return "artists";
		}
		return null;
	}

	function applyClasses(el, activeKey) {
		var key = el.getAttribute("data-sider-nav");
		if (!key) return;

		var isActive = activeKey !== null && key === activeKey;

		if (key === "song-create") {
			el.className = isActive ? NAV_ACTIVE : FOOTER_CTA_INACTIVE;
			return;
		}

		el.className = isActive ? NAV_ACTIVE : NAV_INACTIVE;
	}

	function init() {
		var pathname = window.location.pathname || "";
		var activeKey = resolveActiveKey(pathname);
		document.querySelectorAll("[data-sider-nav]").forEach(function (el) {
			applyClasses(el, activeKey);
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
