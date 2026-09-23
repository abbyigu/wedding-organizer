import Link from "next/link";
import { Camera, Check, Heart } from "lucide-react";
import {
  AVAILABILITY_LABELS,
  CARD_STATE_LABEL,
  CARD_STATE_STYLE,
  fmtMoney,
  formatShortDate,
  isFavourite,
  priceRange,
  type CardState,
  type PaymentSummary,
  type Vendor,
} from "@/lib/vendors";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function VendorPhoto({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_30%_30%,color-mix(in_srgb,var(--gold)_30%,var(--paper)),color-mix(in_srgb,var(--surface-blush)_25%,var(--paper)))] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Camera className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-ink-2" strokeWidth={1.25} aria-hidden />
      )}
    </div>
  );
}

const quoteStatus = (v: Pick<Vendor, "communication_status" | "quoted_total">) =>
  v.communication_status === "quote_received" || v.quoted_total != null ? "Received" : v.communication_status === "not_contacted" ? "Not requested" : "Requested";

function StateBadge({ state, label }: { state: CardState; label?: string }) {
  return (
    <span className={`pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${CARD_STATE_STYLE[state]}`}>
      {state === "booked" && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
      {label ?? CARD_STATE_LABEL[state]}
    </span>
  );
}

type Common = { vendor: Vendor; src: string; state: CardState; attention: string | null };

export function PotentialCard({
  vendor: v,
  src,
  state,
  attention,
  compare,
  onReaction,
}: Common & {
  compare: { checked: boolean; disabled: boolean; hint: string; onToggle: () => void };
  onReaction: (who: "ariel" | "fred") => void;
}) {
  const passed = v.decision_status === "rejected";
  const price = v.quoted_total != null ? ["Quote", fmtMoney(v.quoted_total)] : ["Estimated", priceRange(v) || "Not yet known"];
  const avail = v.availability === "unknown" ? null : v.availability === "available" ? "Available ✓" : AVAILABILITY_LABELS[v.availability];
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm ${passed ? "opacity-70" : ""}`}>
      <div className="relative">
        <Link href={`/vendors/${v.id}`} tabIndex={-1} aria-hidden className="block">
          <VendorPhoto src={src} className="aspect-[4/3] w-full" />
        </Link>
        <StateBadge state={passed ? "researching" : state} label={passed ? "Passed" : attention && state === "attention" ? attention : undefined} />
        {isFavourite(v) && (
          <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] px-3 py-1 text-xs font-semibold text-ink shadow-sm">
            <Heart className="h-3.5 w-3.5 fill-wine text-wine" strokeWidth={1.5} aria-hidden /> Favourite
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Link href={`/vendors/${v.id}`} className={`w-fit rounded font-serif text-2xl leading-tight ${FOCUS_RING}`}>{v.name}</Link>
        <p className="text-sm text-ink-2">{[v.category, v.city].filter(Boolean).join(" · ")}</p>
        {v.tagline && <p className="font-serif text-[15px] italic leading-snug text-ink-2">“{v.tagline}”</p>}
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {avail && (
            <>
              <dt className="text-ink-2">Availability</dt>
              <dd className="font-medium">{avail}</dd>
            </>
          )}
          <dt className="text-ink-2">{price[0]}</dt>
          <dd className="font-medium">{price[1]}</dd>
          <dt className="text-ink-2">Quote</dt>
          <dd>{quoteStatus(v)}</dd>
        </dl>
        <div className="mt-2 flex gap-2">
          {(["ariel", "fred"] as const).map((who) => {
            const on = v[`${who}_reaction`] === "love";
            const name = who === "ariel" ? "Ariel" : "Fred";
            return (
              <button key={who} onClick={() => onReaction(who)} aria-pressed={on} aria-label={`${name}'s favourite: ${v.name}`} className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${FOCUS_RING} ${on ? "border-wine text-ink" : "border-line text-ink-2 hover:border-sage-deep"}`}>
                <Heart className={`h-4 w-4 ${on ? "fill-wine text-wine" : ""}`} strokeWidth={1.5} aria-hidden />
                {name}
              </button>
            );
          })}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <label className={`flex min-h-11 items-center gap-2 text-sm ${compare.disabled ? "text-ink-2" : "cursor-pointer"}`} title={compare.disabled ? compare.hint : undefined}>
            <input type="checkbox" checked={compare.checked} disabled={compare.disabled} onChange={compare.onToggle} className={`h-4 w-4 accent-sage-deep ${FOCUS_RING}`} />
            Compare
          </label>
          <Link href={`/vendors/${v.id}`} className={`flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-ink hover:text-sage-deep ${FOCUS_RING}`}>
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function BookedCard({ vendor: v, src, state, attention, pay }: Common & { pay: PaymentSummary }) {
  const arrival = v.arrival_time ? `Arrives ${v.arrival_time}` : "";
  const action = attention ?? (pay.next ? "" : arrival);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      <div className="relative">
        <Link href={`/vendors/${v.id}`} tabIndex={-1} aria-hidden className="block">
          <VendorPhoto src={src} className="aspect-[16/10] w-full" />
        </Link>
        <StateBadge state={state} label={state === "booked" ? "Booked" : undefined} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link href={`/vendors/${v.id}`} className={`w-fit rounded font-serif text-2xl leading-tight ${FOCUS_RING}`}>{v.name}</Link>
        <p className="text-sm text-ink-2">{[v.category, v.city].filter(Boolean).join(" · ")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
          {[
            ["Contracted", pay.contracted != null ? fmtMoney(pay.contracted) : "Not set"],
            ["Paid", fmtMoney(pay.paid)],
            ["Still owed", pay.owed != null ? fmtMoney(pay.owed) : "—"],
            ["Next payment", pay.next ? `${pay.next.due_date ? formatShortDate(pay.next.due_date) : "No date"} · ${fmtMoney(pay.next.amount)}` : "None scheduled"],
          ].map(([k, val]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-2">{k}</dt>
              <dd className="mt-0.5 font-serif text-lg leading-tight">{val}</dd>
            </div>
          ))}
        </dl>
        {action && <p className={`mt-2 text-sm ${attention ? "font-medium text-wine" : "text-ink-2"}`}>{action}</p>}
        <div className="mt-auto flex justify-end border-t border-line pt-3">
          <Link href={`/vendors/${v.id}`} className={`flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-ink hover:text-sage-deep ${FOCUS_RING}`}>
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}
