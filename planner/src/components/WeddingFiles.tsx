"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FOCUS_RING } from "@/components/VendorUi";
import { FILE_KIND_LABELS, FILE_KINDS, formatShortDate } from "@/lib/vendors";

export type FileEntry = { key: string; kind: string; name: string; owner: string; ownerType: "Vendor" | "Venue"; href: string; url: string; bucket: string; path: string; added: string };

const PLURAL: Record<string, string> = { quote: "Quotes", contract: "Contracts", invoice: "Invoices", pricing_sheet: "Pricing sheets", menu: "Menus", portfolio: "Portfolios", insurance: "Insurance", other: "Other files" };
const ORDER = ["contract", "quote", "invoice", ...FILE_KINDS.filter((k) => !["contract", "quote", "invoice"].includes(k))];

export default function WeddingFiles({ entries, needsMigration }: { entries: FileEntry[]; needsMigration: boolean }) {
  const supabase = createClient();
  const [kind, setKind] = useState("all");
  const [error, setError] = useState("");
  const counts = ORDER.map((k) => ({ k, n: entries.filter((e) => e.kind === k).length })).filter((x) => x.n > 0);
  const shown = ORDER.filter((k) => kind === "all" || k === kind).map((k) => ({ k, items: entries.filter((e) => e.kind === k).sort((a, b) => b.added.localeCompare(a.added)) })).filter((g) => g.items.length > 0);

  async function open(f: FileEntry) {
    setError("");
    if (f.url) return window.open(f.url, "_blank", "noopener,noreferrer");
    const { data, error: err } = await supabase.storage.from(f.bucket).createSignedUrl(f.path, 300);
    if (err || !data) return setError(err?.message ?? "Couldn't open that file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <h2 className="font-serif text-4xl font-light tracking-[-0.02em]">Files &amp; contracts</h2>
      <p className="mt-2 max-w-xl text-ink-2">Everything attached to a venue or vendor, in one place. Each file stays with its owner, so adding or removing it there updates it here.</p>
      {needsMigration && <p role="status" className="mt-4 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-5 py-3 text-sm">Vendor files need migration 046 to have been run. Venue files are shown below.</p>}

      {entries.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-line px-6 py-12 text-center text-ink-2">No files yet. Add a quote or contract on a venue&apos;s Files tab or a vendor&apos;s Files tab and it will appear here.</p>
      ) : (
        <>
          <div role="group" aria-label="File type" className="mt-6 flex flex-wrap gap-2">
            {[{ k: "all", label: "All", n: entries.length }, ...counts.map((c) => ({ k: c.k, label: PLURAL[c.k], n: c.n }))].map((c) => (
              <button key={c.k} onClick={() => setKind(c.k)} aria-pressed={kind === c.k} className={`min-h-11 rounded-full border px-4 text-sm font-medium ${kind === c.k ? "border-surface-green bg-surface-green text-white" : "border-line bg-paper hover:border-sage-deep"} ${FOCUS_RING}`}>
                {c.label} <span className="opacity-70">{c.n}</span>
              </button>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}
          <div className="mt-6 flex flex-col gap-8">
            {shown.map((g) => (
              <section key={g.k} aria-label={PLURAL[g.k]}>
                <h3 className="font-serif text-2xl font-light">{PLURAL[g.k]}</h3>
                <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper">
                  {g.items.map((f) => (
                    <li key={f.key} className="flex items-center gap-3 px-4 py-1">
                      {f.url ? <Link2 className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden /> : <FileText className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />}
                      <button onClick={() => open(f)} className={`min-h-11 min-w-0 flex-1 rounded text-left ${FOCUS_RING}`}>
                        <span className="block truncate font-medium underline-offset-2 hover:underline">{f.name || FILE_KIND_LABELS[f.kind]}</span>
                        <span className="block text-sm text-ink-2">{f.ownerType} · {f.owner}{f.added ? ` · added ${formatShortDate(f.added.slice(0, 10))}` : ""}</span>
                      </button>
                      <Link href={f.href} className={`shrink-0 rounded px-2 py-3 text-sm font-medium text-green underline underline-offset-2 ${FOCUS_RING}`}>Manage<span className="sr-only"> {f.name} on {f.owner}</span></Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
