import {
  DEFAULT_WEIGHTS,
  METRIC_RANGES,
  buildDecisionMemo,
  buildExportPayload,
  compareRankings,
  explainSystem,
  formatMetric,
  groupByDomain,
  rankSystems,
  readinessTier,
  summarizeSystems
} from "./readiness.mjs";

const state = {
  systems: [],
  scenarios: [],
  selectedScenarioId: "balanced",
  selectedSystemId: null,
  domain: "All",
  stage: "All",
  search: "",
  maxRisk: 55,
  weights: { ...DEFAULT_WEIGHTS }
};

const elements = {
  scenarioFilter: document.querySelector("#scenarioFilter"),
  domainFilter: document.querySelector("#domainFilter"),
  stageFilter: document.querySelector("#stageFilter"),
  searchInput: document.querySelector("#searchInput"),
  riskLimit: document.querySelector("#riskLimit"),
  riskValue: document.querySelector("#riskValue"),
  resetWeights: document.querySelector("#resetWeights"),
  copySummary: document.querySelector("#copySummary"),
  exportJson: document.querySelector("#exportJson"),
  rows: document.querySelector("#systemRows"),
  reviewList: document.querySelector("#reviewList"),
  domainList: document.querySelector("#domainList"),
  scenarioImpact: document.querySelector("#scenarioImpact"),
  inspector: document.querySelector("#inspector"),
  statusText: document.querySelector("#statusText"),
  scenarioText: document.querySelector("#scenarioText"),
  metrics: {
    bestScore: document.querySelector("#bestScore"),
    bestName: document.querySelector("#bestName"),
    avgScore: document.querySelector("#avgScore"),
    avgRisk: document.querySelector("#avgRisk"),
    reviewCount: document.querySelector("#reviewCount")
  },
  canvas: document.querySelector("#systemsMap")
};

const weightInputs = Array.from(document.querySelectorAll("[data-weight]"));

async function boot() {
  const [systemsResponse, scenariosResponse] = await Promise.all([
    fetch("./data/systems.json"),
    fetch("./data/scenarios.json")
  ]);

  state.systems = await systemsResponse.json();
  state.scenarios = await scenariosResponse.json();
  applyScenario(state.scenarios[0], { renderAfter: false });
  hydrateControls();
  bindEvents();
  render();
}

function hydrateControls() {
  const domains = ["All", ...new Set(state.systems.map((system) => system.domain))].sort();
  const stages = ["All", ...new Set(state.systems.map((system) => system.stage))].sort();

  elements.scenarioFilter.innerHTML = state.scenarios
    .map((scenario) => `<option value="${scenario.id}">${scenario.name}</option>`)
    .join("");
  elements.domainFilter.innerHTML = domains.map((domain) => `<option value="${domain}">${domain}</option>`).join("");
  elements.stageFilter.innerHTML = stages.map((stage) => `<option value="${stage}">${stage}</option>`).join("");
  updateWeightInputs();
}

function bindEvents() {
  elements.scenarioFilter.addEventListener("change", (event) => {
    const scenario = state.scenarios.find((item) => item.id === event.target.value);
    applyScenario(scenario);
  });

  elements.domainFilter.addEventListener("change", (event) => {
    state.domain = event.target.value;
    render();
  });

  elements.stageFilter.addEventListener("change", (event) => {
    state.stage = event.target.value;
    render();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.riskLimit.addEventListener("input", (event) => {
    state.maxRisk = Number(event.target.value);
    elements.riskValue.textContent = state.maxRisk;
    render();
  });

  weightInputs.forEach((input) => {
    input.addEventListener("input", (event) => {
      const key = event.target.dataset.weight;
      state.weights[key] = Number(event.target.value);
      document.querySelector(`[data-weight-value="${key}"]`).textContent = formatWeight(state.weights[key]);
      render();
    });
  });

  elements.resetWeights.addEventListener("click", () => {
    const scenario = getActiveScenario();
    applyScenario(scenario || state.scenarios[0]);
  });

  elements.rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspect]");
    if (!button) {
      return;
    }

    state.selectedSystemId = button.dataset.inspect;
    render();
  });

  elements.copySummary.addEventListener("click", async () => {
    const ranked = getRankedSystems();
    const summary = summarizeSystems(ranked);
    const scenario = getActiveScenario();
    const payload = buildExportPayload(ranked, summary, scenario);
    const text = [
      `Scenario: ${scenario?.name || "Custom"}`,
      `Top system: ${payload.summary.topSystem || "None"}`,
      `Average score: ${payload.summary.averageScore}`,
      `Average risk: ${payload.summary.averageRisk}`,
      `Needs review: ${payload.summary.reviewCount}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      elements.statusText.textContent = "Summary copied";
    } catch {
      elements.statusText.textContent = "Copy unavailable in this browser";
    }
  });

  elements.exportJson.addEventListener("click", () => {
    const ranked = getRankedSystems();
    const summary = summarizeSystems(ranked);
    const payload = buildExportPayload(ranked, summary, getActiveScenario());
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "model-systems-readiness.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  window.addEventListener("resize", () => renderMap(getRankedSystems()));
}

function applyScenario(scenario, options = { renderAfter: true }) {
  if (!scenario) {
    return;
  }

  state.selectedScenarioId = scenario.id;
  state.weights = { ...scenario.weights };
  state.maxRisk = scenario.riskLimit;

  if (elements.scenarioFilter) {
    elements.scenarioFilter.value = scenario.id;
  }
  if (elements.riskLimit) {
    elements.riskLimit.value = scenario.riskLimit;
    elements.riskValue.textContent = scenario.riskLimit;
  }

  updateWeightInputs();

  if (options.renderAfter) {
    render();
  }
}

function updateWeightInputs() {
  weightInputs.forEach((input) => {
    const key = input.dataset.weight;
    input.value = state.weights[key] || 0;
    document.querySelector(`[data-weight-value="${key}"]`).textContent = formatWeight(state.weights[key] || 0);
  });
}

function getActiveScenario() {
  return state.scenarios.find((scenario) => scenario.id === state.selectedScenarioId);
}

function getFilteredSystems() {
  return state.systems.filter((system) => {
    const domainMatches = state.domain === "All" || system.domain === state.domain;
    const stageMatches = state.stage === "All" || system.stage === state.stage;
    const riskMatches = system.risk <= state.maxRisk;
    const searchMatches =
      !state.search ||
      [system.name, system.domain, system.stage, system.owner, system.signal, system.nextAction]
        .join(" ")
        .toLowerCase()
        .includes(state.search);
    return domainMatches && stageMatches && riskMatches && searchMatches;
  });
}

function getRankedSystems() {
  return rankSystems(getFilteredSystems(), state.weights);
}

function render() {
  const ranked = getRankedSystems();
  const summary = summarizeSystems(ranked);

  if (!ranked.some((system) => system.id === state.selectedSystemId)) {
    state.selectedSystemId = ranked[0]?.id || null;
  }

  renderMetrics(summary, ranked);
  renderTable(ranked);
  renderReviewQueue(ranked);
  renderDomains(ranked);
  renderScenarioImpact(ranked);
  renderInspector(ranked);
  renderMap(ranked);
}

function renderMetrics(summary, ranked) {
  const scenario = getActiveScenario();
  elements.statusText.textContent = `${ranked.length} systems visible`;
  elements.scenarioText.textContent = scenario?.description || "Custom scoring policy";
  elements.metrics.bestScore.textContent = summary.best ? summary.best.score : "0";
  elements.metrics.bestName.textContent = summary.best ? summary.best.name : "No systems";
  elements.metrics.avgScore.textContent = summary.averageScore;
  elements.metrics.avgRisk.textContent = summary.averageRisk;
  elements.metrics.reviewCount.textContent = summary.reviewCount;
}

function renderTable(ranked) {
  elements.rows.innerHTML = ranked
    .map((system, index) => {
      const selected = system.id === state.selectedSystemId ? " selected-row" : "";
      const tier = readinessTier(system.score);

      return `
        <tr class="${selected}">
          <td><span class="rank">${index + 1}</span></td>
          <td>
            <strong>${system.name}</strong>
            <span>${system.signal}</span>
          </td>
          <td>${system.domain}</td>
          <td>${system.stage}</td>
          <td><span class="tier ${tier.toLowerCase()}">${tier}</span></td>
          <td>${system.quality}</td>
          <td>${system.reliability}</td>
          <td>${system.latencyMs} ms</td>
          <td>$${system.costPer1k.toFixed(2)}</td>
          <td>${system.risk}</td>
          <td><span class="score-pill">${system.score}</span></td>
          <td><button class="mini-button" type="button" data-inspect="${system.id}">Inspect</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderReviewQueue(ranked) {
  const reviewItems = ranked
    .filter((system) => system.risk >= 30 || system.observability < 75)
    .slice(0, 4);

  elements.reviewList.innerHTML = (reviewItems.length ? reviewItems : ranked.slice(0, 3))
    .map(
      (system) => `
        <article class="review-card">
          <div>
            <span>${system.stage}</span>
            <strong>${system.name}</strong>
          </div>
          <p>${system.nextAction}</p>
        </article>
      `
    )
    .join("");
}

function renderDomains(ranked) {
  const grouped = groupByDomain(ranked);
  elements.domainList.innerHTML = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(
      ([domain, count]) => `
        <li>
          <span>${domain}</span>
          <strong>${count}</strong>
        </li>
      `
    )
    .join("");
}

function renderScenarioImpact(ranked) {
  const baseline = rankSystems(getFilteredSystems(), DEFAULT_WEIGHTS);
  const comparison = compareRankings(baseline, ranked).slice(0, 5);

  elements.scenarioImpact.innerHTML = comparison
    .map((system) => {
      const direction = system.delta > 0 ? "up" : system.delta < 0 ? "down" : "flat";
      const deltaLabel = system.delta === 0 ? "0" : `${system.delta > 0 ? "+" : ""}${system.delta}`;

      return `
        <li>
          <span>${system.name}</span>
          <strong class="${direction}">${deltaLabel}</strong>
        </li>
      `;
    })
    .join("");
}

function renderInspector(ranked) {
  const selected = ranked.find((system) => system.id === state.selectedSystemId);

  if (!selected) {
    elements.inspector.innerHTML = `<p class="empty-state">No system selected.</p>`;
    return;
  }

  const explanation = explainSystem(selected, state.weights);
  const memo = buildDecisionMemo(selected, state.weights);
  const tier = readinessTier(selected.score);

  elements.inspector.innerHTML = `
    <div class="inspector-header">
      <div>
        <span class="tier ${tier.toLowerCase()}">${tier}</span>
        <h3>${selected.name}</h3>
        <p>${selected.owner} · ${selected.domain} · ${selected.stage}</p>
      </div>
      <strong>${selected.score}</strong>
    </div>
    <div class="contribution-list">
      ${explanation.contributions
        .map(
          (item) => `
            <div class="contribution">
              <span>${formatMetric(item.metric)} <strong>${item.contribution}</strong></span>
              <div><i style="width: ${Math.min(item.contribution * 3.2, 100)}%"></i></div>
            </div>
          `
        )
        .join("")}
    </div>
    <ul class="memo-list">
      ${memo.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderMap(ranked) {
  const canvas = elements.canvas;
  const context = canvas.getContext("2d");
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(Math.round(bounds.width), 320);
  const height = Math.max(Math.round(bounds.height), 280);

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const padding = { top: 28, right: 28, bottom: 42, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  drawGrid(context, padding, plotWidth, plotHeight);

  if (!ranked.length) {
    context.fillStyle = "#5d6875";
    context.font = "700 14px system-ui, sans-serif";
    context.fillText("No systems match the current filters", padding.left, height / 2);
    return;
  }

  ranked.forEach((system) => {
    const x = scale(
      system.latencyMs,
      METRIC_RANGES.latencyMs[0],
      METRIC_RANGES.latencyMs[1],
      padding.left,
      padding.left + plotWidth
    );
    const y = scale(
      system.quality,
      METRIC_RANGES.quality[0],
      METRIC_RANGES.quality[1],
      padding.top + plotHeight,
      padding.top
    );
    const radius = 7 + system.score / 13;
    const color = colorForStage(system.stage);
    const selected = system.id === state.selectedSystemId;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = color.fill;
    context.fill();
    context.lineWidth = selected ? 4 : 2;
    context.strokeStyle = selected ? "#101820" : color.stroke;
    context.stroke();
    context.fillStyle = "#1d242c";
    context.font = "700 11px system-ui, sans-serif";
    context.fillText(system.id.toUpperCase(), x + radius + 5, y + 4);
  });
}

function drawGrid(context, padding, plotWidth, plotHeight) {
  context.strokeStyle = "#d8e0e8";
  context.lineWidth = 1;

  for (let index = 0; index <= 4; index += 1) {
    const x = padding.left + (plotWidth / 4) * index;
    const y = padding.top + (plotHeight / 4) * index;
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, padding.top + plotHeight);
    context.stroke();
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + plotWidth, y);
    context.stroke();
  }

  context.fillStyle = "#5d6875";
  context.font = "700 12px system-ui, sans-serif";
  context.fillText("Quality", padding.left, padding.top - 10);
  context.fillText("Response time", padding.left + plotWidth - 86, padding.top + plotHeight + 30);
}

function colorForStage(stage) {
  const palette = {
    Production: { fill: "rgba(16, 163, 127, 0.72)", stroke: "#08765a" },
    Pilot: { fill: "rgba(59, 130, 246, 0.72)", stroke: "#1d4ed8" },
    Validation: { fill: "rgba(245, 158, 11, 0.74)", stroke: "#a16207" },
    Prototype: { fill: "rgba(239, 68, 68, 0.7)", stroke: "#b91c1c" }
  };
  return palette[stage] || { fill: "rgba(82, 91, 105, 0.7)", stroke: "#343d4a" };
}

function scale(value, inputMin, inputMax, outputMin, outputMax) {
  return outputMin + ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin);
}

function formatWeight(value) {
  return Number(value).toFixed(2);
}

boot().catch((error) => {
  console.error(error);
  document.querySelector("#statusText").textContent = "Unable to load systems data";
});
