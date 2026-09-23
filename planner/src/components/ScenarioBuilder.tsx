"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Copy, Heart, Pencil, Plus } from "lucide-react";
import ScenarioDialog from "@/components/ScenarioDialog";
import ScenarioSummary from "@/components/ScenarioSummary";
import PlanDialog from "@/components/PlanDialog";
import ScenarioSnapshots from "@/components/ScenarioSnapshots";
import { CustomForm, LineRow, NumField, type CustomDraft } from "@/components/ScenarioRows";
import { BTN, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { createClient } from "@/lib/supabase/client";
import { expenseAppliesTo } from "@/lib/budget-extras";
import type { IdeaImage } from "@/lib/registry";
import {
  AVAILABILITY_LABELS,
  COMMUNICATION_LABELS,
  fmtMoney,
  photoSrc,
  PRICE_UNIT_LABELS,
  vendorPrice,
  WORKS_WITH_VENUE_LABELS,
  type Vendor,
} from "@/lib/vendors";
import {
  CATEGORIES,
  computeScenario,
  money,
  setupOf,
  type CategoryDef,
  type ChoiceRole,
  type ChoiceRow,
  type RefType,
  type SnapshotRow,
  type ScenarioLine,
  type ScenarioRow,
  type World,
} from "@/lib/wedding-scenarios";

const SELECT = `${FIELD} !mt-0 h-11 min-w-0 max-w-full`;
const MARKER = ["tbd", "not_needed"] as const;

function RecordSelect({ id, label, placeholder, groups, onPick }: { id: string; label: string; placeholder: string; groups: { name?: string; options: { id: string; label: string }[] }[]; onPick: (id: string) => void }) {
  if (groups.every((g) => g.options.length === 0)) return null;
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} value="" onChange={(e) => e.target.value && onPick(e.target.value)} className={SELECT}>
        <option value="">{placeholder}</option>
        {groups.map((g, i) =>
          g.options.length === 0 ? null : g.name ? (
            <optgroup key={i} label={g.name}>
              {g.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </optgroup>
          ) : (
            g.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)
          ),
        )}
      </select>
    </div>
  );
}

export default function ScenarioBuilder({
  world,
  initialScenario,
  initialChoices,
  ideas,
  photoUrls,
  snapshots,
  snapshotsMissing,
}: {
  world: World;
  initialScenario: ScenarioRow;
  initialChoices: ChoiceRow[];
  ideas: IdeaImage[];
  photoUrls: Record<string, string>;
  snapshots: SnapshotRow[];
  snapshotsMissing: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [scenario, setScenario] = useState(initialScenario);
  const [choices, setChoices] = useState(initialChoices);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"edit" | "duplicate" | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const ideaMap = useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const r = useMemo(() => computeScenario(scenario, choices, world), [scenario, choices, world]);
  const venue = r.venue;
  const venueName = venue?.name ?? "the venue";
  const vendorOf = (id: string | null) => world.vendors.find((v) => v.id === id);

  // ── Writes ────────────────────────────────────────────────────────────────
  async function addChoices(rows: Partial<ChoiceRow>[], clearMarkersIn?: string) {
    setError("");
    const base = choices.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;
    // Every row carries every column: a bulk insert fills any missing key with NULL, not the default.
    const payload = rows.map((row, i) => ({
      scenario_id: scenario.id,
      category: "other",
      role: "selected" as ChoiceRole,
      ref_type: null,
      ref_id: null,
      label: "",
      amount: null,
      unit: "flat",
      quantity: null,
      cost_state: null,
      plus_tax: false,
      extra_confirmed: false,
      sort_order: base + i,
      ...row,
    }));
    const { data, error: err } = await supabase.from("scenario_choices").insert(payload).select("*");
    if (err) return setError(err.message);
    const gone = clearMarkersIn ? choices.filter((c) => c.category === clearMarkersIn && (MARKER as readonly string[]).includes(c.role)).map((c) => c.id) : [];
    if (gone.length) await supabase.from("scenario_choices").delete().in("id", gone);
    setChoices((cur) => [...cur.filter((c) => !gone.includes(c.id)), ...((data ?? []) as ChoiceRow[])]);
  }

  async function patchChoice(id: string, patch: Partial<ChoiceRow>) {
    const before = choices;
    setChoices((cur) => cur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error: err } = await supabase.from("scenario_choices").update(patch).eq("id", id);
    if (err) {
      setChoices(before);
      setError(err.message);
    }
  }

  async function removeChoice(id: string) {
    const before = choices;
    setChoices((cur) => cur.filter((c) => c.id !== id));
    const { error: err } = await supabase.from("scenario_choices").delete().eq("id", id);
    if (err) {
      setChoices(before);
      setError(err.message);
    }
  }

  async function patchScenario(patch: Partial<ScenarioRow>) {
    const before = scenario;
    setScenario({ ...scenario, ...patch });
    const { error: err } = await supabase.from("wedding_scenarios").update(patch).eq("id", scenario.id);
    if (err) {
      setScenario(before);
      setError(err.message);
    }
  }

  async function setMarker(category: string, role: "tbd" | "not_needed" | null) {
    const existing = choices.filter((c) => c.category === category && (MARKER as readonly string[]).includes(c.role));
    const already = existing[0]?.role === role;
    if (existing.length) {
      await supabase.from("scenario_choices").delete().in("id", existing.map((c) => c.id));
      setChoices((cur) => cur.filter((c) => !existing.some((e) => e.id === c.id)));
    }
    if (role && !already) await addChoices([{ category, role }]);
  }

  // Put an alternative in the scenario and move whoever it replaces down to alternatives.
  async function swapIn(alt: ChoiceRow) {
    const altVendor = vendorOf(alt.ref_id);
    const replaced = choices.filter((c) => c.category === alt.category && c.role === "selected" && c.ref_type === "vendor" && vendorOf(c.ref_id)?.category === altVendor?.category);
    const ids = new Set(replaced.map((c) => c.id));
    setChoices((cur) => cur.map((c) => (c.id === alt.id ? { ...c, role: "selected" } : ids.has(c.id) ? { ...c, role: "alternative" } : c)));
    const results = await Promise.all([
      supabase.from("scenario_choices").update({ role: "selected" }).eq("id", alt.id),
      ...replaced.map((c) => supabase.from("scenario_choices").update({ role: "alternative" }).eq("id", c.id)),
    ]);
    const failed = results.find((x) => x.error);
    if (failed?.error) {
      setError(failed.error.message);
      router.refresh();
    }
  }

  // One scenario at a time is the plan. The others are left alone.
  async function togglePlan() {
    setPlanBusy(true);
    setPlanError("");
    const turningOn = !scenario.is_active;
    if (turningOn) {
      const { error: clearErr } = await supabase.from("wedding_scenarios").update({ is_active: false }).eq("is_active", true);
      if (clearErr) {
        setPlanBusy(false);
        return setPlanError(`${clearErr.message} Has migration 049 been run?`);
      }
    }
    const { error: err } = await supabase.from("wedding_scenarios").update({ is_active: turningOn }).eq("id", scenario.id);
    setPlanBusy(false);
    if (err) return setPlanError(err.message);
    setScenario({ ...scenario, is_active: turningOn });
    setPlanDialog(false);
    router.refresh();
  }

  function jump(key: string) {
    setOpen((o) => ({ ...o, [key]: true }));
    requestAnimationFrame(() => {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(`cat-${key}`)?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    });
  }

  // ── Building blocks ───────────────────────────────────────────────────────
  const vendorFacts = (v: Vendor) =>
    [
      `${PRICE_UNIT_LABELS[v.price_unit]} pricing`,
      v.availability === "unknown" ? "availability not asked" : AVAILABILITY_LABELS[v.availability].toLowerCase(),
      v.quoted_total != null ? "quote received" : COMMUNICATION_LABELS[v.communication_status].toLowerCase(),
      venue && v.works_with_venue !== "need_to_ask" ? WORKS_WITH_VENUE_LABELS[v.works_with_venue].replace(/^[✓✕?]\s*/, "").toLowerCase() : "",
    ]
      .filter(Boolean)
      .join(" · ");

  const optionLabel = (v: Vendor) => {
    const p = vendorPrice(v, r.setup);
    return `${v.name} — ${p.amount != null ? `${fmtMoney(p.amount)} ${p.label.toLowerCase()}` : v.price_unit === "hour" ? "priced per hour" : "no price yet"}`;
  };

  function vendorGroups(def: CategoryDef) {
    const taken = new Set(choices.filter((c) => c.category === def.key && c.ref_type === "vendor").map((c) => c.ref_id));
    const usable = world.vendors.filter((v) => v.category !== "Venue" && v.decision_status !== "rejected" && !taken.has(v.id));
    const own = usable.filter((v) => def.vendorCats.includes(v.category)).map((v) => ({ id: v.id, label: optionLabel(v) }));
    const rest = usable.filter((v) => !def.vendorCats.includes(v.category)).map((v) => ({ id: v.id, label: `${optionLabel(v)} (${v.category})` }));
    return own.length && rest.length ? [{ name: "Our shortlist", options: own }, { name: "Other vendors", options: rest }] : [{ options: own.concat(rest) }];
  }

  function recordGroups(def: CategoryDef, type: RefType) {
    const taken = new Set(choices.filter((c) => c.category === def.key && c.ref_type === type).map((c) => c.ref_id));
    const all =
      type === "diy" ? world.diy.map((x) => ({ id: x.id, label: x.title }))
      : type === "event" ? world.events.map((x) => ({ id: x.id, label: x.title }))
      : type === "party" ? world.party.map((x) => ({ id: x.id, label: x.name }))
      : type === "expense" ? world.expenses.filter((e) => !venue || expenseAppliesTo(e, venue.id)).map((x) => ({ id: x.id, label: x.label }))
      : [];
    return all.filter((o) => !taken.has(o.id));
  }

  const REF_NOUN: Record<string, string> = { vendor: "vendor", diy: "project", event: "event", party: "member", expense: "expense" };

  function renderChoiceRow(def: CategoryDef, line: ScenarioLine, choice: ChoiceRow) {
    const v = choice.ref_type === "vendor" ? vendorOf(choice.ref_id) : undefined;
    const isCustom = choice.ref_type == null;
    if (editingId === choice.id) {
      return (
        <li key={line.id} className="py-3">
          <CustomForm
            idPrefix={`edit-${choice.id}`}
            initial={choice}
            submitLabel="Save"
            onCancel={() => setEditingId(null)}
            onSubmit={(d) => {
              patchChoice(choice.id, d);
              setEditingId(null);
            }}
          />
        </li>
      );
    }
    const hourly = v?.price_unit === "hour" && v.contracted_total == null && v.quoted_total == null;
    return (
      <LineRow
        key={line.id}
        line={line}
        photo={v ? photoSrc(v.photos[0], ideaMap) : undefined}
        facts={v ? vendorFacts(v) : undefined}
        warning={r.duplicates[choice.id]}
        controls={hourly ? <NumField id={`hours-${choice.id}`} label="Hours" value={choice.quantity} onCommit={(n) => patchChoice(choice.id, { quantity: n })} /> : undefined}
        actions={
          <>
            {r.duplicates[choice.id] && <button onClick={() => patchChoice(choice.id, { extra_confirmed: true })} className={BTN}>It&apos;s an extra. Keep it</button>}
            {isCustom && <button onClick={() => setEditingId(choice.id)} className={BTN}><Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />Edit</button>}
            {v && <button onClick={() => patchChoice(choice.id, { role: "alternative" })} className={BTN}>Make alternative</button>}
            <button onClick={() => removeChoice(choice.id)} aria-label={`Remove ${line.label} from this scenario`} className={BTN}>Remove</button>
          </>
        }
      />
    );
  }

  function renderCategory(def: CategoryDef) {
    const cat = r.byCategory[def.key];
    const mine = choices.filter((c) => c.category === def.key);
    const marker = mine.find((c) => (MARKER as readonly string[]).includes(c.role));
    const selectedLines = cat?.lines ?? [];
    const fromVenue = selectedLines.filter((l) => l.source === "Venue");
    const chosen = selectedLines.filter((l) => l.choiceId);
    const alts = mine.filter((c) => c.role === "alternative");
    const notes = r.notes[def.key] ?? [];
    const defaultOpen = def.key === "venue" || selectedLines.length > 0 || Boolean(marker) || alts.length > 0;
    const isOpen = open[def.key] ?? defaultOpen;

    const status = marker
      ? { text: marker.role === "tbd" ? "Still to decide" : "Not needed", tone: marker.role === "tbd" ? "text-wine" : "text-ink-2" }
      : !cat || cat.lines.length === 0
        ? { text: def.key === "venue" ? "Not chosen yet" : "Not added yet", tone: "text-ink-2" }
        : { text: `${money(cat.total)}${cat.unknown ? " + unknown" : ""}`, tone: cat.unknown ? "text-wine" : "text-ink" };

    const selectedVendorLines = chosen.filter((l) => l.refType === "vendor");
    const canMark = def.key !== "venue" && chosen.length === 0;

    return (
      <section key={def.key} id={`cat-${def.key}`} className="scroll-mt-4 rounded-3xl border border-line bg-paper">
        <h3>
          <button type="button" aria-expanded={isOpen} aria-controls={`panel-${def.key}`} onClick={() => setOpen((o) => ({ ...o, [def.key]: !isOpen }))} className={`flex min-h-16 w-full items-center gap-3 rounded-3xl px-5 py-3 text-left sm:px-6 ${FOCUS_RING}`}>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-2xl font-light leading-tight">{def.label}</span>
              {!isOpen && <span className="block truncate text-sm text-ink-2">{chosen.length ? chosen.map((l) => l.label).join(" · ") : def.blurb}</span>}
            </span>
            <span className={`shrink-0 text-right text-[15px] font-medium tabular-nums ${status.tone}`}>{status.text}</span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-ink-2 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} aria-hidden />
          </button>
        </h3>

        {isOpen && (
          <div id={`panel-${def.key}`} className="border-t border-line px-5 pb-5 pt-3 sm:px-6">
            <p className="text-sm text-ink-2">{def.blurb}</p>

            {notes.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {notes.map((n, i) => (
                  <li key={i} className={`rounded-xl px-3 py-2 text-sm ${n.kind === "required" ? "bg-[color-mix(in_srgb,var(--wine)_9%,var(--paper))]" : n.kind === "included" ? "bg-[color-mix(in_srgb,var(--sage)_24%,var(--paper))]" : "bg-bg"}`}>
                    <span className={`font-semibold ${n.kind === "required" ? "text-wine" : n.kind === "included" ? "text-sage-deep" : "text-ink-2"}`}>
                      {n.kind === "required" ? `Required by ${venueName}` : n.kind === "included" ? `Included with ${venueName}` : `From ${venueName}`}
                    </span>
                    {" · "}{n.text}
                  </li>
                ))}
              </ul>
            )}

            {def.key === "venue" && (
              <div className="mt-3">
                <label htmlFor="sc-venue-pick" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Select venue</label>
                <select id="sc-venue-pick" value={scenario.venue_id ?? ""} onChange={(e) => patchScenario({ venue_id: e.target.value || null })} className={`${FIELD} sm:max-w-md`}>
                  <option value="">Not chosen yet</option>
                  {world.venues.filter((v) => v.status !== "out" || v.id === scenario.venue_id).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}{v.location ? `, ${v.location}` : ""}</option>
                  ))}
                </select>
                {venue && (
                  <p className="mt-2 text-sm text-ink-2">
                    {[venue.capacity && `Capacity ${venue.capacity}`, venue.contracted_total != null ? "Contracted" : venue.quoted_total != null ? "Quote received" : "Estimated from its line items", venue.turnkey].filter(Boolean).join(" · ")} ·{" "}
                    <Link href={`/venues/${venue.id}`} className={`rounded font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Open venue record</Link>
                  </p>
                )}
              </div>
            )}

            {(fromVenue.length > 0 || chosen.length > 0) && (
              <ul className="mt-2 divide-y divide-line">
                {fromVenue.map((l) => (
                  <LineRow key={l.id} line={l} photo={def.key === "venue" && venue?.photos[0]?.path ? photoUrls[venue.photos[0].path] ?? "" : undefined} />
                ))}
                {chosen.map((l) => renderChoiceRow(def, l, mine.find((c) => c.id === l.choiceId)!))}
              </ul>
            )}

            {alts.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-2">Alternatives</h4>
                <ul className="divide-y divide-line">
                  {alts.map((c) => {
                    const line = r.alternatives[c.id];
                    const v = vendorOf(c.ref_id);
                    const current = selectedVendorLines.find((l) => vendorOf(l.refId)?.category === v?.category);
                    const worked = (s: ScenarioLine) => s.state === "amount" || s.state === "zero";
                    return (
                      <LineRow
                        key={c.id}
                        line={line}
                        muted
                        photo={v ? photoSrc(v.photos[0], ideaMap) : undefined}
                        facts={v ? vendorFacts(v) : undefined}
                        delta={current && worked(current) && worked(line) ? line.total - current.total : null}
                        actions={
                          <>
                            <button onClick={() => swapIn(c)} className={`${BTN} border-sage-deep text-sage-deep`}>{current ? "Swap into scenario" : "Select this one"}</button>
                            <button onClick={() => removeChoice(c.id)} aria-label={`Remove ${line.label} from alternatives`} className={BTN}>Remove</button>
                          </>
                        }
                      />
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {def.picks.includes("vendor") && (
                <>
                  <RecordSelect id={`add-vendor-${def.key}`} label={`Choose ${def.singular}`} placeholder={`+ Choose ${def.singular}…`} groups={vendorGroups(def)} onPick={(id) => addChoices([{ category: def.key, ref_type: "vendor", ref_id: id }], def.key)} />
                  {chosen.some((l) => l.refType === "vendor") && (
                    <RecordSelect id={`alt-vendor-${def.key}`} label={`Consider another ${def.singular} as an alternative`} placeholder="+ Consider an alternative…" groups={vendorGroups(def)} onPick={(id) => addChoices([{ category: def.key, role: "alternative", ref_type: "vendor", ref_id: id }])} />
                  )}
                </>
              )}
              {(["diy", "event", "party", "expense"] as const).filter((t) => def.picks.includes(t)).map((t) => {
                const options = recordGroups(def, t);
                return (
                  <div key={t} className="flex flex-wrap items-center gap-2">
                    <RecordSelect id={`add-${t}-${def.key}`} label={`Add a ${REF_NOUN[t]}`} placeholder={`+ Add a ${REF_NOUN[t]}…`} groups={[{ options }]} onPick={(id) => addChoices([{ category: def.key, ref_type: t, ref_id: id }], def.key)} />
                    {options.length > 1 && t !== "expense" && (
                      <button onClick={() => addChoices(options.map((o) => ({ category: def.key, ref_type: t, ref_id: o.id })), def.key)} className={BTN}>Add all {options.length}</button>
                    )}
                  </div>
                );
              })}
              {def.custom && adding !== def.key && (
                <button onClick={() => setAdding(def.key)} className={BTN}>
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />A cost of our own
                </button>
              )}
            </div>

            {adding === def.key && (
              <div className="mt-3">
                <CustomForm
                  idPrefix={`new-${def.key}`}
                  submitLabel="Add cost"
                  onCancel={() => setAdding(null)}
                  onSubmit={(d: CustomDraft) => {
                    addChoices([{ category: def.key, ...d }], def.key);
                    setAdding(null);
                  }}
                />
              </div>
            )}

            {canMark && (
              <div role="group" aria-label={`Is ${def.label.toLowerCase()} needed?`} className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                <button aria-pressed={marker?.role === "not_needed"} onClick={() => setMarker(def.key, "not_needed")} className={`${BTN} ${marker?.role === "not_needed" ? "!border-ink" : ""}`}>Not needed</button>
                <button aria-pressed={marker?.role === "tbd"} onClick={() => setMarker(def.key, "tbd")} className={`${BTN} ${marker?.role === "tbd" ? "!border-wine text-wine" : ""}`}>Still to decide</button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  const contOpen = open.contingency ?? false;
  const dateText = scenario.wedding_date ? new Date(scenario.wedding_date + "T12:00").toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : scenario.season;

  return (
    <div>
      <Link href="/budget/scenarios" className={`inline-flex min-h-11 items-center gap-1.5 rounded text-sm text-ink-2 hover:text-ink ${FOCUS_RING}`}>
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden /> All scenarios
      </Link>

      <header className="mt-1 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">{scenario.is_active ? "Our wedding plan" : "Wedding scenario"}</p>
          <h2 className="mt-2 font-serif text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">{scenario.name}</h2>
          {scenario.description && <p className="mt-2 max-w-xl text-ink-2">{scenario.description}</p>}
          <p className="mt-2 text-sm text-ink-2">
            {[venue?.name, dateText, `Priced for ${r.setup.adults} adults and ${r.setup.kids} children`, `${r.setup.invited} invited · ${r.setup.expected} expected`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDialog("edit")} className={BTN}><Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />Details</button>
          <button onClick={() => setDialog("duplicate")} className={BTN}><Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />Duplicate</button>
          <button onClick={() => setPlanDialog(true)} aria-pressed={Boolean(scenario.is_active)} className={`${BTN} ${scenario.is_active ? "!border-wine !bg-[color-mix(in_srgb,var(--wine)_10%,var(--paper))] text-wine" : "border-wine text-wine"}`}>
            <Heart className={`h-3.5 w-3.5 ${scenario.is_active ? "fill-wine" : ""}`} strokeWidth={1.75} aria-hidden />{scenario.is_active ? "Our wedding" : "Make this our wedding"}
          </button>
        </div>
      </header>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[color-mix(in_srgb,var(--wine)_10%,var(--paper))] px-4 py-3 text-sm text-wine">{error}</p>}

      <div className="sticky top-0 z-20 -mx-4 mt-4 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-serif text-2xl font-light">{r.unknownCount > 0 && <span className="text-ink-2">≥ </span>}{money(r.projected)}</p>
          <p className={`text-sm ${r.remaining < 0 ? "font-medium text-wine" : "text-ink-2"}`}>{r.remaining < 0 ? `${money(-r.remaining)} over` : `${money(r.remaining)} left`}</p>
          <a href="#scenario-summary" className={`rounded text-sm font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Summary</a>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {CATEGORIES.map(renderCategory)}

          <section id="cat-contingency" className="scroll-mt-4 rounded-3xl border border-line bg-paper">
            <h3>
              <button type="button" aria-expanded={contOpen} aria-controls="panel-contingency" onClick={() => setOpen((o) => ({ ...o, contingency: !contOpen }))} className={`flex min-h-16 w-full items-center gap-3 rounded-3xl px-5 py-3 text-left sm:px-6 ${FOCUS_RING}`}>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-2xl font-light leading-tight">Contingency</span>
                  {!contOpen && <span className="block text-sm text-ink-2">A cushion for what nobody can predict</span>}
                </span>
                <span className="shrink-0 text-[15px] font-medium tabular-nums">{money(r.contingency)}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-ink-2 transition-transform ${contOpen ? "rotate-180" : ""}`} strokeWidth={1.5} aria-hidden />
              </button>
            </h3>
            {contOpen && (
              <div id="panel-contingency" className="border-t border-line px-5 pb-5 pt-3 sm:px-6">
                <p className="text-sm text-ink-2">Worked out on everything above, so it grows as the plan does. Unknown costs are not part of it.</p>
                <div className="mt-3">
                  <NumField id="sc-contingency" label="Contingency %" value={scenario.contingency_pct} placeholder={String(world.base.contPct)} onCommit={(n) => patchScenario({ contingency_pct: n })} />
                  <p className="mt-1 text-sm text-ink-2">{r.setup.inherits.contingency ? `Using the wedding-wide ${world.base.contPct}%. Type a number to set one for this scenario only.` : "Set for this scenario only."}</p>
                </div>
              </div>
            )}
          </section>

          <ScenarioSnapshots scenarioId={scenario.id} current={r} initial={snapshots} needsMigration={snapshotsMissing} />
        </div>

        <aside id="scenario-summary" aria-label="Scenario summary and gaps" className="scroll-mt-16 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pb-2">
          <ScenarioSummary name={scenario.name} r={r} onJump={jump} />
        </aside>
      </div>

      {planDialog && <PlanDialog name={scenario.name} r={r} active={Boolean(scenario.is_active)} busy={planBusy} error={planError} onConfirm={togglePlan} onClose={() => setPlanDialog(false)} />}

      {dialog && (
        <ScenarioDialog
          mode={dialog}
          scenario={scenario}
          choices={choices}
          defaults={setupOf({ ...scenario, adults: null, kids: null, invited: null, expected: null, target_budget: null, contingency_pct: null }, world)}
          venues={world.venues.filter((v) => v.status !== "out" || v.id === scenario.venue_id).map((v) => ({ id: v.id, name: v.name }))}
          nextSort={scenario.sort_order + 1}
          onClose={() => setDialog(null)}
          onSaved={(row) => {
            setDialog(null);
            if (dialog === "edit") setScenario(row);
            else router.push(`/budget/scenarios/${row.id}`);
          }}
        />
      )}
    </div>
  );
}
