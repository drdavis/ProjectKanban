# Human tasks and software projects

Owners can choose **Configure → Card style and quality policy → Work type → Human tasks — simple cards**, then save the policy. The choice applies only to that product and is recorded in Activity. Existing products default to software mode. No cards are deleted or converted, and existing development fields remain stored.

| Human task card | Software card |
| --- | --- |
| Name | Title |
| Notes | Structured brief, context, acceptance criteria |
| Assignee | Responsible person |
| Status | Development or bug workflow |
| Attachments | Attachments |
| Attachment Summary | Technical context and verification evidence |

In human-task mode, only Name and Status are required. Use Notes for instructions or completion details. Mark Done when the work is complete; this does not claim a passing software test. Dependencies still prevent advancing blocked work. Bug cards retain software verification rules. Software mode retains briefs, releases, planning, test plans, results, and completion evidence.

Files can be attached after the first save. CSV attachment URLs remain source references in Notes; importing does not fetch third-party files. Existing imported summaries remain preserved in Notes; new CSV imports also populate Attachment Summary.

## Separate logins and board access

Each person must use their own account. The owner invites the person's email with **Editor** access under the chosen product's **Access** panel. Share the generated link, or enable optional Resend delivery. The person must verify that exact email. The existing user-ID membership editor is still available. That membership lets the person update cards on this product; it does not give access to the owner's other products. Catalog queries filter by ownership/membership, and direct product requests enforce the same boundary on the server. Viewers cannot edit; only owners can change membership or work type. A shared owner login cannot provide this separation.

Confirm the intended account identity before granting access. Test with that person's login: their board should appear, another unshared product URL should return no product, and membership/settings changes should be denied.

## AI assistants

A token must be scoped to the intended product with write access. Read `get_product` first: `qualityPolicy.workType` declares the card mode. Use `title`, `description` (Notes), `responsible` (Assignee), and `execution.attachmentSummary`. Create, update, and move tasks through MCP without inventing test results. Tokens for another product cannot assign work on this board.

## Client and agency work

Create a board with **Client and agency tasks**, or open an existing board's **Configure → Work type and software policy**, select **Human tasks**, and save. Changing mode preserves existing cards and imported history. Existing boards are not switched based on their names.

Task boards start with **By client**, with optional **By agency**, **All tasks**, and **Status columns** layouts. Each task has Client and Agency fields with suggestions from that board. The agency selector narrows the client list. Use **Show completed** for imported historical work. Select tasks to set client/agency together; blank fields in that batch operation clear the old classification.

Owners can customize the task tab title, client/agency field labels, agency visibility, default layout, and five column labels under **Configure → Customize task board**. The underlying states remain compatible with MCP: Backlog (To do), Ready (Scheduled), In Progress, Review (Awaiting approval), Done. Renaming never invents completion evidence.

Each member can save personal client/agency views to their account. Membership controls access to the entire board; these filters do not provide client-level security. Put clients requiring different access in separate boards.

CSV imports map Client / Customer and Agency columns. Exports include both fields. Existing records with only client names buried in notes remain unclassified until reviewed; original notes are retained.

MCP partial updates can set `execution.work.client` and `execution.work.agency` without clearing due dates or checklists. Account assignment remains `execution.work.assigneeId`, restricted to members of that board.
