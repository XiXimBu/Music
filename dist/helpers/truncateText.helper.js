"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateText = void 0;
const truncateText = (text, limit) => {
    const safeText = String(text ?? "");
    const safeLimit = Math.max(0, Number(limit) || 0);
    if (safeText.length <= safeLimit)
        return safeText;
    return `${safeText.slice(0, safeLimit)}...`;
};
exports.truncateText = truncateText;
exports.default = exports.truncateText;
