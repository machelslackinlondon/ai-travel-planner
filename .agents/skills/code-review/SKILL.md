---
name: code-review
description: Review branch commits, pull-request diffs, explicit commit ranges, or local repository changes for correctness, regressions, tests, security, performance, scalability, maintainability, data consistency, availability, and introduced risk. Use when Codex is asked for a review or audit of code changes.
---

# Code Review Workflow

## Overview

Use this skill in review-only mode by default. Do not edit files unless the user explicitly approves a proposed fix.

## Range Selection

- Use an explicit `REVIEW_RANGE` when provided.
- Otherwise use `REVIEW_BASE_REF` and `REVIEW_HEAD_REF` to review the merge-base through the head ref.
- If no range is provided, infer the most likely base branch from repository context when safe.
- Do not review only the latest commit unless the user explicitly asks for latest-commit review.

## Review Scope

Inspect introduced changes for:

- Correctness and behavioral regressions
- Scalability and concurrency risks
- Maintainability and readability
- Security, authentication, authorization, secrets, and dependency risk
- Performance, latency, memory, and cost
- Data consistency and availability
- Test coverage and passing tests
- Build, lint, typecheck, and release impact
- Observability, rollout, and rollback concerns

## Findings Standard

- Lead with findings ordered by severity.
- Ground every finding in file paths, changed behavior, failing checks, or commit evidence.
- Distinguish confirmed issues from assumptions or unknowns.
- Run or inspect relevant tests when feasible; otherwise explain why not.
- Classify introduced risk as low, medium, or high.

## Response Shape

Use a findings-first table:

| Severity | Area | Finding | Evidence | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- |

Then include review range, changed behavior summary, validation status, introduced risk assessment, security/performance/scalability/maintainability notes, proposed fixes requiring approval, and open questions.
