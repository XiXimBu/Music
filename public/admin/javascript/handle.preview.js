(function () {
  /**
   * Slug preview (ASCII): tiếng Việt → bỏ dấu.
   * Chữ đ/Đ không bị Unicode NFD tách thành "d + dấu", nếu không xử lý sẽ bị xóa
   * và thành "ung" thay vì "dung".
   */
  const slugify = (input) => {
    let s = String(input || "").trim();
    if (!s) return "";
    s = s.toLowerCase();
    s = s.replace(/\u0111/g, "d").replace(/\u0110/g, "d"); // đ / Đ → d
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const titleEl = document.getElementById("title");
  const nameEl = document.getElementById("name");
  const slugEl = document.getElementById("slug-preview");
  const thumbInput = document.getElementById("thumbnail-input");
  const thumbImg = document.getElementById("thumbnail-preview-img");
  const thumbPlaceholder = document.getElementById("thumbnail-placeholder");
  const imageInput = document.getElementById("image-input");
  const imageImg = document.getElementById("image-preview-img");
  const imagePlaceholder = document.getElementById("image-placeholder");
  const audioInput = document.getElementById("audio-input");
  const audioWrap = document.getElementById("audio-preview-wrap");
  let audioObjectUrl = null;

  // Trang bài hát: #title + #slug-preview; trang nghệ sĩ: #name + #slug-preview
  if (slugEl) {
    const sourceEl = titleEl || nameEl;
    if (sourceEl) {
      const syncSlug = () => {
        slugEl.value = slugify(sourceEl.value);
      };
      sourceEl.addEventListener("input", syncSlug);
      syncSlug();
    }
  }

  if (thumbInput && thumbImg) {
    thumbInput.addEventListener("change", () => {
      const file = thumbInput.files && thumbInput.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      thumbImg.src = url;
      thumbImg.classList.remove("hidden");
      if (thumbPlaceholder) thumbPlaceholder.classList.add("hidden");
    });
  }

  if (imageInput && imageImg) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      imageImg.src = url;
      imageImg.classList.remove("hidden");
      if (imagePlaceholder) imagePlaceholder.classList.add("hidden");
    });
  }

  if (audioInput && audioWrap) {
    audioInput.addEventListener("change", () => {
      const file = audioInput.files && audioInput.files[0];
      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
        audioObjectUrl = null;
      }
      audioWrap.innerHTML = "";
      if (!file) return;
      audioObjectUrl = URL.createObjectURL(file);
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.className = "w-full mt-2";
      audio.src = audioObjectUrl;
      audioWrap.appendChild(audio);
    });
  }

  const statusToggle = document.getElementById("status-toggle");
  const statusField = document.getElementById("status-field");
  if (statusToggle && statusField) {
    const syncStatus = () => {
      statusField.value = statusToggle.checked ? "active" : "inactive";
    };
    statusToggle.addEventListener("change", syncStatus);
    statusToggle.checked = statusField.value === "active";
    syncStatus();
  }
})();
