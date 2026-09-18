"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Flower2,
  MoreHorizontal,
  Pencil,
  Plane,
  Plus,
  Search,
  Shirt,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BUDGET_CEILING,
  BUDGET_TARGET,
  SHARED_LINES,
  fmt,
  resolveAssumptions,
  type BudgetSettings,
  type GuestScenario,
  type Venue,
} from "@/lib/venues";
import {
  BUDGET_GROUPS,
  blankExpense,
  computeBreakdown,
  type BudgetExpense,
  type BudgetGroup,
  type ExpenseUnit,
} from "@/lib/budget-extras";

const GROUP_ICONS: Record<BudgetGroup, typeof UtensilsCrossed> = {
  "Venue & catering": UtensilsCrossed,
  "Photography & video": Camera,
  "Flowers & décor": Flower2,
  "Attire & beauty": Shirt,
  "Travel & accommodation": Plane,
  Other: MoreHorizontal,
};

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const SCENARIOS: { key: GuestScenario; label: string }[] = [
  { key: "all", label: "All invited" },
  { key: "confirmed", label: "Confirmed (Yes)" },
  { key: "custom", label: "Custom" },
];

function unitLabel(u: ExpenseUnit) {
  return u === "adult" ? "per adult" : u === "kid" ? "per child" : u === "adult+kid" ? "per guest" : u === "hour" ? "per hour" : "flat";
}

export default function BudgetBuilder({
  initialVenues,
  initialSettings,
  guestSummary,
  initialExpenses,
  initialVenueId,
}: {
  initialVenues: Venue[];
  initialSettings: BudgetSettings;
  guestSummary: { adults: number; kids: number; confirmedAdults: number; confirmedKids: number };
  initialExpenses: BudgetExpense[];
  initialVenueId?: string | null;
}) {
  const [venues, setVenues] = useState(initialVenues);
  // A ?venue= link (e.g. "Edit breakdown" from a venue's own page) wins;
  // otherwise same precedence as the Overview page's "current venue", so
  // the two pages agree on which venue the estimate is based on by default.
  const [curId, setCurId] = useState(() => {
    if (initialVenueId && initialVenues.some((v) => v.id === initialVenueId)) return initialVenueId;
    return (initialVenues.find((v) => v.is_final) ?? initialVenues.filter((v) => v.status !== "out")[0] ?? initialVenues[0])?.id ?? "";
  });
  const [settings, setSettings] = useState(initialSettings);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [guestEditOpen, setGuestEditOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<BudgetGroup>>(new Set(["Venue & catering"]));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | BudgetGroup>("all");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const lineTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const cur = venues.find((v) => v.id === curId) ?? venues[0];
  const as = resolveAssumptions(settings, guestSummary);

  const breakdown = useMemo(
    () => (cur ? computeBreakdown(cur, as, settings.shared_line_amounts, expenses) : null),
    [cur, as, settings.shared_line_amounts, expenses],
  );

  function updateSettings(patch: Partial<BudgetSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    clearTimeout(lineTimer.current.settings);
    lineTimer.current.settings = setTimeout(async () => {
      const { error } = await supabase.from("budget_settings").update(next).eq("id", true);
      if (error) setError(error.message);
    }, 600);
  }

  function updateVenueLine(i: number, value: number) {
    if (!cur) return;
    const lines = cur.budget_lines.map((l, j) => (j === i ? ([l[0], value, l[2], l[3]] as typeof l) : l));
    setVenues((vs) => vs.map((v) => (v.id === cur.id ? { ...v, budget_lines: lines } : v)));
    const key = `venue-${i}`;
    clearTimeout(lineTimer.current[key]);
    lineTimer.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("venues").update({ budget_lines: lines }).eq("id", cur.id);
      if (error) setError(error.message);
    }, 800);
  }

  function updateSharedLine(i: number, value: number) {
    const next = SHARED_LINES.map((l, j) => (j === i ? value : settings.shared_line_amounts[j] ?? l[1]));
    updateSettings({ shared_line_amounts: next });
  }

  async function addExpense(category: BudgetGroup) {
    setError("");
    const count = expenses.filter((e) => e.category === category).length;
    const { data, error } = await supabase
      .from("budget_expenses")
      .insert(blankExpense(category, count, cur?.id ?? null))
      .select()
      .single();
    if (error) setError(error.message);
    else if (data) {
      setExpenses((es) => [...es, data as BudgetExpense]);
      setEditingExpenseId((data as BudgetExpense).id);
      setOpenGroups((s) => new Set(s).add(category));
    }
  }

  async function duplicateExpense(e: BudgetExpense) {
    setError("");
    const { id, created_at, updated_at, ...rest } = e;
    void id;
    void created_at;
    void updated_at;
    const { data, error } = await supabase.from("budget_expenses").insert({ ...rest, label: `${e.label} (copy)` }).select().single();
    if (error) setError(error.message);
    else if (data) setExpenses((es) => [...es, data as BudgetExpense]);
  }

  function patchExpenseLocal(id: string, patch: Partial<BudgetExpense>) {
    setExpenses((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function scheduleExpenseSave(id: string, patch: Partial<BudgetExpense>) {
    patchExpenseLocal(id, patch);
    const key = `expense-${id}-${Object.keys(patch)[0]}`;
    clearTimeout(lineTimer.current[key]);
    lineTimer.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("budget_expenses").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function removeExpense(id: string) {
    if (!confirm("Remove this expense?")) return;
    setExpenses((es) => es.filter((e) => e.id !== id));
    await supabase.from("budget_expenses").delete().eq("id", id);
  }

  function toggleGroup(name: BudgetGroup) {
    setOpenGroups((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function exportCsv() {
    if (!breakdown) return;
    const rows = breakdown.groups.flatMap((g) => g.items.map((it) => [g.name, it.label, Math.round(it.total)]));
    const csv = ["Category,Expense,Total", ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding-budget.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!cur || !breakdown) {
    return <p className="text-ink-2">No venues yet — add some from the venue shortlist first.</p>;
  }

  const verdict =
    breakdown.grand <= BUDGET_TARGET
      ? "On or under target."
      : breakdown.grand <= 42000
      ? "Inside the comfortable buffer."
      : breakdown.grand <= BUDGET_CEILING
      ? "Under the preferred ceiling, but the surprise money is gone."
      : "Over the preferred ceiling.";
  const ceilingPct = Math.min(100, Math.round((breakdown.grand / BUDGET_CEILING) * 100));

  const visibleGroups = breakdown.groups.filter((g) => {
    if (categoryFilter !== "all" && g.name !== categoryFilter) return false;
    return true;
  });
  const q = search.trim().toLowerCase();

  return (
    <div>
      <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p><b className="font-serif text-2xl">{fmt(breakdown.grand)}</b> <span className="text-sm text-ink-2">estimated</span></p>
            <p className="text-sm text-ink-2">{fmt(breakdown.perGuest)} per guest</p>
          </div>
          <div>
            <p><b className="font-serif text-2xl">{fmt(BUDGET_CEILING)}</b> <span className="text-sm text-ink-2">preferred ceiling</span></p>
            <p className="text-sm text-ink-2">{ceilingPct}% used</p>
          </div>
          <div>
            <p><b className="font-serif text-2xl">{fmt(Math.max(0, BUDGET_CEILING - breakdown.grand))}</b> <span className="text-sm text-ink-2">remaining</span></p>
            <p className="text-sm text-ink-2">{verdict}</p>
          </div>
          <div className="ml-auto flex flex-col items-start gap-1">
            <label className="flex items-center gap-2 text-sm text-ink-2">
              Based on:
              <select value={curId || cur.id} onChange={(e) => setCurId(e.target.value)} className="rounded-full border border-line bg-bg px-3 py-1.5 text-sm font-semibold text-ink">
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
            <p className="flex items-center gap-1.5 text-xs text-ink-2">
              <span className={`h-2 w-2 rounded-full ${breakdown.grand <= BUDGET_CEILING ? "bg-sage-deep" : "bg-wine"}`} />
              {breakdown.grand <= BUDGET_CEILING ? "You're within your preferred budget." : "You're over your preferred budget."}
            </p>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${breakdown.grand <= BUDGET_CEILING ? "bg-sage-deep" : "bg-wine"}`} style={{ width: `${ceilingPct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-ink-2">
          <span>$0</span>
          <span>{fmt(BUDGET_CEILING)}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h2 className="font-serif text-xl font-medium">Budget settings</h2>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Guest count</h3>
              <button onClick={() => setGuestEditOpen((v) => !v)} className={`rounded text-sm font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>
                {guestEditOpen ? "Done" : "Edit"}
              </button>
            </div>
            {!guestEditOpen ? (
              <p className="mt-1 text-sm text-ink-2">{as.adults + as.kids} invited</p>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => updateSettings({ guest_scenario: s.key })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${FOCUS_RING} ${
                        settings.guest_scenario === s.key ? "border-sage-deep bg-sage-deep text-white" : "border-line bg-bg text-ink hover:border-sage-deep"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {settings.guest_scenario === "custom" ? (
                  <>
                    <div>
                      <div className="flex justify-between text-sm"><label>Adults</label><span className="font-serif">{settings.custom_adults}</span></div>
                      <input type="range" min={0} max={150} value={settings.custom_adults} onChange={(e) => updateSettings({ custom_adults: +e.target.value })} className="w-full accent-sage-deep" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm"><label>Children</label><span className="font-serif">{settings.custom_kids}</span></div>
                      <input type="range" min={0} max={40} value={settings.custom_kids} onChange={(e) => updateSettings({ custom_kids: +e.target.value })} className="w-full accent-sage-deep" />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-ink-2">
                    From {settings.guest_scenario === "confirmed" ? "confirmed Yes RSVPs" : "the full guest list"}.{" "}
                    <Link href="/guests/list" className={`rounded font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>Edit guest list →</Link>
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Service charge</h3>
              <p className="text-xs text-ink-2">Added to venue-related lines</p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button onClick={() => updateSettings({ svc_pct: Math.max(0, settings.svc_pct - 1) })} className={`flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink hover:border-sage-deep ${FOCUS_RING}`}>−</button>
              <span className="w-12 text-center font-serif text-lg">{settings.svc_pct}%</span>
              <button onClick={() => updateSettings({ svc_pct: Math.min(30, settings.svc_pct + 1) })} className={`flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink hover:border-sage-deep ${FOCUS_RING}`}>+</button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Contingency</h3>
              <p className="text-xs text-ink-2">For unexpected costs</p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button onClick={() => updateSettings({ cont_pct: Math.max(0, settings.cont_pct - 1) })} className={`flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink hover:border-sage-deep ${FOCUS_RING}`}>−</button>
              <span className="w-12 text-center font-serif text-lg">{settings.cont_pct}%</span>
              <button onClick={() => updateSettings({ cont_pct: Math.min(25, settings.cont_pct + 1) })} className={`flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink hover:border-sage-deep ${FOCUS_RING}`}>+</button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.apply_tax} onChange={(e) => updateSettings({ apply_tax: e.target.checked })} className="h-4 w-4 accent-sage-deep" />
            Québec taxes (14.975%)
            <span className="text-xs text-ink-2">Applied to all lines</span>
          </label>

          <div className="border-t border-line pt-3">
            <h3 className="mb-2 font-semibold">What&apos;s included</h3>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between"><span className="text-ink-2">Venue</span><b>{fmt(breakdown.venueTotal)}</b></div>
              <div className="flex justify-between"><span className="text-ink-2">Vendors &amp; personal</span><b>{fmt(breakdown.grand - breakdown.venueTotal - breakdown.contingency)}</b></div>
              <div className="flex justify-between"><span className="text-ink-2">Contingency</span><b>{fmt(breakdown.contingency)}</b></div>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2">
              <span className="font-serif text-lg">Estimated total</span>
              <b className="font-serif text-lg">{fmt(breakdown.grand)}</b>
            </div>
            <div className="mt-1 flex justify-between text-sm text-ink-2"><span>Cost per guest</span><b>{fmt(breakdown.perGuest)}</b></div>
            <Link href={`/venues/${cur.id}`} className={`mt-2 inline-block rounded text-sm font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>
              Edit quote, contract &amp; deposits →
            </Link>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))] p-5 shadow-sm">
            <p className="text-sm text-ink">
              <span aria-hidden>🌿</span> Largest cost driver: <b>{[...breakdown.groups].sort((a, b) => b.total - a.total)[0]?.name}</b>
              {" · "}
              {[...breakdown.groups].sort((a, b) => b.total - a.total)[0]?.pct ?? 0}% of your budget
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-medium">Budget breakdown</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportCsv} className={`flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}>
                <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Export
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-wine">{error}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expenses…"
                className="w-full rounded-full border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-sage-deep"
              />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as "all" | BudgetGroup)} className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-2">
              <option value="all">All categories</option>
              {BUDGET_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {visibleGroups.map((g) => {
              const Icon = GROUP_ICONS[g.name];
              const open = openGroups.has(g.name);
              const items = q ? g.items.filter((it) => it.label.toLowerCase().includes(q)) : g.items;
              if (q && items.length === 0) return null;
              return (
                <div key={g.name} className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                  <button onClick={() => toggleGroup(g.name)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg ${FOCUS_RING}`}>
                    {open ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />}
                    <Icon className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                    <span className="font-serif text-base font-medium">{g.name}</span>
                    <div className="mx-2 hidden h-1.5 flex-1 overflow-hidden rounded-full bg-line sm:block">
                      <div className="h-full rounded-full bg-sage-deep" style={{ width: `${g.pct}%` }} />
                    </div>
                    <span className="ml-auto shrink-0 font-semibold text-ink">{fmt(g.total)}</span>
                    <span className="w-10 shrink-0 text-right text-xs text-ink-2">{g.pct}%</span>
                  </button>
                  {open && (
                    <div className="border-t border-line">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-2">
                            <th className="px-4 py-2">Expense</th>
                            <th className="px-4 py-2">Rate</th>
                            <th className="px-4 py-2 text-right">Total</th>
                            <th className="w-16 px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it) => {
                            const isExpense = it.editable === "expense";
                            const expense = isExpense ? expenses.find((e) => e.id === it.ref) : null;
                            const editingThis = isExpense && editingExpenseId === it.ref;
                            return (
                              <tr key={`${it.editable}-${it.ref ?? it.label}`} className="border-t border-line">
                                <td className="px-4 py-2 align-top">
                                  {editingThis && expense ? (
                                    <input
                                      defaultValue={expense.label}
                                      onChange={(e) => scheduleExpenseSave(expense.id, { label: e.target.value })}
                                      className="w-full rounded border border-line bg-bg px-2 py-1"
                                    />
                                  ) : (
                                    <>
                                      {it.label}
                                      {expense?.notes && <span className="block text-xs text-ink-2">{expense.notes}</span>}
                                    </>
                                  )}
                                </td>
                                <td className="px-4 py-2 align-top">
                                  {it.editable === "venue-line" && cur.budget_lines[it.ref as number] ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        step={5}
                                        value={cur.budget_lines[it.ref as number][1]}
                                        onChange={(e) => updateVenueLine(it.ref as number, +e.target.value || 0)}
                                        className="w-20 rounded border border-line bg-bg px-2 py-1"
                                      />
                                      <span className="text-xs text-ink-2">{unitLabel(cur.budget_lines[it.ref as number][2])}</span>
                                    </div>
                                  ) : it.editable === "shared-line" ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        step={50}
                                        value={settings.shared_line_amounts[it.ref as number] ?? SHARED_LINES[it.ref as number][1]}
                                        onChange={(e) => updateSharedLine(it.ref as number, +e.target.value || 0)}
                                        className="w-20 rounded border border-line bg-bg px-2 py-1"
                                      />
                                      <span className="text-xs text-ink-2">flat</span>
                                    </div>
                                  ) : editingThis && expense ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        defaultValue={expense.rate}
                                        onChange={(e) => scheduleExpenseSave(expense.id, { rate: +e.target.value || 0 })}
                                        className="w-16 rounded border border-line bg-bg px-2 py-1"
                                      />
                                      <select
                                        defaultValue={expense.unit}
                                        onChange={(e) => scheduleExpenseSave(expense.id, { unit: e.target.value as ExpenseUnit })}
                                        className="rounded border border-line bg-bg px-1 py-1 text-xs"
                                      >
                                        <option value="flat">flat</option>
                                        <option value="adult">per adult</option>
                                        <option value="kid">per child</option>
                                        <option value="adult+kid">per guest</option>
                                        <option value="hour">by hour</option>
                                      </select>
                                      {expense.unit === "hour" && (
                                        <input
                                          type="number"
                                          min={0}
                                          step={0.5}
                                          defaultValue={expense.qty}
                                          onChange={(e) => scheduleExpenseSave(expense.id, { qty: +e.target.value || 0 })}
                                          aria-label="Hours"
                                          className="w-14 rounded border border-line bg-bg px-1.5 py-1 text-xs"
                                        />
                                      )}
                                    </div>
                                  ) : isExpense && expense ? (
                                    <span className="text-xs text-ink-2">
                                      {expense.unit === "hour" ? `${fmt(expense.rate)}/hr × ${expense.qty}h` : unitLabel(expense.unit)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-ink-2">included</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right align-top font-serif">{fmt(it.total)}</td>
                                <td className="px-4 py-2 text-right align-top">
                                  {isExpense && expense && (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => setEditingExpenseId(editingThis ? null : expense.id)}
                                        aria-label={editingThis ? "Done editing" : `Edit ${expense.label}`}
                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink ${FOCUS_RING}`}
                                      >
                                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                                      </button>
                                      <button
                                        onClick={() => duplicateExpense(expense)}
                                        aria-label={`Duplicate ${expense.label}`}
                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-ink ${FOCUS_RING}`}
                                      >
                                        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                                      </button>
                                      <button
                                        onClick={() => removeExpense(expense.id)}
                                        aria-label={`Remove ${expense.label}`}
                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <button
                        onClick={() => addExpense(g.name)}
                        className={`flex w-full items-center gap-1.5 border-t border-line px-4 py-2.5 text-left text-sm font-semibold text-sage-deep hover:bg-bg ${FOCUS_RING}`}
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        Add expense to {g.name}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
