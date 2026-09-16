"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  BUDGET_CEILING,
  BUDGET_TARGET,
  SHARED_LINES,
  calcVenue,
  fmt,
  resolveAssumptions,
  type BudgetLine,
  type BudgetSettings,
  type GuestScenario,
  type Venue,
} from "@/lib/venues";

function unitLabel(u: BudgetLine[2]) {
  return u === "adult" ? "per adult" : u === "kid" ? "per child" : u === "adult+kid" ? "per guest" : "flat";
}

const SCENARIOS: { key: GuestScenario; label: string }[] = [
  { key: "all", label: "All invited" },
  { key: "confirmed", label: "Confirmed (Yes)" },
  { key: "custom", label: "Custom" },
];

export default function Budget({
  initialVenues,
  userName,
  initialSettings,
  guestSummary,
}: {
  initialVenues: Venue[];
  userName: string;
  initialSettings: BudgetSettings;
  guestSummary: { adults: number; kids: number; confirmedAdults: number; confirmedKids: number };
}) {
  const [venues, setVenues] = useState(initialVenues);
  const [curId, setCurId] = useState(initialVenues[0]?.id ?? "");
  const [settings, setSettings] = useState(initialSettings);
  const lineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const cur = venues.find((v) => v.id === curId) ?? venues[0];
  const as = resolveAssumptions(settings, guestSummary);

  function updateSettings(patch: Partial<BudgetSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      supabase.from("budget_settings").update(next).eq("id", true);
    }, 600);
  }

  function updateLine(i: number, value: number) {
    if (!cur) return;
    const lines = cur.budget_lines.map((l, j) => (j === i ? ([l[0], value, l[2], l[3]] as BudgetLine) : l));
    setVenues((vs) => vs.map((v) => (v.id === cur.id ? { ...v, budget_lines: lines } : v)));
    if (lineTimer.current) clearTimeout(lineTimer.current);
    lineTimer.current = setTimeout(() => {
      supabase.from("venues").update({ budget_lines: lines }).eq("id", cur.id);
    }, 800);
  }

  function updateSharedLine(i: number, value: number) {
    const next = SHARED_LINES.map((l, j) => (j === i ? value : settings.shared_line_amounts[j] ?? l[1]));
    updateSettings({ shared_line_amounts: next });
  }

  if (!cur) {
    return (
      <div className="min-h-screen">
        <NavBar userName={userName} />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <p className="text-ink-2">No venues yet — add some from the dashboard first.</p>
        </div>
      </div>
    );
  }

  const calc = calcVenue(cur, as, settings.shared_line_amounts);
  const share = Math.round((calc.venueEffective / calc.grand) * 100) || 0;
  const verdict =
    calc.grand <= BUDGET_TARGET
      ? "On or under target."
      : calc.grand <= 42000
      ? "Inside the comfortable buffer."
      : calc.grand <= BUDGET_CEILING
      ? "Under the preferred ceiling, but the surprise money is gone."
      : calc.grand <= 50000
      ? "Above the ceiling — something has to give."
      : "Danger zone.";

  return (
    <div className="min-h-screen">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium">Full wedding budget builder</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Pick a venue and edit any line — the guest count, service charge, tax and shared costs are shared with the
          dashboard and comparison table, and a quote or signed contract on a venue&apos;s profile overrides its estimate here.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => setCurId(v.id)}
              className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${
                v.id === curId ? "border-green bg-green text-[#F7F3EA]" : "border-line bg-paper text-ink hover:border-sage-deep"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <h3 className="mb-2 font-semibold">Guest count</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => updateSettings({ guest_scenario: s.key })}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    settings.guest_scenario === s.key
                      ? "border-sage-deep bg-sage-deep text-[#F7F3EA]"
                      : "border-line bg-bg text-ink hover:border-sage-deep"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {settings.guest_scenario === "custom" ? (
              <>
                <div className="mb-3">
                  <div className="flex justify-between"><label className="font-semibold">Adults</label><span className="font-serif text-lg">{settings.custom_adults}</span></div>
                  <input type="range" min={0} max={150} value={settings.custom_adults} onChange={(e) => updateSettings({ custom_adults: +e.target.value })} className="w-full accent-sage-deep" />
                </div>
                <div className="mb-3">
                  <div className="flex justify-between"><label className="font-semibold">Children</label><span className="font-serif text-lg">{settings.custom_kids}</span></div>
                  <input type="range" min={0} max={40} value={settings.custom_kids} onChange={(e) => updateSettings({ custom_kids: +e.target.value })} className="w-full accent-sage-deep" />
                </div>
              </>
            ) : (
              <p className="mb-3 rounded-lg border border-dashed border-line bg-bg px-3 py-2 text-sm text-ink-2">
                {as.adults} adults + {as.kids} kids — from{" "}
                {settings.guest_scenario === "confirmed" ? "confirmed Yes RSVPs" : "the full guest list"}.{" "}
                <Link href="/guests" className="font-semibold text-sage-deep underline underline-offset-2">Edit guest list →</Link>
              </p>
            )}

            <div className="mb-3">
              <div className="flex justify-between"><label className="font-semibold">Venue service charge</label><span className="font-serif text-lg">{settings.svc_pct}%</span></div>
              <input type="range" min={0} max={20} value={settings.svc_pct} onChange={(e) => updateSettings({ svc_pct: +e.target.value })} className="w-full accent-sage-deep" />
            </div>
            <div className="mb-3">
              <div className="flex justify-between"><label className="font-semibold">Contingency</label><span className="font-serif text-lg">{settings.cont_pct}%</span></div>
              <input type="range" min={0} max={15} value={settings.cont_pct} onChange={(e) => updateSettings({ cont_pct: +e.target.value })} className="w-full accent-sage-deep" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.apply_tax} onChange={(e) => updateSettings({ apply_tax: e.target.checked })} className="accent-sage-deep" />
              Apply Québec taxes (14.975%) to all lines
            </label>

            <div className="mt-5 border-t-2 border-gold pt-3">
              <div className="flex justify-between text-sm"><span>Venue cost <small className="text-ink-2">({calc.venueSource})</small></span><b>{fmt(calc.venueEffective)}</b></div>
              <div className="flex justify-between text-sm"><span>Vendors &amp; personal</span><b>{fmt(calc.st)}</b></div>
              <div className="flex justify-between text-sm"><span>Contingency</span><b>{fmt(calc.cont)}</b></div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 font-serif text-xl"><span>Estimated total</span><b>{fmt(calc.grand)}</b></div>
              <div className="mt-1 flex justify-between text-sm text-ink-2"><span>Cost per guest</span><b>{fmt(calc.perGuest)}</b></div>
              <p className="mt-2 text-sm text-ink-2">
                {verdict} Venue is {share}% of the total. Target ${(BUDGET_TARGET / 1000).toFixed(0)}K · ceiling ${(BUDGET_CEILING / 1000).toFixed(0)}K.
              </p>
              <Link href={`/venues/${cur.id}`} className="mt-2 inline-block text-sm font-semibold text-sage-deep underline underline-offset-2">
                Edit quote, contract &amp; deposits →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
            <h3 className="mb-1 font-semibold">Venue-dependent lines</h3>
            <p className="mb-3 text-sm text-ink-2">
              {calc.venueSource !== "estimated"
                ? `A ${calc.venueSource} figure (${fmt(calc.venueEffective)}) from the venue profile overrides this line-item estimate.`
                : cur.budget_note || "No pricing notes yet."}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-2"><th className="pb-2">Line</th><th className="pb-2">Rate</th><th></th><th className="pb-2 text-right">Total</th></tr>
              </thead>
              <tbody>
                {calc.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2 pr-2">{r.label}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={cur.budget_lines[i][1]}
                        onChange={(e) => updateLine(i, +e.target.value || 0)}
                        className="w-20 rounded border border-line bg-bg px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2 pr-2 text-xs text-ink-2">{unitLabel(r.unit)}{r.noSvc ? <br /> : null}{r.noSvc ? "no service charge" : null}</td>
                    <td className="py-2 text-right font-serif">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mb-1 mt-6 font-semibold">Shared lines — same at every venue</h3>
            <table className="w-full text-sm">
              <tbody>
                {SHARED_LINES.map(([label, defaultAmount, note], i) => (
                  <tr key={label} className="border-t border-line">
                    <td className="py-2 pr-2">{label}{note && <small className="block text-ink-2">{note}</small>}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={settings.shared_line_amounts[i] ?? defaultAmount}
                        onChange={(e) => updateSharedLine(i, +e.target.value || 0)}
                        className="w-20 rounded border border-line bg-bg px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2 text-right font-serif">
                      {fmt((settings.shared_line_amounts[i] ?? defaultAmount) * (settings.apply_tax ? 1.14975 : 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
