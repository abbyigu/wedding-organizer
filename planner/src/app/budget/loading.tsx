export default function BudgetLoading() {
  return (
    <div role="status" aria-label="Loading" className="mt-6 animate-pulse space-y-4">
      <div className="h-8 w-56 rounded-lg bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-3xl bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))]" />
        <div className="h-48 rounded-3xl bg-[color-mix(in_srgb,var(--gold)_14%,var(--paper))]" />
      </div>
      <span className="sr-only">Loading the budget…</span>
    </div>
  );
}
