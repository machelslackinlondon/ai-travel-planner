---
name: risk-discovery
description: Inspect a codebase, scaffold, design, or implementation to identify non-functional limitations, production risks, constraints, and follow-up actions. Use when Codex should produce a risk register covering performance, reliability, security, data consistency, availability, observability, delivery safety, and mitigation strategies without implementing fixes.
---

# Risk Discovery Workflow

## Overview

Use this skill for review and risk analysis. Do not implement fixes unless the user explicitly asks.

## Scope

- Assess only the current repository/workspace unless the user provides external systems, docs, or architecture context.
- Do not infer risks from systems that are not present in the repo or described by the user.
- Mark missing context as `Unknown` rather than assuming.
- Base evidence on repository files, configuration, observed behavior, or explicit user-provided context.

## Discovery Areas

- Performance, latency, scalability, and concurrency
- Reliability, resilience, timeouts, retries, backoff, idempotency, and graceful degradation
- Data consistency, integrity, availability, migrations, backup, and restore
- Security, authentication, authorization, secrets, and dependency risk
- Observability, logs, metrics, traces, dashboards, alerts, and runbooks
- CI/CD, deployment, rollback, environment parity, and release safety
- Local development, configuration, operational complexity, and cost
- Test coverage, quality gates, accessibility, browser support, and client-side rendering risks

## Risk Register

Produce a prioritized table:

| Area | Finding | Impact | Likelihood | Severity | Evidence | Mitigation Strategy | Recommended Action | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Use `low`, `medium`, or `high` for likelihood and severity. Evidence must reference a file, config, observed behavior, or explicit user-provided context.

## Response Shape

- Executive summary of highest risks
- Risk register
- Assumptions and unknowns
- Quick wins
- Follow-up tasks ordered by priority
- Suggested validation or monitoring to confirm mitigation success
