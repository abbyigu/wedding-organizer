"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import { BTN, BTN_PRIMARY, Fact, FIELD, FOCUS_RING } from "@/components/VendorUi";
import {
  budgetGroupOf,
  fmtMoney,
  formatShortDate,
  isBooked,
  PLACEHOLDER_LINE_OF,
  PRICE_SOURCE_LABELS,
  PRICE_SOURCE_ORDER,
  PRICE_UNIT_LABELS,
  paymentSummary,
  priceRange,
  vendorPrice,
  type LineItem,
  type PriceSource,
  type Vendor,
  type VendorPayment,
  type VendorPriceRow,
} from "@/lib/vendors";

type Guests = { adults: number; kids: number };
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

export default function VendorPricing({
  vendor: v,
  prices,
  setPrices,
  payments,
  setPayments,
  guests,
  save,
}: {
  vendor: Vendor;
  prices: VendorPriceRow[];
  setPrices: (fn: (p: VendorPriceRow[]) => VendorPriceRow[]) => void;
  payments: VendorPayment[];
  setPayments: (fn: (p: VendorPayment[]) => VendorPayment[]) => void;
  guests: Guests;
  save: { now: (patch: Partial<Vendor>) => void; later: (patch: Partial<Vendor>) => void };
}) {
  const confirm = useConfirm();
  const supabase = createClient();
  const [source, setSource] = useState<PriceSource>(v.contracted_total != null ? "actual" : v.quoted_total != null ? "contracted" : "quote");
  const [amount, setAmount] = useState("");
  const [upTo, setUpTo] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [payLabel, setPayLabel] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDue, setPayDue] = useState("");

  const used = vendorPrice(v, guests);
  const pay = paymentSummary(v, payments);
  const isEstimate = source === "rough_estimate" || source === "website" || source === "vendor_estimate";
  const placeholder = PLACEHOLDER_LINE_OF[v.category];
  const lineTotal = v.line_items.reduce((t, l) => t + (l.amount || 0), 0);

  async function record(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (amount === "" || Number.isNaN(+amount)) return;
    const low = +amount;
    const high = isEstimate && upTo !== "" ? +upTo : low;
    const shown = isEstimate ? high : low;
    const noteText = [isEstimate && high !== low ? `Range ${fmtMoney(low)}–${fmtMoney(high)}` : "", note.trim()].filter(Boolean).join(" · ");
    const { data, error: err } = await supabase.from("vendor_prices").insert({ vendor_id: v.id, source, amount: shown, note: noteText, recorded_on: date }).select().single();
    if (err) return setError(`${err.message} Has migration 046 been run?`);
    setPrices((ps) => [data as VendorPriceRow, ...ps]);
    if (source === "quote") save.now({ quoted_total: low, ...(isBooked(v) ? {} : { communication_status: "quote_received" as const }) });
    else if (source === "contracted") save.now({ contracted_total: low });
    else if (source === "starting_price") save.now({ starting_price: low });
    else if (isEstimate) save.now({ price_low: low, price_high: high, estimate_source: source });
    setAmount("");
    setUpTo("");
    setNote("");
  }

  async function removePrice(p: VendorPriceRow) {
    if (!(await confirm(`Remove this ${PRICE_SOURCE_LABELS[p.source as PriceSource]?.toLowerCase() ?? "price"} from the history? The current prices above won’t change.`, "Remove"))) return;
    setPrices((ps) => ps.filter((x) => x.id !== p.id));
    await supabase.from("vendor_prices").delete().eq("id", p.id);
  }

  const setItems = (items: LineItem[]) => save.later({ line_items: items });

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payLabel.trim() || payAmount === "") return;
    const row = { label: payLabel.trim(), vendor: v.name, vendor_id: v.id, category: budgetGroupOf(v.category), amount: +payAmount, due_date: payDue || null, status: "upcoming" };
    const { data, error: err } = await supabase.from("payments").insert(row).select("id, vendor_id, label, amount, due_date, status").single();
    if (err) return setError(err.message);
    setPayments((ps) => [...ps, data as VendorPayment]);
    setPayLabel("");
    setPayAmount("");
    setPayDue("");
  }
  async function markPaid(p: VendorPayment) {
    setPayments((ps) => ps.map((x) => (x.id === p.id ? { ...x, status: "paid" } : x)));
    await supabase.from("payments").update({ status: "paid" }).eq("id", p.id);
  }

  const ladder: [string, string, string][] = [
    ["Estimated", priceRange({ price_low: v.price_low, price_high: v.price_high, price_unit: v.price_unit, starting_price: null }) || "—", v.price_low != null || v.price_high != null ? PRICE_SOURCE_LABELS[v.estimate_source] : ""],
    ["Starting at", v.starting_price != null ? fmtMoney(v.starting_price) : "—", ""],
    ["Quoted", v.quoted_total != null ? fmtMoney(v.quoted_total) : "—", v.quote_expiry ? `Expires ${formatShortDate(v.quote_expiry)}` : ""],
    ["Contracted", v.contracted_total != null ? fmtMoney(v.contracted_total) : "—", ""],
  ];
  const mine = payments.filter((p) => p.vendor_id === v.id).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-[color-mix(in_srgb,var(--sage)_12%,var(--paper))] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">What Budget and scenarios use</p>
        {used.amount != null ? (
          <p className="mt-1 font-serif text-3xl font-light">
            {fmtMoney(used.amount)} <span className="font-sans text-sm text-ink-2">· {used.label}{used.note ? ` · ${used.note}` : ""}</span>
          </p>
        ) : (
          <p className="mt-1 font-serif text-3xl font-light">Unknown <span className="font-sans text-sm text-ink-2">· {used.note}. It isn’t counted as $0.</span></p>
        )}
        <p className="mt-1 text-sm text-ink-2">The most reliable price wins: contracted, then a quote, then an estimate, then the starting price.</p>
        {isBooked(v) && used.amount != null && placeholder && (
          <p className="mt-2 text-sm">Counted in Budget under {budgetGroupOf(v.category)}. Your Budget also has a “{placeholder}” placeholder line, so lower it to avoid counting this twice.</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {ladder.map(([k, val, sub]) => (
          <div key={k}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">{k}</dt>
            <dd className="mt-1 font-serif text-2xl leading-tight">{val}</dd>
            {sub && <dd className="text-xs text-ink-2">{sub}</dd>}
          </div>
        ))}
      </dl>

      <dl className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
        <Fact label="Priced" value={PRICE_UNIT_LABELS[v.price_unit]} />
        <Fact label="Service charge" value={v.service_charge_pct != null ? `${v.service_charge_pct}%` : ""} />
        <Fact label="Travel fee" value={v.travel_fee != null ? fmtMoney(v.travel_fee) : ""} />
        <Fact label="Deposit" value={[v.deposit_amount != null ? fmtMoney(v.deposit_amount) : "", v.deposit_required].filter(Boolean).join(" · ")} />
        <Fact label="Taxes" value={v.tax_included ? "Included" : "Not included"} />
        <Fact label="Required minimum" value={v.minimum_spend != null ? fmtMoney(v.minimum_spend) : ""} />
      </dl>

      <section aria-labelledby="record-price">
        <h3 id="record-price" className="font-serif text-2xl font-light">Record a price</h3>
        <p className="mt-1 text-sm text-ink-2">Each price you record is kept in the history, so you can see how the number moved.</p>
        <form onSubmit={record} className="mt-4 grid gap-3 sm:grid-cols-6">
          <label className="sm:col-span-2">
            <span className={LABEL}>Type</span>
            <select value={source} onChange={(e) => setSource(e.target.value as PriceSource)} className={FIELD}>
              {PRICE_SOURCE_ORDER.map((s) => (
                <option key={s} value={s}>{PRICE_SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={LABEL}>{isEstimate ? "From ($)" : "Amount ($)"}</span>
            <input type="number" min={0} required value={amount} onChange={(e) => setAmount(e.target.value)} className={FIELD} />
          </label>
          {isEstimate ? (
            <label>
              <span className={LABEL}>Up to ($)</span>
              <input type="number" min={0} value={upTo} onChange={(e) => setUpTo(e.target.value)} className={FIELD} />
            </label>
          ) : (
            <span className="hidden sm:block" />
          )}
          <label className="sm:col-span-2">
            <span className={LABEL}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
          </label>
          <label className="sm:col-span-4">
            <span className={LABEL}>Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Includes second shooter" className={FIELD} />
          </label>
          <div className="flex items-end sm:col-span-2">
            <button type="submit" className={`${BTN_PRIMARY} w-full`}>Save price</button>
          </div>
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}

        {prices.length > 0 && (
          <ol className="mt-6">
            {[...prices].sort((a, b) => b.recorded_on.localeCompare(a.recorded_on) || b.created_at.localeCompare(a.created_at)).map((p) => (
              <li key={p.id} className="flex items-baseline gap-4 border-t border-line py-3 first:border-t-0">
                <span className="w-14 shrink-0 text-sm text-ink-2">{formatShortDate(p.recorded_on)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{PRICE_SOURCE_LABELS[p.source as PriceSource] ?? "Estimate"}</span>
                  {p.note && <span className="block text-sm text-ink-2">{p.note}</span>}
                </span>
                <span className="font-serif text-xl">{fmtMoney(p.amount)}</span>
                <button onClick={() => removePrice(p)} aria-label={`Remove ${PRICE_SOURCE_LABELS[p.source as PriceSource] ?? "price"} of ${fmtMoney(p.amount)} from the history`} className={`-my-2 flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="line-items" className="border-t border-line pt-6">
        <h3 id="line-items" className="font-serif text-2xl font-light">Line items <span className="font-sans text-sm text-ink-2">(optional)</span></h3>
        <p className="mt-1 text-sm text-ink-2">Break a quote into its parts, like the base package, a second shooter or an album.</p>
        <ul className="mt-3 space-y-2">
          {v.line_items.map((l, i) => (
            <li key={i} className="flex gap-2">
              <label className="flex-1"><span className="sr-only">Line item {i + 1} name</span><input defaultValue={l.label} onChange={(e) => setItems(v.line_items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={`${FIELD} !mt-0`} /></label>
              <label className="w-32"><span className="sr-only">Line item {i + 1} amount</span><input type="number" min={0} defaultValue={l.amount} onChange={(e) => setItems(v.line_items.map((x, j) => (j === i ? { ...x, amount: +e.target.value || 0 } : x)))} className={`${FIELD} !mt-0`} /></label>
              <button onClick={() => save.now({ line_items: v.line_items.filter((_, j) => j !== i) })} aria-label={`Remove line item ${i + 1}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}><Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /></button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => save.now({ line_items: [...v.line_items, { label: "", amount: 0 }] })} className={BTN}><Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />Add a line</button>
          {v.line_items.length > 0 && <p className="text-sm text-ink-2">Lines add up to <b className="font-serif text-lg text-ink">{fmtMoney(lineTotal)}</b></p>}
        </div>
      </section>

      {isBooked(v) && (
        <section aria-labelledby="pay-schedule" className="border-t border-line pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="pay-schedule" className="font-serif text-2xl font-light">Payment schedule</h3>
            <Link href="/budget/payments" className={`rounded text-sm font-medium underline underline-offset-2 ${FOCUS_RING}`}>Open in Payments →</Link>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-4">
            <Fact label="Contracted" value={pay.contracted != null ? fmtMoney(pay.contracted) : "Not set"} />
            <Fact label="Paid" value={fmtMoney(pay.paid)} />
            <Fact label="Still owed" value={pay.owed != null ? fmtMoney(pay.owed) : "—"} />
          </dl>
          <ul className="mt-3">
            {mine.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line py-2 text-sm">
                <span className="min-w-0 flex-1 font-medium">{p.label}</span>
                <span className="text-ink-2">{p.due_date ? formatShortDate(p.due_date) : "No date"}</span>
                <span className="font-serif text-lg">{fmtMoney(p.amount)}</span>
                {p.status === "paid" ? <span className="w-24 text-right font-medium text-sage-deep">Paid ✓</span> : <button onClick={() => markPaid(p)} className={`h-11 w-24 rounded-full border border-line text-sm hover:border-sage-deep ${FOCUS_RING}`}>Mark paid</button>}
              </li>
            ))}
          </ul>
          <form onSubmit={addPayment} className="mt-3 grid gap-3 sm:grid-cols-6">
            <label className="sm:col-span-2"><span className={LABEL}>Payment</span><input required value={payLabel} onChange={(e) => setPayLabel(e.target.value)} placeholder="e.g. Deposit" className={FIELD} /></label>
            <label className="sm:col-span-2"><span className={LABEL}>Amount ($)</span><input type="number" min={0} required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={FIELD} /></label>
            <label className="sm:col-span-2"><span className={LABEL}>Due</span><input type="date" value={payDue} onChange={(e) => setPayDue(e.target.value)} className={FIELD} /></label>
            <div className="sm:col-span-6"><button type="submit" className={BTN}><Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />Add to schedule</button></div>
          </form>
        </section>
      )}
    </div>
  );
}
