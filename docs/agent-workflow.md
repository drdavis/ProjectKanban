# Agent-guided planning and execution

ProjectKanban provides an opt-in workflow pack, structured card records, and MCP operations. It does not run a background agent or automatically install skills into another tool.

## Enable the workflow for a project

1. Connect that product's MCP server using [the MCP setup guide](mcp.md).
2. Open **MCP access → Add agent workflow guidance** and copy the versioned instructions.
3. Merge the section into the connected project's `AGENTS.md` (Codex), `CLAUDE.md` (Claude Code), or project-instructions setting. Preserve existing rules. No tokens belong in these files.
4. Start a session and ask the agent to call `get_product` and `get_workflow`, confirm the selected product, and explain its next action.

The workflow routes ideas to planning, implementation to an existing or new card, errors to bug triage, and completion to verification. With GSD or another framework, use its planning process and record outcomes on the shared board. The host must load the project instructions; copying them does not prove they are installed. `get_workflow` returns the current version for comparison.

## Development cards

Capture the audience, problem, outcome, scope, exclusions and unresolved decisions separately. Add observable acceptance criteria, owner, priority, release/phase/milestone, a parent outcome if useful, blockers, implementation approach and test plan. Prefer a deliverable slice over an oversized checklist. Keep test evidence separate from acceptance criteria.

A draft can stay in Backlog while questions remain. Ready and later require acceptance criteria, a test plan and the structured brief's problem, outcome and scope. If plan review is required, record the reviewed approach and approval. Prerequisites must be completed with verification evidence. Done requires a passing result and actual evidence, even if the optional verification checkbox is off.

## Bug reports

Capture reporter/time, affected version/build, environment/browser/device, preconditions, numbered reproduction steps, expected and actual behavior, frequency, impact, severity and priority. Use Reported or Triage for missing information. Preserve unknowns rather than inventing them.

A report can be Confirmed, Intermittent or Not reproduced. An unreproduced bug needs investigation evidence before advancing; it is not automatically resolved. Link duplicates to the original within the same product, preserving both reports. Sanitized log references can go in evidence; attachment upload is a separate roadmap item and is not provided by this workflow release.

Before closure, record root-cause findings (or explicitly state that the cause is unresolved), fix summary, regression-test evidence, fixed-in version/release, and passing retest evidence. A successful build alone is insufficient.

## MCP lifecycle

- `get_product`: roadmap, releases, current revision, permissions and policy.
- `get_workflow`: versioned workflow and template guidance.
- `list_cards` / `get_card`: discover work; card details include structured execution and missing readiness/completion fields.
- `create_card`: create at intake. Use a UUID `requestId` for retry safety and `expectedRevision` when starting from a snapshot.
- `update_card`: partial edits to metadata, acceptance criteria and nested execution fields; requires `expectedRevision`. Omitted fields stay unchanged; arrays replace.
- `move_card`: use the latest `expectedRevision` to reject stale moves. Existing clients can still omit it, but new integrations should always supply it.
- `update_roadmap`: reviewed roadmap and optional full release list, a UUID retry key, latest revision and explicit roadmap permission. It rejects removal of releases/phases/milestones still assigned to cards.

A roadmap permission is separate from card write access and is off on existing tokens. Issuing a new roadmap-enabled token is an owner action. Read-only tokens cannot mutate records. Updates are product-scoped and audited. Retries using the same create/roadmap requestId return the earlier result; different content with the same key is rejected.

Structured data is nested under `execution.brief` and `execution.bug`. Use `execution.testPlan`, `result`, and `evidence` for verification. Read a card before changing it and read it back after writing. A conflict requires rereading and reconciling, not overwriting a newer edit.

## Compatibility and limits

Existing free-text descriptions and evidence remain unchanged. New cards get structured briefs; legacy cards adopt them when edited through the new form. Legacy cards can still be edited through MCP without inventing structured data, but advancing requires criteria and a test plan, and closure requires evidence. Readiness lists explain missing fields; they are not a predictive quality score.

This release has fixed safety requirements and no quality-gate bypass. Owner-configurable policies and audited exceptions require a separate verified implementation. MCP cannot upload attachments or execute tests itself; the connected coding tool runs tests and records their real results. Host-specific skill auto-installation and background synchronization are not included.
