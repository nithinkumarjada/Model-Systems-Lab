import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_WEIGHTS,
  buildDecisionMemo,
  buildExportPayload,
  compareRankings,
  explainSystem,
  groupByDomain,
  normalizeWeights,
  rankSystems,
  readinessTier,
  scoreSystem,
  summarizeSystems
} from "../src/readiness.mjs";
import { generateMarkdownReport } from "../src/report.mjs";

const systems = JSON.parse(await readFile(new URL("../data/systems.json", import.meta.url), "utf8"));
const scenarios = JSON.parse(await readFile(new URL("../data/scenarios.json", import.meta.url), "utf8"));

assert.equal(systems.length, 7, "fixture should include seven systems");
assert.equal(scenarios.length, 4, "fixture should include four decision scenarios");

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

const explanation = explainSystem(ranked[0], DEFAULT_WEIGHTS);
assert.equal(explanation.contributions.length, 6);
assert.ok(explanation.contributions[0].contribution >= explanation.contributions.at(-1).contribution);

const summary = summarizeSystems(ranked);
assert.equal(summary.best.id, ranked[0].id);
assert.equal(summary.productionCount, 2);
assert.ok(summary.reviewCount >= 2);

const grouped = groupByDomain(systems);
assert.equal(grouped.Knowledge, 2);
assert.equal(grouped.Planning, 2);

assert.equal(readinessTier(88), "Ready");
assert.equal(readinessTier(72), "Watch");
assert.equal(readinessTier(60), "Review");
assert.equal(readinessTier(40), "Hold");

const trustScenario = scenarios.find((scenario) => scenario.id === "trust");
const trustRanked = rankSystems(systems, trustScenario.weights);
const comparison = compareRankings(ranked, trustRanked);
assert.equal(comparison.length, systems.length);
assert.ok(comparison.some((system) => system.delta !== 0));

const memo = buildDecisionMemo(trustRanked[0], trustScenario.weights);
assert.ok(memo.length >= 3);
assert.ok(memo[0].includes(trustRanked[0].name));

const payload = buildExportPayload(trustRanked, summarizeSystems(trustRanked), trustScenario);
assert.equal(payload.scenario.id, "trust");
assert.equal(payload.systems[0].rank, 1);
assert.ok(payload.systems[0].tier);

const report = generateMarkdownReport(systems, trustScenario);
assert.match(report, /# Model Systems Lab Report/);
assert.match(report, /Trust review/);

console.log("readiness utilities passed");
