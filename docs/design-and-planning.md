# ProjectKanban design and planning

ProjectKanban is a daily work surface for product owners. Make the active product, board, and next action easy to locate. Use fictional projects for examples and review.

## Design decisions

- The wordmark uses charcoal for **Project** and deep green for **Kanban**. The three-column symbol mirrors the board.
- Reserve frosted glass for issue cards and the horizontal scroll thumb. Keep text legible across the gradient and use opaque surfaces for forms.
- Compose the existing shadcn-style Button and Sheet before introducing controls. Board status labels remain visible alongside colored dots.
- Keep current product and board visible when opening an editing panel. Check focus, overflow, long titles and task-specific feedback before release.

## Domain glossary

| Term | Meaning |
|---|---|
| Product | A private catalog entry owning a roadmap and two boards |
| Roadmap version | A saved, timestamped snapshot of the roadmap text |
| Card | A development or bug record with its own status and position |
| AI proposal | Suggested card changes for a specific product revision, applied after approval |

## Upstream references

| Source | Use in this repo |
|---|---|
| [shadcn/ui](https://ui.shadcn.com/docs/skills) | Component composition and variants |
| [Impeccable](https://github.com/pbakaus/impeccable) | Product hierarchy, restrained styling, and state review |
| [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills) and [UI Skills](https://github.com/ibelick/ui-skills) | Accessibility and interaction audits |
| [Taste](https://github.com/Leonxlnx/taste-skill), [Anthropic Frontend Design](https://github.com/anthropics/skills), and [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Visual exploration when a new surface needs alternatives |
| [GSD](https://github.com/gsd-build/get-shit-done) and [Superpowers](https://github.com/obra/superpowers) | Sequenced delivery and verification evidence |
| [Matt Pocock’s skills](https://github.com/mattpocock/skills) | Planning draws on grill-with-docs, to-spec, to-tickets and wayfinder. Design uses prototype where useful. Architecture draws on domain-modeling, codebase-design and improve-codebase-architecture. |

The repo skills are original ProjectKanban workflows. The upstream collections are references and optional tools for contributors.

## Card display plan

| Surface | Purpose |
|---|---|
| Column heading | Workflow status, always labeled. |
| Card tint | Project phase: Planning lavender, Build blue, Verify peach, Release mint; custom phases use stable pastels. A visible legend and phase/milestone text make color supplementary. |
| Top-right indicators | P means planning, T means testing, and ! means a prerequisite is blocking the card where supported. Colors show the result within each indicator. |
| Tags | Readable context or urgency. The standalone board shows release and milestone. The authenticated app shows exceptional priority and bug severity. |
| Card details | Full release and phase assignments, planning decisions, dependencies, test steps, and evidence. |

The board legend should be visible on first load. Keep labels and symbols available without color. Next, complete PK-02 by adding authenticated release, phase, and milestone assignments plus filtering. Then add owner and topic tags under PK-03. Check populated and empty boards, keyboard navigation, and contrast before moving the design to Done.
