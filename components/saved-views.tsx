"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type View = {name: string; board: "development" | "bug"; filter: string; phase: string; tag: string; responsible: string};

export function SavedViews({storageKey, board, filter, phase, tag, responsible, apply}: {
  storageKey: string; board: View["board"]; filter: string; phase: string; tag: string; responsible: string; apply: (view: View) => void;
}) {
  const [views, setViews] = useState<View[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      setViews(Array.isArray(saved) ? saved.filter((item) => item &&
        typeof item.name === "string" && typeof item.filter === "string" &&
        ["development", "bug"].includes(item.board)).map((item) => ({...item, phase: item.phase ?? "", tag: item.tag ?? "", responsible: item.responsible ?? ""})) : []);
    } catch {setViews([]);}
  }, [storageKey]);

  function save(next: View[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setViews(next);
      setError("");
    } catch {setError("This browser could not save the view.");}
  }

  return <details className="board-legend"><summary>Saved views</summary>
    <form className="actions" onSubmit={(event) => {
      event.preventDefault();
      const label = name.trim();
      if (!label) return;
      save([...views.filter((view) => view.name !== label), {name: label, board, filter, phase, tag, responsible}]);
      setName("");
    }}>
      <input aria-label="View name" placeholder="Name this board and search" value={name} onChange={(event) => setName(event.target.value)} maxLength={80}/>
      <Button type="submit" variant="outline" disabled={!name.trim()}>Save view</Button>
    </form>
    {error && <p role="alert">{error}</p>}
    <div>{views.map((view) => <section className="actions" key={view.name}>
      <Button variant="outline" onClick={() => apply(view)}>{view.name}</Button>
      <Button variant="ghost" aria-label={"Remove view " + view.name} onClick={() => save(views.filter((item) => item !== view))}>Remove</Button>
    </section>)}</div>
  </details>;
}
