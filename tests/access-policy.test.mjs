import assert from "node:assert/strict";
import { test } from "node:test";
import { emailIsAllowed, blockedAuthPath } from "../lib/access-policy.ts";

test("bootstrap access requires an exact, verified, explicitly allowed email", () => {
  assert.equal(emailIsAllowed("OWNER@example.com", true, " owner@example.com, other@example.com "), true);
  assert.equal(emailIsAllowed("owner@example.com", false, "owner@example.com"), false);
  assert.equal(emailIsAllowed("attacker@example.com", true, "owner@example.com"), false);
  assert.equal(emailIsAllowed("owner@example.com.evil", true, "owner@example.com"), false);
  assert.equal(emailIsAllowed("owner@example.com", true, undefined), false);
});

test("public auth routes reject registration and social login but preserve password login and reset", () => {
  for (const path of [["sign-up", "email"], ["sign-up"], ["sign-in", "social"]]) assert.equal(blockedAuthPath(path), true);
  for (const path of [["sign-in", "email"], ["request-password-reset"], ["reset-password"], ["get-session"], ["sign-out"]]) assert.equal(blockedAuthPath(path), false);
});
