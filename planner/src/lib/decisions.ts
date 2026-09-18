export type Criterion = { key: string; label: string; weight: number };

export type Rating = {
  id: string;
  venue_id: string;
  rater_id: string;
  rater_name: string;
  scores: Record<string, number>;
  note: string;
  created_at: string;
  updated_at: string;
};

export type DecisionEvent = {
  id: string;
  venue_id: string | null;
  venue_name: string;
  event_type: "rating" | "final";
  actor_name: string;
  summary: string;
  created_at: string;
};

export const DEFAULT_CRITERIA: Criterion[] = [
  { key: "location", label: "Location & travel", weight: 3 },
  { key: "budget", label: "Budget fit", weight: 3 },
  { key: "food", label: "Food & bar", weight: 3 },
  { key: "character", label: "Character & atmosphere", weight: 3 },
  { key: "logistics", label: "Capacity & logistics", weight: 3 },
  { key: "gut", label: "Overall gut feeling", weight: 3 },
];

export const CRITERION_HELP: Record<string, string> = {
  location: "Ease for guests, parking, shuttles and nearby stays.",
  budget: "How comfortably it stays within your preferred ceiling.",
  food: "Menu quality, flexibility, drinks and dietary needs.",
  character: "How well the venue matches your wedding vision.",
  logistics: "Guest fit, accessibility, rain plan and setup.",
  gut: "How strongly you can picture getting married there.",
};

export function blankScores(criteria: Criterion[], value = 3): Record<string, number> {
  return Object.fromEntries(criteria.map((c) => [c.key, value]));
}

// A criterion with more importance (weight) counts for more in the average.
export function weightedScore(scores: Record<string, number>, criteria: Criterion[]): number | null {
  let sumWeight = 0;
  let sumWeighted = 0;
  for (const c of criteria) {
    const s = scores[c.key];
    if (s == null) continue;
    sumWeight += c.weight;
    sumWeighted += s * c.weight;
  }
  return sumWeight ? sumWeighted / sumWeight : null;
}

export function fmtScore(n: number | null): string {
  return n == null ? "—" : n.toFixed(1);
}
