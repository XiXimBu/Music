const initPlaylistPage = () => {
	const SELECTED_PLAYLIST_STORAGE_KEY = "selected_add_playlist_id";
	const playlistGrid = document.getElementById("playlistGrid");
	const openCreateModalBtn = document.getElementById("openCreatePlaylistModal");
	const createModal = document.getElementById("createPlaylistModal");
	const cancelCreateBtn = document.getElementById("cancelCreatePlaylist");
	const createSubmitBtn = document.getElementById("createPlaylistSubmit");
	const createTitleInput = document.getElementById("createPlaylistTitle");
	const createDescriptionInput = document.getElementById("createPlaylistDescription");
	const emptyState = document.getElementById("playlistEmptyState");

	const showToast = (message, type = "success") => {
		const toast = document.createElement("div");
		toast.textContent = message;
		toast.className =
			"fixed right-6 top-6 z-[9999] px-4 py-3 rounded-lg font-semibold shadow-lg transition-opacity duration-300 " +
			(type === "success" ? "bg-secondary text-on-secondary" : "bg-error text-on-error");
		document.body.appendChild(toast);
		setTimeout(() => (toast.style.opacity = "0"), 2200);
		setTimeout(() => toast.remove(), 2600);
	};

	const handleRemoveSongFromPlaylist = async (btn) => {
		const playlistId = btn.getAttribute("data-playlist-id");
		const songId = btn.getAttribute("data-song-id");
		if (!playlistId || !songId) return;

		try {
			const response = await fetch("/playlist/remove-song", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ playlistId, songId }),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message || "Khong the go bai hat.");
			}

			const li = btn.closest("li");
			li?.remove();

			const stillIn = result.data?.stillInUserPlaylists === true;
			if (!stillIn) {
				document.querySelectorAll("[data-add-song-btn]").forEach((el) => {
					if (el.getAttribute("data-song-id") === songId) el.classList.remove("hidden");
				});
			}

			showToast(result.message || "Da go bai hat khoi playlist.");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Khong the go bai hat.";
			showToast(message, "error");
		}
	};

	const applySelectedPlaylistStyle = () => {
		const selectedId = localStorage.getItem(SELECTED_PLAYLIST_STORAGE_KEY) || "";
		document.querySelectorAll("[data-select-add-playlist]").forEach((btn) => {
			if (!(btn instanceof HTMLButtonElement)) return;
			const card = btn.closest("[data-playlist-id]");
			const playlistId = card?.getAttribute("data-playlist-id") || "";
			const isSelected = !!playlistId && playlistId === selectedId;
			btn.classList.toggle("bg-secondary", isSelected);
			btn.classList.toggle("text-on-secondary", isSelected);
			btn.classList.toggle("border-secondary", isSelected);
			btn.classList.toggle("text-on-surface-variant", !isSelected);
			btn.textContent = isSelected ? "Dang chon" : "Chon lam playlist them";
		});
	};

	const createPlaylistCard = (playlist) => {
		const card = document.createElement("div");
		card.className =
			"glass p-5 rounded-xl transition-all duration-300 playlist-card hover:scale-[1.02] hover:bg-surface-container-highest/60 hover:shadow-[0_0_30px_rgba(192,193,255,0.15)]";
		card.setAttribute("data-playlist-id", playlist._id);
		card.innerHTML = `
      <div class="flex items-center justify-between gap-3 mb-1">
        <h3 class="text-xl font-bold text-on-surface" data-playlist-title>${playlist.title}</h3>
        <button type="button" data-select-add-playlist class="text-xs font-bold px-3 py-1 rounded-full border border-outline-variant text-on-surface-variant">Chon lam playlist them</button>
      </div>
      <p class="text-sm text-on-surface-variant mb-4" data-playlist-description>${playlist.description || "No description"}</p>
      <div class="flex items-center gap-2 mb-4">
        <button type="button" data-edit-playlist class="px-3 py-1 text-xs font-bold rounded-md border border-outline-variant text-on-surface-variant">Sua</button>
        <button type="button" data-delete-playlist class="px-3 py-1 text-xs font-bold rounded-md border border-error text-error">Xoa</button>
      </div>
      <form class="hidden space-y-2" data-edit-playlist-form>
        <input type="text" data-edit-playlist-title value="${playlist.title}" class="w-full rounded-md bg-surface-container-low border-outline-variant text-on-surface px-3 py-2" />
        <textarea rows="2" data-edit-playlist-description class="w-full rounded-md bg-surface-container-low border-outline-variant text-on-surface px-3 py-2">${playlist.description || ""}</textarea>
        <div class="flex items-center gap-2">
          <button type="button" data-save-playlist class="px-3 py-1 text-xs font-bold rounded-md bg-secondary text-on-secondary">Luu</button>
          <button type="button" data-cancel-edit-playlist class="px-3 py-1 text-xs font-bold rounded-md border border-outline-variant text-on-surface-variant">Huy</button>
        </div>
      </form>
      <p class="text-sm text-on-surface-variant">Playlist nay chua co bai hat.</p>
    `;
		return card;
	};

	const handleCreate = async () => {
		if (!(createTitleInput instanceof HTMLInputElement)) return;
		const title = createTitleInput.value.trim();
		const description =
			createDescriptionInput instanceof HTMLTextAreaElement
				? createDescriptionInput.value.trim()
				: "";

		try {
			const response = await fetch("/playlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title, description }),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message || "Khong the tao playlist.");
			}

			const card = createPlaylistCard(result.data);
			playlistGrid.prepend(card);
			emptyState?.remove();
			createTitleInput.value = "";
			if (createDescriptionInput instanceof HTMLTextAreaElement) createDescriptionInput.value = "";
			createModal?.classList.add("hidden");
			createModal?.classList.remove("flex");
			showToast(result.message || "Tao playlist thanh cong.");
			applySelectedPlaylistStyle();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Khong the tao playlist.";
			showToast(message, "error");
		}
	};

	const handleUpdate = async (card) => {
		const playlistId = card.getAttribute("data-playlist-id");
		const titleInput = card.querySelector("[data-edit-playlist-title]");
		const descInput = card.querySelector("[data-edit-playlist-description]");
		if (!(titleInput instanceof HTMLInputElement) || !(descInput instanceof HTMLTextAreaElement) || !playlistId) return;

		try {
			const response = await fetch(`/playlist/${playlistId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: titleInput.value.trim(),
					description: descInput.value.trim(),
				}),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message || "Khong the cap nhat playlist.");
			}

			const titleEl = card.querySelector("[data-playlist-title]");
			const descEl = card.querySelector("[data-playlist-description]");
			if (titleEl) titleEl.textContent = result.data.title;
			if (descEl) descEl.textContent = result.data.description || "No description";
			const form = card.querySelector("[data-edit-playlist-form]");
			form?.classList.add("hidden");
			showToast(result.message || "Cap nhat thanh cong.");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Khong the cap nhat playlist.";
			showToast(message, "error");
		}
	};

	const handleDelete = async (card) => {
		const playlistId = card.getAttribute("data-playlist-id");
		if (!playlistId) return;
		if (!window.confirm("Ban chac chan muon xoa playlist nay?")) return;

		try {
			const response = await fetch(`/playlist/${playlistId}`, { method: "DELETE" });
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message || "Khong the xoa playlist.");
			}

			const selectedId = localStorage.getItem(SELECTED_PLAYLIST_STORAGE_KEY) || "";
			if (selectedId === playlistId) {
				localStorage.removeItem(SELECTED_PLAYLIST_STORAGE_KEY);
			}
			card.remove();
			if (!playlistGrid.querySelector("[data-playlist-id]")) {
				const fallback = document.createElement("div");
				fallback.id = "playlistEmptyState";
				fallback.className = "glass p-5 rounded-xl";
				fallback.innerHTML = `<p class="text-on-surface-variant">Ban chua co playlist nao.</p>`;
				playlistGrid.parentElement?.appendChild(fallback);
			}
			showToast(result.message || "Xoa playlist thanh cong.");
			applySelectedPlaylistStyle();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Khong the xoa playlist.";
			showToast(message, "error");
		}
	};

	openCreateModalBtn?.addEventListener("click", () => {
		createModal?.classList.remove("hidden");
		createModal?.classList.add("flex");
	});
	cancelCreateBtn?.addEventListener("click", () => {
		createModal?.classList.add("hidden");
		createModal?.classList.remove("flex");
	});
	createSubmitBtn?.addEventListener("click", handleCreate);

	if (!window.__playlistGlobalClickBound) {
		window.__playlistGlobalClickBound = true;

		document.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const removeSongBtn = target.closest("[data-remove-song-from-playlist]");
			if (removeSongBtn instanceof HTMLButtonElement) {
				event.preventDefault();
				void handleRemoveSongFromPlaylist(removeSongBtn);
				return;
			}

			const currentPlaylistGrid = document.getElementById("playlistGrid");
			if (!currentPlaylistGrid) return;

			const selectPlaylistBtn = target.closest("[data-select-add-playlist]");
			if (selectPlaylistBtn instanceof HTMLButtonElement) {
				event.preventDefault();
				const card = selectPlaylistBtn.closest("[data-playlist-id]");
				const playlistId = card?.getAttribute("data-playlist-id");
				if (!playlistId) return;

				const currentSelected = localStorage.getItem(SELECTED_PLAYLIST_STORAGE_KEY) || "";
				if (currentSelected === playlistId) {
					localStorage.removeItem(SELECTED_PLAYLIST_STORAGE_KEY);
					showToast("Da bo chon playlist mac dinh.");
				} else {
					localStorage.setItem(SELECTED_PLAYLIST_STORAGE_KEY, playlistId);
					showToast("Da chon playlist mac dinh de them bai hat.");
				}
				applySelectedPlaylistStyle();
				return;
			}

			const card = target.closest("[data-playlist-id]");
			if (!card) return;

			const editBtn = target.closest("[data-edit-playlist]");
			if (editBtn) {
				card.querySelector("[data-edit-playlist-form]")?.classList.remove("hidden");
				return;
			}

			const cancelEditBtn = target.closest("[data-cancel-edit-playlist]");
			if (cancelEditBtn) {
				card.querySelector("[data-edit-playlist-form]")?.classList.add("hidden");
				return;
			}

			const saveBtn = target.closest("[data-save-playlist]");
			if (saveBtn) {
				handleUpdate(card);
				return;
			}

			const deleteBtn = target.closest("[data-delete-playlist]");
			if (deleteBtn) {
				handleDelete(card);
			}
		});
	}

	applySelectedPlaylistStyle();
};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initPlaylistPage, { once: true });
} else {
	initPlaylistPage();
}
document.addEventListener("app:page-ready", initPlaylistPage);