import type { Guest } from "@/lib/guests";

export const people = (g: Pick<Guest, "party_size" | "kids_count">) => g.party_size + g.kids_count;

// Rough "where from" bucket read off a free-text address. Only what the address itself says —
// households with no address are counted separately, never guessed.
export function regionOf(address: string): string | null {
  const a = address.trim();
  if (!a) return null;
  const t = a.toLowerCase();
  if (/\b(qc|qu[eé]bec|montr[eé]al|laval|gatineau|sherbrooke|rimouski|l[eé]vis|saguenay|trois-rivi)/i.test(t)) return "Québec";
  if (/\bON\b/.test(a) || /\b(ontario|ottawa|toronto)\b/.test(t)) return "Ontario";
  if (/\b(BC|AB|MB|SK|NS|NB|NL|PE|NT|YT|NU)\b/.test(a) || /\bcanada\b/.test(t)) return "Elsewhere in Canada";
  if (/\b(MA|CT|RI|VT|NH|ME)\b/.test(a) || /\b(boston|new england|massachusetts|vermont|maine|connecticut)\b/.test(t)) return "New England";
  if (/\b[A-Z]{2}\s\d{5}\b/.test(a) || /\b(usa|united states)\b/.test(t)) return "Elsewhere in the U.S.";
  return "Somewhere else";
}

export function regionCounts(guests: Guest[]) {
  const counts = new Map<string, number>();
  let noAddress = 0;
  for (const g of guests) {
    const r = regionOf(g.address ?? "");
    if (!r) noAddress += 1;
    else counts.set(r, (counts.get(r) ?? 0) + people(g));
  }
  return { regions: [...counts.entries()].sort((a, b) => b[1] - a[1]), noAddress };
}

// Tables people are already assigned to, with how many are seated at each.
export function tablesFrom(guests: Guest[]) {
  const seats = new Map<string, number>();
  for (const g of guests) {
    const t = (g.table_assignment ?? "").trim();
    if (t) seats.set(t, (seats.get(t) ?? 0) + people(g));
  }
  return [...seats.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
}
