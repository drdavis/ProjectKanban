# Invitation and human task acceptance — November 25, 2026

Production: https://pk.d3dm.com. Chrome test account: Invitation QA, restricted to the QA Invitation Flow 2026-11-25 board. No Kris account credentials were changed.

## Verified live

- Invitation delivery, invited account creation, code email delivery, verification, and assigned-board access (initial rehearsal).
- Only the demo board appears for the invited editor. Configure exposes no owner settings or access controls.
- Create task, change status, edit client/agency/notes/assignee label.
- Assign to the demo account and find the task in My Work.
- Complete task, hide/show completed work, and reopen it.
- Refresh preserves task fields, status, account assignment, checklist, and discussion comment.
- Group by client and save a named view.
- Accepted invitation opens sign-in rather than allowing duplicate registration.
- Missing invitation link produces a recovery message (initial rehearsal).
- Password-reset email arrives. Its real link opens the password form even with an existing session after the routing fix.
- 32 public HTTP checks pass: unauthenticated private APIs reject access, public signup is blocked, unknown MCP tokens and foreign MCP origins are rejected.

## Fixes discovered by this test

- Eleven form actions lacked submit button types: work details, comments, handoff, evidence, intake, saved views, board customization, integration settings, outcomes, cycles and release review. Added explicit submit types and an automated form-action audit.
- The account-assignee select could display Unassigned before member options loaded. Remount the form when the options arrive; verified it preserves the existing assignment.
- Existing sessions hid the password-reset form. Recovery query parameters now take precedence over workspace routing. Added two routing regression tests.

Commits: 81a6f36 and 6b78243. Earlier verification-code and quick-add repairs: ce0457a and c2a3a53.

## Pending / not claimed as passed

- Actual password change, sign-out and fresh password sign-in: browser policy requires user entry and submission of the new password. Ready for manual test-account step.
- Kris's personal account acceptance, a second invited viewer, expired/revoked invitation browser flows, attachment upload/download, CSV migration, mobile layout, AI provider execution and full software planning workflows were not live-tested in this pass.
- Database regression tests cover membership isolation, viewer restrictions, invitation conditions, CSV handling and other server workflows; these do not substitute for all live browser checks.
- Product-scoped MCP currently points to LinkKonsole, not this project. No unrelated board was modified.
