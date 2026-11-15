# Release verification — November 15, 2026

## Executed

- 29 local automated tests passed, including parsed MCP partial-update preservation and completed-to-open verification invalidation.
- An isolated installation completed using npm install and the resulting lockfile using npm ci. Tests, TypeScript checking and production build all passed after the locked install. An initial test-harness copy omitted the standalone preview HTML; copying the tracked file resolved that setup error.
- Drizzle snapshot validation (`npm exec drizzle-kit check`) passed. No production migration was run or needed.
- Live MCP: 19 acceptance checks passed. These covered cross-product read denial, create replay, changed retry rejection, missing readiness fields, unapproved plans, open dependencies, dependency cycles, self-parent rejection, invalid release phases, release/phase/milestone/owner/tag persistence, concurrent writes, failed/pending/missing test evidence, unblocking after verified completion, incomplete bug closure, foreign-product duplicate links, verification reset after reopening, and rejection of immediate reclosure.
- Live public HTTP: 16 checks passed. Homepage 200; unauthenticated board/attachment/member/portfolio/AI/token operations 401; public/social signup 403; MCP GET 405; well-formed unknown token 401; foreign origin 403.
- Live authenticated MCP protocol: 6 checks passed. Roadmap publishing without permission, injected product scope, unsupported protocol version, wrong content type, malformed JSON and unknown method were rejected.
- GitHub history scan: Gitleaks scanned all refs in a fresh clone, covering 10 commits, with no secrets detected. This is a scanner result, not a guarantee that arbitrary private prose is absent.

QA cards are retained as audit evidence. The lifecycle/dependency fixtures are Done. The reopen defect is Closed after a live retest.

## Defect fixed during testing

Completed work retained a passing result after reopening. Commit `b9f7d82caeb334906486ba6aa37364696984b9da` resets the current result to Pending and clears test evidence, bug regression evidence and fixed-in version. Prior evidence remains in the activity history. Live retest confirmed reopening invalidates verification and immediate reclosure is rejected.

## Dependency audit

The clean-install audit initially reported 2 critical, 3 high, 4 moderate and 11 low dependency entries. These counts include packages affected through transitive dependencies, not necessarily distinct exploitable vulnerabilities.

The tested update uses Next.js 16.4.6, AI SDK 6.0.332, OpenAI provider 3.0.143, Anthropic provider 3.0.142 and Drizzle Kit 0.31.11. Overrides align Better Auth packages to 1.7.25, related helpers to compatible patched versions, Neon Auth's Zod to 4.6.7, and the older tooling wrapper's esbuild to 0.25.4.

The resulting audit reports **0 critical, 0 high, 0 moderate and 7 low dependency entries**. The remaining entries trace to the upstream `deepmerge` prototype-poisoning advisory GHSA-gcqx-w48m-w2h4 through the auth UI/email dependency chain. The registry's latest deepmerge release is still 4.3.1, which the advisory lists as affected. Audit therefore still exits nonzero. No claim of zero vulnerabilities or confirmed production exploitability is made.

## Not executed / still required

- Signed-in browser journeys: login continuity after dependency updates, drag/keyboard controls, responsive/accessibility review, actual paste/drop upload-download-reload, guided AI generation/publish/resume, saved-view restoration, and roadmap comparison.
- Separate owner/editor/viewer/uninvited account checks, including member attachment authorization and audited owner exceptions.
- Live expired/revoked/read-only token tests. The current credential is write-enabled; issuing/revoking test tokens requires an authenticated owner session. Read-only protocol behavior is covered locally, not claimed as live credential testing.
- Roadmap publishing through MCP with a roadmap-enabled credential. The current credential correctly denies it.
- First-time database migration on a dedicated empty database.
- Public repository visibility was not changed by this test run.

The browser-control runtime was unavailable. None of these unexecuted checks are marked Passed, and affected roadmap cards remain Review/Pending. No Neon connector calls were made.
