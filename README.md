# ProjectKanban

ProjectKanban tracks multiple products in a searchable catalog. Each product has a roadmap, a Development board, a Bug Fixes board, an activity log, and its own AI planning context. The app includes optional fictional sample products with a roadmap, a development card, and a bug card. Each product has a timestamped roadmap history that records changes when you save the roadmap.

## Connect your coding tool

Open a product’s **MCP access** panel for step-by-step setup with copy buttons. Use a product token with `/api/mcp`; the token selects the product.

**[Complete MCP setup and troubleshooting guide](docs/mcp.md)** — Codex Desktop, exact header fields, multiple products, connection verification, and the separate optional OAuth setup.

## Run locally

1. Install dependencies with `npm ci` using Node.js 24.
2. Copy `.env.example` to `.env.local`. Create a Neon PostgreSQL database and enable Neon Auth with Better Auth on its branch. Set NEON_AUTH_BASE_URL to the branch auth endpoint and generate NEON_AUTH_COOKIE_SECRET with openssl rand -base64 32. Use the pooled URL for `DATABASE_URL` and the direct URL for `DATABASE_URL_UNPOOLED`. Configure an AI provider if you want to use the planner. For internal use, restrict account registration through Neon Auth.
3. Apply the database schema with `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate`.
4. Set `AUTH_ALLOWED_EMAILS` to the first owner's email and verify that email in Neon Auth. Existing product owners and explicitly assigned product members retain application access. Public signup and social sign-in routes are blocked; a provider account alone does not grant workspace access. Keep signup disabled in Neon Auth too.
5. Start the app with `npm run dev` and sign in at http://localhost:3000.

Set the same variables in Vercel before deploying. Use separate credentials and databases for production and development. Apply the migration to the target database before the first deployment.

## Workflow

1. Add sample products or create your own.
2. Record a product's roadmap and primary repository.
3. Add cards, move them with drag-and-drop, or edit their status and board from the detail panel.
4. Ask the AI planner for a set of changes. Review the field changes and apply or dismiss the proposal.
5. Inspect Activity to see updates and their source.

The first release uses private product catalogs per Neon Auth user. The application checks product ownership or explicit membership on every API operation. Product revisions catch stale manual edits and AI plans, and PostgreSQL transactions commit card changes and activity together. GitHub integration currently consists of repository, issue, and pull-request URLs. The product catalog, data model, and planner scope support 20 or more products in one database.

## Verification after setup

- Create two products and confirm each has independent cards and roadmap.
- Sign in as a second user and confirm access to the first user's product returns 404.
- Move a card within a column and across columns, then reload.
- Move a bug to Closed after recording verification evidence.
- Generate an AI proposal, edit a card, and confirm the proposal can no longer apply. Generate a fresh proposal and check the card and activity updates after approval.

## Public source and private data

Use one public source repository. Keep live products, bugs, roadmaps, and history in your private Postgres instance. Store keys in deployment environment variables. Keep real exports and seed data outside the Git checkout. Review tracked files and Git history before publishing. Anyone running this app supplies their own Neon Auth, database, and optional AI provider configuration. AI planning sends the selected product roadmap and card context to the configured model provider.

## AI planner privacy

External planning starts off for every product. Enable it in the product's Roadmap settings. For each request, choose whether to include the current roadmap and which cards to include. The preview shows the destination, prompt, product name, and selected context. The server checks the product revision and rejects a request if the displayed AI connection has changed. OpenRouter requests require zero-data-retention routing with data collection denied. Direct OpenAI requests set response storage off. For OpenAI and Anthropic, remaining retention behavior depends on the provider and your account terms. Test with fictional products before adding real projects.

For an installation default, set `PLANNER_AI_PROVIDER` to `openrouter`, `openai`, or `anthropic`, then set the matching API key and optional model from `.env.example`. Anyone with planner access in that installation can use the server key. Leave the server key unset when you want each user to supply their own.

To enable personal keys, generate a 32-byte hex secret with `openssl rand -hex 32` and set `AI_CREDENTIAL_ENCRYPTION_KEY` on the server. Keep it stable across deployments. A lost or changed secret requires users to replace their saved provider keys. In the sidebar, open **AI Provider**, select a provider, enter a model identifier and key, and save. Use **Test connection** to send a short prompt without board data. The connection test uses the active account's API credits. Remove the personal key to revert to the installation default, if one exists.

## Contributing with agent skills

Repo-local workflows live in `skills/`. Use `projectkanban-design` for UI work, `projectkanban-design-review` for review, `projectkanban-planning` for specs and tickets, and `projectkanban-architecture` for domain and backend design. See the [design and planning guide](docs/design-and-planning.md) for conventions and upstream references.

## Agent workflow

Connect a product, then copy the opt-in workflow from **MCP access → Add agent workflow guidance** into the coding project’s instructions. [Workflow, structured cards and bug reporting](docs/agent-workflow.md) explains activation, quality checks and MCP updates. Connecting MCP alone does not install skills or run background work.

## Planning and tracking work

Use **Roadmap** to create releases and compare saved roadmap versions. Assign release, phase, milestone, owner, and topic tags in card details. Use **Plan product** to work through a draft and publish the reviewed roadmap and backlog cards together. Drafts and saved views are stored in the browser. Readiness flags blocked cards, serious bugs, and fixes awaiting verification.

Run `node --test tests/*.test.mjs` and `npm run typecheck` before a release. Use the fictional samples to verify the authenticated workflow after applying migrations.


### Vercel AI Gateway

A Vercel deployment with OIDC enabled can use AI Gateway as the planner default. A deployment can also set `PLANNER_AI_PROVIDER=vercel` explicitly. Set `AI_GATEWAY_API_KEY` as a server-side secret for environments without Vercel OIDC. Override the default model with `AI_GATEWAY_MODEL`. Saved personal connections still take precedence.

## Attachments and quality controls

Save a card, then use **Attachments** to paste screenshots, drop files or choose a file. PNG, JPEG, WebP, PDF and UTF-8 text/Markdown/CSV/JSON files are supported. Images have inline previews; documents download. Each file is limited to 2 MB, and a product to 50 MB. Files are stored privately in PostgreSQL; no public object URL or additional storage service is required. Attachment bytes are excluded from board history and MCP responses. These limits bound database storage cost; base64 storage adds about one third to the raw size. Owners and editors can add/remove files, and all members can download them. Use sanitized files; uploads are format-checked, not malware-scanned.

**Roadmap → Quality policy** lets the owner choose structured readiness requirements and enable explicit, audited readiness exceptions. Exceptions apply to one transition. Dependencies, failed tests and missing completion evidence remain protected.

**Plan product** supports editable AI drafts, real release/phase/milestone assignments and per-card test plans. Publishing commits the roadmap, release and cards together. Retry keys reject changed content and prevent duplicate cards.

Run `npm test` for local checks. For end-to-end MCP checks, use a dedicated test product and set `PROJECTKANBAN_MCP_URL`, `PROJECTKANBAN_MCP_TOKEN` and `PROJECTKANBAN_TEST_PRODUCT_ID`, then run `npm run test:mcp`. This creates one audit-visible test card, verifies retries/conflicts/gates, and closes that test card only after the checks pass. Never commit tokens.

Source code is available under the MIT license. Deployments, user data and credentials are not part of the source license.

## Release verification

See [the recorded acceptance results](docs/release-verification.md) for executed checks and remaining sign-in/browser checks. `npm run test:http` runs public HTTP access-boundary checks against production, or against `PROJECTKANBAN_BASE_URL`.

The lockfile fixes the tested dependency graph. Security overrides keep Neon Auth’s pinned Better Auth and Zod dependencies on patched versions. Review these overrides when upgrading Neon Auth; do not remove them without rerunning the audit and authentication checks.
