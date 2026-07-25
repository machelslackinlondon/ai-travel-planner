# Codex Skills System

Portable, skills-first instructions for AI coding agents working in this repository.

## Source of Truth

- Project skills live in `.agents/skills/<skill-name>/SKILL.md`.
- `skills.sh.json` groups the hosted skills for discovery and presentation.
- `THIRD_PARTY_SKILLS.md` records provenance and licences for vendored skills.
- The current user request is the authoritative source of scope and desired outcome.

There is no separate task layer. Do not load, create, or depend on `tasks/*.md` or `runtime/active-task.md`. If workflow guidance needs to change, update the relevant skill instead of creating parallel task instructions.

## Skill Load Order

1. Read the current user request and inspect the relevant repository context.
2. Select the smallest set of matching skills from the skills exposed by the runtime or `.agents/skills/`.
3. Read each selected `SKILL.md` completely before acting.
4. Read only the references, scripts, or assets that the selected skill requires for the current work.
5. Follow the selected skill while preserving higher-priority system, developer, safety, and user instructions.

Do not load every skill. If no project skill matches, follow the repository conventions and the current user request directly.

## Precedence

1. System, developer, security, and safety instructions.
2. Current user request.
3. Repository-level instructions in this file.
4. Selected skill instructions.
5. Existing code and documentation conventions.

A skill may specialize the workflow but must not weaken higher-priority instructions.

## Skill Selection

Use `skills.sh.json` as the maintained catalogue. Typical routing includes:

- Planning and discovery: `problem-understanding`, `requirements-extraction`, `business-requirements-planning`, `implementation-planning`, `plan-review-and-refinement`, `architecture-comparison`, `risk-discovery`.
- Engineering: `feature-build`, `bug-fix`, `refactor`, `performance-optimization`, `project-bootstrap`, `iterative-implementation`, `clarity-refactor`.
- Review and validation: `change-review`, `code-review`, `testing-and-validation`, `performance-and-edge-cases`, `solution-explanation`, `assumptions-and-tradeoffs`.
- Specialist workflows: `accessibility`, `playwright-cli`, `vercel-react-best-practices`, `supabase-postgres-best-practices`, `gh-fix-ci`, `codeql`, `supply-chain-risk-auditor`, `azure-diagnostics`, `create-jira-ticket`.

Explicit skill requests take priority over automatic routing when they remain compatible with the user’s requested outcome.

## Agent Behaviour

- Validate repository context before changing files.
- Clarify material ambiguity before implementation when a safe assumption is not available.
- Use the smallest safe change and avoid unrelated refactors.
- Preserve existing behaviour unless the request explicitly changes it.
- Follow repository conventions and keep secrets out of code, logs, fixtures, and version control.
- Run validation proportionate to the change and report failures honestly.
- Report changed files, validation performed, and any material residual risk.
- Prefer concise links and summaries over copying long instructions into responses.

## Maintenance

- Update a skill’s `SKILL.md` first when changing workflow behaviour.
- Keep `skills.sh.json` aligned when skills are added, removed, renamed, or regrouped.
- Keep `THIRD_PARTY_SKILLS.md` aligned when vendored skill source, commit, licence, or integration changes.
- Do not reintroduce a separate task layer or duplicate skill instructions in this file.
