# ProjectKanban: proposed roadmap informed by Linear

Research date: November 24, 2026. Status: approved for implementation. Core features in all five releases are implemented; live collaborator and external integration acceptance remains open. See [delivery status](roadmap-delivery.md) for evidence and activation requirements.

## Positioning

A shared work system for a product owner, human collaborators, and multiple AI coding tools across accounts and computers. Human tasks remain simple; software delivery retains explicit acceptance and verification evidence.

## Evidence and limits

Reviewed the official Reverse Engineer Anything repository (morluto/rea), Linear's public documentation, and ProjectKanban's local implementation and verification notes. Applied REA's principle of connecting observations to conclusions and naming unknowns. No REA CLI/MCP analysis, authenticated Linear session, binary inspection, or performance benchmark was executed. Linear's internal architecture is not established by this review.

ProjectKanban already implements product-scoped boards and membership, human-task mode, CSV migration, MCP create/update/move operations, releases/phases/milestones, dependencies, structured software verification, AI proposals, portfolio filtering, and activity history. These are foundations to extend, not features to recreate. Prior verification notes contain unresolved live checks; this review does not mark them passed.

## Linear patterns and adaptation

| Documented pattern | ProjectKanban adaptation |
| --- | --- |
| My Issues and issue templates | My Work, simple operations templates, and separate software templates |
| Human assignee plus agent delegate | Keep a human accountable while recording which coding tool is executing |
| Triage inbox | Review and deduplicate ideas and reports before adding committed work |
| Initiatives and cycles | Group releases around outcomes; make weekly work commitments optional |
| GitHub PR links and workflow updates | Attach change, test, and deployment evidence to the same card |
| Roles and team access | Invitations by email, explicit board membership, and isolated search/notifications |

These are recommended adaptations, not claims of identical behavior or implementation.

## Release 1: dependable access and connections

Priority P0; prerequisite for broader use.

- Invite by email, choose boards and role, accept invitation, revoke access. Replace the need to copy an authentication user ID.
- Finish the human-task pilot with a separate collaborator login and activate its board mode explicitly.
- Add a connection screen identifying the connected product, tool identity, scopes, expiration, and last successful request. Distinguish expired token, wrong product, missing write permission, stale revision, and incomplete card requirements.
- Retain scoped credentials. Design a single MCP connection that can discover only authorized products and requires an explicit product ID on writes; never interpret an omitted ID as permission to choose any product.
- Preserve selected product and filters after reload. Offer archive/restore before permanent deletion.
- Verify owner/editor/viewer/uninvited boundaries through catalog, direct URLs, attachments, portfolio, search, exports, and MCP. Verify revocation and stale-write recovery.

Exit: a collaborator sees only their authorized board, updates a task, and cannot read an unshared card or attachment. Two coding clients reconnect and update the intended product without overwriting each other. Software closure gates still apply.

## Release 2: daily work for people

November 24 extension: client and agency fields, grouped client/agency/all-task layouts, customizable column labels, bulk classification, saved client views, and CSV client/agency mapping and export. Task boards suppress development/bug tabs and software delivery settings.

Priority P1; depends on account identity and membership from Release 1.

- My Work: assigned to me, due soon, overdue, blocked, and awaiting review.
- Actual account-linked assignees; preserve imported free-text assignee labels until explicitly matched.
- Optional due dates, checklists, comments, mentions, notifications, and recurring tasks.
- Quick add, inline status/assignee edits, multi-select, and a list view alongside the board.
- Templates for operations work, software features, and bugs. Human completion requires no invented test result.
- Persist saved views and planning drafts on the server for use across computers, with revision conflict handling.
- Improve import mapping, preserve attachment references, expose invalid rows, and add export for portability.

Exit: a human collaborator can find, discuss, complete, and reopen their work without developer assistance. Views survive a change of computer. A recurring task creates exactly one next occurrence across retries and time-zone changes.

## Release 3: reliable collaboration between people and agents

Priority P1; identity foundations first, basic comments before notification-based handoff.

- Distinct human owner and agent delegate; agent/tool identity recorded on every write.
- Claim/release work with expiring claims, last activity, and a visible paused or failed state. Claims coordinate work, rather than replacing optimistic concurrency checks.
- A durable handoff containing objective, decisions, relevant files, remaining work, blockers, and evidence references.
- Display the intended product prominently before applying AI plans. Preview additions and changes; preserve idempotency across retries.
- Session resumption retrieves saved context without implying that all prior chats or local changes have synchronized.

Exit: two agents attempt the same task and only one obtains the active claim; an abandoned claim can be recovered. A second tool resumes from saved context. An agent can assign a task to an authorized human without gaining access to unrelated boards.

## Release 4: connect planning to shipped work

Priority P2; depends on reliable card identity and integration authorization.

- Link PRs, commits, CI runs, preview URLs, and production deployments to cards.
- Process signed GitHub/Vercel webhooks with deduplication, retries, and loop prevention.
- Show implementation, test, review, and deployment states separately. A merged PR does not prove successful production behavior.
- Extend existing readiness checks into a release checklist and human approval when required.
- Draft release notes from verified work and trace each entry back to its evidence.

Exit: a card traces to the exact deployed commit and actual test result. Duplicate webhooks cause no duplicate transitions. A successful build alone cannot close a software card whose functional acceptance remains unverified.

## Release 5: prioritize across products

Priority P2; build after work and release data are trustworthy.

- Intake inbox: accept, request details, merge duplicates, defer, or decline with a reason.
- Link customer requests and source conversations to candidate work; maintain visibility boundaries.
- Add outcomes above the existing release hierarchy, with an owner and measurable target.
- Add optional weekly cycles, capacity limits, and a portfolio view of blocked work, aging tasks, release risk, and decisions needing the owner's attention.
- Explain AI prioritization using impact, effort, dependencies, and source evidence; keep final prioritization editable.

Exit: the owner can identify the next useful work and explain its priority from evidence. Progress distinguishes accepted outcomes from card counts. Restricted collaborators cannot infer other clients' work through summaries or notifications.

## Delivery sequence and cost

Build Release 1, then pilot Release 2 with human work and Release 3 with two coding clients. Add release automation and portfolio planning after those pilots work. These are delivery gates, not date promises.

Keep the existing Vercel/Postgres architecture unless measured load requires change. Add transactional event/outbox records before notification and webhook automation. Use bounded scheduled processing; keep AI summaries explicit or batched. Avoid a database migration to another vendor merely to add planning features. Cost estimates require actual storage, attachment, notification, model, and execution usage.

Defer a hosted autonomous coding runtime, full chat platform, native apps, extensive integration catalog, and advanced scheduling until the core collaboration loop is dependable.

## Further REA investigation

A runtime investigation needs an accessible Linear application or authenticated session. Useful bounded questions: how quick-add defaults behave; how templates reveal fields; how concurrent edits resolve; how agent delegation appears; and how notification routing follows permissions. Record target version, reproducible steps, observations, alternative explanations, and limitations for each. Public documentation alone does not establish these runtime details.

## Sources

- REA official repository: https://github.com/morluto/rea
- Linear My Issues: https://linear.app/docs/my-issues
- Templates: https://linear.app/docs/issue-templates
- Agents and delegation: https://linear.app/developers/agents
- Triage: https://linear.app/docs/triage
- Initiatives: https://linear.app/docs/initiatives
- Cycles: https://linear.app/docs/use-cycles
- GitHub: https://linear.app/docs/github
- Members and roles: https://linear.app/docs/members-roles
- Customer requests: https://linear.app/docs/customer-requests
- Local evidence: lib/schema.ts, lib/card-write.ts, lib/member-fields.ts, lib/mcp-board.ts, lib/planning.ts, components/workspace.tsx, docs/human-tasks.md, docs/release-verification.md.
