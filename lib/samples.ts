export const sampleProducts = {
  "Atlas Notes": {
    roadmap: "Release 1\nMake notes easier to find with keyword search.\n\nRelease 2\nAdd folders and saved filters.",
    feature: "Add keyword search to notes",
    bug: "Empty search shows a blank screen",
  },
  "Harbor Desk": {
    roadmap: "Release 1\nGive support teams a shared inbox with status filters.",
    feature: "Add an unresolved tickets filter",
    bug: "Ticket count stays stale after closing a ticket",
  },
  "Maple Studio": {
    roadmap: "Release 1\nLet designers preview and export a color palette.",
    feature: "Export a palette as CSS variables",
    bug: "Palette preview drops the last color",
  },
} as const;
