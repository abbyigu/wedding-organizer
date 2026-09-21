export type BudgetLine = [label: string, rate: number, unit: "flat" | "adult" | "kid" | "adult+kid", noServiceCharge?: 0];

export type Photo = { path: string; caption: string; addedAt: string };

export type Status = "researching" | "contacted" | "tour_booked" | "quote_received" | "finalist" | "out";

export type Venue = {
  id: string;
  key: string | null;
  name: string;
  location: string;
  status: Status;
  website: string;
  capacity: string;
  contact: string;
  notes: string;
  pros: string;
  cons: string;
  questions: string;
  period: string;
  turnkey: string;
  diy: string;
  team: string;
  themes: string;
  colors: string;
  quote_received: boolean;
  is_favourite: boolean;
  lat?: number | null; // absent until migration 033 has been run
  lng?: number | null;
  quote_checklist: Record<string, boolean>;
  budget_note: string;
  budget_lines: BudgetLine[];
  quoted_total: number | null;
  contracted_total: number | null;
  deposit_amount: number;
  deposit_due: string | null;
  deposit_paid: boolean;
  balance_due: string | null;
  balance_paid: boolean;
  is_final: boolean;
  final_reason: string;
  photos: Photo[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// The pipeline every venue moves through, left to right.
export const STATUS_ORDER: Status[] = ["researching", "contacted", "tour_booked", "quote_received", "finalist", "out"];

export const STATUSES: Record<Status, string> = {
  researching: "Researching",
  contacted: "Contacted",
  tour_booked: "Tour booked",
  quote_received: "Quote received",
  finalist: "Finalist",
  out: "Out",
};

// Items that make up a "complete" quote — checked off as answers come in.
export const CHECKLIST_ITEMS: [key: string, label: string][] = [
  ["capacity", "Capacity confirmed"],
  ["family_style", "Family-style meal available"],
  ["wine", "Wine / corkage confirmed"],
  ["kids_pricing", "Children's meal pricing"],
  ["accommodation", "Accommodation block"],
  ["suite", "Couple's suite"],
  ["rain_plan", "Rain backup"],
  ["all_in_total", "Total including service and tax"],
];

export function checklistPercent(v: Pick<Venue, "quote_checklist">): number {
  const checked = CHECKLIST_ITEMS.filter(([key]) => v.quote_checklist?.[key]).length;
  return Math.round((checked / CHECKLIST_ITEMS.length) * 100);
}

export const GENERIC_LINES: BudgetLine[] = [
  ["Ceremony fee", 1000, "flat"],
  ["Cocktail-hour bites", 20, "adult+kid"],
  ["Dinner", 90, "adult"],
  ["Children's meals", 40, "kid"],
  ["Bar / wine", 35, "adult"],
  ["Late-night food", 15, "adult+kid"],
  ["Rentals beyond venue", 0, "flat", 0],
  ["Guest shuttle", 0, "flat", 0],
  ["Wedding-night suite", 0, "flat", 0],
];

const DEFAULT_LINES: Record<string, BudgetLine[]> = {
  cap: [
    ["Ceremony fee", 800, "flat"],
    ["Cocktail-hour bites", 20, "adult+kid"],
    ["Family-style dinner", 75, "adult"],
    ["Children's meals", 35, "kid"],
    ["Hosted wine + signature cocktails", 35, "adult"],
    ["Late-night food", 12, "adult+kid"],
    ["Rentals / décor uplift", 500, "flat", 0],
    ["Ferry + shuttle coordination", 600, "flat", 0],
    ["Wedding-night suite", 400, "flat", 0],
  ],
  montebello: [
    ["Ceremony (gazebo, chairs, rain backup)", 550, "flat"],
    ["Canapés, 4 per guest", 15, "adult+kid"],
    ["Elegance plated dinner (Dream: $195)", 105, "adult"],
    ["Children's meals (12 and under)", 35, "kid"],
    ["Hosted wine + signature cocktails", 40, "adult"],
    ["Poutine bar (before 11 pm)", 14, "adult+kid"],
    ["Outside cake/cupcake fee", 285, "flat", 0],
    ["Guest shuttle (all on site)", 0, "flat", 0],
    ["Couple's night (included)", 0, "flat", 0],
  ],
  germain: [
    ["Ceremony fee", 1500, "flat"],
    ["Cocktail-hour bites", 25, "adult+kid"],
    ["Family-style dinner", 95, "adult"],
    ["Children's meals", 45, "kid"],
    ["Hosted wine + signature cocktails", 40, "adult"],
    ["Late-night food", 15, "adult+kid"],
    ["Rentals beyond venue", 0, "flat", 0],
    ["Guest shuttle", 500, "flat", 0],
    ["Wedding-night suite", 600, "flat", 0],
  ],
  leste: [
    ["Ceremony fee", 1000, "flat"],
    ["Cocktail-hour bites", 22, "adult+kid"],
    ["3-course dinner", 90, "adult"],
    ["Children's meals", 45, "kid"],
    ["Hosted wine + cocktails (venue only)", 40, "adult"],
    ["Late-night food", 15, "adult+kid"],
    ["Unoccupied-room liability", 3000, "flat"],
    ["Guest shuttle (all on site)", 0, "flat", 0],
    ["Wedding-night cottage", 500, "flat", 0],
  ],
  manoir: [
    ["Ceremony fee (golf-cliff site)", 2500, "flat"],
    ["Cocktail-hour bites", 35, "adult+kid"],
    ["Plated or family-style dinner", 99, "adult"],
    ["Children's meals", 50, "kid"],
    ["Hosted wine + signature cocktails", 50, "adult"],
    ["Late-night food", 20, "adult+kid"],
    ["Rentals beyond venue", 0, "flat", 0],
    ["Guest shuttle", 300, "flat", 0],
    ["Wedding-night suite", 900, "flat", 0],
  ],
  bacchus: [
    ["Site / ceremony fee", 3000, "flat"],
    ["Cocktail-hour bites (caterer)", 25, "adult+kid"],
    ["Family-style dinner (caterer)", 85, "adult"],
    ["Children's meals", 40, "kid"],
    ["Wine (their own) + bar service", 35, "adult"],
    ["Late-night food", 15, "adult+kid"],
    ["Tent, rentals, power, washrooms", 10000, "flat"],
    ["Guest shuttle (no lodging on site)", 2000, "flat", 0],
    ["Suite off-site", 400, "flat", 0],
  ],
};

// PostgREST turns a bulk insert of objects with different key sets into one
// SQL statement with a shared column list — any row missing a key gets an
// explicit NULL, not the column default. Always normalize before inserting.
export function blankVenue(over: Partial<Venue> = {}): Partial<Venue> {
  return {
    key: null,
    name: "New place",
    location: "",
    status: "researching",
    website: "",
    capacity: "",
    contact: "",
    notes: "",
    pros: "",
    cons: "",
    questions: "",
    period: "",
    turnkey: "",
    diy: "",
    team: "",
    themes: "",
    colors: "",
    quote_received: false,
    is_favourite: false,
    quote_checklist: {},
    budget_note: over.key ? BUDGET_NOTES[over.key] ?? "" : "",
    quoted_total: null,
    contracted_total: null,
    deposit_amount: 0,
    deposit_due: null,
    deposit_paid: false,
    balance_due: null,
    balance_paid: false,
    is_final: false,
    final_reason: "",
    photos: [],
    sort_order: 0,
    ...over,
    budget_lines: over.budget_lines ?? defaultLines(over.key ?? null),
  };
}

export function defaultLines(key: string | null): BudgetLine[] {
  return structuredClone(key && DEFAULT_LINES[key] ? DEFAULT_LINES[key] : GENERIC_LINES);
}

export const BUDGET_NOTES: Record<string, string> = {
  cap: "No published wedding pricing. Per-person numbers are set a notch below Le Germain on purpose — this is the venue to beat on value.",
  montebello:
    "From the published 2024 menu: Elegance $105 plated dinner, canapés priced by the dozen (~$15/guest for 4 pieces), kids $35, ceremony $550, poutine bar $14. Service is 18% here — set the slider.",
  germain: "Published sharing dinner ~$95. Ceremony, cocktail, bar and late-night are placeholders until the quote.",
  leste: "Published ~$90 dinner and ~$45 kids. Includes a $3K placeholder for unoccupied-room liability if full privatization is required.",
  manoir: "Uses the top of the published $68–$99 catering range; Fairmont service and admin charges are usually the highest on the list — confirm the real percentage.",
  bacchus: "Assumes a site fee, an outside caterer, and ~$10K of tent, tables, chairs, linens, lighting, power, washrooms and bar staff. If the vineyard provides more, this drops fast.",
};

export const STARTERS: Partial<Venue>[] = [
  { key: "cap", name: "Hôtel Cap-aux-Pierres", location: "Isle-aux-Coudres, Charlevoix", status: "finalist", website: "https://www.originehotels.com/en/hotels-and-inns/charlevoix/hotel-cap-aux-pierres", capacity: "400, comfortable", turnkey: "Full turnkey", period: "Late Aug – mid Sept 2029", pros: "Likely the lowest-pressure hotel option if wedding packages are reasonable.", sort_order: 1 },
  { key: "montebello", name: "Fairmont Le Château Montebello", location: "Montebello, Outaouais", status: "contacted", website: "https://www.fairmont.com/en/hotels/montebello/fairmont-le-chateau-montebello/weddings.html", capacity: "400+, comfortable", turnkey: "Full turnkey plus", period: "Late Aug – mid Sept 2029", cons: "~4h30 drive — the guest-travel question.", sort_order: 2 },
  { key: "germain", name: "Hôtel & Spa Le Germain Charlevoix", location: "Baie-Saint-Paul, Charlevoix", status: "finalist", website: "https://www.germainhotels.com/en/le-germain-hotel-and-spa/charlevoix/spaces-and-events", capacity: "100, ask about 95–102 with dancing", turnkey: "Full turnkey", period: "Late Aug – mid Sept 2029", pros: "Strongest overall fit; sharing-style dinner matches the vision.", cons: "Capacity at 102 with dancing needs confirming.", sort_order: 3 },
  { key: "leste", name: "Auberge du Cap au Leste", location: "Sainte-Rose-du-Nord, Saguenay Fjord", status: "contacted", website: "https://capauleste.com/en/wedding/", capacity: "100, right at the edge", turnkey: "Full turnkey (closed)", period: "Late Aug – mid Sept 2029", cons: "Most remote; room-buyout terms unclear.", sort_order: 4 },
  { key: "manoir", name: "Fairmont Le Manoir Richelieu", location: "La Malbaie, Charlevoix", status: "quote_received", website: "https://www.fairmont.com/en/hotels/charlevoix/fairmont-le-manoir-richelieu/weddings.html", capacity: "820, comfortable", turnkey: "Full turnkey plus", period: "Late Aug – mid Sept 2029", pros: "Philosophy match — lots for guests to do, none mandatory.", cons: "Risk of drifting toward $50K+.", sort_order: 5 },
  { key: "bacchus", name: "Vignoble Isle de Bacchus", location: "Saint-Pierre, Île d'Orléans", status: "finalist", website: "https://www.isledebacchusenligne.com/", capacity: "~100, unconfirmed", turnkey: "DIY-heavy", period: "Late Aug – mid Sept 2029", pros: 'Highest emotional upside — deeply "you".', cons: "Highest logistical risk; needs ~$10K of rentals.", sort_order: 6 },
];

export const SHARED_LINES: [label: string, amount: number, note: string][] = [
  ["Day-of coordinator", 2000, "must-have"],
  ["Photographer (documentary, full day)", 4000, "splurge"],
  ["Childcare (2–3 sitters, evening)", 900, "splurge"],
  ["Officiant + marriage paperwork", 700, ""],
  ["Attire (dress, suit, shoes, alterations)", 3500, ""],
  ["Hair & makeup", 600, ""],
  ["Simple florals", 1500, ""],
  ["Décor, café lights, signage (DIY)", 1000, "DIY, done 30 days out"],
  ["Wedding website (paperless invites)", 100, ""],
  ["Couple's cake + Mlle Cupcake", 600, ""],
  ["Music via app + sound/AV", 400, "live cocktail musician: +$800 nice-to-have"],
  ["Gifts, favours, thank-yous", 500, ""],
  ["SOCAN + Re:Sound tariff", 75, "music licensing fee for the reception — confirm the current tariff"],
];

export type Assumptions = { adults: number; kids: number; svcPct: number; contPct: number; tax: boolean };
export const TAX_RATE = 1.14975;
export const DEFAULT_ASSUMPTIONS: Assumptions = { adults: 80, kids: 15, svcPct: 15, contPct: 8, tax: true };

export const BUDGET_TARGET = 40000;
export const BUDGET_CEILING = 45000;
// Adults you plan to invite — editable on the Guests pages (budget_settings.guest_target).
export const DEFAULT_GUEST_TARGET = 80;

// Which venue count drives the estimate — real guest-list data, not a guess.
export type GuestScenario = "all" | "confirmed" | "custom";

export type BudgetSettings = {
  svc_pct: number;
  cont_pct: number;
  apply_tax: boolean;
  guest_scenario: GuestScenario;
  custom_adults: number;
  custom_kids: number;
  shared_line_amounts: number[];
  wedding_date: string;
  guest_target?: number; // absent until migration 035 has been run
};

export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  svc_pct: 15,
  cont_pct: 8,
  apply_tax: true,
  guest_scenario: "all",
  custom_adults: 80,
  custom_kids: 15,
  shared_line_amounts: SHARED_LINES.map((l) => l[1]),
  wedding_date: "2029-09-08",
  guest_target: DEFAULT_GUEST_TARGET,
};

// Turns the chosen scenario + live guest-list totals into the adult/kid counts
// every cost calculation uses — the single place "guest count" is decided.
export function resolveAssumptions(
  settings: BudgetSettings,
  gs: { adults: number; kids: number; confirmedAdults: number; confirmedKids: number }
): Assumptions {
  const { adults, kids } =
    settings.guest_scenario === "confirmed"
      ? { adults: gs.confirmedAdults, kids: gs.confirmedKids }
      : settings.guest_scenario === "custom"
      ? { adults: settings.custom_adults, kids: settings.custom_kids }
      : { adults: gs.adults, kids: gs.kids };
  return { adults, kids, svcPct: settings.svc_pct, contPct: settings.cont_pct, tax: settings.apply_tax };
}

export function calcVenue(
  v: Pick<Venue, "budget_lines" | "quoted_total" | "contracted_total">,
  as: Assumptions,
  sharedVals: number[]
) {
  const svc = 1 + as.svcPct / 100;
  const cont = as.contPct / 100;
  const tax = as.tax ? TAX_RATE : 1;
  let vt = 0;
  const rows = (v.budget_lines.length ? v.budget_lines : GENERIC_LINES).map(([label, rate, unit, noSvc]) => {
    const qty = unit === "adult" ? as.adults : unit === "kid" ? as.kids : unit === "adult+kid" ? as.adults + as.kids : 1;
    const total = rate * qty * (noSvc === 0 ? 1 : svc) * tax;
    vt += total;
    return { label, unit, noSvc: noSvc === 0, total };
  });
  let st = 0;
  SHARED_LINES.forEach((l, i) => {
    st += (sharedVals[i] ?? l[1]) * tax;
  });
  // A contract beats a quote beats the line-item model — always use the most real number we have.
  const venueSource: "contracted" | "quoted" | "estimated" =
    v.contracted_total != null ? "contracted" : v.quoted_total != null ? "quoted" : "estimated";
  const venueEffective = v.contracted_total ?? v.quoted_total ?? vt;
  const contAmt = (venueEffective + st) * cont;
  const grand = venueEffective + st + contAmt;
  const guestCount = as.adults + as.kids;
  return { rows, vt, st, cont: contAmt, grand, venueEffective, venueSource, perGuest: guestCount ? grand / guestCount : 0 };
}

export function fmt(n: number) {
  return "$" + Math.round(n).toLocaleString("en-CA");
}
