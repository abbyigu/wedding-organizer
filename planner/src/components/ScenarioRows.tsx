"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { VendorPhoto } from "@/components/VendorCard";
import { BTN, BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { CONFIDENCE_SHORT, CUSTOM_UNITS, isConfirmed, money, type ChoiceRow, type CostState, type ScenarioLine } from "@/lib/wedding-scenarios";

export function PriceCell({ line }: { line: ScenarioLine }) {
  const fees = line.service + line.tax;
  return (
    <div className="text-right">
      {line.state === "amount" || line.state === "zero" ? (
        <>
          <p className="font-serif text-2xl font-light leading-none">{money(line.total)}</p>
          {line.state === "zero" && <p className="mt-1 text-xs text-ink-2">Confirmed $0</p>}
          {fees > 0 && <p className="mt-1 text-xs text-ink-2">{money(line.base)} + {money(fees)} {line.service > 0 ? "service and tax" : "tax"}</p>}
          {line.partial && <p className="mt-1 text-xs font-medium text-wine">+ some unknown</p>}
        </>
      ) : line.state === "included" ? (
        <p className="text-sm font-medium text-sage-deep">Included</p>
      ) : line.state === "na" ? (
        <p className="text-sm text-ink-2">Not required</p>
      ) : (
        <p className="text-sm font-medium text-wine">Unknown</p>
      )}
      {line.confidence && (line.state === "amount" || line.state === "zero") && (
        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${isConfirmed(line.confidence) ? "bg-[color-mix(in_srgb,var(--sage)_35%,var(--paper))] text-sage-deep" : "bg-[color-mix(in_srgb,var(--gold)_22%,var(--paper))] text-ink"}`}>
          {CONFIDENCE_SHORT[line.confidence]}
        </span>
      )}
    </div>
  );
}

export function LineRow({
  line,
  photo,
  facts,
  warning,
  controls,
  actions,
  delta,
  muted,
}: {
  line: ScenarioLine;
  photo?: string | null;
  facts?: string;
  warning?: string;
  controls?: ReactNode;
  actions?: ReactNode;
  delta?: number | null;
  muted?: boolean;
}) {
  const title = line.href ? (
    <Link href={line.href} className={`rounded font-medium hover:underline ${FOCUS_RING}`}>{line.label}</Link>
  ) : (
    <span className="font-medium">{line.label}</span>
  );
  return (
    <li className={`flex flex-col gap-3 py-3 ${muted ? "opacity-90" : ""}`}>
      <div className="flex gap-3">
        {photo !== undefined && <VendorPhoto src={photo ?? ""} className="h-14 w-14 shrink-0 rounded-xl" />}
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-snug">{title}</p>
          {(line.sub || facts) && <p className="text-sm text-ink-2">{[line.sub, facts].filter(Boolean).join(" · ")}</p>}
          {line.assumed && <p className="text-xs text-ink-2">Assumed from the venue&apos;s all-in quote</p>}
        </div>
        <div className="shrink-0">
          <PriceCell line={line} />
          {delta != null && delta !== 0 && (
            <p className={`mt-1 text-right text-xs font-medium ${delta > 0 ? "text-wine" : "text-sage-deep"}`}>{delta > 0 ? "+" : "−"}{money(Math.abs(delta))} vs selected</p>
          )}
        </div>
      </div>
      {warning && (
        <p role="note" className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--gold)_20%,var(--paper))] px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-wine" strokeWidth={1.75} aria-hidden />
          <span>{warning}</span>
        </p>
      )}
      {(controls || actions) && (
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          <div className="ml-auto flex flex-wrap gap-2">{actions}</div>
        </div>
      )}
    </li>
  );
}

// A number that's committed when you leave the box, so typing "12" never saves "1" first.
export function NumField({ id, label, value, onCommit, placeholder, width = "w-24" }: { id: string; label: string; value: number | null; onCommit: (n: number | null) => void; placeholder?: string; width?: string }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value == null ? "" : String(value));
  }
  const commit = () => {
    const n = text.trim() === "" ? null : Math.max(0, Number(text));
    if (n !== value) onCommit(n);
  };
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-ink-2">{label}</label>
      <input id={id} type="number" min={0} inputMode="decimal" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), e.preventDefault())} className={`${FIELD} !mt-0 h-11 ${width}`} />
    </div>
  );
}

export type CustomDraft = Pick<ChoiceRow, "label" | "amount" | "unit" | "quantity" | "cost_state" | "plus_tax">;

// Our own cost line, for anything that isn't a record elsewhere.
export function CustomForm({ idPrefix, initial, submitLabel, onSubmit, onCancel }: { idPrefix: string; initial?: CustomDraft; submitLabel: string; onSubmit: (d: CustomDraft) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [state, setState] = useState<"priced" | CostState>(initial?.cost_state ?? "priced");
  const [amount, setAmount] = useState(initial?.amount == null ? "" : String(initial.amount));
  const [unit, setUnit] = useState(initial?.unit ?? "flat");
  const [quantity, setQuantity] = useState(initial?.quantity == null ? "" : String(initial.quantity));
  const [plusTax, setPlusTax] = useState(initial?.plus_tax ?? false);
  const priced = state === "priced";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        onSubmit({
          label: label.trim(),
          amount: priced && amount.trim() !== "" ? Number(amount) : null,
          unit,
          quantity: priced && quantity.trim() !== "" ? Number(quantity) : null,
          cost_state: priced ? null : state,
          plus_tax: priced && plusTax,
        });
      }}
      className="grid gap-3 rounded-2xl border border-line bg-bg p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-label`} className="text-xs font-semibold uppercase tracking-wide text-ink-2">What is it?</label>
        <input id={`${idPrefix}-label`} required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Live guest portraits" className={FIELD} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-state`} className="text-xs font-semibold uppercase tracking-wide text-ink-2">Cost</label>
        <select id={`${idPrefix}-state`} value={state} onChange={(e) => setState(e.target.value as "priced" | CostState)} className={FIELD}>
          <option value="priced">A price</option>
          <option value="unknown">Unknown so far</option>
          <option value="included">Included in something else</option>
          <option value="na">Not required</option>
          <option value="zero">Confirmed $0</option>
        </select>
      </div>
      {priced && (
        <>
          <div>
            <label htmlFor={`${idPrefix}-amount`} className="text-xs font-semibold uppercase tracking-wide text-ink-2">Price ($)</label>
            <input id={`${idPrefix}-amount`} type="number" min={0} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-unit`} className="text-xs font-semibold uppercase tracking-wide text-ink-2">Charged</label>
            <select id={`${idPrefix}-unit`} value={unit} onChange={(e) => setUnit(e.target.value)} className={FIELD}>
              {CUSTOM_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {(unit === "hour" || unit === "package") && (
            <div>
              <label htmlFor={`${idPrefix}-qty`} className="text-xs font-semibold uppercase tracking-wide text-ink-2">{unit === "hour" ? "Hours" : "Quantity"}</label>
              <input id={`${idPrefix}-qty`} type="number" min={0} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={FIELD} />
            </div>
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={plusTax} onChange={(e) => setPlusTax(e.target.checked)} className="h-4 w-4 accent-sage-deep" />
            Add Québec taxes on top (leave off if the price already includes them)
          </label>
        </>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className={BTN}>Cancel</button>
        <button type="submit" className={BTN_PRIMARY}>{submitLabel}</button>
      </div>
    </form>
  );
}
