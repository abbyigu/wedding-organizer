"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Heart, Scale, X } from "lucide-react";
import { VendorPhoto } from "@/components/VendorCard";
import { BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { createClient } from "@/lib/supabase/client";
import type { IdeaImage } from "@/lib/registry";
import {
  AVAILABILITY_LABELS,
  fmtMoney,
  PLURAL,
  photoSrc,
  PRICE_UNIT_LABELS,
  priceRange,
  SINGULAR,
  vendorPrice,
  type Vendor,
} from "@/lib/vendors";

const MAX = 4;

export default function VendorCompare({ candidates, initialIds, ideas, guests }: { candidates: Vendor[]; initialIds: string[]; ideas: IdeaImage[]; guests: { adults: number; kids: number } }) {
  const router = useRouter();
  const [ids, setIds] = useState(initialIds.filter((id) => candidates.some((v) => v.id === id)).slice(0, MAX));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ideaMap = useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);
  const chosen = ids.map((id) => candidates.find((v) => v.id === id)).filter((v): v is Vendor => Boolean(v));
  const category = chosen[0]?.category;

  const setAndSync = (next: string[]) => {
    setIds(next);
    router.replace(next.length ? `/vendors/compare?ids=${next.join(",")}` : "/vendors/compare", { scroll: false });
  };

  const prices = chosen.map((v) => vendorPrice(v, guests));
  const known = prices.filter((p) => p.amount != null).map((p) => p.amount as number);
  const lowest = known.length > 1 ? Math.min(...known) : null;

  async function makeDecision() {
    if (!category) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data: decision, error: err } = await supabase
      .from("decisions")
      .insert({ title: `Which ${SINGULAR[category] ?? "vendor"} should we choose?`, category: "Vendors", option_type: "vendor" })
      .select("id")
      .single();
    if (err || !decision) {
      setBusy(false);
      return setError(err?.message ?? "Couldn't start the decision.");
    }
    const { error: optErr } = await supabase.from("decision_options").insert(chosen.map((v, i) => ({ decision_id: decision.id, label: v.name, vendor_id: v.id, sort_order: i })));
    if (optErr) {
      setBusy(false);
      return setError(`${optErr.message} Has migration 046 been run?`);
    }
    router.push(`/decide/${decision.id}`);
  }

  if (chosen.length === 0) {
    const byCategory = [...new Set(candidates.map((v) => v.category))]
      .map((c) => ({ c, n: candidates.filter((v) => v.category === c).length }))
      .filter((x) => x.n >= 2);
    return (
      <div className="rounded-3xl border border-dashed border-line px-6 py-14 text-center">
        <Scale className="mx-auto h-8 w-8 text-ink-2" strokeWidth={1.25} aria-hidden />
        <p className="mt-3 font-serif text-3xl font-light">Put a few side by side</p>
        <p className="mx-auto mt-2 max-w-md text-ink-2">Tick “Compare” on two to four vendors in the same category, or start with a category that already has a few candidates.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {byCategory.map(({ c, n }) => (
            <Link key={c} href={`/vendors/compare?category=${encodeURIComponent(c)}`} className={`flex h-11 items-center rounded-full border border-line bg-paper px-5 text-sm hover:border-sage-deep ${FOCUS_RING}`}>
              {n} {PLURAL[c] ?? "vendors"}
            </Link>
          ))}
          {byCategory.length === 0 && (
            <Link href="/vendors" className={`flex h-11 items-center rounded-full border border-line px-5 text-sm hover:border-sage-deep ${FOCUS_RING}`}>Browse potential vendors</Link>
          )}
        </div>
      </div>
    );
  }

  const addable = candidates.filter((v) => v.category === category && !ids.includes(v.id));
  const cols = { gridTemplateColumns: `repeat(${chosen.length}, minmax(15rem, 1fr))` };

  // One labelled band per topic; each vendor's answer sits in its own column.
  const rows: { label: string; cell: (v: Vendor, i: number) => React.ReactNode }[] = [
    {
      label: "Price we’d use",
      cell: (v, i) => {
        const p = prices[i];
        return p.amount != null ? (
          <>
            <span className="font-serif text-3xl font-light">{fmtMoney(p.amount)}</span>
            <span className="block text-sm text-ink-2">{p.label}{p.note ? ` · ${p.note}` : ""}{lowest === p.amount && " · lowest"}</span>
          </>
        ) : (
          <>
            <span className="font-serif text-3xl font-light">Unknown</span>
            <span className="block text-sm text-ink-2">{p.note}</span>
          </>
        );
      },
    },
    {
      label: "Estimated · quoted",
      cell: (v) => [priceRange({ ...v, starting_price: null }) || "No estimate", v.quoted_total != null ? `quote ${fmtMoney(v.quoted_total)}` : "no quote yet"].join(" · "),
    },
    { label: "Our date", cell: (v) => (v.availability === "unknown" ? "Not asked yet" : AVAILABILITY_LABELS[v.availability]) },
    { label: "Package", cell: (v) => v.package_details || "—" },
    { label: "What’s included", cell: (v) => v.whats_included || "—" },
    { label: "Travel", cell: (v) => [v.travel_included ? "Included" : "", v.travel_fee != null ? `Fee ${fmtMoney(v.travel_fee)}` : "", v.travel_radius && `Up to ${v.travel_radius}`].filter(Boolean).join(" · ") || "—" },
    { label: "Service charge · deposit · taxes", cell: (v) => [v.service_charge_pct != null ? `${v.service_charge_pct}% service` : "No service charge noted", v.deposit_amount != null || v.deposit_required ? `Deposit ${[v.deposit_amount != null ? fmtMoney(v.deposit_amount) : "", v.deposit_required].filter(Boolean).join(", ")}` : "", v.tax_included ? "Taxes included" : "Taxes extra", PRICE_UNIT_LABELS[v.price_unit].toLowerCase()].filter(Boolean).join(" · ") },
    { label: "Style & services", cell: (v) => [v.tagline, v.add_ons && `Add-ons: ${v.add_ons}`].filter(Boolean).join("\n") || "—" },
    { label: "What we love", cell: (v) => v.pros || "—" },
    { label: "Concerns", cell: (v) => v.concerns || "—" },
    {
      label: "Who’s smitten",
      cell: (v) => (
        <span className="flex gap-4">
          {(["ariel", "fred"] as const).map((who) => (
            <span key={who} className="flex items-center gap-1.5">
              <Heart className={`h-4 w-4 ${v[`${who}_reaction`] === "love" ? "fill-wine text-wine" : "text-ink-2"}`} strokeWidth={1.5} aria-hidden />
              {who === "ariel" ? "Ariel" : "Fred"}
              <span className="sr-only">{v[`${who}_reaction`] === "love" ? " loves them" : " hasn’t picked them"}</span>
            </span>
          ))}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-light">Comparing {chosen.length} {PLURAL[category!] ?? "vendors"}</h2>
          <p className="mt-1 text-ink-2">Only what’s been filled in. Missing details show as a dash.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chosen.length < MAX && addable.length > 0 && (
            <label className="block">
              <span className="sr-only">Add another {SINGULAR[category!] ?? "vendor"} to compare</span>
              <select value="" onChange={(e) => e.target.value && setAndSync([...ids, e.target.value])} className={`${FIELD} !mt-0 h-11 rounded-full`}>
                <option value="">+ Add a {SINGULAR[category!] ?? "vendor"}…</option>
                {addable.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
          )}
          {chosen.length >= 2 && (
            <button onClick={makeDecision} disabled={busy} className={BTN_PRIMARY}>{busy ? "Starting…" : "Decide together →"}</button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
      {chosen.length === 1 && <p className="mt-3 text-sm text-ink-2">Add at least one more to compare.</p>}

      <div className="mt-6 overflow-x-auto pb-4">
        <div className="min-w-min">
          <div className="grid gap-x-6" style={cols}>
            {chosen.map((v) => (
              <div key={v.id} className="relative">
                <Link href={`/vendors/${v.id}`} className={`block rounded-2xl ${FOCUS_RING}`}>
                  <VendorPhoto src={photoSrc(v.photos[0], ideaMap)} className="aspect-[4/3] w-full rounded-2xl" />
                  <span className="mt-3 block font-serif text-2xl leading-tight">{v.name}</span>
                </Link>
                <p className="text-sm text-ink-2">{[v.category, v.city].filter(Boolean).join(" · ")}</p>
                <button onClick={() => setAndSync(ids.filter((x) => x !== v.id))} aria-label={`Remove ${v.name} from the comparison`} className={`absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 shadow-sm hover:bg-paper ${FOCUS_RING}`}>
                  <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </button>
              </div>
            ))}
          </div>
          {rows.map((r) => (
            <section key={r.label} className="mt-6 border-t border-line pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{r.label}</h3>
              <div className="mt-2 grid gap-x-6 gap-y-4" style={cols}>
                {chosen.map((v, i) => (
                  <div key={v.id} className="whitespace-pre-line text-[15px] leading-relaxed">
                    <span className="sr-only">{v.name}: </span>
                    {r.cell(v, i)}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
