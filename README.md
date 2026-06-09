# Model Systems Lab

A generic interactive project for comparing model systems, evaluating readiness, and communicating deployment tradeoffs. The dashboard ranks candidates with adjustable decision weights, filters systems by domain and stage, and highlights readiness signals for review.

## Features

- Weighted readiness scoring across quality, reliability, speed, cost, observability, and risk.
- Interactive filters for domain, lifecycle stage, and risk tolerance.
- Canvas-based systems map showing quality versus response time.
- Review queue for the highest-priority follow-up actions.
- Static app design that can be deployed with GitHub Pages.

## Run Locally

```bash
npm test
npm run check
npm start
```

Then open [http://localhost:4174](http://localhost:4174).

## Project Structure

```text
data/systems.json       Example model systems
src/readiness.mjs       Scoring and summary utilities
src/app.js              Browser UI
tests/readiness.test.mjs
scripts/check-project.mjs
index.html
styles.css
```
