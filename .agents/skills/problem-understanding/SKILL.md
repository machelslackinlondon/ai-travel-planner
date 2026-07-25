---
name: problem-understanding
description: Read a task or bug report yourself before delegating work. Use this step to form a clear problem statement, identify constraints, and surface missing information before requirements extraction.
---

# Problem Understanding

## Overview

Use this skill when a task is ambiguous, under-specified, or likely to be misread if the agent jumps straight to implementation.

## Workflow

- Read the request, repository context, and any linked files or instructions.
- Restate the problem in your own words.
- Identify the user impact, scope, constraints, assumptions, and known unknowns.
- Note any missing information that should be sourced before proceeding.
- Produce a concise problem statement and a short list of clarifying questions.

## Gates

- If the request is ambiguous, ask the user for missing context before continuing.
- If the task conflicts with repository guidance or constraints, pause and ask for confirmation.
- If the problem appears to be a bug, confirm the expected versus actual behavior before moving on.

## Response Shape

- Problem statement
- Scope and constraints
- Assumptions
- Open questions
- Recommended next step
