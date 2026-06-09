# Operating Model

Model Systems Lab is organized around a lightweight review loop for model-powered systems.

## Review Loop

1. Add or update system records in `data/systems.json`.
2. Choose the scenario that matches the operating question.
3. Inspect the top-ranked systems and the review queue.
4. Export JSON or generate a Markdown report for the review record.
5. Convert next actions into tracked work.

## Suggested Review Questions

- Which system is ready under the balanced policy?
- Does the top candidate remain strong under production hardening?
- Which systems move most when cost or trust is prioritized?
- Are low-observability systems being promoted too early?
- Is the next action specific enough for an owner to execute?

## Pull Request Checklist

- New systems have complete metrics and next actions.
- Scenario weights sum to `1.0`.
- `npm test` passes.
- `npm run check` passes.
- README or docs are updated when behavior changes.

## Governance Notes

This project does not claim that a numeric score is sufficient for deployment. It makes tradeoffs visible so reviewers can focus discussion, document decisions, and track operational gaps.
