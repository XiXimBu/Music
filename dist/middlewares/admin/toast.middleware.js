"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flashToastMiddleware = flashToastMiddleware;
require("../../types/express-session");
function collectFromSession(session) {
    const out = [];
    if (session.toasts?.length) {
        out.push(...session.toasts);
    }
    if (session.toast) {
        out.push(session.toast);
    }
    return out;
}
function flashToastMiddleware(req, res, next) {
    const fromSession = collectFromSession(req.session);
    res.locals.toasts = fromSession;
    delete req.session.toast;
    delete req.session.toasts;
    next();
}
