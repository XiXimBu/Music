"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSessionToast = setSessionToast;
exports.pushSessionToast = pushSessionToast;
function setSessionToast(req, toast) {
    req.session.toast = toast;
}
function pushSessionToast(req, toast) {
    if (!req.session.toasts) {
        req.session.toasts = [];
    }
    req.session.toasts.push(toast);
}
