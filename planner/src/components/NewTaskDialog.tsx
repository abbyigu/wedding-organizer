"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import {
  CATEGORIES,
  STATUS_LABELS,
  STATUS_ORDER,
  type Assignee,
  type PlanningTask,
  type TaskStatus,
} from "@/lib/planning-tasks";

const FIELD =
  "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

export type NewTask = Pick<
  PlanningTask,
  "title" | "category" | "status" | "assigned_to" | "notes"
> & { due_date: string | null; start_date: string | null; isDiy: boolean };

export default function NewTaskDialog({
  onClose,
  onCreate,
  defaultCategory = "Other",
}: {
  onClose: () => void;
  onCreate: (t: NewTask) => Promise<string | null>;
  defaultCategory?: string;
}) {
  const ref = useDialog(true, onClose);
  const [f, setF] = useState({
    title: "",
    category: defaultCategory,
    status: "todo" as TaskStatus,
    assigned_to: "together" as Assignee,
    notes: "",
    due: "",
    start: "",
    isDiy: false,
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return;
    setSaving(true);
    const category = f.isDiy ? "DIY" : f.category;
    const error = await onCreate({
      title: f.title.trim(),
      category,
      status: f.status,
      assigned_to: f.assigned_to,
      notes: f.notes,
      due_date: f.due || null,
      start_date: f.isDiy && f.start ? f.start : null,
      isDiy: f.isDiy,
    });
    setSaving(false);
    if (error) setErr(error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Add a task"
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg"
      >
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light">Add a task</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <label htmlFor="nt-title" className={`${LABEL} mt-4`}>
            Task
          </label>
          <input
            id="nt-title"
            autoFocus
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Order the aisle flowers"
            className={FIELD}
          />

          <label className="mt-4 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={f.isDiy}
              onChange={(e) => set("isDiy", e.target.checked)}
              className="h-4 w-4 accent-sage-deep"
            />
            This is a DIY project
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {!f.isDiy && (
              <div>
                <label htmlFor="nt-cat" className={LABEL}>
                  Category
                </label>
                <select
                  id="nt-cat"
                  value={f.category}
                  onChange={(e) => set("category", e.target.value)}
                  className={FIELD}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="nt-status" className={LABEL}>
                Status
              </label>
              <select
                id="nt-status"
                value={f.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
                className={FIELD}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nt-who" className={LABEL}>
                Assigned to
              </label>
              <select
                id="nt-who"
                value={f.assigned_to}
                onChange={(e) => set("assigned_to", e.target.value as Assignee)}
                className={FIELD}
              >
                <option value="together">Both of us</option>
                <option value="ariel">Ariel</option>
                <option value="fred">Fred</option>
              </select>
            </div>
            <div>
              <label htmlFor="nt-due" className={LABEL}>
                {f.isDiy ? "Finish by" : "Target date"}
              </label>
              <input
                id="nt-due"
                type="date"
                value={f.due}
                onChange={(e) => set("due", e.target.value)}
                className={FIELD}
              />
            </div>
            {f.isDiy && (
              <div>
                <label htmlFor="nt-start" className={LABEL}>
                  Start date
                </label>
                <input
                  id="nt-start"
                  type="date"
                  value={f.start}
                  onChange={(e) => set("start", e.target.value)}
                  className={FIELD}
                />
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-2">
            Leave the date empty to keep it under “Unscheduled” until you choose
            one.
          </p>

          <label htmlFor="nt-notes" className={`${LABEL} mt-4`}>
            Notes
          </label>
          <textarea
            id="nt-notes"
            rows={3}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={FIELD}
          />

          {err && <p className="mt-3 text-sm text-wine">{err}</p>}
          <div className="mt-5 flex items-center gap-2">
            <button
              type="submit"
              disabled={!f.title.trim() || saving}
              className="rounded-full bg-surface-wine px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:border-sage-deep"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
