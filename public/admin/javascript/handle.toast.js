/**
 * Toast từ server (session flash): slide-in, tự ẩn sau vài giây, nút đóng, progress bar.
 * Hỗ trợ nhiều toast xếp chồng (stack).
 */
(function () {
	"use strict";

	var DURATION_MS = 3000;
	var TRANSITION_MS = 350;

	/** @typedef {{ type: 'success' | 'error', message: string }} ToastPayload */

	function ensureKeyframes() {
		if (document.getElementById("toast-keyframes")) return;
		var style = document.createElement("style");
		style.id = "toast-keyframes";
		style.textContent =
			"@keyframes toast-progress-shrink { " +
			"from { transform: scaleX(1); } " +
			"to { transform: scaleX(0); } " +
			"}";
		document.head.appendChild(style);
	}

	/**
	 * @param {ToastPayload} t
	 * @returns {{ bar: string, icon: string, panel: string }}
	 */
	function classesForType(t) {
		if (t.type === "success") {
			return {
				bar: "bg-white/70",
				icon: "check_circle",
				panel: "bg-green-500 text-white",
			};
		}
		return {
			bar: "bg-white/70",
			icon: "error",
			panel: "bg-red-500 text-white",
		};
	}

	/**
	 * @param {ToastPayload} payload
	 * @param {HTMLElement} container
	 */
	function mountToast(payload, container) {
		var c = classesForType(payload);
		var root = document.createElement("div");
		root.className =
			"pointer-events-auto w-full overflow-hidden rounded-lg shadow-lg " +
			"transition-all ease-in-out translate-x-full opacity-0 " +
			"will-change-transform";
		root.style.transitionDuration = TRANSITION_MS + "ms";

		var panel = document.createElement("div");
		panel.className =
			"flex items-start gap-3 px-4 py-3 " + c.panel + " font-body text-sm";

		var icon = document.createElement("span");
		icon.className = "material-symbols-outlined shrink-0 text-[22px] leading-none mt-0.5";
		icon.textContent = c.icon;

		var msg = document.createElement("p");
		msg.className = "flex-1 min-w-0 break-words leading-snug";
		msg.textContent = payload.message;

		var closeBtn = document.createElement("button");
		closeBtn.type = "button";
		closeBtn.setAttribute("aria-label", "Đóng");
		closeBtn.className =
			"shrink-0 -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full " +
			"text-xl leading-none hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white/40";
		closeBtn.textContent = "\u00d7";

		panel.appendChild(icon);
		panel.appendChild(msg);
		panel.appendChild(closeBtn);

		var track = document.createElement("div");
		track.className = "h-1 w-full overflow-hidden bg-black/20";

		var bar = document.createElement("div");
		bar.className = "h-full origin-left " + c.bar;
		bar.style.transform = "scaleX(1)";
		bar.style.animation =
			"toast-progress-shrink " +
			DURATION_MS +
			"ms cubic-bezier(0.4, 0, 0.2, 1) forwards";

		track.appendChild(bar);
		root.appendChild(panel);
		root.appendChild(track);
		container.appendChild(root);

		function dismiss() {
			if (root.dataset.dismissed === "1") return;
			root.dataset.dismissed = "1";
			window.clearTimeout(autoTimer);
			root.classList.remove("translate-x-0", "opacity-100");
			root.classList.add("translate-x-full", "opacity-0");
			window.setTimeout(function () {
				root.remove();
			}, TRANSITION_MS);
		}

		var autoTimer = window.setTimeout(dismiss, DURATION_MS);

		closeBtn.addEventListener("click", function () {
			dismiss();
		});

		// Hai frame: đảm bảo transition từ translate-x-full → translate-x-0
		window.requestAnimationFrame(function () {
			window.requestAnimationFrame(function () {
				root.classList.remove("translate-x-full", "opacity-0");
				root.classList.add("translate-x-0", "opacity-100");
			});
		});
	}

	function init() {
		var dataEl = document.getElementById("admin-toast-data");
		var container = document.getElementById("toast-container");
		if (!dataEl || !container) return;

		/** @type {ToastPayload[]} */
		var list = [];
		try {
			list = JSON.parse(dataEl.textContent || "[]");
		} catch (e) {
			return;
		}
		dataEl.remove();

		if (!Array.isArray(list) || list.length === 0) return;

		ensureKeyframes();

		list.forEach(function (item) {
			if (!item || !item.message) return;
			var type = item.type === "error" ? "error" : "success";
			mountToast({ type: type, message: String(item.message) }, container);
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
