"use client";

import { Envelope, Ribbon } from "@/components/PrivateArt";
import { usePrivateUrls } from "@/lib/use-private-urls";
import { shortDate, type RevealedSurprise, type Teaser } from "@/lib/private";

// What has been shared with you, and nothing else. Both lists come from database functions that return only the
// fields a surprise's creator has allowed, so there is nothing hidden behind CSS here.
export default function PrivateRevealed({ teasers, revealed, userName }: { teasers: Teaser[]; revealed: RevealedSurprise[]; userName: string }) {
  const urls = usePrivateUrls(revealed.map((r) => r.cover_path));
  if (teasers.length === 0 && revealed.length === 0) {
    return (
      <section aria-label="Revealed to me" className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
        <Ribbon className="h-20 w-24 text-wine/50" />
        <p className="mt-3 font-serif text-3xl font-light">Revealed surprises will become little memories here.</p>
        <p className="mt-1 max-w-sm text-ink-2">When something is meant for you, it will wait here until its moment.</p>
      </section>
    );
  }
  return (
    <section aria-label="Revealed to me" className="mt-8">
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {teasers.map((t) => (
          <li key={t.id} className="flex flex-col items-center rounded-3xl border border-[color-mix(in_srgb,var(--gold)_40%,var(--line))] bg-[color-mix(in_srgb,var(--gold)_8%,var(--paper))] px-6 py-8 text-center">
            <Envelope className="h-24 w-32 text-wine/70" />
            <p className="mt-3 font-serif text-2xl font-light">Something is waiting for you</p>
            <p className="mt-1 text-ink-2">From {t.owner_name}</p>
            {t.opens_on && <p className="mt-1 font-script text-2xl text-wine">Opens {shortDate(t.opens_on)} ♡</p>}
          </li>
        ))}
        {[...revealed].sort((a, b) => b.revealed_on.localeCompare(a.revealed_on)).map((r) => (
          <li key={r.id} className="flex flex-col overflow-hidden rounded-3xl border border-line bg-paper">
            {r.cover_path && urls[r.cover_path] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[r.cover_path]} alt="" className="h-48 w-full object-cover" />
            )}
            <div className="flex flex-col gap-2 p-5">
              <p className="font-script text-2xl text-wine">For {userName} ♡</p>
              <h3 className="font-serif text-2xl leading-tight">{r.title}</h3>
              {r.message && <p className="whitespace-pre-line font-serif text-[16px] italic leading-relaxed text-ink-2">{r.message}</p>}
              <p className="mt-1 text-sm text-ink-2">From {r.owner_name} · Revealed {shortDate(r.revealed_on)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
