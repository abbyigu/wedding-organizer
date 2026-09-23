"use client";

import { useDialog } from "@/lib/use-dialog";
import { useConfirm } from "@/components/ConfirmProvider";
import { useRef, useState } from "react";
import { CalendarDays, CircleCheck, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/venues";
import { BUDGET_GROUPS, blankPayment, formatDueDate, paymentStatus, type Payment, type PaymentStatus } from "@/lib/budget-extras";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function statusPillClass(status: PaymentStatus) {
  if (status === "paid") return "border-sage-deep bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] text-sage-deep";
  if (status === "overdue") return "border-wine bg-[color-mix(in_srgb,var(--wine)_15%,var(--paper))] text-wine";
  return "border-gold bg-[color-mix(in_srgb,var(--gold)_22%,var(--paper))] text-ink";
}
const STATUS_LABEL: Record<PaymentStatus, string> = { upcoming: "Upcoming", overdue: "Overdue", paid: "Paid" };

export default function BudgetPayments({ initialPayments, vendors }: { initialPayments: Payment[]; vendors: { id: string; name: string }[] }) {
  const confirm = useConfirm();
  const [payments, setPayments] = useState(initialPayments);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const open = payments.find((p) => p.id === openId) ?? null;
  const dialogRef = useDialog(Boolean(open), () => setOpenId(null));
  const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const committed = payments.reduce((s, p) => s + p.amount, 0);
  const sorted = [...payments].sort((a, b) => {
    if (a.status !== b.status && (a.status === "paid" || b.status === "paid")) return a.status === "paid" ? 1 : -1;
    return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  });

  function patchLocal(id: string, patch: Partial<Payment>) {
    setPayments((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function save(id: string, patch: Partial<Payment>) {
    const { error } = await supabase.from("payments").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  function scheduleSave(id: string, patch: Partial<Payment>) {
    patchLocal(id, patch);
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save(id, patch), 700);
  }

  async function saveNow(id: string, patch: Partial<Payment>) {
    patchLocal(id, patch);
    await save(id, patch);
  }

  async function addPayment() {
    setError("");
    const { data, error } = await supabase.from("payments").insert(blankPayment()).select().single();
    if (error) setError(error.message);
    else if (data) {
      setPayments((ps) => [...ps, data as Payment]);
      setOpenId((data as Payment).id);
    }
  }

  async function removePayment(id: string) {
    if (!(await confirm("Delete this payment?"))) return;
    setPayments((ps) => ps.filter((p) => p.id !== id));
    if (openId === id) setOpenId(null);
    await supabase.from("payments").delete().eq("id", id);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Paid</p>
          <b className="mt-1 block font-serif text-2xl">{fmt(paid)}</b>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Committed</p>
          <b className="mt-1 block font-serif text-2xl">{fmt(committed)}</b>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Remaining</p>
          <b className="mt-1 block font-serif text-2xl">{fmt(committed - paid)}</b>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-serif text-xl font-medium">All payments</h2>
        <button onClick={addPayment} className={`flex items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Add payment
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-wine">{error}</p>}

      <div className="mt-4 flex flex-col divide-y divide-line rounded-2xl border border-line bg-paper shadow-sm">
        {sorted.length === 0 && <p className="p-5 text-sm text-ink-2">Nothing tracked yet — add a deposit or vendor payment to get started.</p>}
        {sorted.map((p) => {
          const status = paymentStatus(p);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-bg sm:flex-nowrap">
              <button onClick={() => setOpenId(p.id)} className={`min-w-0 flex-1 rounded text-left ${FOCUS_RING}`}>
                <p className="font-semibold text-ink">{p.label}</p>
                <p className="text-sm text-ink-2">{(p.vendor_id && vendors.find((v) => v.id === p.vendor_id)?.name) || p.vendor || p.category}</p>
              </button>
              <span className="flex shrink-0 items-center gap-1 text-sm text-ink-2">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {p.due_date ? formatDueDate(p.due_date) : "No due date"}
              </span>
              <span className="shrink-0 font-serif text-lg">{fmt(p.amount)}</span>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(status)}`}>{STATUS_LABEL[status]}</span>
              {status !== "paid" && (
                <button
                  onClick={() => saveNow(p.id, { status: "paid" })}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink"
                >
                  <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  Mark as paid
                </button>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" tabIndex={-1} onClick={() => setOpenId(null)} className="absolute inset-0" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Edit payment" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-paper shadow-lg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <input
                defaultValue={open.label}
                onChange={(e) => scheduleSave(open.id, { label: e.target.value })}
                className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-xl font-medium outline-none focus:border-line focus:bg-bg"
              />
              <button onClick={() => setOpenId(null)} aria-label="Close" className={`ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg ${FOCUS_RING}`}>
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="budget-payments-f1" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Vendor</label>
                  <select
                    id="budget-payments-f1"
                    value={open.vendor_id ?? ""}
                    onChange={(e) => {
                      const v = vendors.find((x) => x.id === e.target.value);
                      saveNow(open.id, { vendor_id: v?.id ?? null, vendor: v?.name ?? open.vendor });
                    }}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    <option value="">{open.vendor && !open.vendor_id ? `${open.vendor} (not linked)` : "Not tied to a vendor"}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="budget-payments-f2" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Category</label>
                  <select id="budget-payments-f2"
                    value={open.category}
                    onChange={(e) => scheduleSave(open.id, { category: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  >
                    {BUDGET_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="budget-payments-f3" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Amount</label>
                  <input id="budget-payments-f3"
                    type="number"
                    min={0}
                    defaultValue={open.amount}
                    onChange={(e) => scheduleSave(open.id, { amount: +e.target.value || 0 })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="budget-payments-f4" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Due date</label>
                  <input id="budget-payments-f4"
                    type="date"
                    defaultValue={open.due_date ?? ""}
                    onChange={(e) => scheduleSave(open.id, { due_date: e.target.value || null })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={open.status === "paid"}
                  onChange={(e) => saveNow(open.id, { status: e.target.checked ? "paid" : "upcoming" })}
                  className="h-4 w-4 accent-sage-deep"
                />
                Paid
              </label>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="budget-payments-f5" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Payment method</label>
                  <input id="budget-payments-f5"
                    defaultValue={open.method}
                    onChange={(e) => scheduleSave(open.id, { method: e.target.value })}
                    placeholder="e.g. e-transfer"
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="budget-payments-f6" className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Confirmation #</label>
                  <input id="budget-payments-f6"
                    defaultValue={open.confirmation_number}
                    onChange={(e) => scheduleSave(open.id, { confirmation_number: e.target.value })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <label htmlFor="budget-payments-f7" className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Receipt or contract link</label>
              <input id="budget-payments-f7"
                defaultValue={open.link}
                onChange={(e) => scheduleSave(open.id, { link: e.target.value })}
                placeholder="Paste a link to the file"
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <label htmlFor="budget-payments-f8" className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Notes</label>
              <textarea id="budget-payments-f8"
                defaultValue={open.notes}
                onChange={(e) => scheduleSave(open.id, { notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <button onClick={() => removePayment(open.id)} className="mt-4 text-xs font-semibold text-wine">
                Delete this payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
