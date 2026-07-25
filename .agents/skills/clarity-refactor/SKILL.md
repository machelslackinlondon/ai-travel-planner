---
name: clarity-refactor
description: Refactor the implemented solution for readability, maintainability, and alignment with the approved plan without changing intended behavior.
---

# Clarity Refactor

## Overview

Use this skill once the solution is functionally working and the structure is understood.

## Workflow

- Review the implementation for readability, naming, modularity, and duplication.
- Apply safe refactors that improve clarity without changing behavior.
- Preserve any existing contracts, interfaces, and user-visible semantics.
- Re-run the relevant validation after refactoring.

## Gates

- If the refactor would change behavior or scope, ask the user for confirmation.
- If the change is not clearly beneficial, skip the refactor and preserve the current implementation.

## Response Shape

- Refactor summary
- What improved
- Validation after refactor
- Any deferred follow-up
