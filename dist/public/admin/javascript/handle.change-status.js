(() => {
  const buttonsChangeStatus = document.querySelectorAll("[button-change-status]");

  const dotsActiveHtml = `
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span class="text-xs font-bold text-emerald-500 capitalize">active</span>
            `;
  const dotsInactiveHtml = `
              <span class="w-2 h-2 rounded-full bg-zinc-500 shrink-0"></span>
              <span class="text-xs font-bold text-zinc-400 capitalize">inactive</span>
            `;

  const toggleActiveHtml = `
              <div class="w-10 h-5 bg-primary/20 rounded-full relative p-1">
                <div class="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_#a6c5fa] ml-auto"></div>
              </div>`;
  const toggleInactiveHtml = `
              <div class="w-10 h-5 bg-zinc-600/40 rounded-full relative p-1">
                <div class="w-3 h-3 bg-zinc-400 rounded-full mr-auto"></div>
              </div>`;

  buttonsChangeStatus.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (button.disabled) return;

      const statusCurrent = button.getAttribute("data-status");
      const id = button.getAttribute("data-id");
      if (!id) return;

      const statusChange = statusCurrent === "active" ? "inactive" : "active";
      const endpointBase =
        button.getAttribute("data-status-endpoint") || "/admin/dashboard";
      const path = `${endpointBase.replace(/\/$/, "")}/change-status/${statusChange}/${id}`;

      button.disabled = true;

      try {
        const res = await fetch(path, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error(data.message || "Cập nhật thất bại");
          return;
        }

        if (data.code === 200) {
          button.setAttribute("data-status", statusChange);

          const ui = button.getAttribute("data-ui") || "dots";
          if (ui === "toggle") {
            button.innerHTML =
              statusChange === "active" ? toggleActiveHtml : toggleInactiveHtml;
          } else {
            button.innerHTML =
              statusChange === "active" ? dotsActiveHtml : dotsInactiveHtml;
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        button.disabled = false;
      }
    });
  });
})();
