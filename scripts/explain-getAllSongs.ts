import "dotenv/config";
import mongoose, { PipelineStage, Types } from "mongoose";
import Song from "../models/song.model";

type StageSummary = {
  stage?: string;
  indexName?: string;
  inputStage?: any;
  inputStages?: any[];
  outerStage?: any;
  innerStage?: any;
  queryPlan?: any;
  winningPlan?: any;
  executionStages?: any;
};

const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI) as string | undefined;
const artistId = String(process.env.ARTIST_ID || "").trim();

const getAllStages = (node: any, acc: string[] = []): string[] => {
  if (!node || typeof node !== "object") return acc;
  if (typeof node.stage === "string") acc.push(node.stage);
  if (typeof node.indexName === "string") acc.push(`INDEX:${node.indexName}`);

  const nextNodes = [
    node.inputStage,
    ...(Array.isArray(node.inputStages) ? node.inputStages : []),
    node.outerStage,
    node.innerStage,
    node.queryPlan,
    node.winningPlan,
    node.executionStages,
  ];

  for (const child of nextNodes) getAllStages(child, acc);
  return acc;
};

const collectFromAggregateStages = (stages: any[]): { names: string[]; stats: any } => {
  const names: string[] = [];
  let stats: any = {};

  for (const stage of stages || []) {
    if (!stage || typeof stage !== "object") continue;
    const opKeys = Object.keys(stage).filter((k) => k.startsWith("$"));
    for (const key of opKeys) names.push(key.replace("$", "").toUpperCase());

    // Common Mongo aggregate explain shape:
    // { $cursor: { queryPlanner, executionStats, ... } }
    const cursor = (stage as any).$cursor;
    if (cursor) {
      names.push(...getAllStages(cursor.queryPlanner || {}));
      names.push(...getAllStages(cursor.executionStats || {}));
      stats = cursor.executionStats || stats;
    }
  }

  return { names, stats };
};

const main = async () => {
  if (!uri) {
    throw new Error("Missing MONGOOSE_URL or MONGO_URI");
  }

  await mongoose.connect(uri);

  const match: {
    deleted: boolean;
    status: string;
    artists?: Types.ObjectId;
  } = {
    deleted: false,
    status: "active",
  };

  if (artistId) {
    if (!Types.ObjectId.isValid(artistId)) {
      throw new Error(`ARTIST_ID is invalid: ${artistId}`);
    }
    match.artists = new Types.ObjectId(artistId);
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { views: -1 as const } },
    { $limit: 10 },
    {
      $lookup: {
        from: "artists",
        localField: "artists",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
        as: "artists",
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        duration: 1,
        audioUrl: 1,
        coverImage: 1,
        views: 1,
        artists: 1,
      },
    },
  ];

  const explainResult = await Song.aggregate(pipeline).explain("executionStats");
  const planner = (explainResult as any)?.queryPlanner || {};
  const directStats = (explainResult as any)?.executionStats || {};
  const aggregateStages = Array.isArray((explainResult as any)?.stages)
    ? (explainResult as any).stages
    : [];
  const fromAggregate = collectFromAggregateStages(aggregateStages);

  const stats =
    Object.keys(directStats || {}).length > 0 ? directStats : fromAggregate.stats || {};

  const rawStages = getAllStages(planner)
    .concat(getAllStages(stats))
    .concat(fromAggregate.names);
  const stageSet = Array.from(new Set(rawStages));
  const indexNames = stageSet
    .filter((s) => s.startsWith("INDEX:"))
    .map((s) => s.replace("INDEX:", ""));

  const hasSortStage = stageSet.includes("SORT");
  const hasIxscan = stageSet.includes("IXSCAN");
  const hasFetch = stageSet.includes("FETCH");

  console.log("=== Explain getAllSongs (executionStats) ===");
  console.log("Filter:", match);
  console.log("Stages:", stageSet.join(" -> "));
  console.log("Uses IXSCAN:", hasIxscan);
  console.log("Uses FETCH:", hasFetch);
  console.log("Uses SORT stage:", hasSortStage);
  console.log("Indexes used:", indexNames.length ? indexNames.join(", ") : "(none)");
  console.log("nReturned:", stats.nReturned ?? "n/a");
  console.log("totalKeysExamined:", stats.totalKeysExamined ?? "n/a");
  console.log("totalDocsExamined:", stats.totalDocsExamined ?? "n/a");
  console.log("executionTimeMillis:", stats.executionTimeMillis ?? "n/a");

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("Explain script failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
