"use client";

import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import NavBar from "@/components/NavBar";
import PrivateNotes from "@/components/PrivateNotes";
import PrivateRevealed from "@/components/PrivateRevealed";
import PrivateSurprises from "@/components/PrivateSurprises";
import { Sprig } from "@/components/PrivateArt";
import type { EventRef, PrivateNote, RevealedSurprise, Surprise, Teaser } from "@/lib/private";

type Tab = "space" | "surprises" | "revealed";

export default function Private({
  initialNotes,
  initialSurprises,
  teasers,
  revealed,
  events,
  weddingDate,
  userName,
  userId,
  partner,
  initialTab,
  needsMigration,
}: {
  initialNotes: PrivateNote[];
  initialSurprises: Surprise[];
  teasers: Teaser[];
  revealed: RevealedSurprise[];
  events: EventRef[];
  weddingDate: string | null;
  userName: string;
  userId: string;
  partner: string;
  initialTab: Tab;
  needsMigration: boolean;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [notes, setNotes] = useState(initialNotes);
  const [surprises, setSurprises] = useState(initialSurprises);
  const [error, setError] = useState("");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ space: null, surprises: null, revealed: null });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "space", label: "My Private Space", count: notes.length },
    { key: "surprises", label: "Surprises", count: surprises.length },
    { key: "revealed", label: "Revealed to Me", count: revealed.length + teasers.length },
  ];
  function onKey(e: React.KeyboardEvent, i: number) {
    const to = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : -1;
    if (to < 0) return;
    e.preventDefault();
    setTab(tabs[to].key);
    tabRefs.current[tabs[to].key]?.focus();
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="relative mx-auto max-w-[1100px] overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <Sprig aria-hidden className="pointer-events-none absolute right-4 top-4 hidden h-40 w-32 rotate-6 text-sage-deep/30 sm:block" />
        <header className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-wine">Private</p>
          <h1 className="mt-2 font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">Private</h1>
          <p className="mt-3 font-script text-3xl leading-snug text-wine">A little space that&apos;s only yours. ♡</p>
          <p className="mt-2 max-w-lg text-ink-2">Keep thoughts to yourself, plan a surprise, or save something for later.</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--surface-wine)_25%,var(--line))] bg-[color-mix(in_srgb,var(--surface-blush)_8%,var(--paper))] px-4 py-1.5 text-sm text-wine">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />Only {userName || "you"} can see your private space.
          </p>
        </header>

        {needsMigration && <p role="status" className="mt-6 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-5 py-4 text-sm">The new Private space needs one database update (migration 052) before notes, surprises and files can be saved.</p>}
        {error && <p role="alert" className="mt-4 text-sm text-wine">{error}</p>}

        <div role="tablist" aria-label="Private space" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => { tabRefs.current[t.key] = el; }}
              role="tab"
              id={`ptab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`ppanel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine ${tab === t.key ? "border-wine font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {t.label}
              {t.count > 0 && <span className="text-sm text-ink-2">{t.count}</span>}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`ppanel-${tab}`} aria-labelledby={`ptab-${tab}`}>
          {tab === "space" && <PrivateNotes notes={notes} setNotes={setNotes} userId={userId} onError={setError} />}
          {tab === "surprises" && <PrivateSurprises surprises={surprises} setSurprises={setSurprises} userName={userName} userId={userId} partner={partner} events={events} weddingDate={weddingDate} onError={setError} />}
          {tab === "revealed" && <PrivateRevealed teasers={teasers} revealed={revealed} userName={userName} />}
        </div>

        <p className="mt-14 text-center font-script text-2xl leading-snug text-sage-deep">Some things are worth keeping secret<br />for a little while. ♡</p>
      </div>
    </div>
  );
}
