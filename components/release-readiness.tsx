"use client";

import type { QualityPolicy } from "../lib/quality-policy";
import { qualityIssues } from "../lib/card-quality";
import { useState } from "react";
import type { cards } from "../lib/schema";
import { Button } from "./ui/button";

type Card = typeof cards.$inferSelect;

export function ReleaseReadiness({cards, releases, open, policy}: {policy?: QualityPolicy; cards: Card[]; releases: {id: string; name: string}[]; open: (card: Card) => void}) {
  const [releaseId, setReleaseId] = useState("");
  const scope = releaseId ? cards.filter((card) => card.roadmapAssignment?.releaseId === releaseId) : cards;
  const finished = new Set(cards.filter((card) => ["Done", "Closed"].includes(card.status) && qualityIssues(card,card.status,policy).length === 0 &&
    (!card.execution?.verificationRequired || (card.execution.result === "Passed" &&
      card.execution.testPlan.trim() && card.execution.evidence.trim()))).map((card) => card.id));
  const concerns = scope.filter((card) => !finished.has(card.id)).flatMap((card) => {
    const reasons = qualityIssues(card, card.kind === "bug" ? "Closed" : "Done",policy).map(label => "Needs " + label.toLowerCase());
    if (card.kind === "bug" && ["Critical", "Major"].includes(card.severity)) reasons.push("Open " + card.severity.toLowerCase() + " bug");
    if (card.kind === "bug" && card.status === "Verify") reasons.push("Fix awaiting verification");
    if (card.execution?.verificationRequired && card.execution.result === "Failed") reasons.push("Verification failed");
    if (card.execution?.blockers.some((id) => !finished.has(id))) reasons.push("Waiting on prerequisites");
    return reasons.length ? [{card, reasons}] : [];
  });
  return <details className="board-legend">
    <summary>Readiness · {concerns.length} flagged</summary>
    {releases.length > 0 && <label>Release<select value={releaseId} onChange={(event) => setReleaseId(event.target.value)}>
      <option value="">All releases</option>{releases.map((release) => <option key={release.id} value={release.id}>{release.name}</option>)}
    </select></label>}
    <div>{concerns.length === 0 && <p>No cards match the readiness checks.</p>}
      {concerns.map(({card, reasons}) => <Button key={card.id} variant="outline" onClick={() => open(card)}>
        {card.title} · {reasons.join(", ")}
      </Button>)}
    </div>
  </details>;
}
