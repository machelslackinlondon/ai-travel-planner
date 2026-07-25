---
name: bug-fix
description: Diagnose and fix broken, incorrect, flaky, or unexpected software behavior. Use when Codex is asked to reproduce a bug, identify a root cause, make a minimal correction, add regression coverage, or validate that behavior now matches the expected outcome.
---

# Bug Fix Workflow

## Overview

Use this skill to correct observed behavior with the smallest safe change. Preserve unrelated behavior and avoid opportunistic refactors.

## Workflow

- Identify the expected behavior, actual behavior, trigger input/state, and affected module before changing code when feasible.
- Reproduce the issue with a failing test, failing command, log evidence, code inspection, or a minimal scenario.
- Apply TDD when regression coverage is practical: write or identify a failing check first, make the smallest fix, then prove the check passes.
- Consider data integrity, security, availability, and user-visible correctness before deciding the change is low risk.
- Keep edits scoped to the root cause. Do not reformat, restructure, or rename unrelated code.

## Validation

- Run the most targeted test or check first.
- Add or update regression coverage for non-trivial fixes when the repo has a suitable test pattern.
- If tests cannot run, explain why and provide the best static or manual validation available.

## Response Shape

- Root cause
- Fix summary
- Validation performed
- Residual risk, if any
