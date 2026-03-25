const initEditProfile = () => {
	const openButton = document.getElementById("openEditProfile");
	const cancelButton = document.getElementById("cancelEditProfile");
	const avatarInput = document.getElementById("editAvatar");
	const nameDisplay = document.getElementById("profileName");
	const descriptionDisplay = document.getElementById("profileDescription");
	const avatarDisplay = document.getElementById("profileAvatar");
	const nameInput = document.getElementById("editFullName");
	const descriptionInput = document.getElementById("editDescription");

	if (
		!openButton ||
		!avatarInput ||
		!nameDisplay ||
		!descriptionDisplay ||
		!avatarDisplay ||
		!nameInput ||
		!descriptionInput
	) {
		return;
	}
	if (openButton.dataset.editProfileBound === "1") return;
	openButton.dataset.editProfileBound = "1";

	let isEditing = false;
	let previousAvatar = avatarDisplay.src;

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

	const enterEditMode = () => {
		isEditing = true;
		previousAvatar = avatarDisplay.src;
		nameInput.value = nameDisplay.textContent || "";
		descriptionInput.value = descriptionDisplay.textContent || "";

		nameDisplay.classList.add("hidden");
		descriptionDisplay.classList.add("hidden");
		nameInput.classList.remove("hidden");
		descriptionInput.classList.remove("hidden");
		avatarInput.classList.remove("hidden");
		if (cancelButton) cancelButton.classList.remove("hidden");

		openButton.textContent = "Save Changes";
	};

	const exitEditMode = () => {
		isEditing = false;
		nameDisplay.classList.remove("hidden");
		descriptionDisplay.classList.remove("hidden");
		nameInput.classList.add("hidden");
		descriptionInput.classList.add("hidden");
		avatarInput.classList.add("hidden");
		avatarInput.value = "";
		if (cancelButton) cancelButton.classList.add("hidden");
		openButton.textContent = "Edit Profile";
	};

	if (cancelButton) {
		cancelButton.addEventListener("click", () => {
			avatarDisplay.src = previousAvatar;
			exitEditMode();
		});
	}

	avatarInput.addEventListener("change", (event) => {
		const input = event.target;
		if (!(input instanceof HTMLInputElement) || !input.files || !input.files[0]) return;

		const imageFile = input.files[0];
		const objectUrl = URL.createObjectURL(imageFile);
		avatarDisplay.src = objectUrl;
	});

	openButton.addEventListener("click", async () => {
		if (!isEditing) {
			enterEditMode();
			return;
		}

		const formData = new FormData();
		formData.append("fullName", nameInput.value.trim());
		formData.append("description", descriptionInput.value.trim());
		if (avatarInput.files && avatarInput.files[0]) {
			formData.append("avatar", avatarInput.files[0]);
		}

		try {
			const response = await fetch("/user/edit-profile", {
				method: "PATCH",
				body: formData,
			});

			const result = await response.json();

			if (!response.ok || !result?.success) {
				throw new Error(result?.message || "Không thể cập nhật hồ sơ.");
			}

			const data = result.data || {};
			const fullName = data.fullName || "User";
			const description = data.description || "Losing myself in the beats of the night. 🌙";
			const avatar = data.avatar || previousAvatar;

			nameDisplay.textContent = fullName;
			descriptionDisplay.textContent = description;
			if (avatar) avatarDisplay.src = avatar;

			previousAvatar = avatarDisplay.src;
			exitEditMode();
			showToast(result.message || "Cập nhật thành công.");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
			showToast(message, "error");
		}
	});

};

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initEditProfile, { once: true });
} else {
	initEditProfile();
}
document.addEventListener("app:page-ready", initEditProfile);
