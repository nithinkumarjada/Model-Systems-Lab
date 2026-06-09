import { readFile } from "node:fs/promises";
import { generateMarkdownReport } from "../src/report.mjs";

const systems = JSON.parse(await readFile(new URL("../data/systems.json", import.meta.url), "utf8"));
const scenarios = JSON.parse(await readFile(new URL("../data/scenarios.json", import.meta.url), "utf8"));
const scenarioId = process.argv[2] || "balanced";
const scenario = scenarios.find((item) => item.id === scenarioId) || scenarios[0];

console.log(generateMarkdownReport(systems, scenario));
