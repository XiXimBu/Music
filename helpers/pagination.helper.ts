import { Model, Document } from "mongoose";

export type PaginateOptions = {
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
  sortBy?: string;
  search?: string;
  select?: string;
  populate?: string | Array<string | any>;
};

export type PaginateResult<T> = {
  docs: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const paginate = async <T extends Document>(
  model: Model<T>,
  filter: Record<string, any> = {},
  options: PaginateOptions = {}
): Promise<PaginateResult<T>> => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Number(options.limit) || 10);
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "createdAt";
  const sortOrder = options.sort === "asc" ? 1 : -1;

  const finalFilter = { ...filter };
  if (options.search && typeof options.search === "string" && options.search.trim()) {
    finalFilter.title = { $regex: options.search.trim(), $options: "i" };
  }

  const query = model.find(finalFilter as any);
  if (options.select) query.select(options.select);
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach((p) => (query as any).populate(p));
    } else {
      (query as any).populate(options.populate as any);
    }
  }

  (query as any).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit);


  const [docs, total] = await Promise.all([
    query.exec(),
    (model.countDocuments(finalFilter) as any).exec(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return { docs, total, page, limit, totalPages };
  //docs: ket qua tra ve sau khi da ap dung filter, search, sort, pagination
};

export default paginate;
