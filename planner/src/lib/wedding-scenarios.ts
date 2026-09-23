import { BUDGET_CEILING, GENERIC_LINES, TAX_RATE, type Assumptions, type Venue } from "@/lib/venues";
import { bucketOfLabel, BUCKET_LABEL, type BucketKey } from "@/lib/budget-scenarios";
import type { BudgetExpense } from "@/lib/budget-extras";
import { projectCost, type DiyMaterial } from "@/lib/diy-projects";
import { eventCost, eventHref, type EventExpense } from "@/lib/wedding-events";
import { vendorPrice, WORKS_WITH_VENUE_LABELS, type PriceSource, type Vendor } from "@/lib/vendors";

// A Wedding Scenario is only a set of choices. Every price stays on the record it came from (venue, vendor,
// DIY project, event, wedding-party member, Budget expense) and is looked up live, so nothing is copied and
// nothing goes stale.

export type ChoiceRole = "selected" | "alternative" | "not_needed" | "tbd";
export type RefType = "vendor" | "diy" | "event" | "party" | "expense";
export type CostState = "included" | "na" | "unknown" | "zero";

export type ScenarioRow = {
  id: string;
  name: string;
  description: string;
  season: string;
  wedding_date: string | null;
  venue_id: string | null;
  invited: number | null;
  expected: number | null;
  adults: number | null;
  kids: number | null;
  target_budget: number | null;
  contingency_pct: number | null;
  archived: boolean;
  sort_order: number;
  created_at: string;
};

export type ChoiceRow = {
  id: string;
  scenario_id: string;
  category: string;
  role: ChoiceRole;
  ref_type: RefType | null;
  ref_id: string | null;
  label: string;
  amount: number | null;
  unit: string;
  quantity: number | null;
  cost_state: CostState | null;
  plus_tax: boolean;
  extra_confirmed: boolean;
  sort_order: number;
};

export type SummaryGroup = "Venue & catering" | "Vendors" | "DIY" | "Wedding weekend" | "Guest experience" | "Other";
export const SUMMARY_GROUPS: SummaryGroup[] = ["Venue & catering", "Vendors", "DIY", "Wedding weekend", "Guest experience", "Other"];

export type CategoryDef = {
  key: string;
  label: string;
  group: SummaryGroup;
  blurb: string;
  singular: string;
  picks: RefType[];
  vendorCats: string[];
  anyVendor?: boolean;
  custom?: boolean;
};

// The nineteen builder sections. Contingency is worked out, not chosen, so it has no picker.
export const CATEGORIES: CategoryDef[] = [
  { key: "venue", label: "Venue", group: "Venue & catering", blurb: "Where it happens. Its pricing, capacity and rules come from the venue record.", singular: "venue", picks: [], vendorCats: [] },
  { key: "food", label: "Food & catering", group: "Venue & catering", blurb: "An outside caterer, if the venue doesn't provide the meal.", singular: "caterer", picks: ["vendor"], vendorCats: ["Catering"], custom: true },
  { key: "bar", label: "Bar & drinks", group: "Venue & catering", blurb: "Bar service, wine, cocktails.", singular: "bar service", picks: ["vendor"], vendorCats: ["Bar"], custom: true },
  { key: "photo", label: "Photography & video", group: "Vendors", blurb: "Photographer, videographer, or both.", singular: "photographer or videographer", picks: ["vendor"], vendorCats: ["Photography", "Videography"] },
  { key: "music", label: "Music & entertainment", group: "Vendors", blurb: "DJ, band, ceremony musicians.", singular: "musician or DJ", picks: ["vendor"], vendorCats: ["Music & DJ", "Entertainment"], custom: true },
  { key: "flowers", label: "Flowers & décor", group: "Vendors", blurb: "Florist and styling.", singular: "florist", picks: ["vendor"], vendorCats: ["Florist"], custom: true },
  { key: "hair", label: "Hair & makeup", group: "Vendors", blurb: "Getting ready.", singular: "hair and makeup artist", picks: ["vendor"], vendorCats: ["Hair & Makeup"] },
  { key: "officiant", label: "Officiant", group: "Vendors", blurb: "Who marries you.", singular: "officiant", picks: ["vendor"], vendorCats: ["Officiant"], custom: true },
  { key: "stationery", label: "Stationery", group: "Vendors", blurb: "Invitations, signage, menus.", singular: "stationer", picks: ["vendor"], vendorCats: ["Stationery"], custom: true },
  { key: "cake", label: "Cake & desserts", group: "Vendors", blurb: "The cake, the sweet table.", singular: "cake vendor", picks: ["vendor"], vendorCats: ["Cake & Desserts"] },
  { key: "rentals", label: "Rentals", group: "Vendors", blurb: "Tables, chairs, linens, tent, lighting.", singular: "rental company", picks: ["vendor"], vendorCats: ["Rentals"], custom: true },
  { key: "transport", label: "Transportation", group: "Vendors", blurb: "Shuttles, cars, ferry.", singular: "transport", picks: ["vendor"], vendorCats: ["Transportation"], custom: true },
  { key: "party", label: "Wedding party", group: "Wedding weekend", blurb: "What you're spending on your people. Costs come from the Wedding Party page.", singular: "wedding party costs", picks: ["party"], vendorCats: [] },
  { key: "guest", label: "Guest experience", group: "Guest experience", blurb: "Live portraits, welcome bags, childcare, favours.", singular: "guest experience", picks: ["vendor"], vendorCats: [], anyVendor: true, custom: true },
  { key: "diy", label: "DIY projects", group: "DIY", blurb: "What you're making yourselves. Costs come from each project's materials.", singular: "DIY projects", picks: ["diy"], vendorCats: [] },
  { key: "events", label: "Wedding weekend & events", group: "Wedding weekend", blurb: "Welcome party, rehearsal dinner, brunch. Budgets come from each event.", singular: "events", picks: ["event"], vendorCats: [] },
  { key: "travel", label: "Travel & accommodation", group: "Other", blurb: "Rooms, the couple's suite, getting people there.", singular: "accommodation", picks: [], vendorCats: [], custom: true },
  { key: "other", label: "Other", group: "Other", blurb: "Anything else, including expenses already in your Budget.", singular: "other cost", picks: ["vendor", "expense"], vendorCats: ["Other"], anyVendor: true, custom: true },
];
export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<string, CategoryDef>;

// ── Inputs ──────────────────────────────────────────────────────────────────
export type World = {
  venues: Venue[];
  vendors: Vendor[];
  diy: { id: string; title: string; cost_estimate: number | null; cost_actual: number | null }[];
  materials: DiyMaterial[];
  events: { id: string; key: string | null; title: string; budget_estimate: number | null }[];
  eventExpenses: EventExpense[];
  party: { id: string; name: string; cost: number | null }[];
  expenses: BudgetExpense[];
  base: Assumptions;
  guests: { invited: number; expected: number };
};

export type ScenarioSetup = Assumptions & { invited: number; expected: number; target: number; inherits: { guests: boolean; invited: boolean; expected: boolean; target: boolean; contingency: boolean } };

// Blank scenario fields inherit the wedding-wide settings; changing them here never touches those.
export function setupOf(s: ScenarioRow, w: World): ScenarioSetup {
  const adults = s.adults ?? w.base.adults;
  const kids = s.kids ?? w.base.kids;
  return {
    adults,
    kids,
    svcPct: w.base.svcPct,
    tax: w.base.tax,
    contPct: s.contingency_pct ?? w.base.contPct,
    invited: s.invited ?? w.guests.invited,
    expected: s.expected ?? w.guests.expected,
    target: s.target_budget ?? BUDGET_CEILING,
    inherits: { guests: s.adults == null && s.kids == null, invited: s.invited == null, expected: s.expected == null, target: s.target_budget == null, contingency: s.contingency_pct == null },
  };
}

// ── Lines ───────────────────────────────────────────────────────────────────
// "amount" is a real price (a confirmed $0 is "zero"); "included" is covered by something else; "na" isn't needed;
// "unknown" has no price yet. Only "amount" and "zero" ever add to a total.
export type LineState = "amount" | "zero" | "included" | "na" | "unknown";

export type ScenarioLine = {
  id: string;
  category: string;
  label: string;
  sub: string;
  source: string;
  href: string | null;
  state: LineState;
  base: number;
  service: number;
  tax: number;
  total: number;
  confidence: PriceSource | null;
  choiceId: string | null;
  refId: string | null;
  refType: RefType | null;
  partial: boolean;
  assumed: boolean;
  needsHours: boolean;
  missing: boolean;
};

const CONFIRMED: PriceSource[] = ["quote", "contracted", "actual"];
export const isConfirmed = (c: PriceSource | null) => c != null && CONFIRMED.includes(c);

const blankLine = (over: Partial<ScenarioLine>): ScenarioLine => ({
  id: "",
  category: "other",
  label: "",
  sub: "",
  source: "",
  href: null,
  state: "unknown",
  base: 0,
  service: 0,
  tax: 0,
  total: 0,
  confidence: null,
  choiceId: null,
  refId: null,
  refType: null,
  partial: false,
  assumed: false,
  needsHours: false,
  missing: false,
  ...over,
});

const taxMul = (as: Assumptions) => (as.tax ? TAX_RATE : 1);
const priced = (state: LineState) => state === "amount" || state === "zero";

export function unitQty(unit: string, as: Assumptions, quantity: number | null): number | null {
  if (unit === "adult") return as.adults;
  if (unit === "kid") return as.kids;
  if (unit === "adult+kid") return as.adults + as.kids;
  if (unit === "hour") return quantity != null && quantity > 0 ? quantity : null;
  if (unit === "package") return quantity != null && quantity > 0 ? quantity : 1;
  return 1;
}

export const CUSTOM_UNITS: [value: string, label: string][] = [
  ["flat", "Flat amount"],
  ["package", "Quantity × price"],
  ["adult", "Per adult"],
  ["kid", "Per child"],
  ["adult+kid", "Per guest"],
  ["hour", "Per hour"],
];

function estimateConfidence(v: Vendor): PriceSource {
  const s = v.estimate_source;
  return s === "website" || s === "vendor_estimate" || s === "rough_estimate" || s === "starting_price" ? s : s === "quote" || s === "contracted" || s === "actual" ? "vendor_estimate" : "rough_estimate";
}

function vendorLine(choice: ChoiceRow, v: Vendor | undefined, as: Assumptions): ScenarioLine {
  const common = { id: `c-${choice.id}`, category: choice.category, source: "Vendor", choiceId: choice.id, refId: choice.ref_id, refType: "vendor" as const };
  if (!v) return blankLine({ ...common, label: "Removed vendor", sub: "This vendor was deleted", missing: true });
  const href = `/vendors/${v.id}?tab=pricing`;
  const label = v.name;
  const lead = { ...common, label, href };

  let base: number | null;
  let confidence: PriceSource | null;
  let sub = "";
  let needsHours = false;
  const est = v.price_high ?? v.price_low ?? v.starting_price;
  if (v.contracted_total == null && v.quoted_total == null && v.price_unit === "hour" && est != null) {
    const hours = choice.quantity;
    if (hours != null && hours > 0) {
      base = est * hours;
      confidence = v.price_high != null || v.price_low != null ? estimateConfidence(v) : "starting_price";
      sub = `${hours} hour${hours === 1 ? "" : "s"} × $${Math.round(est).toLocaleString()}`;
    } else {
      base = null;
      confidence = null;
      needsHours = true;
      sub = "Priced per hour. How many hours?";
    }
  } else {
    const p = vendorPrice(v, as);
    base = p.amount;
    confidence = p.source === "contracted" ? "contracted" : p.source === "quoted" ? "quote" : p.source === "starting" ? "starting_price" : p.source === "estimated" ? estimateConfidence(v) : null;
    sub = p.amount == null ? p.note : [p.label, p.note].filter(Boolean).join(" · ");
    if (base != null && v.price_unit === "package" && choice.quantity != null && choice.quantity > 1 && v.contracted_total == null && v.quoted_total == null) {
      base *= choice.quantity;
      sub += ` × ${choice.quantity}`;
    }
  }
  if (base == null) return blankLine({ ...lead, state: "unknown", needsHours, sub: sub || "No price yet", missing: true });

  const contracted = confidence === "contracted";
  if (!contracted && v.travel_fee != null && v.travel_fee > 0 && !v.travel_included) {
    base += v.travel_fee;
    sub += ` + travel $${Math.round(v.travel_fee).toLocaleString()}`;
  }
  // A contracted total is what you'll actually pay. Anything earlier gets the vendor's service charge and Québec taxes unless they say those are included.
  const service = !contracted && v.service_charge_pct != null ? (base * v.service_charge_pct) / 100 : 0;
  const tax = !contracted && !v.tax_included ? (base + service) * (taxMul(as) - 1) : 0;
  return blankLine({ ...lead, state: base === 0 ? "zero" : "amount", base, service, tax, total: base + service + tax, confidence, sub: sub.trim() });
}

function diyLine(choice: ChoiceRow, w: World): ScenarioLine {
  const p = w.diy.find((x) => x.id === choice.ref_id);
  const common = { id: `c-${choice.id}`, category: choice.category, source: "DIY project", choiceId: choice.id, refId: choice.ref_id, refType: "diy" as const };
  if (!p) return blankLine({ ...common, label: "Removed project", missing: true });
  const mats = w.materials.filter((m) => m.project_id === p.id);
  const c = projectCost(p, mats);
  const lead = { ...common, label: p.title, href: `/diy/${p.id}` };
  if (!c.fromMaterials && p.cost_estimate == null && p.cost_actual == null) return blankLine({ ...lead, state: "unknown", sub: "No cost entered yet", missing: true });
  const actual = c.projected > 0 && c.spent >= c.projected;
  return blankLine({ ...lead, state: c.projected === 0 ? "zero" : "amount", base: c.projected, total: c.projected, confidence: actual ? "actual" : "rough_estimate", sub: c.fromMaterials ? "From its materials list" : p.cost_actual != null ? "Actual cost" : "Estimate" });
}

function eventLine(choice: ChoiceRow, w: World): ScenarioLine {
  const e = w.events.find((x) => x.id === choice.ref_id);
  const common = { id: `c-${choice.id}`, category: choice.category, source: "Event", choiceId: choice.id, refId: choice.ref_id, refType: "event" as const };
  if (!e) return blankLine({ ...common, label: "Removed event", missing: true });
  const lead = { ...common, label: e.title, href: `${eventHref(e)}?tab=budget` };
  const amount = eventCost(e, w.eventExpenses.filter((x) => x.event_id === e.id));
  if (amount <= 0) return blankLine({ ...lead, state: "unknown", sub: "No budget yet", missing: true });
  return blankLine({ ...lead, state: "amount", base: amount, total: amount, confidence: "rough_estimate", sub: "Event budget" });
}

function partyLine(choice: ChoiceRow, w: World): ScenarioLine {
  const m = w.party.find((x) => x.id === choice.ref_id);
  const common = { id: `c-${choice.id}`, category: choice.category, source: "Wedding party", choiceId: choice.id, refId: choice.ref_id, refType: "party" as const };
  if (!m) return blankLine({ ...common, label: "Removed member", missing: true });
  const lead = { ...common, label: m.name, href: "/wedding-party" };
  if (m.cost == null) return blankLine({ ...lead, state: "unknown", sub: "No cost entered", missing: true });
  return blankLine({ ...lead, state: m.cost === 0 ? "zero" : "amount", base: m.cost, total: m.cost, confidence: "rough_estimate", sub: "Wedding party cost" });
}

function expenseLine(choice: ChoiceRow, w: World, as: Assumptions): ScenarioLine {
  const e = w.expenses.find((x) => x.id === choice.ref_id);
  const common = { id: `c-${choice.id}`, category: choice.category, source: "Budget", choiceId: choice.id, refId: choice.ref_id, refType: "expense" as const };
  if (!e) return blankLine({ ...common, label: "Removed expense", missing: true });
  const qty = e.unit === "hour" ? e.qty || 1 : unitQty(e.unit, as, null);
  const lead = { ...common, label: e.label, href: "/budget/builder" };
  if (qty == null) return blankLine({ ...lead, state: "unknown", sub: "Hours not set", missing: true });
  const base = e.rate * qty;
  const service = e.category === "Venue & catering" ? (base * as.svcPct) / 100 : 0;
  const tax = (base + service) * (taxMul(as) - 1);
  return blankLine({ ...lead, state: base === 0 ? "zero" : "amount", base, service, tax, total: base + service + tax, confidence: "rough_estimate", sub: "From the Budget builder" });
}

function customLine(choice: ChoiceRow, as: Assumptions): ScenarioLine {
  const lead = { id: `c-${choice.id}`, category: choice.category, label: choice.label || "Untitled cost", source: "Our own line", choiceId: choice.id };
  if (choice.cost_state === "included") return blankLine({ ...lead, state: "included", sub: "Covered by something else" });
  if (choice.cost_state === "na") return blankLine({ ...lead, state: "na", sub: "Not required" });
  if (choice.cost_state === "unknown" || (choice.cost_state == null && choice.amount == null)) return blankLine({ ...lead, state: "unknown", sub: "Price still to find out", missing: true });
  const qty = unitQty(choice.unit, as, choice.quantity);
  if (choice.cost_state === "zero") return blankLine({ ...lead, state: "zero", sub: "Confirmed $0", confidence: "quote" });
  if (qty == null || choice.amount == null) return blankLine({ ...lead, state: "unknown", needsHours: choice.unit === "hour", sub: "Hours not set", missing: true });
  const base = choice.amount * qty;
  const tax = choice.plus_tax ? base * (taxMul(as) - 1) : 0;
  const unit = CUSTOM_UNITS.find((u) => u[0] === choice.unit)?.[1] ?? "";
  const how = choice.unit === "flat" ? "" : `${qty} × $${Math.round(choice.amount).toLocaleString()}`;
  return blankLine({ ...lead, state: base === 0 ? "zero" : "amount", base, tax, total: base + tax, confidence: "rough_estimate", sub: [how || unit, choice.plus_tax ? "+ taxes" : ""].filter(Boolean).join(" · ") });
}

export function lineForChoice(choice: ChoiceRow, w: World, as: Assumptions): ScenarioLine {
  if (choice.ref_type === "vendor") return vendorLine(choice, w.vendors.find((v) => v.id === choice.ref_id), as);
  if (choice.ref_type === "diy") return diyLine(choice, w);
  if (choice.ref_type === "event") return eventLine(choice, w);
  if (choice.ref_type === "party") return partyLine(choice, w);
  if (choice.ref_type === "expense") return expenseLine(choice, w, as);
  return customLine(choice, as);
}

// ── The venue ───────────────────────────────────────────────────────────────
const BUCKET_CATEGORY: Record<BucketKey, string> = { venue: "venue", alcohol: "bar", rentals: "rentals", accommodation: "travel", transport: "transport", shared: "other", linked: "other" };
const VENUE_BUCKETS: BucketKey[] = ["venue", "alcohol", "rentals", "accommodation", "transport"];
type Tally = { base: number; service: number; tax: number; lines: number; priced: number; zero: number; included: number; na: number; unknown: number; labels: { included: string[] } };
const blankTally = (): Tally => ({ base: 0, service: 0, tax: 0, lines: 0, priced: 0, zero: 0, included: 0, na: 0, unknown: 0, labels: { included: [] } });

// The venue's own cost lines, worked out from this scenario's guest counts — same rules as the Venues page.
export function venueLines(v: Venue, as: Assumptions): ScenarioLine[] {
  const href = `/venues/${v.id}?tab=costs`;
  const T = taxMul(as);
  const svcRate = as.svcPct / 100;
  const contracted = v.contracted_total != null;
  const quoted = v.quoted_total != null;
  const out: ScenarioLine[] = [];

  if (contracted || quoted) {
    const total = (v.contracted_total ?? v.quoted_total)!;
    out.push(blankLine({ id: "v-venue", category: "venue", label: v.name, sub: contracted ? "Contracted total" : "Quoted total", source: "Venue", href, state: total === 0 ? "zero" : "amount", base: total, total, confidence: contracted ? "contracted" : "quote", refId: v.id }));
    // An all-in quote stands in for every other venue line, so those read "included" rather than "unknown".
    for (const b of VENUE_BUCKETS.slice(1)) {
      out.push(blankLine({ id: `v-${b}`, category: BUCKET_CATEGORY[b], label: `${BUCKET_LABEL[b]} at the venue`, sub: "Covered by the venue's quote", source: "Venue", href, state: "included", assumed: true, refId: v.id }));
    }
    return out;
  }

  const t = Object.fromEntries(VENUE_BUCKETS.map((b) => [b, blankTally()])) as Record<BucketKey, Tally>;
  for (const [label, rate, unit, noSvc, state] of v.budget_lines.length ? v.budget_lines : GENERIC_LINES) {
    const b = bucketOfLabel(label);
    if (!(b in t)) continue;
    const x = t[b];
    x.lines++;
    if (state) {
      x[state]++;
      if (state === "included") x.labels.included.push(label);
      continue;
    }
    x.priced++;
    const qty = unit === "adult" ? as.adults : unit === "kid" ? as.kids : unit === "adult+kid" ? as.adults + as.kids : 1;
    const base = rate * qty;
    if (base === 0) x.zero++;
    const svc = noSvc === 0 ? 0 : base * svcRate;
    x.base += base;
    x.service += svc;
    x.tax += (base + svc) * (T - 1);
  }
  for (const b of VENUE_BUCKETS) {
    const x = t[b];
    const total = x.base + x.service + x.tax;
    const state: LineState = x.base > 0 ? "amount" : x.lines === 0 || x.unknown > 0 ? "unknown" : x.zero > 0 ? "zero" : x.included > 0 ? "included" : "na";
    if (state === "na" && b !== "venue") continue;
    out.push(
      blankLine({
        id: `v-${b}`,
        category: BUCKET_CATEGORY[b],
        label: b === "venue" ? v.name : `${BUCKET_LABEL[b]} at the venue`,
        sub: state === "included" ? x.labels.included.join(", ") || "Included" : state === "unknown" ? "Not priced yet" : "Estimated from the venue's line items",
        source: "Venue",
        href,
        state,
        base: x.base,
        service: x.service,
        tax: x.tax,
        total,
        confidence: state === "amount" || state === "zero" ? "rough_estimate" : null,
        partial: x.base > 0 && x.unknown > 0,
        missing: state === "unknown" || (x.base > 0 && x.unknown > 0),
        refId: v.id,
      }),
    );
  }
  return out;
}

export type VenueNote = { kind: "required" | "included" | "note"; text: string };

// What the venue's own answers say about each part of the wedding. Only ever what's been filled in on the venue record.
export function venueNotes(v: Venue): Record<string, VenueNote[]> {
  const a = v.amenities ?? {};
  const out: Record<string, VenueNote[]> = {};
  const add = (cat: string, kind: VenueNote["kind"], text: string) => (out[cat] ??= []).push({ kind, text });
  const has = (k: string) => (a[k] ?? "").trim() !== "";

  if (a.food_outside === "No") add("food", "required", `Outside caterers aren't allowed. Catering comes from ${v.name}.`);
  else if (a.food_inhouse === "Yes") add("food", "note", "In-house catering available.");
  if (has("food_alcohol")) add("bar", "note", `Alcohol rules: ${a.food_alcohol}`);
  if (has("food_corkage")) add("bar", "note", `Corkage: ${a.food_corkage}`);
  if (has("food_bar")) add("bar", "note", `Bar options: ${a.food_bar}`);
  if (a.reception_furniture === "Yes") add("rentals", "included", "Tables and chairs are included with the venue.");
  if (a.reception_furniture === "No") add("rentals", "required", "Tables and chairs aren't included. Rentals are needed.");
  if (has("diy_florist")) add("flowers", "note", `Florist restrictions: ${a.diy_florist}`);
  if (has("food_cake")) add("cake", "note", `Cake policy: ${a.food_cake}`);
  if (a.stay_onsite === "Yes") add("travel", "included", "On-site accommodation available.");
  if (a.stay_onsite === "No") add("travel", "required", "No on-site accommodation. Guests will need somewhere nearby.");
  if (has("stay_nearby")) add("travel", "note", `Nearby: ${a.stay_nearby}`);
  if (a.log_shuttle === "Yes") add("transport", "note", "Shuttle access is possible.");
  if (has("log_ferry")) add("transport", "note", `Ferry: ${a.log_ferry}`);
  if (has("ceremony_fee")) add("venue", "note", `Ceremony fee: ${a.ceremony_fee}`);
  if (has("log_curfew")) add("venue", "note", `Curfew: ${a.log_curfew}`);
  if (v.turnkey === "DIY-heavy" || v.turnkey === "Full DIY") add("venue", "required", `${v.turnkey}: expect to bring in most of the wedding yourselves.`);

  for (const [label, , , , state] of v.budget_lines) {
    if (state !== "included") continue;
    const b = bucketOfLabel(label);
    if (b !== "venue" && b in { alcohol: 1, rentals: 1, accommodation: 1, transport: 1 }) add(BUCKET_CATEGORY[b], "included", `${label}: included.`);
  }
  return out;
}

// ── The whole scenario ──────────────────────────────────────────────────────
export type MissingItem = { text: string; href: string; kind: "unknown" | "warning" };

export type ScenarioResult = {
  setup: ScenarioSetup;
  venue: Venue | null;
  lines: ScenarioLine[];
  alternatives: Record<string, ScenarioLine>;
  byCategory: Record<string, { lines: ScenarioLine[]; total: number; unknown: number }>;
  groups: Record<SummaryGroup, number>;
  subtotal: number;
  contingency: number;
  projected: number;
  perGuest: number;
  remaining: number;
  unknownCount: number;
  confidence: { pct: number; confirmed: number; estimated: number; estimateCount: number; quoteCount: number; contractedCount: number };
  missing: MissingItem[];
  duplicates: Record<string, string>;
  notes: Record<string, VenueNote[]>;
};

export function computeScenario(s: ScenarioRow, choices: ChoiceRow[], w: World): ScenarioResult {
  const setup = setupOf(s, w);
  const venue = w.venues.find((v) => v.id === s.venue_id) ?? null;
  const mine = choices.filter((c) => c.scenario_id === s.id).sort((a, b) => a.sort_order - b.sort_order);
  const notes = venue ? venueNotes(venue) : {};

  const lines: ScenarioLine[] = venue ? venueLines(venue, setup) : [];
  const alternatives: Record<string, ScenarioLine> = {};
  for (const c of mine) {
    if (c.role === "selected") lines.push(lineForChoice(c, w, setup));
    else if (c.role === "alternative") alternatives[c.id] = lineForChoice(c, w, setup);
  }

  const byCategory: ScenarioResult["byCategory"] = {};
  for (const l of lines) {
    const c = (byCategory[l.category] ??= { lines: [], total: 0, unknown: 0 });
    c.lines.push(l);
    if (priced(l.state)) c.total += l.total;
    if (l.state === "unknown" || l.partial) c.unknown++;
  }

  const groups = Object.fromEntries(SUMMARY_GROUPS.map((g) => [g, 0])) as Record<SummaryGroup, number>;
  for (const l of lines) if (priced(l.state)) groups[CATEGORY_BY_KEY[l.category]?.group ?? "Other"] += l.total;
  const subtotal = SUMMARY_GROUPS.reduce((t, g) => t + groups[g], 0);
  const contingency = subtotal * (setup.contPct / 100);
  const projected = subtotal + contingency;
  const headcount = setup.invited || setup.adults + setup.kids;

  let confirmed = 0;
  let estimated = 0;
  let quoteCount = 0;
  let contractedCount = 0;
  let estimateCount = 0;
  for (const l of lines) {
    if (l.state !== "amount" || l.total <= 0) continue;
    if (isConfirmed(l.confidence)) {
      confirmed += l.total;
      if (l.confidence === "quote") quoteCount++;
      else contractedCount++;
    } else {
      estimated += l.total;
      estimateCount++;
    }
  }
  const isOpenUnknown = (l: ScenarioLine) => l.state === "unknown" || l.partial;
  const partyUnknown = lines.filter((l) => l.source === "Wedding party" && isOpenUnknown(l)).length;
  // Wedding-party members without a cost read as one gap, not one per person.
  const unknownCount = lines.filter((l) => l.source !== "Wedding party" && isOpenUnknown(l)).length + (partyUnknown > 0 ? 1 : 0) + mine.filter((c) => c.role === "tbd").length;

  const missing: MissingItem[] = [];
  const back = (key: string) => `#cat-${key}`;
  if (!venue) missing.push({ text: "No venue chosen yet", href: back("venue"), kind: "unknown" });
  if (partyUnknown > 0) missing.push({ text: `${partyUnknown} wedding party member${partyUnknown === 1 ? " has" : "s have"} no cost entered`, href: "/wedding-party", kind: "unknown" });
  for (const l of lines) {
    if (!isOpenUnknown(l) || l.source === "Wedding party") continue;
    const href = l.href ?? back(l.category);
    if (l.source === "Venue") missing.push({ text: `${venue?.name}: ${l.category === "venue" ? "some costs" : l.label.toLowerCase()} ${l.partial ? "partly unknown" : "not priced yet"}`, href, kind: "unknown" });
    else if (l.needsHours) missing.push({ text: `${l.label}: how many hours?`, href: back(l.category), kind: "unknown" });
    else if (l.source === "Vendor") missing.push({ text: `${l.label} selected but no price entered`, href, kind: "unknown" });
    else if (l.source === "Event") missing.push({ text: `${l.label} has no budget`, href, kind: "unknown" });
    else missing.push({ text: `${l.label}: ${l.sub.toLowerCase() || "cost unknown"}`, href, kind: "unknown" });
  }
  for (const c of mine) if (c.role === "tbd") missing.push({ text: `${CATEGORY_BY_KEY[c.category]?.label ?? c.category} still to decide`, href: back(c.category), kind: "unknown" });

  // A vendor the venue already covers, or won't let in.
  const duplicates: Record<string, string> = {};
  for (const l of lines) {
    if (l.source !== "Vendor" || !l.choiceId || !venue) continue;
    const choice = mine.find((c) => c.id === l.choiceId)!;
    const covered = (notes[l.category] ?? []).find((n) => n.kind === "included");
    if (covered && !choice.extra_confirmed && priced(l.state)) duplicates[l.choiceId] = `Potential duplicate cost. ${covered.text.replace(/\.$/, "")}.`;
    const v = w.vendors.find((x) => x.id === choice.ref_id);
    if (v?.works_with_venue === "not_allowed") missing.push({ text: `${v.name} isn't allowed at ${venue.name}`, href: `/vendors/${v.id}`, kind: "warning" });
    else if (v?.works_with_venue === "external_fee") missing.push({ text: `${v.name}: ${venue.name} may charge an outside-vendor fee (${WORKS_WITH_VENUE_LABELS.external_fee.toLowerCase()})`, href: `/vendors/${v.id}`, kind: "warning" });
    if (l.category === "food" && (notes.food ?? []).some((n) => n.kind === "required")) missing.push({ text: `${venue.name} doesn't allow outside caterers. Confirm ${l.label} is approved.`, href: back("food"), kind: "warning" });
  }
  for (const [id, text] of Object.entries(duplicates)) {
    const l = lines.find((x) => x.choiceId === id)!;
    missing.push({ text: `${l.label}: ${text}`, href: back(l.category), kind: "warning" });
  }

  const known = confirmed + estimated;
  return {
    setup,
    venue,
    lines,
    alternatives,
    byCategory,
    groups,
    subtotal,
    contingency,
    projected,
    perGuest: headcount ? projected / headcount : 0,
    remaining: setup.target - projected,
    unknownCount,
    confidence: { pct: known > 0 ? Math.round((confirmed / known) * 100) : 0, confirmed, estimated, estimateCount, quoteCount, contractedCount },
    missing,
    duplicates,
    notes,
  };
}

export const CONFIDENCE_SHORT: Record<PriceSource, string> = {
  rough_estimate: "Rough estimate",
  website: "Website pricing",
  starting_price: "Starting price",
  vendor_estimate: "Vendor estimate",
  quote: "Quote received",
  contracted: "Contracted",
  actual: "Actual",
};

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
