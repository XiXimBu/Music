/**
 
 * Xử lý gợi ý tìm kiếm và phát nhạc nhanh
 */

const initSearchSystem = () => {
    const searchInputs = document.querySelectorAll('.js-search-input');
    if (!searchInputs.length) return;
    const SELECTED_PLAYLIST_STORAGE_KEY = 'selected_add_playlist_id';

    const addedSongIdsSet = new Set();
    const hideAllAddButtonsOfSong = (songId) => {
        document.querySelectorAll(`[data-add-song-btn][data-song-id="${songId}"]`).forEach((btn) => {
            btn.classList.add('hidden');
        });
    };

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className =
            "fixed right-6 top-6 z-[9999] px-4 py-3 rounded-lg font-semibold shadow-lg transition-opacity duration-300 " +
            (type === "success" ? "bg-secondary text-on-secondary" : "bg-error text-on-error");
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
        }, 2200);
        setTimeout(() => {
            toast.remove();
        }, 2600);
    };

    // Hàm Render kết quả ra HTML
    const renderResults = (data, container) => {
        let html = '';
        const addedSongIds = Array.isArray(data.addedSongIds) ? data.addedSongIds.map(String) : [];
        addedSongIds.forEach(id => addedSongIdsSet.add(id));

        // 1. PHẦN NGHỆ SĨ (Click chuyển trang)
        if (data.artists && data.artists.length > 0) {
            html += `<div class="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nghệ sĩ</div>`;
            data.artists.forEach(artist => {
                html += `
                    <a href="/artist/detail/${artist.slug}" class="flex items-center gap-3 p-3 hover:bg-white/5 transition-all group">
                        <div class="relative w-10 h-10 flex-shrink-0">
                            <img src="${artist.avatar || '/images/default-avatar.png'}" class="w-full h-full object-cover rounded-full border border-white/10 shadow-lg">
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <p class="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">${artist.name}</p>
                            <p class="text-[10px] text-zinc-500 uppercase">Xem hồ sơ</p>
                        </div>
                        <span class="material-symbols-outlined text-zinc-600 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">arrow_forward</span>
                    </a>`;
            });
        }

        // 2. PHẦN BÀI HÁT (Click phát nhạc)
        if (data.songs && data.songs.length > 0) {
            const borderClass = (data.artists && data.artists.length > 0) ? 'border-t border-white/5 mt-1' : '';
            html += `<div class="${borderClass} px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Bài hát</div>`;
            
            // Cập nhật đoạn render bài hát trong search.js để khớp với Mixin trackItem
            data.songs.forEach(song => {
                const isAdded = addedSongIdsSet.has(String(song._id));
                html += `
                    <div class="flex items-center justify-between p-3 hover:bg-white/10 cursor-pointer group transition-all" 
                        button-play-track="${song.audioUrl}"
                        data-audio-url="${song.audioUrl}"
                        data-song-id="${song._id}"
                        data-song-title="${song.title}"
                        data-song-artist="${song.artistName}"
                        data-song-cover="${song.coverImage}">
                    
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="relative w-10 h-10 flex-shrink-0">
                        <img src="${song.coverImage || '/images/default-song.png'}" class="w-full h-full object-cover rounded-lg shadow-md">
                        <button class="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold bg-secondary text-on-secondary shadow ${isAdded ? 'hidden' : ''}"
                            type="button"
                            data-add-song-btn
                            data-song-id="${song._id}"
                        >+</button>
                        </div>
                        <div class="min-w-0">
                        <p class="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">${song.title}</p>
                        <p class="text-[10px] text-zinc-400 truncate">${song.artistName}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100">play_circle</span>
                    </div>
                    </div>`;
            });
        }

        // Cập nhật DOM
        if (html === '') {
            container.classList.add('hidden');
        } else {
            container.innerHTML = html;
            container.classList.remove('hidden');
        }
    };

    // Xử lý sự kiện input cho từng ô search
    searchInputs.forEach(input => {
        if (input.dataset.searchBound === '1') return;
        input.dataset.searchBound = '1';

        const container = input.closest('.search-container');
        const resultsBox = container ? container.querySelector('.js-search-results') : null;
        if (!resultsBox) return;

        let debounceTimer;

        input.addEventListener('input', (e) => {
            const keyword = e.target.value.trim();

            clearTimeout(debounceTimer);
            if (keyword.length < 2) {
                resultsBox.classList.add('hidden');
                return;
            }

            // Chờ người dùng ngừng gõ 300ms mới gọi API (Debounce)
            debounceTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`/search?keyword=${encodeURIComponent(keyword)}`);
                    const data = await response.json();

                    if (data.code === 200 && (data.songs.length > 0 || data.artists.length > 0)) {
                        renderResults(data, resultsBox);
                    } else {
                        resultsBox.classList.add('hidden');
                    }
                } catch (err) {
                    console.error("Search API Error:", err);
                }
            }, 300);
        });
    });

    // Click ra ngoài để đóng kết quả
    if (!window.__searchGlobalListenersBound) {
        window.__searchGlobalListenersBound = true;

        document.addEventListener('click', (e) => {
            const addBtn = e.target.closest('[data-add-song-btn]');
            if (addBtn) {
                e.preventDefault();
                e.stopPropagation();
                const songId = addBtn.getAttribute('data-song-id');
                if (!songId) return;

                const selectedPlaylistId = localStorage.getItem(SELECTED_PLAYLIST_STORAGE_KEY) || '';
                fetch('/playlist/add-song', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        songId,
                        playlistId: selectedPlaylistId || undefined,
                    }),
                })
                    .then(res => res.json())
                    .then(result => {
                        if (!result?.success) {
                            throw new Error(result?.message || 'Không thể thêm bài hát.');
                        }
                        addedSongIdsSet.add(String(songId));
                        hideAllAddButtonsOfSong(String(songId));
                        showToast(result.message || 'Đã thêm bài hát vào playlist.');
                    })
                    .catch((err) => {
                        console.error('Add song error:', err);
                        showToast(err?.message || 'Thêm bài hát thất bại.', 'error');
                    });
                return;
            }

            if (!e.target.closest('.search-container')) {
                document.querySelectorAll('.js-search-results').forEach(el => el.classList.add('hidden'));
            }
        });

        // Ẩn nút "+" khi bài đã có sẵn trong playlist (dựa trên API trả về từ lần search gần nhất).
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-add-song-btn]');
            if (!target) return;
            const songId = String(target.getAttribute('data-song-id') || '');
            if (addedSongIdsSet.has(songId)) {
                target.classList.add('hidden');
            }
        });
    }

};

// Khởi chạy hệ thống khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', initSearchSystem);
document.addEventListener('app:page-ready', initSearchSystem);

