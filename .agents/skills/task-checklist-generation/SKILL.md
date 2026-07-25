---
name: task-checklist-generation
description: Convert the approved plan into a task-by-task checklist that can be implemented incrementally with clear completion criteria.
---

# Task Checklist Generation

## Overview

Use this skill after the plan is approved to create a working checklist for incremental delivery.

## Workflow

- Break the approved plan into discrete implementation tasks.
- Write each task with a clear completion criterion.
- Order the tasks so that each step builds on the previous one.
- Mark tasks that should be validated immediately after implementation.

## Gates

- If the checklist is too coarse, ask the user to refine the granularity before implementation starts.
- If a task depends on an unconfirmed decision, pause and request clarification.

## Response Shape

- Ordered task checklist
- Completion criteria per task
- Validation notes
- Suggested starting point
