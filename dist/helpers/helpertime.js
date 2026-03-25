"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFromNow = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
require("dayjs/locale/vi");
dayjs_1.default.extend(relativeTime_1.default);
dayjs_1.default.locale("vi");
const formatFromNow = (date) => {
    return (0, dayjs_1.default)(date).fromNow();
};
exports.formatFromNow = formatFromNow;
exports.default = { formatFromNow: exports.formatFromNow };
