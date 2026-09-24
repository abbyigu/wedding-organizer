// Shown the instant any page is opened, while its data loads, so a click always answers straight away.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="min-h-screen pb-20 lg:pl-56">
      <div className="mx-auto max-w-[1100px] animate-pulse space-y-5 px-4 py-10 sm:px-6 lg:px-8 motion-reduce:animate-none">
        <div className="h-3 w-24 rounded bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]" />
        <div className="h-12 w-72 max-w-full rounded-lg bg-[color-mix(in_srgb,var(--sage)_22%,var(--paper))]" />
        <div className="h-5 w-96 max-w-full rounded bg-[color-mix(in_srgb,var(--gold)_16%,var(--paper))]" />
        <div className="grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-52 rounded-3xl bg-[color-mix(in_srgb,var(--sage)_16%,var(--paper))]" />
          <div className="h-52 rounded-3xl bg-[color-mix(in_srgb,var(--gold)_12%,var(--paper))]" />
          <div className="hidden h-52 rounded-3xl bg-[color-mix(in_srgb,var(--surface-blush)_10%,var(--paper))] xl:block" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
