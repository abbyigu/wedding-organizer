"use client";

import { useDialog } from "@/lib/use-dialog";
import { useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import DashboardTopBar, { type Notice, type SearchItem } from "@/components/DashboardTopBar";
import { createClient } from "@/lib/supabase/client";
import { DECISION_CATEGORIES, type DecisionStatus, type DecisionStatusKind } from "@/lib/decisions";
import { ArrowRight, CircleCheck, Gift, Heart, Leaf, Plus, X } from "lucide-react";

export type DecisionSummary = {
  id: string;
  category: string;
  title: string;
  description: string;
  detail: string;
  image: string | null;
  createdAt: string;
  href: string;
  status: DecisionStatus;
  finalLabel?: string;
};

type Kind = DecisionStatusKind;

const FILTERS: { key: string; label: string; test: (k: Kind) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "still", label: "Still to decide", test: (k) => k === "not_started" || k === "in_progress" || k === "your_turn" },
  { key: "waiting", label: "Waiting on each other", test: (k) => k === "waiting_partner" },
  { key: "ready", label: "Ready to reveal", test: (k) => k === "ready_to_reveal" },
  { key: "decided", label: "Decided", test: (k) => k === "decided" },
];

const CTA_LABEL: Record<Kind, string> = {
  decided: "View decision",
  ready_to_reveal: "Reveal together",
  not_started: "Start deciding",
  in_progress: "Continue",
  your_turn: "Continue",
  waiting_partner: "View",
};

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const PILL = "rounded-full px-3 py-1 text-[13px] font-semibold";

const FALLBACK_PHOTO = "/photo-candlelit-table.jpg";

function Cover({ s, className }: { s: DecisionSummary; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={s.image ?? FALLBACK_PHOTO} alt="" loading="lazy" className={`${className} object-cover`} />;
}

function Count({ n, tone }: { n: number; tone: string }) {
  return (
    <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm text-ink ${tone}`}>{n}</span>
  );
}

function Empty({ icon: Icon, title, body }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <Icon className="h-9 w-9 text-ink-2" strokeWidth={1.25} aria-hidden />
      <p className="mt-4 font-serif text-lg">{title}</p>
      <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

function DecisionCard({ s }: { s: DecisionSummary }) {
  return (
    <Link href={s.href} className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm transition-colors hover:border-sage-deep ${FOCUS_RING}`}>
      <Cover s={s} className="h-36 w-full" />
      <div className="flex flex-1 flex-col p-4">
        <p className="font-serif text-lg leading-snug">{s.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.finalLabel ? `Chosen: ${s.finalLabel}` : s.description || s.detail || s.category}</p>
        {s.status.kind !== "not_started" && s.status.kind !== "decided" && <p className="mt-2 text-xs font-medium text-sage-deep">{s.status.label}</p>}
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface-rose)_22%,var(--paper))] px-4 py-2 text-sm text-ink">
          {CTA_LABEL[s.status.kind]}
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function DecideDashboard({ summaries, userName, partner }: { summaries: DecisionSummary[]; userName: string; partner: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("All");
  const [newestFirst, setNewestFirst] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const newDialogRef = useDialog(showNew, () => setShowNew(false));
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState(DECISION_CATEGORIES[1]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const categories = useMemo(() => ["All", ...Array.from(new Set(summaries.map((s) => s.category)))], [summaries]);

  const visible = summaries
    .filter((s) => category === "All" || s.category === category)
    .sort((a, b) => (newestFirst ? -1 : 1) * a.createdAt.localeCompare(b.createdAt));
  const group = (key: string) => visible.filter((s) => FILTERS.find((f) => f.key === key)!.test(s.status.kind));
  const still = group("still");
  const waiting = group("waiting");
  const ready = group("ready");
  const decidedList = group("decided");
  const show = (key: string) => filter === "all" || filter === key;

  const needsAttention = summaries
    .filter((s) => s.status.kind !== "decided")
    .sort((a, b) => {
      const order: Kind[] = ["ready_to_reveal", "your_turn", "in_progress", "waiting_partner", "not_started"];
      return order.indexOf(a.status.kind) - order.indexOf(b.status.kind);
    })
    .slice(0, 2);

  const count = (key: string) => summaries.filter((s) => FILTERS.find((f) => f.key === key)!.test(s.status.kind)).length;
  const stats = [
    { n: count("decided"), label: "Decided" },
    { n: count("ready"), label: "Ready to reveal" },
    { n: count("still"), label: "Still to decide" },
    { n: count("waiting"), label: `Waiting on ${partner}` },
  ];

  const searchItems: SearchItem[] = summaries.map((s) => ({ label: s.title, hint: "Decision", href: s.href }));
  const notices: Notice[] = summaries
    .filter((s) => s.status.kind === "ready_to_reveal" || s.status.kind === "your_turn")
    .map((s) => ({ label: s.status.kind === "ready_to_reveal" ? `${s.title} is ready to reveal` : `${partner} has voted on ${s.title}`, href: s.href }));

  async function createDecision() {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError("");
    const { data, error } = await supabase
      .from("decisions")
      .insert({ title: newTitle.trim(), category: newCategory, sort_order: summaries.length })
      .select()
      .single();
    setCreating(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/decide/${data.id}`);
  }

  const selectClass = `rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink ${FOCUS_RING}`;

  return (
    <div className="min-h-screen pb-16 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardTopBar userName={userName} partner={partner} items={searchItems} notices={notices} />

        <header className="relative mt-8">
          <h1 className="font-serif text-5xl font-light tracking-[-0.02em] sm:text-6xl xl:text-[4.5rem]">Decide together</h1>
          <p className="mt-3 text-lg text-ink-2">Every choice brings your wedding into focus.</p>
          <div className="pointer-events-none absolute right-0 top-0 hidden md:block" aria-hidden>
            <p className="absolute right-24 top-2 -rotate-[8deg] text-right font-script text-[1.7rem] leading-[1.1] text-sage-deep">
              Better
              <br />
              decisions
              <br />
              together
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/botanical-accent.webp" width={350} height={420} alt="" className="h-40 w-auto rotate-6 opacity-70" />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-line">
            {stats.map(({ n, label }) => (
              <div key={label} className="sm:px-8 sm:first:pl-3">
                <dd className="font-serif text-3xl font-light">{n}</dd>
                <dt className="text-sm text-ink-2">{label}</dt>
              </div>
            ))}
          </dl>
        </header>

        {needsAttention.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-serif text-2xl font-light">What needs you now</h2>
              <Link href="#all-decisions" className={`rounded text-sm font-semibold text-wine ${FOCUS_RING}`}>
                View all decisions <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
              {needsAttention.map((s, i) => (
                <Link key={s.id} href={s.href} className={`group relative flex min-h-[17rem] overflow-hidden rounded-2xl text-white ${FOCUS_RING}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image ?? FALLBACK_PHOTO} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/5" />
                  <div className="relative flex flex-col justify-end p-6 sm:p-8">
                    <p className="text-[11px] font-medium uppercase tracking-[0.24em]">{s.category}</p>
                    <p className="mt-2 max-w-[16rem] text-balance font-serif text-3xl font-light leading-[1.05] sm:text-4xl">{s.title}</p>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed">{s.detail || s.description || s.status.label}</p>
                    <span
                      className={`mt-5 inline-flex w-fit items-center gap-3 rounded-full px-6 py-3 text-base ${
                        i === 0 ? "bg-surface-wine text-white" : "bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-ink"
                      }`}
                    >
                      {s.status.kind === "ready_to_reveal" ? "Reveal together" : i === 0 ? "Continue decision" : "Decide together"}
                      <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section id="all-decisions" className="mt-12 scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-light">Your wedding decisions</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Filter decisions" className="flex flex-wrap rounded-full border border-line bg-paper p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    aria-pressed={filter === f.key}
                    className={`${PILL} ${FOCUS_RING} ${filter === f.key ? "bg-surface-sage-deep text-white" : "text-ink hover:bg-bg"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {categories.length > 2 && (
                <select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>
                  ))}
                </select>
              )}
              <select aria-label="Sort decisions" value={newestFirst ? "new" : "old"} onChange={(e) => setNewestFirst(e.target.value === "new")} className={selectClass}>
                <option value="new">Newest first</option>
                <option value="old">Oldest first</option>
              </select>
              <button
                onClick={() => setShowNew(true)}
                className={`flex items-center gap-1.5 rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}
              >
                <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> New decision
              </button>
            </div>
          </div>

          <div className={`mt-6 grid gap-8 ${filter === "all" ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-0" : ""}`}>
            {show("still") && (
              <div className="lg:pr-8">
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-xl">Still to decide</h3>
                  <Count n={still.length} tone="bg-[color-mix(in_srgb,var(--surface-rose)_30%,var(--paper))]" />
                </div>
                {still.length === 0 ? (
                  <Empty icon={CircleCheck} title="Nothing left to decide" body="Every open decision is with one of you or already made." />
                ) : (
                  <div className={`mt-4 grid gap-4 ${filter === "all" ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {still.map((s) => <DecisionCard key={s.id} s={s} />)}
                  </div>
                )}
              </div>
            )}
            {show("waiting") && (
              <div className={filter === "all" ? "lg:border-l lg:border-line lg:px-8" : ""}>
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-xl">Waiting on each other</h3>
                  <Count n={waiting.length} tone="bg-[color-mix(in_srgb,var(--surface-rose)_30%,var(--paper))]" />
                </div>
                {waiting.length === 0 ? (
                  <Empty icon={Heart} title="All caught up!" body="When a decision is waiting on one of you, it will show up here." />
                ) : (
                  <div className={`mt-4 grid gap-4 ${filter === "all" ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {waiting.map((s) => <DecisionCard key={s.id} s={s} />)}
                  </div>
                )}
              </div>
            )}
            {show("ready") && (
              <div className={filter === "all" ? "lg:border-l lg:border-line lg:pl-8" : ""}>
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-xl">Ready to reveal</h3>
                  <Count n={ready.length} tone="bg-[color-mix(in_srgb,var(--gold)_25%,var(--paper))]" />
                </div>
                {ready.length === 0 ? (
                  <Empty icon={Gift} title="Nothing to reveal yet!" body="Keep planning — a decision shows here once you've both voted on every option." />
                ) : (
                  <div className={`mt-4 grid gap-4 ${filter === "all" ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {ready.map((s) => <DecisionCard key={s.id} s={s} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {show("decided") && (
          <section className="mt-12 border-t border-line pt-8">
            <div className="flex items-center gap-3">
              <Leaf className="h-6 w-6 text-sage-deep" strokeWidth={1.25} aria-hidden />
              <h2 className="font-serif text-2xl font-light">Decided together</h2>
              <Count n={decidedList.length} tone="bg-[color-mix(in_srgb,var(--surface-rose)_30%,var(--paper))]" />
            </div>
            {decidedList.length === 0 ? (
              <div className="relative mt-5 overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_22%,var(--paper))] px-6 py-9 text-center">
                <p className="font-semibold">No decisions yet</p>
                <p className="mt-1 text-sm text-ink-2">Once you&apos;ve made a decision together, it will appear here as a keepsake.</p>
                <p aria-hidden className="pointer-events-none absolute bottom-3 right-8 hidden -rotate-6 text-right font-script text-2xl leading-[1.1] text-sage-deep md:block">
                  So many
                  <br />
                  beautiful decisions
                  <br />
                  ahead
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {decidedList.map((s) => <DecisionCard key={s.id} s={s} />)}
              </div>
            )}
          </section>
        )}

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowNew(false)}>
            <div ref={newDialogRef} role="dialog" aria-modal="true" aria-label="New decision" tabIndex={-1} className="w-full max-w-sm rounded-2xl border border-line bg-paper p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-medium">New decision</h3>
                <button onClick={() => setShowNew(false)} aria-label="Close">
                  <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              <p className="mt-1 text-sm text-ink-2">What are {userName} and {partner} deciding?</p>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Choose our wedding colours"
                className="mt-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
                autoFocus
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
              >
                {DECISION_CATEGORIES.filter((c) => c !== "Venue").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {error && <p className="mt-2 text-sm text-wine">{error}</p>}
              <button
                onClick={createDecision}
                disabled={!newTitle.trim() || creating}
                className="mt-3 w-full rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create decision"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
