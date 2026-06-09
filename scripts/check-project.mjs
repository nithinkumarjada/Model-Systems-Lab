import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/readiness.mjs",
  "src/report.mjs",
  "data/systems.json",
  "data/scenarios.json",
  "scripts/generate-report.mjs",
  "tests/readiness.test.mjs",
  "docs/architecture.md",
  "docs/scoring-model.md",
  "docs/operating-model.md",
  "CHANGELOG.md",
  ".github/ISSUE_TEMPLATE/model-review.md",
  ".github/pull_request_template.md"
];

await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
assert.match(html, /<title>Model Systems Lab<\/title>/, "page title should be generic");
assert.match(html, /src="\.\/src\/app\.js"/, "index should load the app module");
assert.match(html, /id="systemsMap"/, "index should include the systems map canvas");
assert.match(html, /id="scenarioFilter"/, "index should include scenario controls");
assert.match(html, /id="inspector"/, "index should include the system inspector");
assert.match(readme, /Scenario presets/, "README should describe interactive scenarios");
assert.match(readme, /Report Generation/, "README should document report generation");

const systems = JSON.parse(await readFile(new URL("../data/systems.json", import.meta.url), "utf8"));
const scenarios = JSON.parse(await readFile(new URL("../data/scenarios.json", import.meta.url), "utf8"));
const ids = new Set();

for (const system of systems) {
  assert.ok(system.id, "system needs an id");
  assert.ok(!ids.has(system.id), `duplicate id: ${system.id}`);
  ids.add(system.id);
  assert.ok(system.quality >= 0 && system.quality <= 100, `${system.id} quality out of range`);
  assert.ok(system.reliability >= 0 && system.reliability <= 100, `${system.id} reliability out of range`);
  assert.ok(system.latencyMs > 0, `${system.id} latency must be positive`);
  assert.ok(system.costPer1k >= 0, `${system.id} cost must be non-negative`);
  assert.ok(system.risk >= 0 && system.risk <= 100, `${system.id} risk out of range`);
  assert.ok(system.nextAction.length > 20, `${system.id} next action is too thin`);
}

for (const scenario of scenarios) {
  assert.ok(scenario.id, "scenario needs an id");
  assert.ok(scenario.name.length > 4, `${scenario.id} name is too short`);
  assert.ok(scenario.description.length > 30, `${scenario.id} description is too thin`);
  assert.ok(scenario.riskLimit >= 10 && scenario.riskLimit <= 55, `${scenario.id} risk limit out of range`);
  assert.equal(
    Number(Object.values(scenario.weights).reduce((sum, value) => sum + value, 0).toFixed(8)),
    1,
    `${scenario.id} weights should sum to 1`
  );
}

console.log("static project validation passed");
