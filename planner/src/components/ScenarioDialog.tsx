"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { createClient } from "@/lib/supabase/client";
import { BTN, BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import type { ChoiceRow, ScenarioRow, ScenarioSetup } from "@/lib/wedding-scenarios";

export type ScenarioDialogMode = "create" | "edit" | "duplicate";

const num = (raw: string) => (raw.trim() === "" ? null : Math.max(0, Number(raw)));
const str = (n: number | null | undefined) => (n == null ? "" : String(n));

// One form for building, editing and duplicating a scenario. Blank number fields inherit the wedding-wide
// settings (shown as the placeholder), and nothing typed here ever changes those settings.
export default function ScenarioDialog({
  mode,
  scenario,
  choices,
  defaults,
  venues,
  nextSort,
  onClose,
  onSaved,
}: {
  mode: ScenarioDialogMode;
  scenario?: ScenarioRow;
  choices?: ChoiceRow[];
  defaults: ScenarioSetup;
  venues: { id: string; name: string }[];
  nextSort: number;
  onClose: () => void;
  onSaved: (row: ScenarioRow, copied?: ChoiceRow[]) => void;
}) {
  const ref = useDialog(true, onClose);
  const [name, setName] = useState(mode === "duplicate" ? `${scenario?.name ?? "Scenario"} — copy` : scenario?.name ?? "");
  const [description, setDescription] = useState(scenario?.description ?? "");
  const [season, setSeason] = useState(scenario?.season ?? "");
  const [date, setDate] = useState(scenario?.wedding_date ?? "");
  const [venueId, setVenueId] = useState(scenario?.venue_id ?? "");
  const [invited, setInvited] = useState(str(scenario?.invited));
  const [expected, setExpected] = useState(str(scenario?.expected));
  const [adults, setAdults] = useState(str(scenario?.adults));
  const [kids, setKids] = useState(str(scenario?.kids));
  const [target, setTarget] = useState(str(scenario?.target_budget));
  const [contingency, setContingency] = useState(str(scenario?.contingency_pct));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const fields = {
      name: name.trim(),
      description: description.trim(),
      season: season.trim(),
      wedding_date: date || null,
      venue_id: venueId || null,
      invited: num(invited),
      expected: num(expected),
      adults: num(adults),
      kids: num(kids),
      target_budget: num(target),
      contingency_pct: num(contingency),
    };
    if (mode === "edit" && scenario) {
      const { data, error: err } = await supabase.from("wedding_scenarios").update(fields).eq("id", scenario.id).select("*").single();
      setBusy(false);
      if (err || !data) return setError(err?.message ?? "Couldn't save.");
      return onSaved(data as ScenarioRow);
    }
    const { data, error: err } = await supabase.from("wedding_scenarios").insert({ ...fields, sort_order: nextSort }).select("*").single();
    if (err || !data) {
      setBusy(false);
      return setError(err?.message ?? "Couldn't create the scenario. Has migration 047 been run?");
    }
    let copied: ChoiceRow[] = [];
    if (mode === "duplicate" && choices?.length) {
      const rows = choices.map((c) => ({
        scenario_id: data.id,
        category: c.category,
        role: c.role,
        ref_type: c.ref_type,
        ref_id: c.ref_id,
        label: c.label,
        amount: c.amount,
        unit: c.unit,
        quantity: c.quantity,
        cost_state: c.cost_state,
        plus_tax: c.plus_tax,
        extra_confirmed: c.extra_confirmed,
        sort_order: c.sort_order,
      }));
      const { data: inserted, error: copyErr } = await supabase.from("scenario_choices").insert(rows).select("*");
      if (copyErr) {
        await supabase.from("wedding_scenarios").delete().eq("id", data.id);
        setBusy(false);
        return setError(copyErr.message);
      }
      copied = (inserted ?? []) as ChoiceRow[];
    }
    setBusy(false);
    onSaved(data as ScenarioRow, copied);
  }

  const title = mode === "create" ? "Build a scenario" : mode === "edit" ? "Scenario details" : "Duplicate scenario";
  const lead =
    mode === "create"
      ? "Give this version of the wedding a name. You'll choose the venue and vendors next."
      : mode === "edit"
        ? "Blank numbers use your wedding-wide settings. Changing them here only affects this scenario."
        : "Everything is copied as a starting point. Change only what's different.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-3xl font-light">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className={`-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg ${FOCUS_RING}`}>
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-2">{lead}</p>

          <label htmlFor="sc-name" className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ink-2">Scenario name</label>
          <input id="sc-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vineyard wedding" className={FIELD} />

          <label htmlFor="sc-desc" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-2">Description <span className="font-normal normal-case">(optional)</span></label>
          <textarea id="sc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What makes this version different?" className={FIELD} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sc-venue" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Venue</label>
              <select id="sc-venue" value={venueId} onChange={(e) => setVenueId(e.target.value)} className={FIELD}>
                <option value="">Not chosen yet</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sc-date" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Wedding date</label>
              <input id="sc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sc-season" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Season <span className="font-normal normal-case">(if there&apos;s no date yet)</span></label>
              <input id="sc-season" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. Late summer 2029" className={FIELD} />
            </div>
          </div>

          <fieldset className="mt-5 border-t border-line pt-4">
            <legend className="font-serif text-xl font-medium">Guests and money</legend>
            <p className="text-sm text-ink-2">Leave a box blank to use what&apos;s already set for the wedding.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(
                [
                  ["sc-invited", "Invited guests", invited, setInvited, defaults.invited, "from your guest list"],
                  ["sc-expected", "Expected attendance", expected, setExpected, defaults.expected, "from RSVPs"],
                  ["sc-adults", "Adults priced", adults, setAdults, defaults.adults, "from Budget"],
                  ["sc-kids", "Children priced", kids, setKids, defaults.kids, "from Budget"],
                  ["sc-target", "Target budget ($)", target, setTarget, defaults.target, "Budget ceiling"],
                  ["sc-cont", "Contingency (%)", contingency, setContingency, defaults.contPct, "Budget setting"],
                ] as const
              ).map(([id, label, value, set, fallback, from]) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</label>
                  <input id={id} type="number" min={0} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} placeholder={String(fallback)} className={FIELD} />
                  <span className="mt-0.5 block text-xs text-ink-2">{value === "" ? `Using ${fallback} (${from})` : "Set for this scenario"}</span>
                </div>
              ))}
            </div>
          </fieldset>

          {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={onClose} className={BTN}>Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className={`${BTN_PRIMARY} flex-1`}>
              {busy ? "Saving…" : mode === "create" ? "Create scenario" : mode === "edit" ? "Save details" : "Duplicate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
