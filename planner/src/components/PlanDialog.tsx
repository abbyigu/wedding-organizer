"use client";

import { Heart, X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { BTN, BTN_PRIMARY, FOCUS_RING } from "@/components/VendorUi";
import { money, type ScenarioResult } from "@/lib/wedding-scenarios";

// The one confirmation before a scenario becomes the plan the rest of the app works from.
export default function PlanDialog({ name, r, active, busy, error, onConfirm, onClose }: { name: string; r: ScenarioResult; active: boolean; busy: boolean; error: string; onConfirm: () => void; onClose: () => void }) {
  const ref = useDialog(true, onClose);
  const title = active ? "Step back from this plan?" : "Make this our wedding?";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-3xl font-light">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className={`-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg ${FOCUS_RING}`}>
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        {active ? (
          <p className="mt-2 text-ink-2">
            <b className="text-ink">{name}</b> will stay saved as a scenario. Budget and the Dashboard go back to working from your venue estimates until you choose another plan.
          </p>
        ) : (
          <>
            <p className="mt-2 text-ink-2">
              <b className="text-ink">{name}</b> becomes the plan the rest of The Wedding Room works from: {r.venue ? r.venue.name : "no venue yet"}, {money(r.projected)} projected{r.unknownCount > 0 ? ` (a minimum, with ${r.unknownCount} unknown cost${r.unknownCount === 1 ? "" : "s"})` : ""}.
            </p>
            <ul className="mt-4 flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
              <li>Budget uses this plan&apos;s total, breakdown and target.</li>
              <li>The Dashboard shows what&apos;s still missing from it.</li>
              <li>Its venue and vendors are marked <i>In our wedding</i> on their own pages.</li>
              <li>Your other scenarios stay exactly as they are, and you can change your mind any time.</li>
            </ul>
          </>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className={BTN}>Not yet</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`${BTN_PRIMARY} flex-1 ${active ? "" : "!bg-surface-wine"}`}>
            {!active && <Heart className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            {busy ? "Saving…" : active ? "Step back" : "Make this our wedding"}
          </button>
        </div>
      </div>
    </div>
  );
}
