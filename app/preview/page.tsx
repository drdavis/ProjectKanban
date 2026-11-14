import Workspace, { type Snapshot } from "../../components/workspace";
import roadmapCards from "../../lib/projectkanban-roadmap.json";

const product = {
  id: "projectkanban", owner: "", name: "ProjectKanban",
  roadmap: "Make the board usable, then add releases and card metadata, guided planning, AI provider settings, and coding-tool connections. Verify a test deployment before publishing.",
  releases: [], aiEnabled: false, repository: "", revision: 0,
};
const cards = roadmapCards.map(([id, kind, status, title, description], index) => ({
  id, productId: product.id, kind, status, title, description,
  priority: "Normal", position: index + 1, criteria: "", link: "", severity: "", execution: null, roadmapAssignment: null, responsible: "", tags: [],
}));
const snapshot: Snapshot = {product, cards, proposals: [], activity: [], roadmapVersions: [{
  id: "projectkanban-roadmap-1", productId: product.id, actor: "Sample", action: "Saved roadmap version",
  before: null, after: {roadmap: product.roadmap}, createdAt: new Date("2026-01-15T12:00:00Z"),
}]};

export default function Preview() {
  return <Workspace account={null} preview={snapshot}/>;
}
