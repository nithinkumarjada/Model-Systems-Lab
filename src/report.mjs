import {
  DEFAULT_WEIGHTS,
  buildDecisionMemo,
  buildExportPayload,
  rankSystems,
  summarizeSystems
} from "./readiness.mjs";

export function generateMarkdownReport(systems, scenario = null) {
  const weights = scenario?.weights || DEFAULT_WEIGHTS;
  const ranked = rankSystems(systems, weights);
  const summary = summarizeSystems(ranked);
  const payload = buildExportPayload(ranked, summary, scenario);
  const topSystems = payload.systems.slice(0, 5);
  const memo = buildDecisionMemo(ranked[0], weights);

  return [
    "# Model Systems Lab Report",
    "",
    `Generated: ${payload.generatedAt}`,
    `Scenario: ${payload.scenario?.name || "Balanced readiness"}`,
    "",
    "## Portfolio Snapshot",
    "",
    `- Top system: ${payload.summary.topSystem || "None"}`,
    `- Average score: ${payload.summary.averageScore}`,
    `- Average risk: ${payload.summary.averageRisk}`,
    `- Systems needing review: ${payload.summary.reviewCount}`,
    "",
    "## Top Ranked Systems",
    "",
    "| Rank | System | Stage | Score | Tier | Next action |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...topSystems.map(
      (system) =>
        `| ${system.rank} | ${system.name} | ${system.stage} | ${system.score} | ${system.tier} | ${system.nextAction} |`
    ),
    "",
    "## Decision Memo",
    "",
    ...memo.map((item) => `- ${item}`),
    ""
  ].join("\n");
}
