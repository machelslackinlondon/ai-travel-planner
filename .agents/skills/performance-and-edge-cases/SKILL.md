---
name: performance-and-edge-cases
description: Analyse performance implications, scalability constraints, and edge cases for the current implementation and identify follow-up improvements.
---

# Performance and Edge Cases

## Overview

Use this skill after the main implementation is in place to look for bottlenecks, failure modes, and corner cases before final refinement.

## Workflow

- Review the change for obvious performance concerns.
- Identify edge cases, error conditions, and boundary behaviors.
- Highlight any risks related to scale, latency, reliability, or data correctness.
- Recommend whether mitigation is necessary before completion.

## Gates

- If a performance concern could materially affect users, ask the user whether to prioritize mitigation now.
- If an edge case would change behavior significantly, pause and confirm the intended result.

## Response Shape

- Performance observations
- Edge cases considered
- Risks and recommendations
- Recommended follow-up action
