# Observability setup

This repository is organized into separate deployable apps:

- apps/metrics-dashboard
- apps/alarms-dashboard
- packages/shared-contracts

This keeps visual dashboards and alert logic independent while allowing them to share the same contracts.

## Deployment model

- Metrics dashboard: reads and displays metrics from the metrics API or store.
- Alarm dashboard: reads rules and active alert states from the alarm service.
- Shared contracts: central schema for metric and alarm objects.

## Suggested next step

Add a real metrics API and a real alarm evaluator behind each dashboard.
