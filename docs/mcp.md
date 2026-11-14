# Coding tool access

ProjectKanban exposes product-scoped card tools over Streamable HTTP. Clients need support for MCP protocol version 2025-11-25, 2025-06-18, or 2025-03-26 and a configurable bearer token. The standard token endpoint uses bearer tokens. An optional browser authorization pilot is described below.

1. Sign in as a product owner and open **MCP access**.
2. Create a labeled token. Copy it when issued and store it in the coding client's credential store.
3. Configure the MCP server URL shown in the panel with an `Authorization: Bearer <token>` header. Use HTTPS for remote deployments.
4. Call `list_cards` with optional `board`, `status`, `limit`, and `offset` arguments. Use the returned card ID with `get_card` for acceptance criteria, test details, and related links.

A token is valid for 30 days and reads only cards in the selected product. The database stores a token digest. Codeless agents and coding tools receive the same card content, which may include private descriptions and links. Revoke the token from the product panel when the connection is no longer needed.

## Create and move cards

Open **MCP access** on the product and issue a new token with **Allow this token to create and move cards** selected. Existing tokens remain read-only. A write token exposes `create_card` (board, title, optional description and acceptance criteria) and `move_card` (card ID and destination status). Creation starts in Backlog or Reported. Moves enforce the same planning, prerequisite, and verification rules as the board.

## Optional browser authorization pilot

The OAuth pilot retains its existing route at `/api/mcp/magic-diagram`. Set `MCP_OAUTH_RESOURCE` to the full HTTPS URL for that route and `MCP_OAUTH_PRODUCT` to the exact name of the board. Register the same resource URL with Neon Auth and configure `/mcp/connect` and `/mcp/connect/consent` as the login and consent pages on the application origin. Add both variables before redeploying an already configured pilot. The OAuth connection grants read and write access to the named board owned by the signed-in account.
