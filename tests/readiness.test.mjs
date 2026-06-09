import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_WEIGHTS,
  groupByDomain,
  normalizeWeights,
  rankSystems,
  scoreSystem,
  summarizeSystems
} from "../src/readiness.mjs";

const systems = JSON.parse(await readFile(new URL("../data/systems.json", import.meta.url), "utf8"));

assert.equal(systems.length, 7, "fixture should include seven systems");

const ranked = rankSystems(systems, DEFAULT_WEIGHTS);
assert.equal(ranked[0].id, "sys-137", "visual inspection system should lead under default weights");
assert.ok(ranked.every((system) => system.score >= 0 && system.score <= 100));

const speedWeighted = rankSystems(systems, {
  quality: 0.08,
  reliability: 0.1,
  latency: 0.45,
  cost: 0.25,
  observability: 0.07,
  risk: 0.05
});
assert.equal(speedWeighted[0].id, "sys-137", "fast production system should lead when speed dominates");

const weights = normalizeWeights({ quality: 2, reliability: 2, latency: 1, cost: 0, observability: 0, risk: 0 });
assert.equal(Number(Object.values(weights).reduce((sum, value) => sum + value, 0).toFixed(8)), 1);

const scored = scoreSystem(systems[0], DEFAULT_WEIGHTS);
assert.ok(scored.components.quality > 0.7);
assert.ok(scored.components.risk > 0.7);

const summary = summarizeSystems(ranked);
assert.equal(summary.best.id, ranked[0].id);
assert.equal(summary.productionCount, 2);
assert.ok(summary.reviewCount >= 2);

const grouped = groupByDomain(systems);
assert.equal(grouped.Knowledge, 2);
assert.equal(grouped.Planning, 2);

console.log("readiness utilities passed");
