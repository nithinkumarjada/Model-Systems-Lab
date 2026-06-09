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
