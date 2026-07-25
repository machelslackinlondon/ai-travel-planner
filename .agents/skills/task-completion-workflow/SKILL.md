---
name: task-completion-workflow
description: Orchestrate a full task-completion workflow by invoking the required analysis, planning, implementation, review, validation, and summarisation steps with approval gates at the right moments.
---

# Task Completion Workflow

## Overview

Use this skill as a top-level orchestrator for end-to-end task completion. It should guide the work through the full lifecycle while pausing for user approval or input whenever a decision could materially affect scope, design, or implementation.

## Workflow

1. Start by understanding the task and restating the problem.
2. Extract requirements and acceptance criteria.
3. Create an implementation plan.
4. Review the plan with the user and refine it.
5. Compare architecture options and ask the user to choose the preferred design when needed.
6. Generate a task checklist from the approved plan.
7. Implement the work one checklist item at a time.
8. Review each change before moving to the next item.
9. Run relevant tests and validation checks.
10. Analyse performance and edge cases.
11. Apply safe refactors for clarity.
12. Prepare an explanation of the final solution.
13. Simulate likely interviewer questions.
14. Summarise assumptions and trade-offs.

## Required Gates

- Before implementation, ask the user to confirm the plan unless it is already explicitly approved.
- Before entering code changes, ask for clarification if the task is ambiguous or under-specified.
- When architecture choices materially affect complexity, risk, or scope, present the options and request a choice.
- Before making a larger refactor or changing behavior beyond the approved scope, ask for confirmation.
- If validation cannot run fully, explain the limitation and ask whether to proceed with partial validation.

## Execution Guidance

- Prefer small, reviewable increments over large changes.
- Keep the workflow transparent by summarising the current step and the next expected gate.
- If the user declines a proposed design or plan, revise the plan and continue.
- Use the matching sub-skills in sequence rather than skipping steps.

## Response Shape

- Workflow status
- Current step
- Approval or input requested
- Completed steps and outcomes
- Next recommended action
