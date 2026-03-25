

const NAV_KEYS = ["home", "explore", "library", "profile"];

const CLASS_INACTIVE =
	"footer-mobile-nav flex flex-col items-center justify-center text-slate-400 px-5 py-2 transition-all duration-300 hover:bg-white/10 hover:text-teal-300 hover:ring-1 hover:ring-teal-400/30 scale-105 active:scale-95";

const CLASS_ACTIVE =
	"footer-mobile-nav flex flex-col items-center justify-center rounded-2xl px-5 py-2 duration-300 bg-teal-400/20 text-teal-400 shadow-[0_0_15px_rgba(68,226,205,0.3)] scale-105 active:scale-95 hover:bg-teal-400/35 hover:text-teal-200 hover:ring-1 hover:ring-teal-300/50";

function normalizePath(pathname) {
	const p = pathname.replace(/\/+$/, "") || "/";
	return p;
}

export function resolveFooterActiveKey(pathname = window.location.pathname) {
	const p = normalizePath(pathname);
	if (p === "/" || p === "/home") return "home";
	if (p.startsWith("/user/profile")) return "profile";
	if (p.startsWith("/auth/login")) return "profile";
	if (p.startsWith("/library")) return "library";
	if (p.startsWith("/explore")) return "explore";
	return "explore";
}

function navigateProfileGuestToLogin(e) {
	const link = e.target.closest('a[data-footer-nav="profile"]');
	if (!link || link.getAttribute("data-profile-auth") !== "guest") return;
	e.preventDefault();
	e.stopPropagation();
	window.location.assign("/auth/login");
}

function applyFooterNavState() {
	const activeKey = resolveFooterActiveKey();

	NAV_KEYS.forEach((key) => {
		const el = document.querySelector(`[data-footer-nav="${key}"]`);
		if (!el) return;
		const isActive = key === activeKey;
		el.className = isActive ? CLASS_ACTIVE : CLASS_INACTIVE;

		const spans = el.querySelectorAll("span.font-manrope");
		const label = spans[spans.length - 1];
		if (label) {
			if (isActive) label.classList.add("font-bold");
			else label.classList.remove("font-bold");
		}
	});
}

function initFooterNav() {
	applyFooterNavState();
}

document.body.addEventListener("click", navigateProfileGuestToLogin, true);

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initFooterNav, { once: true });
} else {
	initFooterNav();
}

document.addEventListener("app:page-ready", initFooterNav);
