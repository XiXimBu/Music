import { Request, Response } from "express";
import * as ArtistService from "../../services/admin/artist.service";
import { setSessionToast } from "../../helpers/session-toast.helper";
import { ensureUniqueArtistSlug, slugifyArtistName } from "../../helpers/slug.helper";

/** Phân trang mặc định khi lỗi hoặc không có dữ liệu. */
const emptyPagination = () => ({
	currentPage: 1,
	totalPages: 1,
	total: 0,
	limit: 5,
});

/** Redirect an toàn về trang trước (Referer cùng host); fallback form tạo artist. */
const redirectSafeBack = (req: Request, res: Response): void => {
	const ref = req.get("Referrer") || req.get("Referer");
	const host = req.get("host");
	if (ref && host) {
		try {
			const u = new URL(ref);
			if (u.host === host) {
				res.redirect(ref);
				return;
			}
		} catch {
			/* ignore */
		}
	}
	res.redirect(`${req.baseUrl}/create`);
};

/**
 * Trang quản lý artist: đọc `?page=`, gọi service, render view kèm danh sách và phân trang.
 */
export const getManageArtist = async (req: Request, res: Response): Promise<void> => {
	try {
		const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
		const result = await ArtistService.getArtistsPaginated(page);

		res.render("admin/pages/manageartist/index", {
			pageTitle: "Quản lý nghệ sĩ",
			artists: result.artists,
			pagination: {
				currentPage: result.currentPage,
				totalPages: result.totalPages,
				total: result.total,
				limit: result.limit,
			},
			paginationBasePath: req.baseUrl,
		});
	} catch (error) {
		console.error("getManageArtist error:", error);
		res.status(500).render("admin/pages/manageartist/index", {
			pageTitle: "Quản lý nghệ sĩ",
			artists: [],
			pagination: emptyPagination(),
			paginationBasePath: req.baseUrl,
			error: "Có lỗi xảy ra khi tải danh sách nghệ sĩ",
		});
	}
};

/** GET form tạo nghệ sĩ (preview slug + ảnh do JS client xử lý). */
export const getCreateArtist = async (req: Request, res: Response): Promise<void> => {
	try {
		res.render("admin/pages/manageartist/create", {
			pageTitle: "Tạo nghệ sĩ",
		});
	} catch (error) {
		console.error("getCreateArtist error:", error);
		res.status(500).send("Lỗi tải trang");
	}
};

/**
 * POST tạo nghệ sĩ: body (name, description) + file `image` → upload Cloudinary → URL trong `req.body.image`.
 * Slug server sinh từ `name` (trim, không lưu chuỗi rỗng cho description).
 */
export const postCreateArtist = async (req: Request, res: Response): Promise<void> => {
	try {
		const name = String(req.body.name ?? "").trim();
		const descRaw = String(req.body.description ?? "").trim();
		const description = descRaw.length > 0 ? descRaw : undefined;

		const imageUrl =
			typeof req.body.image === "string" ? req.body.image.trim() : "";

		if (!name || !imageUrl) {
			setSessionToast(req, {
				type: "error",
				message: "Vui lòng nhập đầy đủ thông tin!",
			});
			redirectSafeBack(req, res);
			return;
		}

		const baseSlug = slugifyArtistName(name);
		const slug = await ensureUniqueArtistSlug(baseSlug);

		await ArtistService.createArtist({
			name,
			description,
			avatar: imageUrl,
			slug,
		});

		setSessionToast(req, {
			type: "success",
			message: "Tạo nghệ sĩ thành công 😎",
		});
		res.redirect(req.baseUrl);
	} catch (error) {
		console.error("postCreateArtist error:", error);
		setSessionToast(req, {
			type: "error",
			message: "Có lỗi xảy ra khi tạo nghệ sĩ. Vui lòng thử lại.",
		});
		redirectSafeBack(req, res);
	}
};
