// Phase names keep their tint across releases, filters and workflow transitions.
export function phaseTint(phase?: string): string {
  const name = phase?.trim().toLowerCase();
  if (!name) return "#f1f4f3";
  const defaults: Record<string, number> = {planning: 265, build: 205, verify: 40, release: 145};
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const hue = defaults[name] ?? hash % 360;
  return `hsl(${hue} 65% 90%)`;
}
