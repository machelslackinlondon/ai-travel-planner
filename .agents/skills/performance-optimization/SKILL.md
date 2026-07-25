---
name: performance-optimization
description: Improve latency, throughput, memory use, CPU use, database load, network usage, cost, scalability, or resource contention. Use when Codex should identify a bottleneck, make a measured optimization, preserve correctness, and report before/after evidence when feasible.
---

# Performance Optimization Workflow

## Overview

Use this skill for measurement-aware optimization. Prefer evidence over speculation and preserve correctness, security, and reliability.

## Workflow

- Establish the target metric, baseline, or bottleneck before optimizing when feasible.
- Identify the latency-sensitive or resource-sensitive path and relevant data size, concurrency, or traffic pattern.
- Keep changes scoped and reversible.
- Consider whether the change shifts cost or load to another system.
- Avoid trading maintainability for performance unless the gain is material and documented.
- Watch for cache invalidation, stale data, concurrency, backpressure, and retry amplification.

## Validation

- Compare before/after metrics when feasible.
- Use existing benchmarks, load tests, profiling, query plans, or targeted timing checks where available.
- Validate correctness on the optimized path and relevant edge cases.
- If measurement is unavailable, explain the reasoning and residual uncertainty.

## Response Shape

- Bottleneck or hypothesis
- Optimization summary
- Before/after evidence, if available
- Correctness validation
- Trade-offs and residual risk
