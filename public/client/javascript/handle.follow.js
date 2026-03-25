(() => {
	const showToast = (message, type = "success") => {
		const toast = document.createElement("div");
		toast.textContent = message;
		toast.className =
			"fixed right-6 top-6 z-[9999] px-4 py-3 rounded-lg font-semibold shadow-lg transition-opacity duration-300 " +
			(type === "success"
				? "bg-secondary text-on-secondary"
				: "bg-error text-on-error");
		document.body.appendChild(toast);
		setTimeout(() => {
			toast.style.opacity = "0";
		}, 2200);
		setTimeout(() => {
			toast.remove();
		}, 2600);
	};

	const setButtonState = (btn, isFollowing) => {
		btn.dataset.following = isFollowing ? "true" : "false";
		btn.textContent = isFollowing ? "Unfollow" : "Follow";
		btn.classList.toggle("bg-secondary", isFollowing);
		btn.classList.toggle("text-on-secondary", isFollowing);
		btn.classList.toggle("border-secondary", isFollowing);
	};

	const requestFollow = async (artistId, isFollowing) => {
		if (isFollowing) {
			const response = await fetch(`/follow-artist/${encodeURIComponent(artistId)}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
			});
			return response.json();
		}

		const response = await fetch("/follow-artist", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ artistId }),
		});
		return response.json();
	};

	const onClickFollowButton = async (btn) => {
		const artistId = String(btn.getAttribute("data-artist-id") || "").trim();
		if (!artistId) {
			showToast("Thiếu artistId.", "error");
			return;
		}

		const isFollowing = btn.dataset.following === "true";
		const originalText = btn.textContent || "";
		btn.disabled = true;
		btn.textContent = isFollowing ? "Unfollowing..." : "Following...";

		try {
			const result = await requestFollow(artistId, isFollowing);
			if (!result || typeof result.code !== "number") {
				throw new Error("Phản hồi không hợp lệ.");
			}

			if (result.code >= 400) {
				showToast(result.message || "Thao tác thất bại.", "error");
				btn.textContent = originalText;
				return;
			}

			setButtonState(btn, !isFollowing);
			showToast(result.message || "Thao tác thành công.");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Không thể xử lý theo dõi nghệ sĩ.";
			showToast(message, "error");
			btn.textContent = originalText;
		} finally {
			btn.disabled = false;
		}
	};

	const bindFollowButtons = () => {
		document.querySelectorAll("[data-follow-artist-btn]").forEach((node) => {
			if (!(node instanceof HTMLButtonElement)) return;
			if (node.dataset.followBound === "1") return;
			node.dataset.followBound = "1";
			node.addEventListener("click", () => {
				void onClickFollowButton(node);
			});
		});
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bindFollowButtons, { once: true });
	} else {
		bindFollowButtons();
	}
	document.addEventListener("app:page-ready", bindFollowButtons);
})();
