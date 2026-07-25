---
name: iterative-implementation
description: Implement one task at a time from the approved checklist, keeping changes scoped and validating each increment before moving on.
---

# Iterative Implementation

## Overview

Use this skill to execute the work in small, reviewable increments rather than a large batch change.

## Workflow

- Select the next task from the checklist.
- Implement only that task and keep the diff focused.
- Validate the change with the most relevant test or check.
- Record any blockers or unexpected complexity before moving on.

## Gates

- Ask the user for guidance if the next task requires a design choice that was not previously approved.
- Pause if the task would broaden scope beyond the selected checklist item.

## Response Shape

- Current task
- What changed
- Validation performed
- Next task or blocker
