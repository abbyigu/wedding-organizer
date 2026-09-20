"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { DECISION_CATEGORIES, type DecisionStatus, type DecisionStatusKind } from "@/lib/decisions";
import {
  Bus,
  CircleCheck,
  CircleHelp,
  Handshake,
  Landmark,
  Lock,
  Plus,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";

export type DecisionSummary = {
  id: string;
  category: string;
  title: string;
  description: string;
  href: string;
  status: DecisionStatus;
  finalLabel?: string;
};

const CATEGORY_ICON: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Venue: Landmark,
  Guests: Users,
  Budget: Wallet,
  Vendors: Handshake,
  "Style & Details": Sparkles,
  Ceremony: Sparkles,
  Reception: Sparkles,
  "Travel & Logistics": Bus,
};

const FILTERS: { key: string; label: string; test: (k: DecisionStatusKind) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "needs_you", label: "Needs you", test: (k) => k === "not_started" || k === "in_progress" || k === "your_turn" },
  { key: "waiting", label: "Waiting", test: (k) => k === "waiting_partner" },
  { key: "ready", label: "Ready to reveal", test: (k) => k === "ready_to_reveal" },
  { key: "completed", label: "Completed", test: (k) => k === "decided" },
];

const RING_COLOR: Record<DecisionStatusKind, string> = {
  decided: "var(--sage-deep)",
  ready_to_reveal: "var(--wine)",
  not_started: "var(--gold)",
  in_progress: "var(--sage-deep)",
  your_turn: "var(--sage-deep)",
  waiting_partner: "var(--sage-deep)",
};

const CTA_LABEL: Record<DecisionStatusKind, string> = {
  decided: "View decision →",
  ready_to_reveal: "Reveal together →",
  not_started: "Start →",
  in_progress: "Continue →",
  your_turn: "Continue →",
  waiting_partner: "View →",
};

function Ring({ status, Icon }: { status: DecisionStatus; Icon: ComponentType<{ className?: string; strokeWidth?: number }> }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const filled = status.kind === "not_started" ? 0.08 : status.progress;
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={RING_COLOR[status.kind]}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - filled)}
        />
      </svg>
      <span className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-bg text-ink-2">
        {status.kind === "ready_to_reveal" ? (
          <Lock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        )}
      </span>
      {status.kind === "decided" && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-sage-deep text-white">
          <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </span>
      )}
    </div>
  );
}

export default function DecideDashboard({ summaries, userName, partner }: { summaries: DecisionSummary[]; userName: string; partner: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("All");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState(DECISION_CATEGORIES[1]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const categories = useMemo(() => ["All", ...Array.from(new Set(summaries.map((s) => s.category)))], [summaries]);

  const activeFilterTest = FILTERS.find((f) => f.key === filter)?.test ?? (() => true);
  const filtered = summaries.filter((s) => activeFilterTest(s.status.kind) && (category === "All" || s.category === category));

  const needsAttention = summaries
    .filter((s) => s.status.kind !== "decided")
    .sort((a, b) => {
      const order: DecisionStatusKind[] = ["ready_to_reveal", "your_turn", "in_progress", "waiting_partner", "not_started"];
      return order.indexOf(a.status.kind) - order.indexOf(b.status.kind);
    })
    .slice(0, 3);

  const decided = summaries.filter((s) => s.status.kind === "decided").length;
  const readyToReveal = summaries.filter((s) => s.status.kind === "ready_to_reveal").length;
  const stillToDecide = summaries.filter((s) => ["not_started", "in_progress", "your_turn"].includes(s.status.kind)).length;
  const waitingOnPartner = summaries.filter((s) => s.status.kind === "waiting_partner").length;

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

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Decide together</h1>
            <p className="mt-2 max-w-2xl text-ink-2">Every choice brings your wedding into focus.</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> New decision
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:grid-cols-4">
          {[
            { n: decided, label: "Decided" },
            { n: readyToReveal, label: "Ready to reveal" },
            { n: stillToDecide, label: "Still to decide" },
            { n: waitingOnPartner, label: `Waiting on ${partner}` },
          ].map(({ n, label }) => (
            <div key={label}>
              <p className="font-serif text-3xl font-medium">{n}</p>
              <p className="text-sm text-ink-2">{label}</p>
            </div>
          ))}
        </div>

        {needsAttention.length > 0 && (
          <div className="mt-8">
            <h2 className="font-serif text-xl font-medium">What needs you now</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {needsAttention.map((s) => {
                const Icon = CATEGORY_ICON[s.category] ?? CircleHelp;
                return (
                  <Link key={s.id} href={s.href} className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 shadow-sm hover:border-sage-deep">
                    <div className="flex items-center gap-2">
                      <Ring status={s.status} Icon={Icon} />
                      <div>
                        <p className="font-semibold">{s.title}</p>
                        <p className="text-xs text-ink-2">{s.category}</p>
                      </div>
                    </div>
                    <p className="text-sm text-sage-deep">{s.status.label}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-medium">Your wedding decisions</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-line bg-paper p-1 text-sm">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-3 py-1 font-semibold ${filter === f.key ? "bg-surface-sage-deep text-white" : "text-ink-2 hover:bg-bg"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {categories.length > 2 && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 text-sm text-ink-2">No decisions match this filter.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const Icon = CATEGORY_ICON[s.category] ?? CircleHelp;
              return (
                <Link key={s.id} href={s.href} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4 shadow-sm hover:border-sage-deep">
                  <Ring status={s.status} Icon={Icon} />
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-ink-2">{s.finalLabel ? s.finalLabel : s.description || s.category}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-sm">
                    <span className="text-ink-2">{s.status.label}</span>
                    <span className="font-semibold text-sage-deep">{CTA_LABEL[s.status.kind]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowNew(false)}>
            <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-medium">New decision</h3>
                <button onClick={() => setShowNew(false)} aria-label="Close">
                  <X className="h-5 w-5" strokeWidth={1.75} />
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
