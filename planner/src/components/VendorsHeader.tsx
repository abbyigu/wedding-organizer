"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import DashboardTopBar, { type Notice, type SearchItem } from "@/components/DashboardTopBar";
import { useDialog } from "@/lib/use-dialog";
import { createClient } from "@/lib/supabase/client";
import { blankVendor, VENDOR_CATEGORIES } from "@/lib/vendors";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm";

export type VendorCounts = { potential: number; booked: number };

export default function VendorsHeader({ userName, partner, items, notices, counts }: { userName: string; partner: string; items: SearchItem[]; notices: Notice[]; counts: VendorCounts }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Photography");
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useDialog(adding, () => setAdding(false));

  const tabs = [
    { href: "/vendors", label: "Potential", count: counts.potential, active: pathname === "/vendors" },
    { href: "/vendors/booked", label: "Booked", count: counts.booked, active: pathname === "/vendors/booked" },
    { href: "/vendors/compare", label: "Compare", count: null, active: pathname.startsWith("/vendors/compare") },
  ];

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const row = { ...blankVendor(Math.floor(Date.now() / 1000), category), name: name.trim(), status: booked ? "booked" : "researching", booked_on: booked ? new Date().toISOString().slice(0, 10) : null };
    const { data, error } = await supabase.from("vendors").insert(row).select("id").single();
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "Couldn't add the vendor.");
      return;
    }
    setAdding(false);
    setName("");
    router.push(`/vendors/${data.id}?edit=1`);
  }

  return (
    <>
      <DashboardTopBar userName={userName} partner={partner} items={items} notices={notices} placeholder="Search vendors, categories, or keywords…" />

      <header className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-2">Our wedding team</p>
          <h1 className="mt-2 font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">Vendors</h1>
          <p className="mt-3 max-w-md font-script text-2xl leading-snug text-ink-2">The people who could bring it all to life.</p>
        </div>
        <button onClick={() => setAdding(true)} className={`flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface-olive px-6 text-sm font-medium text-white ${FOCUS_RING}`}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          Add vendor
        </button>
      </header>

      <nav aria-label="Vendor views" className="mt-6 flex gap-8 border-b border-line">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={`flex min-h-11 items-center gap-2 border-b-2 text-lg ${FOCUS_RING} ${t.active ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}>
            {t.label}
            {t.count != null && <span className="text-sm text-ink-2">{t.count}</span>}
          </Link>
        ))}
      </nav>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" tabIndex={-1} onClick={() => setAdding(false)} className="absolute inset-0" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Add a vendor" tabIndex={-1} className="relative w-full max-w-md rounded-2xl bg-paper p-6 shadow-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-serif text-3xl font-light">Add a vendor</h2>
              <button type="button" onClick={() => setAdding(false)} aria-label="Close" className={`-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-bg ${FOCUS_RING}`}>
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-2">Start with the basics. Photos, pricing and everything else come after.</p>
            <label htmlFor="add-vendor-name" className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ink-2">Name</label>
            <input id="add-vendor-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Studio Les Fleurs" className={FIELD} />
            <label htmlFor="add-vendor-category" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-2">Category</label>
            <select id="add-vendor-category" value={category} onChange={(e) => setCategory(e.target.value)} className={FIELD}>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-ink-2">Where are they?</legend>
              <div className="mt-2 flex gap-2">
                {[
                  { v: false, label: "Just exploring" },
                  { v: true, label: "Already booked" },
                ].map((o) => (
                  <label key={o.label} className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full border px-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sage-deep ${booked === o.v ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-bg text-ink"}`}>
                    <input type="radio" name="add-vendor-stage" checked={booked === o.v} onChange={() => setBooked(o.v)} className="sr-only" />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}
            <button type="submit" disabled={busy || !name.trim()} className={`mt-6 h-11 w-full rounded-full bg-surface-olive text-sm font-medium text-white disabled:opacity-50 ${FOCUS_RING}`}>
              {busy ? "Adding…" : "Add vendor"}
            </button>
          </form>
          </div>
        </div>
      )}
    </>
  );
}
