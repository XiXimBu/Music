"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const paginate = async (model, filter = {}, options = {}) => {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 10);
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sort === "asc" ? 1 : -1;
    const finalFilter = { ...filter };
    if (options.search && typeof options.search === "string" && options.search.trim()) {
        finalFilter.title = { $regex: options.search.trim(), $options: "i" };
    }
    const query = model.find(finalFilter);
    if (options.select)
        query.select(options.select);
    if (options.populate) {
        if (Array.isArray(options.populate)) {
            options.populate.forEach((p) => query.populate(p));
        }
        else {
            query.populate(options.populate);
        }
    }
    query.sort({ [sortBy]: sortOrder }).skip(skip).limit(limit);
    const [docs, total] = await Promise.all([
        query.exec(),
        model.countDocuments(finalFilter).exec(),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return { docs, total, page, limit, totalPages };
};
exports.default = paginate;
