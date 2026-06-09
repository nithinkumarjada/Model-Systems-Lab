# Model Systems Lab

Model Systems Lab is a generic interactive dashboard for comparing model-powered systems, testing deployment scenarios, and producing review-ready readiness summaries.

It is intentionally dependency-free: the app runs as static HTML, CSS, and JavaScript, while the scoring logic is isolated in testable modules.

## Live Capabilities

- Scenario presets for balanced readiness, production hardening, cost control, and trust review.
- Adjustable scoring weights for quality, reliability, speed, cost, observability, and risk.
- Search, domain filters, stage filters, and risk limits.
- Canvas systems map that shows quality versus response time.
- System inspector with score contribution bars and a decision memo.
- Scenario impact panel that shows rank movement versus the balanced policy.
- Ranked systems table with readiness tiers and inspect actions.
- JSON export and clipboard summary actions.
- Markdown report generation from the command line.
- GitHub Pages workflow with validation before deployment.

## Quick Start

```bash
npm test
npm run check
npm run report
npm start
```

Then open [http://localhost:4174](http://localhost:4174).

## Repository Map

```text
data/systems.json              Example model systems
data/scenarios.json            Decision scenario presets
src/readiness.mjs              Scoring, tiers, summaries, and exports
src/report.mjs                 Markdown report generator
src/app.js                     Browser interactions and rendering
tests/readiness.test.mjs       Unit coverage for scoring and reports
scripts/check-project.mjs      Static project validation
scripts/generate-report.mjs    CLI report entrypoint
docs/architecture.md           Technical architecture notes
docs/scoring-model.md          Scoring formula and policy guidance
docs/operating-model.md        Review workflow and governance notes
```

## Scoring Summary

Each system is normalized into comparable metric components. Higher is better for quality, reliability, and observability. Lower is better for latency, cost, and risk. The final readiness score is:

```text
score = sum(normalized_metric * normalized_weight) * 100
```

Readiness tiers:

- Ready: score >= 82
- Watch: score >= 68
- Review: score >= 52
- Hold: score < 52

Detailed scoring notes live in [docs/scoring-model.md](docs/scoring-model.md).

## Deployment

The repository includes `.github/workflows/pages.yml`. On pushes to `main`, the workflow:

1. Runs `npm test`.
2. Runs `npm run check`.
3. Uploads the static project as a GitHub Pages artifact.
4. Deploys through GitHub Pages.

If Pages is not already active, set the repository Pages source to **GitHub Actions**.

## Report Generation

Generate a default report:

```bash
npm run report
```

Generate a scenario-specific report:

```bash
node scripts/generate-report.mjs trust
```

Available scenario IDs are defined in [data/scenarios.json](data/scenarios.json).

## Customizing The Lab

To add new systems, edit [data/systems.json](data/systems.json). Keep each record complete: `quality`, `reliability`, `latencyMs`, `costPer1k`, `observability`, `risk`, `signal`, and `nextAction`.

To add a new decision policy, edit [data/scenarios.json](data/scenarios.json). Scenario weights should sum to `1.0`; `npm run check` validates this.

## Quality Gates

```bash
npm test       # scoring, tiering, scenario comparison, report generation
npm run check  # static file and fixture validation
```

No build step is required.
