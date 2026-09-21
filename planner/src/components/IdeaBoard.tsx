"use client";

import { useDialog } from "@/lib/use-dialog";
import { useConfirm } from "@/components/ConfirmProvider";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Bookmark, Ellipsis, Folder, Hammer, Heart, Images, Lock, Pencil, Plus, SquareCheckBig, Sparkles, Users, Vote, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import DashboardTopBar, { type SearchItem } from "@/components/DashboardTopBar";
import { blankTask } from "@/lib/planning-tasks";
import { fmt } from "@/lib/venues";
import { blankDiyProject } from "@/lib/diy-projects";
import {
  blankIdea,
  collectionTabs,
  combinedVerdict,
  IDEA_CATEGORIES,
  normalizeUrl,
  partnerName,
  planningCategoryFor,
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
  const [notice, setNotice] = useState<{ msg: string; href?: string; cta?: string } | null>(null);
  const [view, setView] = useState<"ideas" | "mood">("ideas");
  const [activeTab, setActiveTab] = useState("All ideas");
  const [mineOnly, setMineOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [sort, setSort] = useState<"recent" | "oldest" | "shortlisted">("recent");
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [draft, setDraft] = useState<{ category: string; title: string; image_url: string; note: string; price: string } | null>(null);
  const draftDialogRef = useDialog(Boolean(draft), () => setDraft(null));
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();
  const partner = partnerName(userName);

  const tabs = ["All ideas", ...collectionTabs(ideas)];
  const visible = ideas.filter((i) => (mineOnly ? i.owner_id === userId : true) && (!shortlistOnly || i.is_favourite));
  const shown = (activeTab === "All ideas" ? visible : visible.filter((i) => i.category === activeTab)).sort((a, b) =>
    sort === "shortlisted" && a.is_favourite !== b.is_favourite
      ? a.is_favourite ? -1 : 1
      : (sort === "oldest" ? 1 : -1) * a.created_at.localeCompare(b.created_at),
  );
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

  function flash(msg: string, href?: string, cta?: string) {
    setNotice({ msg, href, cta });
    setTimeout(() => setNotice(null), 6000);
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
      flash("DIY project created — it's in the Idea column.", "/diy", "Open DIY Projects");
    }
  }

  async function addToPlanningBoard(idea: IdeaPin) {
    setError("");
    const { error } = await supabase
      .from("planning_tasks")
      .insert(blankTask("ideas", { title: idea.title, category: planningCategoryFor(idea.category), notes: idea.note, estimated_cost: idea.price }));
    if (error) setError(error.message);
    else flash("Added to the Ideas column on your Planning Board.", "/board", "Open Planning Board");
  }

  async function createDecision(idea: IdeaPin) {
    setError("");
    const { data: decision, error } = await supabase
      .from("decisions")
      .insert({ title: `Decide: ${idea.title}`, category: "Style & Details", description: idea.note, sort_order: 999 })
      .select()
      .single();
    if (error || !decision) {
      setError(error?.message ?? "Couldn't create the decision.");
      return;
    }
    const { error: optError } = await supabase
      .from("decision_options")
      .insert({ decision_id: decision.id, label: idea.title, image_url: idea.image_url, notes: idea.note, sort_order: 0 });
    if (optError) setError(optError.message);
    else flash("Decision created with this idea as the first option.", `/decide/${decision.id}`, "Open decision");
  }

  async function toggleMoodBoard(idea: IdeaPin) {
    await saveNow(idea.id, { on_mood_board: !idea.on_mood_board });
    if (!idea.on_mood_board) flash("Added to your Mood Board.");
  }

  function openMenu(e: React.MouseEvent, id: string) {
    if (menu?.id === id) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ id, top: Math.min(r.bottom + 4, window.innerHeight - 300), left: Math.max(8, Math.min(r.right - 224, window.innerWidth - 232)) });
  }

  // The same four moves are offered on a card's ⋯ menu and inside the idea dialog.
  function actionsFor(idea: IdeaPin) {
    const editable = canEdit(idea);
    return [
      ...(editable ? [{ key: "mood", label: idea.on_mood_board ? "On your Mood Board" : "Add to Mood Board", Icon: Images, on: !!idea.on_mood_board, run: () => toggleMoodBoard(idea) }] : []),
      diyLinked.has(idea.id)
        ? { key: "diy", label: "View DIY project", Icon: Hammer, on: true, href: "/diy" }
        : { key: "diy", label: "Create DIY project", Icon: Hammer, on: false, run: () => addToDiyProjects(idea) },
      { key: "decision", label: "Create decision", Icon: Vote, on: false, run: () => createDecision(idea) },
      { key: "board", label: "Add to Planning Board", Icon: SquareCheckBig, on: false, run: () => addToPlanningBoard(idea) },
    ] as { key: string; label: string; Icon: typeof Images; on: boolean; run?: () => void; href?: string }[];
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

  const SEGMENT = (on: boolean) =>
    `rounded-full px-5 py-2 text-sm ${FOCUS_RING} ${on ? "bg-surface-sage-deep text-white" : "text-ink-2 hover:text-ink"}`;
  const TOOL_SELECT = `rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink ${FOCUS_RING}`;
  const TAB_LIMIT = 9;
  const visibleTabs = tabs.slice(0, TAB_LIMIT);
  const moreTabs = tabs.slice(TAB_LIMIT);
  const searchItems: SearchItem[] = [
    ...ideas.map((i) => ({ label: i.title, hint: i.category, href: `idea:${i.id}` })),
    ...collectionTabs(ideas).map((c) => ({ label: c, hint: "Collection", href: `tab:${c}` })),
  ];
  const moodItems = shown.filter((i) => i.on_mood_board && i.image_url && i.visibility !== "private");
  const menuIdea = menu ? ideas.find((i) => i.id === menu.id) ?? null : null;

  return (
    <div className="min-h-screen pb-16 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardTopBar
          userName={userName}
          partner={partner}
          items={searchItems}
          notices={[]}
          placeholder="Search ideas, collections, or keywords…"
          onSelect={(item) => (item.href.startsWith("tab:") ? setActiveTab(item.href.slice(4)) : setOpenId(item.href.slice(5)))}
        />

        <header className="relative mt-8">
          <h1 className="font-serif text-5xl font-light tracking-[-0.02em] sm:text-6xl xl:text-[4.5rem]">Our Inspiration Board</h1>
          <p className="mt-3 text-lg text-ink-2">Everything we want our wedding to feel like.</p>
          <dl className="mt-5 flex flex-wrap gap-x-12 gap-y-3">
            {[
              { n: ideas.length, label: `saved idea${ideas.length === 1 ? "" : "s"}`, Icon: Bookmark },
              { n: collectionCount, label: `collection${collectionCount === 1 ? "" : "s"}`, Icon: Folder },
              { n: undecidedCount, label: `undecided item${undecidedCount === 1 ? "" : "s"}`, Icon: Sparkles },
            ].map(({ n, label, Icon }) => (
              <div key={label} className="flex items-center gap-3 text-ink-2">
                <Icon className="h-6 w-6" strokeWidth={1.25} aria-hidden />
                <div>
                  <dd className="font-serif text-2xl font-light leading-none text-ink">{n}</dd>
                  <dt className="mt-1 text-sm">{label}</dt>
                </div>
              </div>
            ))}
          </dl>
          <div aria-hidden className="pointer-events-none absolute right-0 top-0 hidden md:block">
            <p className="absolute right-40 top-1 -rotate-6 text-right font-script text-[1.9rem] leading-[1.05] text-sage-deep">
              Little details,
              <br />
              big feeling ♡
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/botanical-accent.webp" width={350} height={420} alt="" className="h-40 w-auto rotate-6 opacity-70" />
            <p className="absolute bottom-1 right-2 bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))] px-5 py-3 text-center text-[10px] font-medium uppercase leading-[1.9] tracking-[0.26em] text-ink-2">
              Collect
              <br />
              Curate
              <br />
              Create
              <br />
              Our day
            </p>
          </div>
        </header>

        {error && <p className="mt-3 text-sm text-wine">{error}</p>}
        {notice && (
          <p role="status" className="mt-3 text-sm text-sage-deep">
            {notice.msg}{" "}
            {notice.href && (
              <Link href={notice.href} className="font-semibold underline underline-offset-2">
                {notice.cta}
              </Link>
            )}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="View" className="flex rounded-full border border-line bg-paper p-1">
            <button onClick={() => setView("ideas")} aria-pressed={view === "ideas"} className={SEGMENT(view === "ideas")}>
              Ideas
            </button>
            <button onClick={() => setView("mood")} aria-pressed={view === "mood"} className={SEGMENT(view === "mood")}>
              Mood Board
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShortlistOnly((v) => !v)}
              aria-pressed={shortlistOnly}
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm ${FOCUS_RING} ${
                shortlistOnly ? "border-surface-wine bg-surface-wine text-white" : "border-line bg-paper text-ink hover:border-wine"
              }`}
            >
              <Heart className={`h-4 w-4 ${shortlistOnly ? "fill-white" : ""}`} strokeWidth={1.5} aria-hidden />
              Shortlisted
            </button>
            <select aria-label="Who saved it" value={mineOnly ? "mine" : "all"} onChange={(e) => setMineOnly(e.target.value === "mine")} className={TOOL_SELECT}>
              <option value="all">Shared</option>
              <option value="mine">{userName} only</option>
            </select>
            <select aria-label="Sort ideas" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={TOOL_SELECT}>
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest first</option>
              <option value="shortlisted">Shortlisted first</option>
            </select>
            <button onClick={newCollection} className={`rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink hover:border-sage-deep ${FOCUS_RING}`}>
              New collection
            </button>
            <button onClick={addIdeaToCurrentTab} className={`flex items-center gap-2 rounded-full bg-surface-wine px-6 py-2.5 text-sm font-medium text-white ${FOCUS_RING}`}>
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Add an idea
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              aria-pressed={activeTab === t}
              className={`rounded-full border px-4 py-2 text-sm ${FOCUS_RING} ${
                activeTab === t ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-paper text-ink hover:border-sage-deep"
              }`}
            >
              {t}
            </button>
          ))}
          {moreTabs.length > 0 && (
            <select
              aria-label="More collections"
              value={moreTabs.includes(activeTab) ? activeTab : ""}
              onChange={(e) => e.target.value && setActiveTab(e.target.value)}
              className={`rounded-full border px-4 py-2 text-sm ${FOCUS_RING} ${moreTabs.includes(activeTab) ? "border-surface-sage-deep bg-surface-sage-deep text-white" : "border-line bg-paper text-ink"}`}
            >
              <option value="">More</option>
              {moreTabs.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>

        {view === "mood" ? (
          moodItems.length === 0 ? (
            <p className="mt-8 max-w-md text-sm leading-relaxed text-ink-2">
              Your Mood Board is empty. Open the ⋯ menu on any idea with a photo and choose “Add to Mood Board” to pin it here. Private ideas are never shown.
            </p>
          ) : (
            <div className="mt-6 columns-2 gap-3 sm:columns-3 xl:columns-5">
              {moodItems.map((idea) => (
                <button key={idea.id} onClick={() => setOpenId(idea.id)} className={`mb-3 block w-full overflow-hidden rounded-xl break-inside-avoid ${FOCUS_RING}`} aria-label={`Open ${idea.title}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={normalizeUrl(idea.image_url)} alt={idea.title} loading="lazy" className="w-full object-cover" />
                </button>
              ))}
            </div>
          )
        ) : shown.length === 0 ? (
          <p className="mt-8 text-sm text-ink-2">
            {shortlistOnly ? "Nothing shortlisted here yet — tap the heart on an idea you want for the wedding." : "Nothing here yet — add an idea above, then paste in an image address (right-click a photo → Copy image address)."}
          </p>
        ) : (
          <div className="mt-6 columns-2 gap-4 md:columns-3 xl:columns-4">
            {shown.map((idea) => {
              const editable = canEdit(idea);
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
                        <div className="flex aspect-square w-full items-center justify-center bg-[color-mix(in_srgb,var(--wine)_10%,var(--paper))] text-ink-2">
                          <Bookmark className="h-9 w-9" strokeWidth={1.25} aria-hidden />
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => editable && toggleFavourite(idea)}
                      disabled={!editable}
                      aria-label={idea.is_favourite ? `Remove ${idea.title} from shortlist` : `Shortlist ${idea.title}`}
                      aria-pressed={idea.is_favourite}
                      className={`absolute right-2.5 top-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] shadow-sm ${FOCUS_RING}`}
                    >
                      <Heart className={`h-[18px] w-[18px] ${idea.is_favourite ? "fill-wine text-wine" : "text-ink"}`} strokeWidth={1.5} aria-hidden />
                    </button>
                    {idea.visibility === "private" && (
                      <span className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-ink-2" title="Private">
                        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2 p-4">
                    <button onClick={() => setOpenId(idea.id)} className={`min-w-0 flex-1 rounded text-left ${FOCUS_RING}`}>
                      <span className="block truncate font-medium text-ink">{idea.title}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[color-mix(in_srgb,var(--sage)_18%,var(--paper))] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-2">{idea.category}</span>
                        {idea.price != null && <span className="text-sm font-semibold text-sage-deep">{fmt(idea.price)}</span>}
                        {idea.on_mood_board && <Images className="h-3.5 w-3.5 text-ink-2" strokeWidth={1.5} aria-label="On your Mood Board" />}
                      </span>
                      {(mine || verdict) && (
                        <span className="mt-2 flex flex-wrap items-center gap-1">
                          {mine && <Pill colorVar="sage-deep">{REACTION_LABELS[mine]}</Pill>}
                          {verdict ? <Pill colorVar={VERDICT_COLOR[verdict]}>{VERDICT_LABELS[verdict]}</Pill> : mine ? <Pill colorVar="gold">Needs {partner}&apos;s vote</Pill> : null}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={(e) => openMenu(e, idea.id)}
                      aria-label={`Actions for ${idea.title}`}
                      aria-expanded={menu?.id === idea.id}
                      className={`-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg pointer-coarse:h-11 pointer-coarse:w-11 ${FOCUS_RING}`}
                    >
                      <Ellipsis className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {menu && menuIdea && (
        <>
          <button aria-label="Close menu" tabIndex={-1} onClick={() => setMenu(null)} className="fixed inset-0 z-40 cursor-default" />
          <div style={{ top: menu.top, left: menu.left }} className="fixed z-50 w-56 overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-md">
            {actionsFor(menuIdea).map(({ key, label, Icon, href, run, on }) =>
              href ? (
                <Link key={key} href={href} onClick={() => setMenu(null)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-bg">
                  <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  {label}
                </Link>
              ) : (
                <button
                  key={key}
                  onClick={() => {
                    setMenu(null);
                    run?.();
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-bg ${on ? "text-sage-deep" : "text-ink"}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  {label}
                </button>
              ),
            )}
            <div className="my-1 h-px bg-line" />
            <button
              onClick={() => {
                setMenu(null);
                setOpenId(menuIdea.id);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-bg"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              {canEdit(menuIdea) ? "Edit & vote" : "Open"}
            </button>
            {menuIdea.owner_id === userId && (
              <button
                onClick={() => {
                  setMenu(null);
                  removeIdea(menuIdea.id);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-wine hover:bg-bg"
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Delete
              </button>
            )}
          </div>
        </>
      )}

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
                <div className="flex h-full w-full items-center justify-center text-ink-2"><Bookmark className="h-10 w-10" strokeWidth={1.25} aria-hidden /></div>
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
                      <button
                        onClick={() => editable && saveNow(open.id, { is_favourite: !open.is_favourite })}
                        disabled={!editable}
                        aria-pressed={open.is_favourite}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${FOCUS_RING} ${open.is_favourite ? "border-wine text-wine" : "border-line text-ink-2 hover:border-sage-deep hover:text-ink"}`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${open.is_favourite ? "fill-wine" : ""}`} strokeWidth={1.5} aria-hidden />
                        {open.is_favourite ? "Shortlisted" : "Shortlist"}
                      </button>
                      {actionsFor(open).map(({ key, label, Icon, href, run, on }) =>
                        href ? (
                          <Link key={key} href={href} className={`flex items-center gap-1.5 rounded-full border border-sage-deep bg-sage-deep/10 px-3 py-1.5 text-xs font-semibold text-sage-deep ${FOCUS_RING}`}>
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                            {label}
                          </Link>
                        ) : (
                          <button key={key} onClick={run} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${FOCUS_RING} ${on ? "border-sage-deep text-sage-deep" : "border-line text-ink-2 hover:border-sage-deep hover:text-ink"}`}>
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                            {label}
                          </button>
                        ),
                      )}
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
                <div className="flex h-full w-full items-center justify-center text-ink-2"><Bookmark className="h-10 w-10" strokeWidth={1.25} aria-hidden /></div>
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
