import assert from "node:assert/strict";
import { test } from "node:test";
import { createMcpToken, digestToken, isMcpOriginAllowed, requestMcpToken } from "../lib/mcp-token.ts";
import { decryptApiKey, encryptApiKey, personalConnectionsAvailable } from "../lib/provider-secrets.ts";
import { publishedPlan } from "../lib/planning.ts";

test("creates distinct tokens and extracts an exact bearer token", () => {
  const {token, digest} = createMcpToken();
  assert.notEqual(token, createMcpToken().token);
  assert.equal(digest, digestToken(token));
  assert.notEqual(digest, token);
  const makeRequest = (authorization) => new Request("https://test.example/api/mcp", {headers: {authorization}});
  assert.equal(requestMcpToken(makeRequest("Bearer " + token)), token);
  assert.equal(requestMcpToken(makeRequest("Basic " + token)), undefined);
  assert.equal(requestMcpToken(makeRequest("Bearer " + token + " extra")), undefined);
});

test("accepts a missing or same origin and rejects an unrelated browser origin", () => {
  const url = "https://test.example/api/mcp";
  assert.equal(isMcpOriginAllowed(new Request(url)), true);
  assert.equal(isMcpOriginAllowed(new Request(url, {headers: {origin: "https://test.example"}})), true);
  assert.equal(isMcpOriginAllowed(new Request(url, {headers: {origin: "https://test.example.invalid"}})), false);
});

test("encrypts credentials with random nonces and binds ciphertext to its purpose", () => {
  const previous = process.env.AI_CREDENTIAL_ENCRYPTION_KEY;
  try {
    delete process.env.AI_CREDENTIAL_ENCRYPTION_KEY;
    assert.equal(personalConnectionsAvailable(), false);
    assert.throws(() => encryptApiKey("fictional-credential", "owner:test"));
    process.env.AI_CREDENTIAL_ENCRYPTION_KEY = "ac".repeat(32);
    const key = "fictional-credential";
    const encrypted = encryptApiKey(key, "owner:test");
    assert.equal(personalConnectionsAvailable(), true);
    assert.notEqual(encrypted, encryptApiKey(key, "owner:test"));
    assert.equal(decryptApiKey(encrypted, "owner:test"), key);
    assert.throws(() => decryptApiKey(encrypted, "owner:other"));
  } finally {
    if (previous === undefined) delete process.env.AI_CREDENTIAL_ENCRYPTION_KEY;
    else process.env.AI_CREDENTIAL_ENCRYPTION_KEY = previous;
  }
});

test("rejects incomplete cards and preserves the idempotency key for a reviewed plan", () => {
  const requestId = "00000000-0000-4000-8000-000000000001";
  const example = {requestId, roadmap: "Build the fictional sample.", cards: [{title: "First slice", description: "Example", criteria: "Expected result"}]};
  assert.equal(publishedPlan.parse(example).requestId, requestId);
  assert.equal(publishedPlan.safeParse({...example, cards: [{...example.cards[0], criteria: " "}]}).success, false);
  assert.equal(publishedPlan.safeParse({...example, requestId: "invalid"}).success, false);
  assert.equal(publishedPlan.safeParse({...example, cards: []}).success, false);
});

test("MCP exposes writes only with a writer and validates write arguments", async () => {
  const { handleMcpRequest } = await import("../lib/mcp-protocol.ts");
  const readers = {listCards: async () => [], getCard: async () => null};
  let writes = 0;
  const writers = {create: async ({title}) => {writes++; return {title};}, move: async () => {writes++; return {error: "Waiting on a prerequisite."};}};
  const call = async (method, params, enabled = false) => {
    const res = await handleMcpRequest(new Request("https://example.com/api/mcp", {
      method:"POST", body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),
    }), readers, enabled ? writers : undefined);
    return res.json();
  };
  assert.equal((await call("tools/list")).result.tools.length, 2);
  assert.equal((await call("tools/list", {}, true)).result.tools.length, 4);
  const create = {name:"create_card", arguments:{board:"development",title:"Test"}};
  assert.equal((await call("tools/call", create)).result.isError, true);
  assert.ok((await call("tools/call", {...create, arguments:{...create.arguments, productId: "another"}}, true)).error);
  assert.equal(writes, 0);
  await call("tools/call", create, true);
  const move = {name:"move_card", arguments:{cardId:crypto.randomUUID(),status:"Done"}};
  assert.equal((await call("tools/call", move, true)).result.isError, true);
  assert.equal(writes, 2);
});
