---
name: create-jira-ticket
description: Create, draft, deduplicate, or verify Jira tickets and work items through a configured Jira MCP server. Use when Codex is given Jira fields, asks to create an issue, needs a draft Jira payload, or must safely automate ticket creation with validation and duplicate checks.
---

# Create Jira Ticket Workflow

## Overview

Use the configured Jira MCP server for Jira reads and writes. Do not bypass MCP with direct REST calls unless the user explicitly asks for that fallback.

## Required Fields

Require these fields before creating an issue:

- `JIRA_PROJECT_KEY`
- `JIRA_ISSUE_TYPE`
- `JIRA_SUMMARY`
- `JIRA_DESCRIPTION`

If any required field is missing, produce a concise draft payload and ask only for the missing values.

## Create Modes

- `auto`: Default. Validate required fields, search for duplicates, then create exactly one issue when safe.
- `approval-required`: Present the exact Jira payload and wait for explicit approval before invoking the create tool.
- `draft`: Do not create an issue; output the payload that would be created.

## Safety Rules

- Never hardcode Jira credentials, API tokens, OAuth secrets, personal account details, or customer-sensitive ticket data.
- Search for an existing issue before creation using `JIRA_DEDUPLICATION_JQL` when present; otherwise search by project key and exact or near-exact summary.
- If a likely duplicate exists, do not create a new issue unless the user explicitly confirms.
- Verify project, issue type, and required fields through Jira MCP metadata when available.
- If Jira rejects the payload, inspect the structured error, fix safe payload issues, and retry at most once.
- Create bulk tickets only when the task provides multiple independent ticket payloads or an exact requested count.

## Validation

- Confirm Jira MCP tools are available before attempting creation.
- Validate required fields and duplicate search before the create call.
- Read back the created issue through Jira MCP when possible.
- Update `runtime/session-notes.md` with the created or existing issue key and URL when continuity matters.

## Response Shape

- Jira action taken: created, duplicate found, draft only, awaiting approval, or blocked
- Created or existing issue key and URL when available
- Final payload summary
- Validation performed
- Residual risks or missing fields only when material
