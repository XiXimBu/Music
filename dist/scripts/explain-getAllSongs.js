"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importStar(require("mongoose"));
const song_model_1 = __importDefault(require("../models/song.model"));
const uri = (process.env.MONGOOSE_URL || process.env.MONGO_URI);
const artistId = String(process.env.ARTIST_ID || "").trim();
const getAllStages = (node, acc = []) => {
    if (!node || typeof node !== "object")
        return acc;
    if (typeof node.stage === "string")
        acc.push(node.stage);
    if (typeof node.indexName === "string")
        acc.push(`INDEX:${node.indexName}`);
    const nextNodes = [
        node.inputStage,
        ...(Array.isArray(node.inputStages) ? node.inputStages : []),
        node.outerStage,
        node.innerStage,
        node.queryPlan,
        node.winningPlan,
        node.executionStages,
    ];
    for (const child of nextNodes)
        getAllStages(child, acc);
    return acc;
};
const collectFromAggregateStages = (stages) => {
    const names = [];
    let stats = {};
    for (const stage of stages || []) {
        if (!stage || typeof stage !== "object")
            continue;
        const opKeys = Object.keys(stage).filter((k) => k.startsWith("$"));
        for (const key of opKeys)
            names.push(key.replace("$", "").toUpperCase());
        const cursor = stage.$cursor;
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
    await mongoose_1.default.connect(uri);
    const match = {
        deleted: false,
        status: "active",
    };
    if (artistId) {
        if (!mongoose_1.Types.ObjectId.isValid(artistId)) {
            throw new Error(`ARTIST_ID is invalid: ${artistId}`);
        }
        match.artists = new mongoose_1.Types.ObjectId(artistId);
    }
    const pipeline = [
        { $match: match },
        { $sort: { views: -1 } },
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
    const explainResult = await song_model_1.default.aggregate(pipeline).explain("executionStats");
    const planner = explainResult?.queryPlanner || {};
    const directStats = explainResult?.executionStats || {};
    const aggregateStages = Array.isArray(explainResult?.stages)
        ? explainResult.stages
        : [];
    const fromAggregate = collectFromAggregateStages(aggregateStages);
    const stats = Object.keys(directStats || {}).length > 0 ? directStats : fromAggregate.stats || {};
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
    await mongoose_1.default.disconnect();
};
main().catch(async (error) => {
    console.error("Explain script failed:", error);
    try {
        await mongoose_1.default.disconnect();
    }
    catch {
    }
    process.exit(1);
});
