# Roadmap implementation — November 24, 2026

This records implemented behavior and activation requirements. It does not claim that production acceptance testing or external integration setup has been completed.

## Delivered capabilities

| Area | Implementation | Where to use it |
| --- | --- | --- |
| Access | Email-bound, seven-day invitation links; verified identity acceptance; revocation; existing owner/editor/viewer isolation | Access → Invite by email |
| Connections | One MCP endpoint for an explicit set of owner-authorized products, explicit product IDs on operations, per-tool identities, expiration/revocation, last-request diagnostics | MCP access; `/api/mcp/workspace` |
| Continuity | Selected product persists after reload; saved views and manually saved planning drafts live in Postgres with conflict detection | Saved views; Plan product → Save/Load account draft |
| Product lifecycle | Owner archive/restore; archived products reject card mutations | Configure; Show archived |
| Human work | Account-linked assignment, due dates, checkboxes, recurring tasks, notes templates, comments, member notifications, quick add, list view, atomic bulk moves | Card details; My Work |
| Portability | CSV import remains available; CSV export includes original notes and escaped formula prefixes | Configure → Download CSV |
| Agent coordination | Expiring claims, claim enforcement for MCP writes, structured handoffs, distinct actor identity, original human assignee preserved | Card collaboration; MCP `collaborate`; `get_card` |
| Delivery | Manually recorded evidence, signed GitHub/Vercel webhook handling, commit correlation, deduplication, release approvals and generated notes | Card delivery details; Configure → integrations/release review |
| Prioritization | Intake decisions and duplicate references, source links, impact/effort estimates, measurable outcomes linked to releases, cycles with capacity, overdue/blocked/review/aging views | Card details; Configure; Portfolio; My Work |

## Intentional behavior and limits

- Invitation links can be shared directly. Optional invitation email delivery uses Resend when RESEND_API_KEY and INVITATION_FROM_EMAIL are configured; sending is explicitly selected by the owner. Neon handles account verification/password flows; new-user email delivery still needs a live acceptance check. Existing authenticated users with the invited verified email receive membership on their next request.
- The existing `/api/mcp` endpoint retains single-product behavior. `/api/mcp/workspace` exposes `list_products` and requires a product ID for every scoped operation. Existing tokens remain valid for their original product; a new explicitly scoped connection is needed to authorize additional products.
- Task recurrence creates one next task when a card first transitions into Done/Closed. It uses calendar dates, resets checklist and verification state, and does not generate a backlog of missed occurrences. A recorded successor prevents reopening and recompleting the same task from generating another occurrence.
- Notifications are in-app for assignment, comments/mentions, and handoffs. No Slack posting or background coding agent was enabled. Invitation email requires separate configuration.
- Browser draft autosave remains a local safety copy. Save account draft publishes that draft to the user's private server record; Load account draft retrieves it. Concurrent device saves are rejected rather than overwriting a newer record.
- Imported assignee names are preserved. Owners/editors explicitly map them to authorized accounts; names are never treated as login identities.
- GitHub PRs identify cards with `PK:<full-card-uuid>` in the description. CI/deployment evidence attaches to known commit references. An unmatched event is recorded as unmatched, not guessed onto a card. Integration settings alone do not create external webhooks.
- Normalized signed webhook events are durably staged before processing. Processing is transactional and idempotent; database failures return a retryable failure. The owner can inspect and retry pending/unmatched events in Configure. No outbound event synchronization is enabled, avoiding integration loops.
- A PR merge, CI success, or deployment event does not override software acceptance/verification checks. Release approval is checked against the current cards; later changes remain visible and require review of the current board.
- Duplicate intake records preserve both original cards, add a reference on the canonical card, and move attachment ownership within the same product with an audit record. Deferrals require a return date and reappear automatically in the Intake view on that date.
- Impact/effort ordering is deterministic and transparent. AI proposals remain reviewed separately; no ongoing paid AI prioritization job runs.
- Human task mode remains per product. Existing boards are not silently switched based on their names.

## Storage and deployment

New collaboration records reuse the existing product-scoped activity table, with private records excluded from public board history. Work details use the existing execution JSON field. Product-row locks serialize mutations and protect recurring creation and idempotency. Event timestamps use database wall-clock insertion time for new snapshots. No database schema migration is required for correctness. Consider dedicated indexed tables once measured event volume warrants them.

Webhook secrets use the existing server credential-encryption key, with product/provider-bound authenticated encryption. No secrets or user exports are checked into this repository.

## Verification

November 24 local run: 54 automated tests passed; production build passed. Local public HTTP checks passed 30/31; the unknown-token database lookup could not run against the unavailable local database connection. Production deployment `453acbc` reached Ready on Vercel; all 31 public HTTP checks passed against https://projectkanban-omega.vercel.app, including invalid-token rejection, private-route authentication, blocked public signup, and MCP origin protection. These checks do not use an authenticated collaborator session.

Local tests use PGlite/Postgres with the real Drizzle schema, mutation code and HTTP route handlers. Authentication is stubbed at the session boundary in these tests, so they prove authorization and persistence rules, not a live identity-provider login.

Covered: outsider and viewer denial; private activity and notification isolation; verified invited-email matching; cross-device version conflicts; explicit MCP product selection and revocation; conflicting claims; recurring creation; software completion rules; atomic bulk failure; owner-only release approval; cross-product release rejection; signed webhook identity and retry deduplication.

Live acceptance still required: new collaborator signup and email verification, owner/editor/viewer/uninvited browsers, attachment access after revocation, two actual coding clients sharing a connection, and signed GitHub/Vercel events from the configured services. Local success is not substituted for those checks.

## Follow-up work from the full proposal

The core release slices are implemented. Remaining activation and acceptance work includes the named collaborator pilot, configured provider events, and broader cross-device browser acceptance. Background reminders are an optional later expansion. These are not marked complete.

## Client task follow-through — November 24

Added a dedicated client-task workspace, optional agency selector, personal saved grouping/filter views, custom labels and default layouts, inline account assignment, atomic bulk client classification, and client/agency CSV import/export. New boards explicitly choose human tasks or software development. Existing boards require an owner to select the work type.

The follow-through also adds portfolio aging, release risk and pending decisions; archives are excluded from My Work and portfolio; the AI planner shows its target board and requests evidence-based priority explanations. Partial MCP updates preserve omitted work fields.

Activation for the existing Kris board is not confirmed. This session's MCP connection resolves to LinkKonsole. The browser runtime is unavailable, Vercel denies project-environment access, and the local Vercel CLI has no credentials. No production data migration or membership change was attempted through an unrelated credential. No client values were inferred from unseen CSV contents.

The roadmap's code implementation is distinct from acceptance: a real Kris login, two real coding clients and externally configured signed webhooks remain open verification gates.

Client-task verification: 62 automated tests passed, including rendered human-view labels, partial MCP metadata preservation, client/agency grouping, CSV mapping, atomic batch rollback, board isolation, owner-only customization, and archived-work exclusion. Production build passed. Interactive signed-in browser acceptance remains unverified.

Deployment `a7d7ae4` reached Ready and was aliased to https://projectkanban-omega.vercel.app. All 31 public HTTP acceptance checks passed after deployment. These verify availability and unauthenticated access rejection, not Kris’s signed-in workflow.

## Invitation feedback and PK favicon

Invitation sending now shows a prominent recipient-specific result and stores the send status, timestamp, and Resend message ID for later inspection. Link-only, rejected, and uncertain sends are distinct from provider-accepted sends. Acceptance of the board invitation is displayed separately. Older invitations have no retrospective send receipt and are labeled accordingly. Resend acceptance is not proof of inbox delivery; delivery/bounce details remain in Resend Emails.

Email is selected by default when configured, with explicit Send invitation email / Create link only buttons and in-flight duplicate-click protection. The favicon uses a navy PK monogram with a mint K.

Verification: 65 tests passed, including mocked provider acceptance/rejection/connection failure, persistent receipt reads, owner-only history, and preserving concurrent invitation acceptance. Production build passed. No real invitation was sent during these tests.

Invitation submission correction: the shared Button defaults to type=button, so the invitation form action was inert. Explicit type=submit now invokes the send handler. A rendered-form regression check covers this behavior; 66 tests and the production build passed. Provider delivery still requires a real send.

### Sign-in error feedback (2026-11-24)
- Fixed handling of thrown Neon Auth errors: rejected credentials, unverified email, throttling, and service failures now have distinct feedback; raw provider details are not displayed.
- Reproduced the misleading unavailable message using the installed Neon client and a mocked 401 response. All 68 tests and the production build pass.
- Production session endpoint responded 200 and a synthetic invalid-account login returned the expected 401. This confirms endpoint reachability, not successful account login.
- Chrome workflow acceptance remains blocked: managed browser bootstrap reports `Managed execution requires a usable CODEX_CLI_PATH`. Valid-account sign-in, invitation delivery, and Kris's board-only access still need interactive verification.
