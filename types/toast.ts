/** Payload lưu trong session và truyền xuống view cho toast. */
export type ToastType = "success" | "error";

export interface SessionToast {
	type: ToastType;
	message: string;
}
