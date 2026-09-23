import type { ReactNode } from "react";

export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
export const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm";
export const BTN = `flex h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-5 text-sm font-medium text-ink hover:border-sage-deep ${FOCUS_RING}`;
export const BTN_PRIMARY = `flex h-11 items-center justify-center gap-1.5 rounded-full bg-surface-olive px-5 text-sm font-medium text-white disabled:opacity-50 ${FOCUS_RING}`;

export function Field({ label, children, span2 = false }: { label: string; children: ReactNode; span2?: boolean }) {
  return (
    <label className={`block ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</span>
      {children}
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 font-serif text-xl font-medium">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// A labelled fact. Renders nothing when the value is empty, so cards only show what's been filled in.
export function Fact({ label, value }: { label: string; value: ReactNode }) {
  if (value === "" || value == null || value === false) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-[15px]">{value}</dd>
    </div>
  );
}
