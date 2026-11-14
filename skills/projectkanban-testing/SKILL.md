---
name: projectkanban-testing
description: Plan and verify ProjectKanban cards before dependent work proceeds.
---

1. Start from the card's acceptance criteria. Identify the risk and the user-visible result that would prove the work.
2. Describe setup, test data, ordered actions, and expected results. Include failure or permission cases when relevant.
3. Automate repeatable checks at the lowest layer that proves the behavior. Use browser tests for user journeys and manual checks for visual judgment or external steps that lack a stable test interface.
4. Record the command or manual steps, environment, observed results, and evidence. Mark a check passed only after running it. Keep failed or pending verification visible to dependent work.
