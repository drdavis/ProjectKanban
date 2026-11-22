# Import tasks from Airtable or CSV

The product owner can open **Configure → Import CSV**, choose a CSV export, and review the column mapping and destination statuses before importing. Create a product first if the tasks need a separate workspace.

The importer recognizes Name/Title/Task, Notes/Description, Assignee/Owner/Responsible person, Status, Attachments, and Attachment Summary. You can select different columns. Unmapped nonempty columns and attachment references are retained in card notes. Attachment files are not downloaded, and external URLs may expire. No formulas or CSV instructions are executed.

- Limit: 500 data rows and 2 MB per file, with quoted commas, escaped quotes, multiline notes, CRLF and UTF-8 BOM support.
- Empty task names are skipped. Long titles are shortened to 180 characters; the full title remains in notes. Oversized notes and assignees are rejected instead of silently truncated.
- Choose **Import completed rows only** to include Done, Complete, Completed and Closed (case insensitive).
- By default all tasks enter Backlog. Explicitly choose **Preserve completed status as historical Done** to retain past completion. All other statuses enter Backlog. Original status, filename and source row are recorded in execution evidence.
- Historical Done cards have `csv-import` and `historical-done` tags. Their verification remains Pending: the source reported completion, but ProjectKanban has not independently tested it. Readiness reports may flag them. Reopen a card before continuing work; normal readiness and completion gates still apply.
- Exact source rows already imported into the same product are skipped, even when a file is renamed or its columns reordered. Changed row values count as new tasks. Repeating identical rows in one file also skips duplicates. Import never overwrites existing cards.
- An import is one database transaction. Product ownership and revision are checked on the server; stale previews require refresh. Activity records the actor, source filename and counts. CSV imports are owner-only, including historical status preservation; MCP and normal card edits cannot use this migration route.

The original CSV and imported client information belong in your private workspace/database, not the public source repository. CSV import does not invite assignees or grant them access; provision a teammate account and grant product access separately.
