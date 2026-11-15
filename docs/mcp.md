# Connect your coding tool to ProjectKanban

## Start here: product token setup

Use **a product token with `/api/mcp`**. This is the standard setup for Codex and other clients that accept HTTP headers. No OAuth login or terminal command is required when your client lets you enter a custom header.

**The token selects the product. The URL stays the same for every product in your installation.** A connection named after a different product still accesses the product that issued its token.

### 1. Open the correct product

Sign in to your permanent ProjectKanban production site. Select the product in the sidebar and click **MCP access** in its toolbar. This button is available to the product owner.

Do not configure your coding tool from a localhost preview or a temporary deployment URL. Copy the server URL from the panel on your production site. It should have this shape:

```text
https://YOUR_PERMANENT_DOMAIN/api/mcp
```

Use your actual domain; `YOUR_PERMANENT_DOMAIN` is a placeholder. Do not append the product name. Remove any leading or trailing spaces or tabs.

### 2. Create the right token

1. Enter a label such as `Codex on my laptop`.
2. Select **Allow this token to create and move cards** if you want the tool to update your board. Otherwise leave it unchecked for read-only access.
3. Click **Create token**.
4. Keep the panel open while configuring your client. The full token is shown only when issued.

A token begins with `pk_mcp_`, lasts 30 days, and is scoped to this product. Store it in your coding tool's credential settings. Do not paste it into chat, screenshots, issues, or a repository. A token cannot be recovered from the token list; issue a replacement if you lose it. Revoke old tokens when no longer needed.

### 3. Configure Codex Desktop

Open **Settings → MCP servers** and add an HTTP server, or edit the existing connection. Labels may differ by client version; use these exact values for the corresponding fields:

| Field | Enter |
| --- | --- |
| Name | A distinct recognizable name, such as `my-product-board` |
| Transport | HTTP / Streamable HTTP |
| URL | The URL copied in step 1, ending in `/api/mcp` |
| Header name | `Authorization` |
| Header value | `Bearer ` followed by your token; use **Copy header value** in ProjectKanban |

There is exactly **one space** between `Bearer` and the token. Do not add quotation marks in a UI text field.

If the client offers a dedicated **bearer token** field, paste the token alone there, without `Bearer`. Use that field OR a custom Authorization header, not both. A field called **Bearer token environment variable** expects an environment-variable name; it is not a token input. For desktop setup without terminal work, use the custom header.

Save the connection, enable it, reconnect if offered, and start a new coding session. If the new session still has no tools, inspect the connection error before changing credentials. Restart the application if it has not reloaded the saved configuration.

### 4. Verify a real MCP request

Ask your coding tool:

> Use my product's MCP connection to list development cards, then read one card's details. Do not change any cards.

Success is a response containing actual card results from `list_cards` and `get_card`, not just a statement that the server exists. An empty card list is also a valid response for an empty board.

A write-enabled token additionally exposes `create_card` and `move_card`. To test writes intentionally, ask the tool to create a clearly labeled connection-test card with acceptance criteria, move it to Ready, and read it back. Verify it appears on the selected product's board. This creates a real card; do not run it merely to test read access.

**Opening `/api/mcp` in a browser is not a test.** Browser navigation sends GET; this endpoint accepts MCP POST requests and returns 405 to GET.

## More than one product

Create a separate token from each product's **MCP access** panel. Add one connection per product, with distinct names and the same server URL. Each connection uses its own token. A Magic Diagram token cannot read ProjectKanban's own development board. Tokens do not grant access to other products or the database.

## Troubleshooting without starting over

| What you see | What to check |
| --- | --- |
| “Tools are not available in this session” | Confirm the connection exists and is enabled, inspect its connection error, then start a fresh session. This message alone does not establish server downtime. |
| 401 Unauthorized | Use `/api/mcp`; check Authorization spelling, exactly one `Bearer` prefix, and token expiry/revocation. A Vercel login response is a separate deployment-protection issue. |
| Token sent to `/api/mcp/magic-diagram` | Change only the URL to `/api/mcp`. Keep your valid product token. The longer route is the separate OAuth pilot. |
| Wrong board | The credential selects the board. Issue a token from the intended product; renaming the MCP connection does not change scope. |
| Read works, write tools absent | Issue a token with write access selected and replace the client credential. Existing read-only tokens do not become writers. |
| Card move rejected | Read the card's plan, prerequisites, acceptance criteria and verification requirements. Workflow rejection is not a connection failure. |
| 405 in a browser | Expected for GET on the product-token endpoint. Test through an MCP client. |
| 503 | Administrator: inspect deployment configuration. Reissuing product tokens does not fix missing server configuration. |
| Vercel login page instead of an MCP response | Administrator: check deployment protection for the permanent domain. An MCP client cannot use your browser's Vercel login session. Preserve application authentication. |
| A Terminal setup works but Desktop does not | Desktop does not inherit an environment variable exported only in another Terminal session. Use the desktop custom header or properly provision the environment for that process. |

## Optional: edit Codex's local configuration file

Prefer the UI setup above. If editing `~/.codex/config.toml`, update the existing entry rather than appending duplicate tables. This example contains placeholders only:

```toml
[mcp_servers.my_product_board]
url = "https://YOUR_PERMANENT_DOMAIN/api/mcp"
enabled = true
http_headers = { Authorization = "Bearer REPLACE_WITH_YOUR_PRODUCT_TOKEN" }
```

Keep a configuration containing a real token private and outside your repository. Never share it for debugging without removing credentials.

For CLI users who intentionally manage process environment variables, the alternative is:

```toml
[mcp_servers.my_product_board]
url = "https://YOUR_PERMANENT_DOMAIN/api/mcp"
enabled = true
bearer_token_env_var = "PROJECTKANBAN_MCP_TOKEN"
```

Set that variable to the **token alone** in the process that launches Codex. Do not use both examples for the same connection. Do not run `codex mcp login` for this product-token setup; that command starts the separate OAuth flow.

Codex reference: [MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Available tools and limits

- `list_cards`: optional board/status filters, limit and offset pagination.
- `get_card`: card details, acceptance criteria, execution/test plan and linked work.
- `create_card` (write token): creates in Backlog for development or Reported for bugs.
- `move_card` (write token): moves within the card's board using the same workflow validation as the app.

The server supports MCP versions 2025-11-25, 2025-06-18 and 2025-03-26 over Streamable HTTP. It stores token digests, not recoverable tokens. Revocation and expiry stop subsequent authorized requests. Card contents may contain private project information; connect only tools you intend to give that information.

## Administrator appendix: separate OAuth pilot

**Do not use these instructions with a `pk_mcp_` product token.** The optional OAuth pilot is a distinct connection method and is not required for standard token setup.

Its route is `/api/mcp/magic-diagram`. Configure these production environment variables before deployment:

| Variable | Value |
| --- | --- |
| `MCP_OAUTH_RESOURCE` | Full permanent HTTPS URL ending in `/api/mcp/magic-diagram` |
| `MCP_OAUTH_PRODUCT` | Exact product name owned by the signed-in account |

Register the same resource URL with Neon Auth. Use `/mcp/connect` and `/mcp/connect/consent` on the permanent app origin as login and consent pages. Redeploy after changing environment variables. Configure the MCP client for OAuth with no static product-token Authorization header, and complete browser login/consent. This pilot grants read and write access to the configured product owned by the signed-in account.

When diagnosing, report which method is being used, the URL (without credentials), the actual response/error, and whether tools loaded. Do not infer successful OAuth from a bare 401 or from a successful application deployment.
