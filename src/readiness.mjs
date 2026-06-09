export const DEFAULT_WEIGHTS = Object.freeze({
  quality: 0.28,
  reliability: 0.24,
  latency: 0.15,
  cost: 0.11,
  observability: 0.14,
  risk: 0.08
});

export const METRIC_RANGES = Object.freeze({
  quality: [70, 98],
  reliability: [65, 96],
  latencyMs: [80, 1100],
  costPer1k: [0.05, 1.2],
  observability: [55, 95],
  risk: [10, 55]
});

export function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function normalize(value, range, direction = "higher") {
  const [min, max] = range;
  if (min === max) {
    return 0;
  }
  const normalized = clamp((value - min) / (max - min));
  return direction === "lower" ? 1 - normalized : normalized;
}

export function normalizeWeights(weights = DEFAULT_WEIGHTS) {
  const merged = { ...DEFAULT_WEIGHTS, ...weights };
  const entries = Object.entries(merged).map(([key, value]) => [key, Math.max(Number(value) || 0, 0)]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (total === 0) {
    return { ...DEFAULT_WEIGHTS };
  }

  return Object.fromEntries(entries.map(([key, value]) => [key, value / total]));
}

export function scoreSystem(system, weights = DEFAULT_WEIGHTS) {
  const safeWeights = normalizeWeights(weights);
  const components = {
    quality: normalize(system.quality, METRIC_RANGES.quality),
    reliability: normalize(system.reliability, METRIC_RANGES.reliability),
    latency: normalize(system.latencyMs, METRIC_RANGES.latencyMs, "lower"),
    cost: normalize(system.costPer1k, METRIC_RANGES.costPer1k, "lower"),
    observability: normalize(system.observability, METRIC_RANGES.observability),
    risk: normalize(system.risk, METRIC_RANGES.risk, "lower")
  };

  const score = Object.entries(components).reduce(
    (sum, [metric, value]) => sum + value * safeWeights[metric],
    0
  );

  return {
    score: Number((score * 100).toFixed(1)),
    components
  };
}

export function explainSystem(system, weights = DEFAULT_WEIGHTS) {
  const scored = scoreSystem(system, weights);
  const safeWeights = normalizeWeights(weights);

  const contributions = Object.entries(scored.components)
    .map(([metric, normalized]) => ({
      metric,
      normalized: Number(normalized.toFixed(3)),
      weight: Number(safeWeights[metric].toFixed(3)),
      contribution: Number((normalized * safeWeights[metric] * 100).toFixed(1))
    }))
    .sort((a, b) => b.contribution - a.contribution);

  return {
    score: scored.score,
    components: scored.components,
    contributions
  };
}

export function rankSystems(systems, weights = DEFAULT_WEIGHTS) {
  return systems
    .map((system) => ({ ...system, ...scoreSystem(system, weights) }))
    .sort((a, b) => b.score - a.score || a.risk - b.risk || a.latencyMs - b.latencyMs);
}

export function summarizeSystems(rankedSystems) {
  if (!rankedSystems.length) {
    return {
      best: null,
      averageScore: 0,
      averageRisk: 0,
      productionCount: 0,
      reviewCount: 0
    };
  }

  return {
    best: rankedSystems[0],
    averageScore: Number(
      (rankedSystems.reduce((sum, system) => sum + system.score, 0) / rankedSystems.length).toFixed(1)
    ),
    averageRisk: Number(
      (rankedSystems.reduce((sum, system) => sum + system.risk, 0) / rankedSystems.length).toFixed(1)
    ),
    productionCount: rankedSystems.filter((system) => system.stage === "Production").length,
    reviewCount: rankedSystems.filter((system) => system.risk >= 30 || system.observability < 75).length
  };
}

export function groupByDomain(systems) {
  return systems.reduce((groups, system) => {
    groups[system.domain] = (groups[system.domain] || 0) + 1;
    return groups;
  }, {});
}

export function readinessTier(score) {
  if (score >= 82) {
    return "Ready";
  }
  if (score >= 68) {
    return "Watch";
  }
  if (score >= 52) {
    return "Review";
  }
  return "Hold";
}

export function compareRankings(baselineSystems, scenarioSystems) {
  const baselineRanks = new Map(baselineSystems.map((system, index) => [system.id, index + 1]));

  return scenarioSystems.map((system, index) => ({
    id: system.id,
    name: system.name,
    score: system.score,
    rank: index + 1,
    delta: (baselineRanks.get(system.id) || scenarioSystems.length + 1) - (index + 1)
  }));
}

export function buildDecisionMemo(system, weights = DEFAULT_WEIGHTS) {
  if (!system) {
    return [];
  }

  const explanation = explainSystem(system, weights);
  const strongest = explanation.contributions[0];
  const weakest = [...explanation.contributions].reverse()[0];
  const notes = [
    `${system.name} is in ${system.stage.toLowerCase()} with a readiness score of ${explanation.score}.`,
    `Strongest signal: ${formatMetric(strongest.metric)} contributes ${strongest.contribution} points.`,
    `Watch item: ${formatMetric(weakest.metric)} contributes ${weakest.contribution} points.`
  ];

  if (system.risk >= 35) {
    notes.push("Risk is elevated enough to require an explicit owner review before expansion.");
  }

  if (system.observability < 75) {
    notes.push("Observability needs stronger telemetry before production decisioning.");
  }

  return notes;
}

export function buildExportPayload(rankedSystems, summary, scenario) {
  return {
    generatedAt: new Date().toISOString(),
    scenario: scenario
      ? {
          id: scenario.id,
          name: scenario.name,
          riskLimit: scenario.riskLimit
        }
      : null,
    summary: {
      topSystem: summary.best?.name || null,
      averageScore: summary.averageScore,
      averageRisk: summary.averageRisk,
      reviewCount: summary.reviewCount
    },
    systems: rankedSystems.map((system, index) => ({
      rank: index + 1,
      id: system.id,
      name: system.name,
      domain: system.domain,
      stage: system.stage,
      score: system.score,
      tier: readinessTier(system.score),
      risk: system.risk,
      nextAction: system.nextAction
    }))
  };
}

export function formatMetric(metric) {
  const labels = {
    quality: "Quality",
    reliability: "Reliability",
    latency: "Speed",
    cost: "Cost",
    observability: "Observability",
    risk: "Risk"
  };

  return labels[metric] || metric;
}
