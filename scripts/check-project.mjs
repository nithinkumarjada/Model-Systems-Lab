import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/readiness.mjs",
  "data/systems.json",
  "tests/readiness.test.mjs"
];

await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /<title>Model Systems Lab<\/title>/, "page title should be generic");
assert.match(html, /src="\.\/src\/app\.js"/, "index should load the app module");
assert.match(html, /id="systemsMap"/, "index should include the systems map canvas");

const systems = JSON.parse(await readFile(new URL("../data/systems.json", import.meta.url), "utf8"));
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

console.log("static project validation passed");
