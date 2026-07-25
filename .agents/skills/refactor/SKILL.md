---
name: refactor
description: Improve structure, readability, maintainability, modularity, or testability while preserving behavior. Use when Codex is asked to refactor code, reduce duplication, improve boundaries, or apply a design pattern without changing external behavior.
---

# Refactor Workflow

## Overview

Use this skill for behavior-preserving structure changes. Apply TDD or characterization tests when coverage is missing or behavior preservation is uncertain.

## Workflow

- Preserve behavior unless the user explicitly requests a behavior change.
- Identify the specific pain point before refactoring.
- Name the refactoring type, design pattern, or structural improvement when useful.
- Prefer localized, incremental, reversible changes.
- Avoid broad rewrites unless explicitly authorized and the impact is understood.
- Keep public interfaces stable unless changing them is part of the requested scope.
- Separate mechanical movement from behavior changes when possible.

## Checklist

- What code smell or maintenance risk is being addressed?
- Why is the improvement needed now?
- What behavior must remain unchanged?
- Which tests or checks can prove behavior preservation?
- Does the refactor change module boundaries, public APIs, data contracts, or runtime behavior?

## Validation

- Run existing tests that cover the refactored area.
- Add characterization tests first when behavior is important and coverage is missing.
- If validation is limited, describe the remaining risk clearly.

## Response Shape

- Refactoring motivation
- Refactoring type or pattern, if applicable
- Behavior preservation strategy
- Validation performed
- Remaining risk
