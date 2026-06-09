# Scoring Model

The readiness score is a weighted sum of normalized metrics. Each metric is converted to a `0..1` range before applying the active scenario weights.

## Metrics

| Metric | Direction | Meaning |
| --- | --- | --- |
| Quality | Higher is better | Task performance or evaluation quality |
| Reliability | Higher is better | Stability, repeatability, and service consistency |
| Speed | Lower latency is better | Response-time suitability |
| Cost | Lower cost is better | Estimated serving cost per 1,000 requests |
| Observability | Higher is better | Monitoring, logging, alerting, and traceability |
| Risk | Lower is better | Operational, governance, or customer-impact risk |

## Formula

```text
normalized = (value - min) / (max - min)
lower_is_better = 1 - normalized
score = sum(component * normalized_weight) * 100
```

Weights are normalized at runtime, so custom values do not need to sum perfectly in the UI. Scenario fixtures do need to sum to `1.0`; this keeps scenario reviews legible in code review.

## Readiness Tiers

| Tier | Score | Default interpretation |
| --- | ---: | --- |
| Ready | 82+ | Strong candidate for production review |
| Watch | 68-81.9 | Useful but needs tracked follow-up |
| Review | 52-67.9 | Needs additional evidence before scaling |
| Hold | < 52 | Not ready for deployment discussion |

## Scenario Presets

- `balanced`: general portfolio review.
- `production`: prioritizes reliability, observability, and risk.
- `cost`: prioritizes cost and latency efficiency.
- `trust`: prioritizes governance posture and monitoring depth.

## Review Guidance

Use the score as a conversation starter, not an automatic deployment gate. The inspector panel shows which components contribute most and least to the score, while the review queue keeps concrete next actions visible.
