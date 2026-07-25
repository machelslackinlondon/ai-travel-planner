---
name: project-bootstrap
description: Create, scaffold, or standardize a new project, app, service, package, or monorepo workspace. Use when Codex should propose project shape, initialize files, choose stack defaults, add testing and tooling, or prepare a production-minded starter structure.
---

# Project Bootstrap Workflow

## Default Stack

Unless the task says otherwise, default to Node.js, TypeScript, Fastify for APIs, Tailwind for UI packages, Docker, GitHub Actions, Jest, Cypress for browser flows, Lighthouse for web performance, k6 for API load tests, OpenTelemetry, Prometheus/Grafana/Loki where useful, Fly.io deployment, and a DAO layer that can support MongoDB plus PostgreSQL or MySQL.

## Required Inputs

- `IS_MONOREPO`: yes or no
- `SERVICES`: required when `IS_MONOREPO=yes`
- `SQL_DATABASE`: PostgreSQL or MySQL when SQL persistence is needed
- `APP_NAME` or service names
- Deployment target and naming strategy when deployment is included
- Capability toggles for CI/CD, Docker, databases, observability, and deployment when supplied

If `IS_MONOREPO` is unknown, ask before scaffolding. If `IS_MONOREPO=yes` and `SERVICES` is missing, ask for the service list before creating files.

## Pre-Scaffold Proposal

Produce a proposal before creating files when the scaffold is monorepo-based, medium/high impact, or approval is requested. Include project shape, services/packages, selected tools, alternatives, database and DAO strategy, CI/CD, deployment, Docker, observability, Node version enforcement, testing, assumptions, risks, and open questions.

## Workflow

- Prefer conventional structure over heavy framework abstraction.
- Use TypeScript throughout app, test, and build configuration.
- Include health checks and structured application entrypoints for APIs.
- Include Tailwind only where a UI/frontend package exists or web styling is requested.
- Include tests, coverage scripts, and practical starter thresholds.
- Include Docker, CI/CD, deployment, and observability scaffolding where useful and requested or safely inferred.
- Validate generated files with install/build/test/lint checks when feasible.

## Response Shape

- Scaffold summary
- Included and skipped capabilities
- Files changed
- Validation performed
- Run/deploy instructions
- Residual risks or required user configuration
