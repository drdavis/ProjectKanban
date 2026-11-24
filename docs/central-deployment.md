# One shared ProjectKanban for every coding tool

Deploy one application and one database. Connect each Codex or Claude Code installation to that application's HTTPS MCP endpoint. The AI accounts and computers do not need to match: the ProjectKanban token controls access, not the subscription used to run the coding assistant.

## Recommended architecture

- **Vercel:** Next.js UI and authenticated API/MCP server.
- **Neon Postgres + Neon Auth:** persistent boards, roadmap history, execution evidence, private attachments, memberships and token digests.
- **GitHub:** application source, migrations and shared operating instructions. Do not use Git to synchronize live database exports or credentials.
- **Coding clients:** one separately labeled token per installation and product. All use `https://YOUR_PERMANENT_DOMAIN/api/mcp`.

A laptop can go offline without taking the board offline. The database is authoritative. Coding sessions do not automatically share chat history or local source changes. Saved views synchronize through the account. Planning drafts have explicit Save/Load account draft controls, with browser autosave as a local safety copy. Record handoffs on cards before changing computers.

The workspace MCP endpoint `/api/mcp/workspace` discovers only products explicitly authorized when issuing the token. Call `list_products`, then pass the intended `productId` on each scoped operation. Existing `/api/mcp` connections remain single-product. The optional OAuth pilot is separate from the standard token route.

## Hosting choice and cost

Prices checked November 21, 2026; verify provider pages before subscribing. Usage, taxes, domains, backups and AI calls can add costs.

| Option | Published starting cost | Fit for this repository |
| --- | --- | --- |
| Neon Free | $0 within quotas; pricing page currently lists 100 CU-hours/month and 1 GB storage per project | Recommended. Existing Drizzle/Postgres and Neon Auth implementation; no migration needed. |
| Vercel Hobby | $0, restricted to personal/noncommercial use | Suitable only when your usage meets its terms. Making the source public does not make business use noncommercial. |
| Vercel Pro | Starts at $20/month, plus applicable usage/seats | Recommended for a business-operated installation. Reuse an existing Pro team where appropriate; four MCP clients are not four Vercel deployer seats. |
| Supabase Free / Pro | Free tier; Pro from $25/month | Postgres is compatible in principle, but this application uses Neon Auth. Moving authentication, membership identity and credentials requires engineering and testing; not a drop-in switch. |
| Convex Free/Starter / Professional | Free or usage-based Starter; Professional $25/developer/month | Requires replacing the Postgres/Drizzle persistence and transaction model. Not recommended merely to centralize this existing app. |

For a new business installation, budget **Vercel Pro starting at $20/month + Neon Free while within quota**, with AI optional. If you already pay for Vercel Pro, this may add no fixed hosting subscription; usage can still increase. No subscription change is performed by following the source setup alone.

Keep Neon scale-to-zero enabled and start with a small compute size. Avoid frequent keep-alive queries and autonomous polling. Attachments share database storage: the app caps files at 2 MB and each product at 50 MB; base64 adds roughly one third overhead. Multiple products, history and backups accumulate beyond those per-product caps. Monitor actual storage and compute, and choose a backup/export schedule appropriate to your data rather than assuming the free tier provides long-term recovery.

The built-in AI planner is optional. Codex and Claude can read/write boards through MCP without a server-side AI provider. Their existing subscriptions do not automatically supply API credits to the app's built-in planner.

Sources: [Neon](https://neon.com/pricing), [Vercel](https://vercel.com/pricing), [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines), [Supabase](https://supabase.com/pricing), [Convex](https://www.convex.dev/pricing).

## Deploy a new central installation

Existing operators should retain their current production database and URL. Do not create four deployments or copy production data between computers.

1. Fork or clone this repository into your own GitHub account. Use Node.js 24 and `npm ci`.
2. Create one Neon project near your Vercel function region. Enable Neon Auth. Obtain the branch auth endpoint, pooled Postgres connection string and direct connection string.
3. Copy `.env.example` to private `.env.local`. Populate the required settings below. Generate secrets locally and store them in your deployment's secret settings, never Git.
4. Apply the committed migrations once to the intended database, before serving traffic:

   ```sh
   node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate
   ```

   Use a separate database/branch for development and preview environments. Do not run migrations against production during every preview build. Back up existing databases before applying new migrations.
5. Import your GitHub repository into Vercel as a Next.js project. Set the Node runtime to the tested version, install with `npm ci`, and build with `npm run build`. Set production environment variables there. Do not expose secrets with a `NEXT_PUBLIC_` prefix.
6. In Neon Auth, configure the application's actual production origin/redirects using its current setup instructions. Keep public registration disabled. Provision the initial owner through Neon Auth's supported administrative user/invitation flow; complete verification and password setup as that user. The app blocks public signup and requires a verified allowlisted email for initial access.
7. Deploy, sign in and create a product. Use the stable production alias or a custom domain you control, not a branch/preview URL. No custom domain purchase is required.
8. Confirm the production domain is reachable by an MCP client. A Vercel deployment-protection login page is not the app's own login. Configure your production access intentionally while retaining application authentication and protected previews; never give coding clients deployment-bypass secrets as a substitute for MCP credentials.
9. Run `PROJECTKANBAN_BASE_URL=https://YOUR_PERMANENT_DOMAIN npm run test:http`, then perform the signed-in journeys in [release verification](release-verification.md). A passing build is not a release acceptance result.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled connection for application requests. |
| `DATABASE_URL_UNPOOLED` | Direct connection for controlled migrations. |
| `NEON_AUTH_BASE_URL` | Auth endpoint for the chosen Neon branch. |
| `NEON_AUTH_COOKIE_SECRET` | Stable random secret, at least 32 characters; generate with `openssl rand -base64 32`. |
| `AUTH_ALLOWED_EMAILS` | Comma-separated verified emails authorized to bootstrap application access. This does not share existing products. |
| `AI_CREDENTIAL_ENCRYPTION_KEY` | Optional: `openssl rand -hex 32` enables encrypted personal provider keys. Keep stable; changing it makes saved keys unreadable. |
| AI provider variables | Optional; see `.env.example`. Leave unconfigured if you use external coding assistants exclusively. |

Redeploy after changing production environment variables. Never overwrite an existing encryption key as routine setup.

## Connect two Codex and two Claude Code installations

Use the same product in the same central deployment. The owner opens **MCP access** and issues four independent credentials, for example:

| Installation | Suggested token label | Endpoint |
| --- | --- | --- |
| Codex account A, computer A | `codex-a-computer-a` | Same production `/api/mcp` |
| Codex account B, computer B | `codex-b-computer-b` | Same production `/api/mcp` |
| Claude Code account A, computer C | `claude-a-computer-c` | Same production `/api/mcp` |
| Claude Code account B, computer D | `claude-b-computer-d` | Same production `/api/mcp` |

Select write permission for assistants expected to maintain cards; grant roadmap permission only to those that need it. Tokens last 30 days. Record their labels and expiry dates in your private credential manager and rotate each independently. Token labels identify credentials; do not assume the activity UI attributes every action to a unique human/tool account. Use explicit responsible-person labels and handoff notes too.

### Codex

Use **Settings → MCP servers**, HTTP/Streamable HTTP, the production URL, and an `Authorization` header with `Bearer YOUR_TOKEN`. Configure each machine/profile separately. See [the full MCP guide](mcp.md) for exact fields and environment-variable alternatives. Never put a real token in a committed configuration file.

For a CLI environment that supplies secrets to the Codex process, use this in the private `~/.codex/config.toml`:

```toml
[mcp_servers.shared_product]
url = "https://YOUR_PERMANENT_DOMAIN/api/mcp"
bearer_token_env_var = "PROJECTKANBAN_MCP_TOKEN"
```

Supply the token alone in that environment variable. Desktop apps may not inherit variables exported in a separate terminal. Use the settings UI if that is your workflow. A cloud-hosted coding session needs its own supported connector configuration; a configuration on your laptop does not automatically configure a remote account.

### Claude Code

Run this on each computer with that computer's token. The example contains placeholders; replace them privately:

```sh
claude mcp add --transport http --scope user shared-product \
  https://YOUR_PERMANENT_DOMAIN/api/mcp \
  --header "Authorization: Bearer YOUR_PRODUCT_TOKEN"
```

User scope keeps configuration outside the source repository. A literal token entered into a command can be retained in shell history and is stored in local configuration; use your credential manager and the client's supported secret-handling practices. Do not paste the completed command into an issue, chat or screenshot. In Claude Code, use `/mcp` to check connection status. Reconnect/start a new session when needed. Account-level organization policies may restrict custom MCP connections.

References: [Claude Code MCP](https://code.claude.com/docs/en/mcp), [Codex MCP](https://developers.openai.com/codex/mcp).

### Verify all four clients

Ask each client to call `get_workflow`, `get_product`, `list_cards` and `get_card`. Confirm all four return the **same product ID**, not merely the same display name. Then, if using write tokens, create one clearly labeled QA card in one client and read it from the other three. Review the activity in the web app. Do not claim multi-computer connectivity until each computer has completed this check.

## Coordinate simultaneous work

Use different cards and branches per assistant. Before writing, read the latest product revision; after a conflict, reread and reconcile. Revision protection detects stale writes. Use the `collaborate` claim command for a 30-minute agent claim and renew or release it explicitly. Agree ownership explicitly and avoid two agents implementing the same files concurrently. Put the branch/commit, changed paths, tests, results, blockers and next action on the card before handing off. Refresh the browser board to see external writes.

Install the opt-in guidance from [agent-workflow.md](agent-workflow.md) in each project's `AGENTS.md` for Codex and `CLAUDE.md` for Claude Code, preserving existing instructions. An MCP connection does not automatically install instructions or run agents in the background.

If separate people or identities need the browser UI, invite their email through the product's **Access** panel with editor/viewer roles. Membership requires that exact verified email. A different ChatGPT or Claude email does not itself grant browser access. Adding an email to `AUTH_ALLOWED_EMAILS` allows app entry but does not make another user's products visible.

## Public source, private operation

The MIT license allows others to use, modify and self-host this software. They supply their own hosting, database, auth and optional AI credentials. Publishing GitHub does not invite anyone into your deployment or publish its database. Do not point a public demo at a database holding private projects.

Before making a repository public, inspect all Git refs/history, tags, issues, PRs, releases and committed artifacts. Scan for secrets and private prose. Keep production exports, local MCP configuration, screenshots of private boards and environment files out of Git. A clean secret scanner is useful evidence, not proof that all business content is public-safe. Keep CI/preview secrets isolated from untrusted fork contributions.

The application still has pending release checks; see [release verification](release-verification.md). Open source availability is not a claim that every security and browser scenario has passed.
