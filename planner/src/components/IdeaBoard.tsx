"use client";

import { useDialog } from "@/lib/use-dialog";
import { useConfirm } from "@/components/ConfirmProvider";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Ellipsis, FolderInput, Hammer, Heart, ListChecks, Lock, Pencil, SquareCheck, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { fmt } from "@/lib/venues";
import { blankDiyProject } from "@/lib/diy-projects";
import {
  blankIdea,
  collectionTabs,
  combinedVerdict,
  IDEA_CATEGORIES,
  normalizeUrl,
  partnerName,
  REACTION_LABELS,
  REACTION_ORDER,
  VERDICT_COLOR,
  VERDICT_LABELS,
  type IdeaPin,
  type IdeaReaction,
  type ReactionValue,
} from "@/lib/ideas";

const CARD_TRANSITION = "transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:transform-none";
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

// Text stays --ink for every pill regardless of accent color, so contrast
// never depends on which of these tints it's sitting on.
function Pill({ colorVar, children }: { colorVar: string; children: ReactNode }) {
  return (
    <span
      className="inline-block truncate rounded-full px-2 py-0.5 text-[11px] font-semibold text-ink"
      style={{ background: `color-mix(in srgb, var(--${colorVar}) 22%, var(--paper))` }}
    >
      {children}
    </span>
  );
}

export default function IdeaBoard({
  initialIdeas,
  initialReactions,
  userName,
  userId,
  linkedDiyIdeaIds,
}: {
  initialIdeas: IdeaPin[];
  initialReactions: IdeaReaction[];
  userName: string;
  userId: string;
  linkedDiyIdeaIds: string[];
}) {
  const confirm = useConfirm();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [reactions, setReactions] = useState(initialReactions);
  const [diyLinked, setDiyLinked] = useState(new Set(linkedDiyIdeaIds));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"ideas" | "mood">("ideas");
  const [activeTab, setActiveTab] = useState("All ideas");
  const [mineOnly, setMineOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ category: string; title: string; image_url: string; note: string; price: string } | null>(null);
  const draftDialogRef = useDialog(Boolean(draft), () => setDraft(null));
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();
  const partner = partnerName(userName);

  const tabs = ["All ideas", ...collectionTabs(ideas)];
  const visible = ideas.filter((i) => (mineOnly ? i.owner_id === userId : true));
  const shown = activeTab === "All ideas" ? visible : visible.filter((i) => i.category === activeTab);
  const open = ideas.find((i) => i.id === openId) ?? null;
  const dialogRef = useDialog(Boolean(open), () => setOpenId(null));

  function myReaction(ideaId: string): ReactionValue | null {
    return reactions.find((r) => r.idea_id === ideaId && r.rater_id === userId)?.reaction ?? null;
  }
  function partnerReaction(ideaId: string): ReactionValue | null {
    return reactions.find((r) => r.idea_id === ideaId && r.rater_id !== userId)?.reaction ?? null;
  }
  function verdictFor(ideaId: string) {
    const mine = myReaction(ideaId);
    const theirs = partnerReaction(ideaId);
    return mine && theirs ? combinedVerdict(mine, theirs) : null;
  }

  const collectionCount = new Set(ideas.map((i) => i.category)).size;
  const undecidedCount = ideas.filter((i) => !verdictFor(i.id)).length;

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

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

  async function castReaction(ideaId: string, reaction: ReactionValue) {
    setError("");
    const { error } = await supabase.from("idea_reactions").upsert({ idea_id: ideaId, rater_id: userId, reaction }, { onConflict: "idea_id,rater_id" });
    if (error) {
      setError(error.message);
      return;
    }
    // Re-fetch this idea's reactions: once you've voted, RLS may now reveal
    // your partner's reaction too (the blind-voting reveal condition).
    const { data } = await supabase.from("idea_reactions").select("*").eq("idea_id", ideaId);
    if (data) setReactions((rs) => [...rs.filter((r) => r.idea_id !== ideaId), ...(data as IdeaReaction[])]);
  }

  async function addToDiyProjects(idea: IdeaPin) {
    setError("");
    const { error } = await supabase.from("diy_projects").insert({
      ...blankDiyProject("idea", 0),
      title: idea.title,
      reference_image: idea.image_url,
      notes: idea.note,
      cost_estimate: idea.price,
      idea_pin_id: idea.id,
    });
    if (error) setError(error.message);
    else {
      setDiyLinked((s) => new Set(s).add(idea.id));
      flash("Added to DIY Projects — find it in the Idea column.");
    }
  }

  async function addToTasks(idea: IdeaPin) {
    const { error } = await supabase.from("custom_tasks").insert({
      title: `Follow up: ${idea.title}`,
      description: `From the Inspiration Board — ${idea.category}`,
      person: "",
      effort: "",
      done: false,
    });
    if (error) setError(error.message);
    else flash("Added to your to-do list on the dashboard.");
  }

  function startDraft(category: string) {
    setError("");
    setDraft({ category, title: "", image_url: "", note: "", price: "" });
  }

  function addIdeaToCurrentTab() {
    startDraft(activeTab === "All ideas" ? IDEA_CATEGORIES[0] : activeTab);
  }

  function newCollection() {
    startDraft("");
  }

  async function saveDraft() {
    if (!draft || !draft.title.trim() || !draft.category.trim()) return;
    setError("");
    const idea = {
      ...blankIdea(ideas.length, draft.category, draft.title.trim()),
      image_url: draft.image_url.trim(),
      note: draft.note.trim(),
      price: draft.price.trim() ? +draft.price : null,
    };
    const { data, error } = await supabase.from("idea_pins").insert(idea).select().single();
    if (error) setError(error.message);
    else if (data) {
      setIdeas((is) => [data as IdeaPin, ...is]);
      setActiveTab(draft.category);
      setDraft(null);
    }
  }

  async function removeIdea(id: string) {
    if (!(await confirm("Delete this idea?"))) return;
    setIdeas((is) => is.filter((i) => i.id !== id));
    if (openId === id) setOpenId(null);
    await supabase.from("idea_pins").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">Our Inspiration Board</h1>
          <p className="mt-2 max-w-2xl text-ink-2">Everything we want our wedding to feel like.</p>
        </div>

        <div className="mt-6 flex flex-wrap items-stretch overflow-hidden rounded-full border border-line bg-paper shadow-sm">
          <div className="flex flex-1 items-baseline justify-center gap-1.5 border-r border-line px-3 py-2">
            <b className="font-serif text-base">{ideas.length}</b>
            <span className="text-xs text-ink-2">saved idea{ideas.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-1 items-baseline justify-center gap-1.5 border-r border-line px-3 py-2">
            <b className="font-serif text-base">{collectionCount}</b>
            <span className="text-xs text-ink-2">collection{collectionCount === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-1 items-baseline justify-center gap-1.5 border-r border-line px-3 py-2">
            <b className="font-serif text-base">{undecidedCount}</b>
            <span className="text-xs text-ink-2">undecided item{undecidedCount === 1 ? "" : "s"}</span>
          </div>
          <button
            onClick={addIdeaToCurrentTab}
            className={`flex items-center gap-1.5 bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}
          >
            ＋ Add an idea
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}
        {notice && <p className="mt-2 text-sm text-sage-deep">{notice}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full border border-line bg-bg p-1">
            <button
              onClick={() => setView("ideas")}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${view === "ideas" ? "bg-surface-sage-deep text-white" : "text-ink-2 hover:text-ink"}`}
            >
              Ideas
            </button>
            <button
              onClick={() => setView("mood")}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${view === "mood" ? "bg-surface-sage-deep text-white" : "text-ink-2 hover:text-ink"}`}
            >
              Mood Board
            </button>
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
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                activeTab === t ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-bg text-ink hover:border-sage-deep"
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
        ) : view === "mood" ? (
          (() => {
            const moodItems = shown.filter((i) => i.image_url && i.visibility !== "private");
            return moodItems.length === 0 ? (
              <p className="mt-8 text-sm text-ink-2">Nothing to show — private ideas are left out of the mood board.</p>
            ) : (
              <div className="mt-6 columns-2 gap-2 sm:columns-4 xl:columns-5">
                {moodItems.map((idea) => (
                  <button
                    key={idea.id}
                    onClick={() => setOpenId(idea.id)}
                    className={`mb-2 block w-full overflow-hidden rounded-lg break-inside-avoid ${FOCUS_RING}`}
                    aria-label={`Open ${idea.title}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={normalizeUrl(idea.image_url)} alt={idea.title} loading="lazy" className="w-full object-cover" />
                  </button>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="mt-6 columns-2 gap-4 sm:columns-3 xl:columns-4">
            {shown.map((idea) => {
              const editable = canEdit(idea);
              const isOwner = idea.owner_id === userId;
              const savedBy = isOwner ? userName : partner;
              const mine = myReaction(idea.id);
              const verdict = verdictFor(idea.id);
              return (
                <div key={idea.id} className={`group mb-4 flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm break-inside-avoid ${CARD_TRANSITION}`}>
                  <div className="relative w-full overflow-hidden bg-bg">
                    <button onClick={() => setOpenId(idea.id)} className={`block w-full text-left ${FOCUS_RING}`} aria-label={`Open ${idea.title}`}>
                      {idea.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={normalizeUrl(idea.image_url)} alt={idea.title} loading="lazy" className="w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center bg-[color-mix(in_srgb,var(--wine)_12%,var(--paper))] text-3xl">📌</div>
                      )}
                    </button>

                    <button
                      onClick={() => editable && toggleFavourite(idea)}
                      disabled={!editable}
                      aria-label={idea.is_favourite ? "Remove favourite" : "Mark as favourite"}
                      aria-pressed={idea.is_favourite}
                      className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] shadow-sm"
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
                        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] text-ink hover:bg-paper">
                          <SquareCheck className="pointer-events-none h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          <select
                            value=""
                            onChange={(e) => e.target.value && castReaction(idea.id, e.target.value as ReactionValue)}
                            aria-label={`React to ${idea.title}`}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          >
                            <option value="" disabled>Vote…</option>
                            {REACTION_ORDER.map((r) => (
                              <option key={r} value={r}>{REACTION_LABELS[r]}</option>
                            ))}
                          </select>
                        </span>
                        <button
                          onClick={() => setOpenId(idea.id)}
                          aria-label={`Edit ${idea.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] text-ink hover:bg-paper"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        </button>
                        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] text-ink hover:bg-paper">
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
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_90%,transparent)] text-ink hover:bg-paper"
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
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink">{idea.title}</span>
                      {idea.price != null && <span className="shrink-0 text-sm font-semibold text-sage-deep">{fmt(idea.price)}</span>}
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-ink-2">
                      {idea.category} · Saved by {savedBy}
                    </span>
                    {(mine || verdict) && (
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {mine && <Pill colorVar="sage-deep">{REACTION_LABELS[mine]}</Pill>}
                        {verdict ? (
                          <Pill colorVar={VERDICT_COLOR[verdict]}>{VERDICT_LABELS[verdict]}</Pill>
                        ) : mine ? (
                          <Pill colorVar="gold">Needs {partner}&apos;s vote</Pill>
                        ) : null}
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
          <button aria-label="Close" tabIndex={-1} onClick={() => setOpenId(null)} className="absolute inset-0" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Idea details" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-paper shadow-lg sm:flex-row">
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
                const mine = myReaction(open.id);
                const theirs = partnerReaction(open.id);
                const verdict = mine && theirs ? combinedVerdict(mine, theirs) : null;
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

                    <label htmlFor="idea-board-f1" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Collection</label>
                    <select id="idea-board-f1"
                      value={open.category}
                      onChange={(e) => scheduleIdeaSave(open.id, { category: e.target.value })}
                      disabled={!editable}
                      className="mx-1 mt-1 rounded border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                    >
                      {collectionTabs(ideas).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <label htmlFor="idea-board-f2" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Your reaction</label>
                    <select id="idea-board-f2"
                      value={mine ?? ""}
                      onChange={(e) => e.target.value && castReaction(open.id, e.target.value as ReactionValue)}
                      className="mx-1 mt-1 rounded border border-line bg-bg px-2 py-1 text-sm"
                    >
                      <option value="" disabled>Choose one…</option>
                      {REACTION_ORDER.map((r) => (
                        <option key={r} value={r}>{REACTION_LABELS[r]}</option>
                      ))}
                    </select>
                    <div className="mx-1 mt-2">
                      {verdict ? (
                        <Pill colorVar={VERDICT_COLOR[verdict]}>{VERDICT_LABELS[verdict]}</Pill>
                      ) : mine ? (
                        <p className="text-xs text-ink-2">Waiting on {partner}&apos;s reaction — hidden until you&apos;ve both voted.</p>
                      ) : null}
                    </div>

                    <label htmlFor="idea-board-f3" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Price</label>
                    <input id="idea-board-f3"
                      type="number"
                      min={0}
                      defaultValue={open.price ?? ""}
                      onChange={(e) => scheduleIdeaSave(open.id, { price: e.target.value ? +e.target.value : null })}
                      disabled={!editable}
                      placeholder="$"
                      className="mx-1 mt-1 w-32 rounded border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                    />

                    <label htmlFor="idea-board-f4" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Image / source URL</label>
                    <input id="idea-board-f4"
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

                    <label htmlFor="idea-board-f5" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Notes</label>
                    <textarea id="idea-board-f5"
                      defaultValue={open.note}
                      onChange={(e) => scheduleIdeaSave(open.id, { note: e.target.value })}
                      disabled={!editable}
                      rows={4}
                      placeholder="Notes…"
                      className="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded border border-line bg-bg px-2 py-1 text-sm disabled:opacity-70"
                    />

                    <p className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Turn into action</p>
                    <div className="mx-1 mt-1 flex flex-wrap gap-2">
                      {!diyLinked.has(open.id) ? (
                        <button
                          onClick={() => addToDiyProjects(open)}
                          className={`flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}
                        >
                          <Hammer className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          Add to DIY Projects
                        </button>
                      ) : (
                        <Link
                          href="/diy"
                          className={`flex items-center gap-1.5 rounded-full border border-sage-deep bg-sage-deep/10 px-3 py-1.5 text-xs font-semibold text-sage-deep ${FOCUS_RING}`}
                        >
                          <Hammer className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          View in DIY Projects
                        </Link>
                      )}
                      <button
                        onClick={() => addToTasks(open)}
                        className={`flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink ${FOCUS_RING}`}
                      >
                        <ListChecks className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        Add to Tasks
                      </button>
                    </div>

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

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Close" tabIndex={-1} onClick={() => setDraft(null)} className="absolute inset-0" />
          <div ref={draftDialogRef} role="dialog" aria-modal="true" aria-label="New idea" tabIndex={-1} className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-paper shadow-lg sm:flex-row">
            <button
              onClick={() => setDraft(null)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_85%,transparent)] text-ink shadow-sm"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
            <div className="aspect-[4/5] w-full shrink-0 bg-bg sm:w-2/5">
              {draft.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={normalizeUrl(draft.image_url)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">📌</div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <h2 className="font-serif text-xl font-medium">New idea</h2>

              <label htmlFor="idea-board-f6" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Title</label>
              <input id="idea-board-f6"
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft((d) => d && { ...d, title: e.target.value })}
                placeholder="e.g. Polaroid guestbook table"
                className="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <label htmlFor="idea-board-f7" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Collection</label>
              <select id="idea-board-f7"
                value={draft.category}
                onChange={(e) => setDraft((d) => d && { ...d, category: e.target.value })}
                className="mx-1 mt-1 rounded border border-line bg-bg px-2 py-1 text-sm"
              >
                {[...new Set([draft.category, ...collectionTabs(ideas)])].map((c) => (
                  <option key={c} value={c}>{c || "Choose a collection…"}</option>
                ))}
              </select>
              <input
                aria-label="Or name a new collection"
                value={collectionTabs(ideas).includes(draft.category) ? "" : draft.category}
                onChange={(e) => setDraft((d) => d && { ...d, category: e.target.value })}
                placeholder="Or name a new one, e.g. Dress or DIY"
                className="mx-1 mt-2 w-[calc(100%-0.5rem)] rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <label htmlFor="idea-board-f8" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Price</label>
              <input id="idea-board-f8"
                type="number"
                min={0}
                value={draft.price}
                onChange={(e) => setDraft((d) => d && { ...d, price: e.target.value })}
                placeholder="$"
                className="mx-1 mt-1 w-32 rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <label htmlFor="idea-board-f9" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Image / source URL</label>
              <input id="idea-board-f9"
                value={draft.image_url}
                onChange={(e) => setDraft((d) => d && { ...d, image_url: e.target.value })}
                placeholder="Paste an image address"
                className="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <label htmlFor="idea-board-f10" className="mt-4 block px-1 text-xs font-semibold uppercase tracking-wide text-ink-2">Notes</label>
              <textarea id="idea-board-f10"
                value={draft.note}
                onChange={(e) => setDraft((d) => d && { ...d, note: e.target.value })}
                rows={4}
                placeholder="Notes…"
                className="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded border border-line bg-bg px-2 py-1 text-sm"
              />

              <div className="mt-5 flex items-center gap-2 px-1">
                <button
                  onClick={saveDraft}
                  disabled={!draft.title.trim() || !draft.category.trim()}
                  className={`rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Add to board
                </button>
                <button onClick={() => setDraft(null)} className={`rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:text-ink ${FOCUS_RING}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
