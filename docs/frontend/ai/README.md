# AI Development Workflow -- Desk Booking

This document defines how Large Language Models (LLMs) must be used
inside the repository.

The goal is to: - Prevent architectural drift - Maintain Clean
Architecture boundaries - Avoid contract violations - Keep quality gates
enforced - Standardize AI-assisted development

------------------------------------------------------------------------

# Philosophy

LLMs are engineering tools, not decision makers.

They must: - Follow architecture documents - Respect separation of
concerns - Never invent API contracts - Never introduce unapproved
dependencies

All architectural decisions are governed by:

-   `docs/ARCHITECTURE.md`
-   `docs/frontend/ARCHITECTURE-FRONTEND.md`
-   `docs/frontend/AI-GUIDE-FRONTEND.md`
-   `docs/frontend/API-CONTRACT.md`
-   `docs/frontend/QUALITY-GATES.md`

If any instruction conflicts with architecture documents, architecture
prevails.

------------------------------------------------------------------------

# AI Modes

The repository defines three operational modes for LLM interaction.

Each mode has a dedicated template.

------------------------------------------------------------------------

## 1. GENERATE MODE

File: LLM-GENERATE.md

Use when: - Creating new features - Adding new files - Implementing
queries/mutations - Creating API adapters

Characteristics: - Strict file targeting - No architectural changes -
Explicit constraints - Defined output format

Never use this mode for auditing or refactoring.

------------------------------------------------------------------------

## 2. AUDIT MODE

File: LLM-AUDIT.md

Use when: - Reviewing new code - Detecting violations - Checking
separation of responsibilities - Ensuring OpenAPI contract adherence -
Verifying no logic in UI

Output must be a structured report, not rewritten code.

------------------------------------------------------------------------

## 3. REFACTOR MODE

File: LLM-REFACTOR.md

Use when: - Improving clarity - Reducing duplication - Improving type
safety - Strengthening separation of layers

Rules: - No behavior changes unless requested - No contract breaking -
Minimal modifications

------------------------------------------------------------------------

# Recommended Workflow

1.  Generate feature using GENERATE mode.
2.  Run local quality gates (lint, typecheck, tests).
3.  Audit using AUDIT mode.
4.  Refactor if needed using REFACTOR mode.
5.  Re-run quality gates.

This creates a controlled AI-assisted development cycle.

------------------------------------------------------------------------

# AI Compliance in PR

Use the PR checklist in:

- `.github/PULL_REQUEST_TEMPLATE.md`

Minimum expected checks:

- LLM mode used and documented (`GENERATE` / `AUDIT` / `REFACTOR`).
- No manual edits on generated OpenAPI artifacts.
- No unapproved dependencies.
- No business logic in UI.
- No direct HTTP calls in components.
- Quality gates in green before merge.

------------------------------------------------------------------------

# Safety Rules

LLMs must never:

-   Modify OpenAPI generated files.
-   Modify unrelated modules.
-   Introduce new dependencies without documentation.
-   Add business logic to UI.
-   Access HTTP directly inside components.

------------------------------------------------------------------------

# Authorization Strategy Reminder

Security enforcement always lives in backend.

Frontend: - May hide UI elements - May use route guards

Backend: - Enforces policies - Validates roles - Protects endpoints

Frontend must never be considered a security boundary.

------------------------------------------------------------------------

# Versioning

AI rules evolve with the architecture.

Whenever folder structure or architectural boundaries change, update:

-   AI-GUIDE-FRONTEND.md
-   This README.md
-   Related templates

------------------------------------------------------------------------

# Final Principle

Consistency beats cleverness.

The purpose of this AI workflow is not speed. It is controlled
acceleration without technical debt.
