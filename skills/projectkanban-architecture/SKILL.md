---
name: projectkanban-architecture
description: Review ProjectKanban domain models and backend interfaces for roadmaps, boards and AI proposals.
---

Read the [design and planning guide](../../docs/design-and-planning.md).

1. Trace a real action through the UI, API and persistence. Name the concrete failure or duplication before proposing a new boundary.
2. Keep authorization, revision checks and transactional writes server-side. Prefer a small interface around behavior that changes together.
3. Stress-test domain terms against card reclassification, saved roadmap versions and stale AI proposals. Record meaningful tradeoffs and verify existing data through normal entry points.
