---
name: testing-and-validation
description: Generate and run the relevant tests, checks, or validation steps for the implemented work and capture any failures.
---

# Testing and Validation

## Overview

Use this skill after implementation or each meaningful increment to verify behavior and detect regressions.

## Workflow

- Identify the most relevant tests, commands, or checks for the change.
- Run them and capture the outcome.
- If tests fail, analyse the failure and report whether it is caused by the change or an existing issue.
- Recommend follow-up actions if validation is incomplete.

## Gates

- If the necessary test coverage is missing, ask the user whether to add a targeted regression test.
- If validation cannot run in the current environment, explain the limitation and request permission to proceed with partial validation.

## Response Shape

- Validation plan
- Execution results
- Failures or blockers
- Follow-up recommendations
