"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Ellipsis, FolderInput, Heart, Lock, Pencil, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import {
  blankIdea,
  collectionTabs,
  DECISION_STATUS_COLOR,
  DECISION_STATUS_ORDER,
  decisionStatusLabel,
  IDEA_CATEGORIES,
  normalizeUrl,
  partnerName,
  type DecisionStatus,
  type IdeaPin,
} from "@/lib/ideas";

const CARD_TRANSITION = "transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function StatusBadge({ status, partner }: { status: DecisionStatus; partner: string }) {
  const color = DECISION_STATUS_COLOR[status];
  return (
    <span
      className="inline-block truncate rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `color-mix(in srgb, var(--${color}) 20%, var(--paper))`, color: `var(--${color})` }}
    >
      {decisionStatusLabel(status, partner)}
    </span>
  );
}

export default function IdeaBoard({
  initialIdeas,
  userName,
  userId,
}: {
  initialIdeas: IdeaPin[];
  userName: string;
  userId: string;
}) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All ideas");
  const [mineOnly, setMineOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();
  const partner = partnerName(userName);

  const tabs = ["All ideas", ...collectionTabs(ideas)];
  const visible = ideas.filter((i) => (mineOnly ? i.owner_id === userId : true));
  const shown = activeTab === "All ideas" ? visible : visible.filter((i) => i.category === activeTab);
  const open = ideas.find((i) => i.id === openId) ?? null;

  function canEdit(idea: IdeaPin) {
    return idea.owner_id === userId || idea.visibility === "shared";
  }

  function scheduleIdeaSave(id: string, patch: Partial<IdeaPin>) {
    setIdeas((is) => is.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("idea_pins").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function saveNow(id: string, patch: Partial<IdeaPin>) {
    setIdeas((is) => is.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error } = await supabase.from("idea_pins").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  async function toggleFavourite(idea: IdeaPin) {
    await saveNow(idea.id, { is_favourite: !idea.is_favourite });
  }

  async function addIdea(category: string, title?: string) {
    const finalTitle = (title ?? window.prompt("Idea title (e.g. Polaroid guestbook table)")?.trim()) || "";
    if (!finalTitle) return;
    setError("");
    const idea = blankIdea(ideas.length, category, finalTitle);
    const { data, error } = await supabase.from("idea_pins").insert(idea).select().single();
    if (error) setError(error.message);
    else if (data) {
      setIdeas((is) => [data as IdeaPin, ...is]);
      setActiveTab(category);
    }
  }

  function addIdeaToCurrentTab() {
    addIdea(activeTab === "All ideas" ? IDEA_CATEGORIES[0] : activeTab);
  }

  function newCollection() {
    const name = window.prompt("New collection name (e.g. Dress, DIY)")?.trim();
    if (name) addIdea(name);
  }

  async function removeIdea(id: string) {
    if (!confirm("Delete this idea?")) return;
    setIdeas((is) => is.filter((i) => i.id !== id));
    if (openId === id) setOpenId(null);
    await supabase.from("idea_pins").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/" className="text-sm text-ink-2 underline underline-offset-2">← Dashboard</Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Inspiration Board</h1>
            <p className="mt-2 max-w-2xl text-ink-2">A shared scrapbook — dresses, décor, flowers, and the little details.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mineOnly ? "mine" : "all"}
              onChange={(e) => setMineOnly(e.target.value === "mine")}
              className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink-2"
            >
              <option value="all">Shared</option>
              <option value="mine">{userName} only</option>
            </select>
            <button onClick={newCollection} className={`rounded-full border border-line px-3.5 py-2 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}>
              ＋ New collection
            </button>
            <button onClick={addIdeaToCurrentTab} className={`rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
              ＋ Add an idea
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                activeTab === t ? "border-sage-deep bg-sage-deep text-white" : "border-line bg-bg text-ink hover:border-sage-deep"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="mt-8 text-sm text-ink-2">
            Nothing here yet — add an idea above, then paste in an image address (right-click a photo → Copy image address).
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((idea) => {
              const editable = canEdit(idea);
              const isOwner = idea.owner_id === userId;
              const savedBy = isOwner ? userName : partner;
              return (
                <div key={idea.id} className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm ${CARD_TRANSITION}`}>
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-bg">
                    <button onClick={() => setOpenId(idea.id)} className={`block h-full w-full text-left ${FOCUS_RING}`} aria-label={`Open ${idea.title}`}>
                      {idea.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={normalizeUrl(idea.image_url)} alt={idea.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[color-mix(in_srgb,var(--wine)_12%,var(--paper))] text-3xl">📌</div>
                      )}
                    </button>

                    <button
                      onClick={() => editable && toggleFavourite(idea)}
                      disabled={!editable}
                      aria-label={idea.is_favourite ? "Remove favourite" : "Mark as favourite"}
                      aria-pressed={idea.is_favourite}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] shadow-sm"
                    >
                      <Heart className={`h-3.5 w-3.5 ${idea.is_favourite ? "fill-wine text-wine" : "text-ink-2"}`} strokeWidth={1.5} aria-hidden />
                    </button>

                    {idea.visibility === "private" && (
                      <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] text-ink-2" title="Private">
                        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      </span>
                    )}

                    {editable && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          onClick={() => setOpenId(idea.id)}
                          aria-label={`Edit ${idea.title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] text-ink hover:bg-paper"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        </button>
                        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] text-ink hover:bg-paper">
                          <FolderInput className="pointer-events-none h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          <select
                            value={idea.category}
                            onChange={(e) => scheduleIdeaSave(idea.id, { category: e.target.value })}
                            aria-label={`Move ${idea.title} to another collection`}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          >
                            {collectionTabs(ideas).map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </span>
                        {isOwner && (
                          <span className="relative">
                            <button
                              onClick={() => setMoreOpenId((id) => (id === idea.id ? null : idea.id))}
                              aria-label="More actions"
                              aria-expanded={moreOpenId === idea.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] text-ink hover:bg-paper"
                            >
                              <Ellipsis className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                            </button>
                            {moreOpenId === idea.id && (
                              <>
                                <button aria-label="Close menu" onClick={() => setMoreOpenId(null)} className="fixed inset-0 z-40 cursor-default" />
                                <div className="absolute bottom-9 right-0 z-50 overflow-hidden rounded-xl border border-line bg-paper shadow-md">
                                  <button
                                    onClick={() => {
                                      setMoreOpenId(null);
                                      removeIdea(idea.id);
                                    }}
                                    className="whitespace-nowrap px-4 py-2 text-left text-sm font-semibold text-wine hover:bg-bg"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button onClick={() => setOpenId(idea.id)} className={`flex flex-col gap-1 p-3 text-left ${FOCUS_RING}`}>
                    <span className="truncate font-semibold text-ink">{idea.title}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-ink-2">
                      {idea.category} · Saved by {savedBy}
                    </span>
                    {idea.decision_status && (
                      <span className="mt-1">
                        <StatusBadge status={idea.decision_status} partner={isOwner ? partner : userName} />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" onClick={() => setOpenId(null)} className="absolute inset-0" />
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-paper shadow-lg sm:flex-row">
            <button
              onClick={() => setOpenId(null)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] text-ink shadow-sm"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
            <div className="aspect-[4/5] w-full shrink-0 bg-bg sm:w-2/5">
              {open.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={normalizeUrl(open.image_url)} alt={open.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">📌</div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {(() => {
                const editable = canEdit(open);
                const isOwner = open.owner_id === userId;
                const partnerOfOwner = isOwner ? partner : userName;
                return (
                  <>
                    <input
                      defaultValue={open.title}
                      onChange={(e) => scheduleIdeaSave(open.id, { title: e.target.value })}
                      disabled={!editable}
                      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-xl font-medium outline-none focus:border-line focus:bg-bg disabled:opacity-70"
                    />
                    <p className="mt-1 px-1 text-sm text-ink-2">
                      Saved by {isOwner ? userName : partner}
                    </p>

                    <label className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Collection</label>
                    <select
                      value={open.category}
                      onChange={(e) => scheduleIdeaSave(open.id, { category: e.target.value })}
                      disabled={!editable}
                      className="mx-1 mt-1 rounded border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                    >
                      {collectionTabs(ideas).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <label className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Decision</label>
                    <select
                      value={open.decision_status ?? ""}
                      onChange={(e) => scheduleIdeaSave(open.id, { decision_status: (e.target.value || null) as DecisionStatus | null })}
                      disabled={!editable}
                      className="mx-1 mt-1 rounded border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                    >
                      <option value="">No decision yet</option>
                      {DECISION_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{decisionStatusLabel(s, partnerOfOwner)}</option>
                      ))}
                    </select>

                    <label className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Image / source URL</label>
                    <input
                      defaultValue={open.image_url}
                      onChange={(e) => scheduleIdeaSave(open.id, { image_url: e.target.value })}
                      disabled={!editable}
                      placeholder="Paste an image address"
                      className="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                    />
                    {open.image_url && (
                      <a href={normalizeUrl(open.image_url)} target="_blank" rel="noreferrer" className="mx-1 mt-1 inline-block text-xs font-semibold text-sage-deep underline underline-offset-2">
                        Source ↗
                      </a>
                    )}

                    <label className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Notes</label>
                    <textarea
                      defaultValue={open.note}
                      onChange={(e) => scheduleIdeaSave(open.id, { note: e.target.value })}
                      disabled={!editable}
                      rows={4}
                      placeholder="Notes…"
                      className="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                    />

                    {isOwner ? (
                      <button
                        onClick={() => saveNow(open.id, { visibility: open.visibility === "shared" ? "private" : "shared" })}
                        className={`mt-4 mx-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          open.visibility === "private"
                            ? "bg-[color-mix(in_srgb,var(--wine)_15%,var(--paper))] text-wine"
                            : "bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))] text-sage-deep"
                        }`}
                      >
                        {open.visibility === "private" ? <Lock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> : <Users className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />}
                        {open.visibility === "private" ? "Private — only you" : "Shared"}
                      </button>
                    ) : (
                      <p className="mt-4 mx-1 text-xs font-semibold text-sage-deep">Shared</p>
                    )}

                    {isOwner && (
                      <button onClick={() => removeIdea(open.id)} className="mt-4 mx-1 block text-xs font-semibold text-wine">
                        Delete this idea
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
