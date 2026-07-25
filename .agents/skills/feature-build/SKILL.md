---
name: feature-build
description: Build new behavior, capabilities, endpoints, UI, workflows, configuration support, or integrations in an existing repository. Use when Codex should implement a requested feature while preserving existing behavior, following repository conventions, and validating the result.
---

# Feature Build Workflow

## Overview

Use this skill to add scoped behavior with production-safe implementation and validation. Preserve existing behavior unless the user explicitly requests a behavior change.

## Workflow

- Clarify the intended user or system outcome before implementation when the requirement is ambiguous.
- Inspect existing patterns before adding abstractions, dependencies, files, or conventions.
- Keep the first implementation scoped to the requested feature.
- Apply TDD when the feature changes testable behavior.
- Avoid opportunistic refactors unless required for correctness, safety, or a clean integration point.
- Consider compatibility, rollout, observability, failure modes, and testability.
- Use feature flags, configuration, or staged rollout patterns when the repo already uses them and the impact warrants it.

## Design Checklist

- What existing module, boundary, or API should own this behavior?
- What data contracts, validation rules, or permissions apply?
- What errors, empty states, or degraded states should be handled?
- What tests or checks prove the feature works without regressing existing behavior?
- Does the feature introduce latency, cost, migration, or operational risk?

## Validation

- Add or update tests around new behavior when a test framework exists.
- Validate important edge cases, not only the happy path.
- For UI changes, verify responsive and interaction states when feasible.
- For API or backend changes, validate input handling, error paths, and compatibility.

## Response Shape

- Feature summary
- Files changed
- Validation performed
- Important edge cases covered
- Follow-up risks only when they materially affect delivery
