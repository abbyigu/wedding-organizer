"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Ellipsis, ExternalLink, Gift, Plus, Share2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import NavBar from "@/components/NavBar";
import DashboardTopBar from "@/components/DashboardTopBar";
import RegistryCover, { coverSrc, TYPE_ICON } from "@/components/RegistryCover";
import RegistryDialog, { type RegistryForm } from "@/components/RegistryDialog";
import RegistrySettingsDialog from "@/components/RegistrySettingsDialog";
import { normalizeUrl, partnerName } from "@/lib/ideas";
import { blankTask, type PlanningTask } from "@/lib/planning-tasks";
import {
  isVisible,
  REGISTRY_TYPES,
  SETUP_TASKS,
  setupKey,
  sortRegistries,
  typeOf,
  type IdeaImage,
  type RegistryEntry,
  type RegistrySettings,
} from "@/lib/registry";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const COVER_BUCKET = "registry-covers";

export type GiftCounts = { supported: boolean; recorded: number; due: number };

export default function Registry({
  initialEntries,
  initialTasks,
  settings: initialSettings,
  needsMigration,
  ideas,
  gifts,
  origin,
  userName,
}: {
  initialEntries: RegistryEntry[];
  initialTasks: PlanningTask[];
  settings: RegistrySettings;
  needsMigration: boolean;
  ideas: IdeaImage[];
  gifts: GiftCounts;
  origin: string;
  userName: string;
}) {
  const confirm = useConfirm();
  const supabase = createClient();
  const [entries, setEntries] = useState(initialEntries);
  const [tasks, setTasks] = useState(initialTasks);
  const [settings, setSettings] = useState(initialSettings);
  const [dialog, setDialog] = useState<{ entry?: RegistryEntry } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const menuTriggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastMenuId = useRef<string | null>(null);
  const skipMenuFocusReturn = useRef(false); // set just before an action that moves focus itself (opens a dialog)

  const partner = partnerName(userName || "Ariel");
  const shown = sortRegistries(entries);
  const host = origin.replace(/^https?:\/\//, "");
  const publicPath = `/${settings.slug}/registry`;
  const publicUrl = `${origin}${publicPath}`;
  const guestCount = entries.filter((e) => isVisible(e) && e.url).length;

  useEffect(() => {
    if (!menuId) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && (e.target as HTMLElement).closest("[data-registry-menu]")) return;
      setMenuId(null);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("mousedown", close);
    };
  }, [menuId]);

  // Whichever way the card options popover closes (Escape, outside click, or picking an
  // action), send focus back to the ⋯ button that opened it instead of dropping it.
  useEffect(() => {
    if (menuId) {
      lastMenuId.current = menuId;
      return;
    }
    const id = lastMenuId.current;
    lastMenuId.current = null;
    if (id && !skipMenuFocusReturn.current) menuTriggers.current[id]?.focus();
    skipMenuFocusReturn.current = false;
  }, [menuId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it by hand.");
    }
  }

  // Cover: at most one source. Uploaded files go to a public bucket; an Inspiration pin is only referenced.
  async function saveRegistry(f: RegistryForm, existing?: RegistryEntry): Promise<string | null> {
    let image_path = existing?.image_path ?? null;
    let idea_id = existing?.idea_id ?? null;
    const oldPath = image_path;
    if (f.cover.kind === "upload") {
      const path = `${crypto.randomUUID()}.${f.cover.ext}`;
      const { error: upErr } = await supabase.storage.from(COVER_BUCKET).upload(path, f.cover.file, { contentType: f.cover.ext === "jpg" ? "image/jpeg" : undefined });
      if (upErr) return `Couldn't upload the image (${upErr.message}). Has migration 044 been run?`;
      image_path = path;
      idea_id = null;
    } else if (f.cover.kind === "idea") {
      image_path = null;
      idea_id = f.cover.id;
    } else if (f.cover.kind === "none") {
      image_path = null;
      idea_id = null;
    }

    const row = {
      type: f.type,
      store_name: f.store_name,
      url: f.url,
      description: f.description.trim(),
      summary: f.summary.trim(),
      visible: f.visible,
      is_primary: f.is_primary,
      image_path,
      idea_id,
    };
    const q = existing
      ? supabase.from("registries").update(row).eq("id", existing.id).select().single()
      : supabase.from("registries").insert({ ...row, sort_order: entries.length }).select().single();
    const { data, error: err } = await q;
    if (err || !data) return err?.message ?? "Couldn't save.";

    const saved = data as RegistryEntry;
    // A DB trigger (migration 045) clears is_primary on every other row atomically —
    // no second round-trip here, so two partners can't race to different winners.
    setEntries((es) => {
      const next = existing ? es.map((e) => (e.id === saved.id ? saved : e)) : [...es, saved];
      return f.is_primary ? next.map((e) => (e.id === saved.id ? e : { ...e, is_primary: false })) : next;
    });
    if (oldPath && oldPath !== image_path) await supabase.storage.from(COVER_BUCKET).remove([oldPath]);
    return null;
  }

  async function patchEntry(id: string, patch: Partial<RegistryEntry>) {
    setError("");
    const { error: err } = await supabase.from("registries").update(patch).eq("id", id);
    if (err) return setError(err.message);
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function makePrimary(id: string) {
    setMenuId(null);
    // One write — the registries_single_primary trigger clears the others atomically.
    await patchEntry(id, { is_primary: true });
    setEntries((es) => es.map((e) => (e.id === id ? e : { ...e, is_primary: false })));
  }

  async function removeEntry(e: RegistryEntry) {
    setMenuId(null);
    if (!(await confirm(`Remove ${e.store_name}? This can't be undone.`))) return;
    const { error: err } = await supabase.from("registries").delete().eq("id", e.id);
    if (err) return setError(err.message);
    setEntries((es) => es.filter((x) => x.id !== e.id));
    if (e.image_path) await supabase.storage.from(COVER_BUCKET).remove([e.image_path]);
  }

  async function saveSettings(s: RegistrySettings): Promise<string | null> {
    const { error: err } = await supabase.from("registry_settings").upsert({ id: true, ...s, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (err) return err.message;
    setSettings(s);
    return null;
  }

  // Registry setup — every item is a Planning Board task, so ticking it here ticks it there.
  const rowFor = (key: string) => tasks.find((t) => t.template_key === setupKey(key));
  const extras = tasks.filter((t) => !t.template_key?.startsWith("registry:setup:"));
  const setupDone = SETUP_TASKS.filter((s) => rowFor(s.key)?.status === "done").length;
  const missing = SETUP_TASKS.filter((s) => !rowFor(s.key));

  async function toggleTask(title: string, key: string | null, t?: PlanningTask) {
    setError("");
    if (t) {
      const status = t.status === "done" ? "todo" : "done";
      setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)));
      const { error: err } = await supabase.from("planning_tasks").update({ status }).eq("id", t.id);
      if (err) setError(err.message);
      return;
    }
    const { data, error: err } = await supabase
      .from("planning_tasks")
      .insert(blankTask("done", { title, category: "Registry", template_key: key ? setupKey(key) : null }))
      .select()
      .single();
    if (err) return setError(err.message);
    setTasks((ts) => [...ts, data as PlanningTask]);
  }

  async function addRestToBoard() {
    setError("");
    const { data, error: err } = await supabase
      .from("planning_tasks")
      .insert(missing.map((s) => blankTask("todo", { title: s.title, category: "Registry", template_key: setupKey(s.key) })))
      .select();
    if (err) return setError(err.message);
    setTasks((ts) => [...ts, ...((data ?? []) as PlanningTask[])]);
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardTopBar
          userName={userName}
          partner={partner}
          items={entries.map((e) => ({ label: e.store_name, hint: REGISTRY_TYPES[typeOf(e)].label, href: e.id }))}
          notices={[]}
          placeholder="Search your registries…"
          onSelect={(item) => setDialog({ entry: entries.find((e) => e.id === item.href) })}
        />

        <section className="relative mt-8 overflow-hidden rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_10%,var(--paper))]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/photo-flower-table.jpg" alt="" aria-hidden className="absolute inset-y-0 right-0 hidden h-full w-3/5 object-cover object-[50%_60%] sm:block" />
          <div aria-hidden className="absolute inset-0 hidden sm:block" style={{ backgroundImage: "linear-gradient(90deg, color-mix(in srgb, var(--gold) 10%, var(--paper)) 38%, transparent 75%)" }} />
          <div className="relative px-6 py-8 sm:max-w-[60%] sm:px-10 sm:py-10">
            <p className="-rotate-2 font-script text-3xl leading-none text-ink-2">Gifts for good beginnings ♡</p>
            <h1 className="mt-2 font-serif text-5xl font-light tracking-[-0.02em] sm:text-6xl">Registry</h1>
            <p className="mt-3 max-w-md text-ink-2">Where you&apos;re registered, so it&apos;s easy to share with guests.</p>
          </div>
        </section>

        {needsMigration && (
          <p role="status" className="mt-4 rounded-xl border border-gold bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] p-3 text-sm">
            The new registry features need database update 044. Once it&apos;s been run, this page unlocks the guest link, cover images and gift tracking.
          </p>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-wine">{error}</p>}

        {entries.length === 0 ? (
          <section aria-label="Start your registry" className="mx-auto mt-10 flex max-w-xl flex-col items-center px-2 py-6 text-center">
            <div className="relative h-44 w-36 overflow-hidden rounded-t-[999px] border border-line bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/photo-candlelit-table.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <h2 className="mt-6 font-serif text-4xl font-light">Start your registry</h2>
            <p className="mt-3 max-w-md text-ink-2">Bring all your registries together so guests always know where to look.</p>
            <button onClick={() => setDialog({})} className={`mt-6 flex min-h-12 items-center gap-2 rounded-full bg-surface-sage-deep px-6 text-sm font-semibold text-white ${FOCUS_RING}`}>
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add your first registry
            </button>
            <p className="mt-4 max-w-sm text-sm text-ink-2">Add a store registry, honeymoon fund, charity, cash fund or anything else.</p>
          </section>
        ) : (
          <>
            {!needsMigration && (
              <section aria-label="Share your registry" className="mt-6 grid items-center gap-5 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <div>
                  <div className="flex items-start gap-3">
                    <Share2 className="mt-1 h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />
                    <div>
                      <h2 className="font-serif text-2xl font-medium">Share your registry</h2>
                      <p className="text-sm text-ink-2">Give guests one link to all your registries.</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-h-12 min-w-0 flex-1 items-center rounded-xl border border-line bg-bg px-4">
                      <input readOnly aria-label="Your public registry link" value={`${host}${publicPath}`} onFocus={(e) => e.currentTarget.select()} className="w-full min-w-0 bg-transparent text-sm text-ink outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copyLink} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-sage-deep px-5 text-sm font-semibold text-white sm:flex-none ${FOCUS_RING}`}>
                        {copied ? <Check className="h-4 w-4" strokeWidth={2} aria-hidden /> : <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                        {copied ? "Copied" : "Copy link"}
                      </button>
                      <Link href={publicPath} target="_blank" className={`flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line px-4 text-sm font-semibold hover:bg-bg sm:flex-none ${FOCUS_RING}`}>
                        View public page <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      </Link>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-ink-2" aria-live="polite">
                    {guestCount === 0 ? "No registry is visible to guests yet. Add a link and switch on Show to guests." : `${guestCount} ${guestCount === 1 ? "registry is" : "registries are"} visible to guests. `}
                    <button onClick={() => setSettingsOpen(true)} className={`min-h-9 font-semibold text-sage-deep underline underline-offset-2 ${FOCUS_RING}`}>Edit link &amp; note</button>
                  </p>
                </div>
                <figure className="relative rounded-xl bg-bg p-5 text-center lg:bg-transparent">
                  <figcaption className="sr-only">Your note to guests</figcaption>
                  <p className="font-serif text-base italic leading-relaxed text-ink-2">&ldquo;{settings.guest_note}&rdquo;</p>
                  <p className="mt-2 font-script text-2xl text-ink-2">{settings.couple} ♡</p>
                </figure>
              </section>
            )}

            <div className="mt-8 flex items-end justify-between gap-3">
              <h2 className="font-serif text-2xl font-medium">Your registries <span className="text-base font-normal text-ink-2">({entries.length})</span></h2>
              <button onClick={() => setDialog({})} className={`flex min-h-11 items-center gap-1.5 rounded-full bg-surface-sage-deep px-5 text-sm font-semibold text-white ${FOCUS_RING}`}>
                <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add registry
              </button>
            </div>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {shown.map((e) => {
                const t = typeOf(e);
                const info = REGISTRY_TYPES[t];
                const Icon = TYPE_ICON[t];
                const hidden = !isVisible(e);
                return (
                  <li key={e.id} className="relative flex flex-col rounded-2xl border border-line bg-paper shadow-sm">
                    <RegistryCover src={coverSrc(e, ideas)} type={t} className={`aspect-[16/9] rounded-t-2xl ${hidden ? "opacity-60" : ""}`} />
                    <div className="absolute right-3 top-3 z-10" data-registry-menu>
                      <button
                        ref={(el) => { menuTriggers.current[e.id] = el; }}
                        onClick={() => setMenuId(menuId === e.id ? null : e.id)}
                        aria-haspopup="true"
                        aria-expanded={menuId === e.id}
                        aria-label={`Options for ${e.store_name}`}
                        className={`flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm hover:bg-paper ${FOCUS_RING}`}
                      >
                        <Ellipsis className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </button>
                      {menuId === e.id && (
                        // Plain buttons, not an ARIA menu widget — Tab already reaches each one in order,
                        // so this doesn't promise arrow-key navigation it would then have to provide.
                        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-md">
                          <button onClick={() => { skipMenuFocusReturn.current = true; setMenuId(null); setDialog({ entry: e }); }} className="block min-h-11 w-full px-4 text-left text-sm font-semibold hover:bg-bg">Edit</button>
                          <button onClick={() => { setMenuId(null); void patchEntry(e.id, { visible: hidden }); }} className="block min-h-11 w-full px-4 text-left text-sm font-semibold hover:bg-bg">{hidden ? "Show to guests" : "Hide from guests"}</button>
                          {!e.is_primary && <button onClick={() => makePrimary(e.id)} className="block min-h-11 w-full px-4 text-left text-sm font-semibold hover:bg-bg">Make primary</button>}
                          <button onClick={() => { skipMenuFocusReturn.current = true; removeEntry(e); }} className="block min-h-11 w-full px-4 text-left text-sm font-semibold text-wine hover:bg-bg">Delete</button>
                        </div>
                      )}
                    </div>
                    {hidden && <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-semibold text-ink-2 shadow-sm">Hidden from guests</span>}

                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> {info.label}
                        </span>
                        {e.is_primary && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] px-2.5 py-1 text-xs font-semibold text-ink">
                            <Star className="h-3 w-3" strokeWidth={1.75} aria-hidden /> Main registry
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 font-serif text-xl font-medium leading-tight">{e.store_name}</h3>
                      <p className="mt-1 text-sm text-ink-2">{e.description || " "}</p>
                      {e.summary && <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">{e.summary}</p>}
                      <div className="mt-auto pt-4">
                        {e.url ? (
                          <a href={normalizeUrl(e.url)} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
                            {info.cta} <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          </a>
                        ) : (
                          <button onClick={() => setDialog({ entry: e })} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-dashed border-line px-4 text-sm font-semibold text-ink-2 hover:bg-bg ${FOCUS_RING}`}>
                            Add a link <span className="text-xs font-normal">so guests can find it</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section aria-label="Registry setup" className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-medium">Registry setup</h2>
                <p className="text-sm text-ink-2">{setupDone} of {SETUP_TASKS.length} done. These live on your Planning Board too.</p>
              </div>
              <Link href="/board" className={`flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
                Planning Board <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {SETUP_TASKS.map((s) => {
                const row = rowFor(s.key);
                return <TaskRow key={s.key} title={s.title} done={row?.status === "done"} onToggle={() => toggleTask(s.title, s.key, row)} onBoard={Boolean(row)} />;
              })}
              {extras.map((t) => (
                <TaskRow key={t.id} title={t.title} done={t.status === "done"} onToggle={() => toggleTask(t.title, null, t)} onBoard />
              ))}
            </ul>
            {missing.length > 0 && (
              <button onClick={addRestToBoard} className={`mt-3 flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Add the rest to the Planning Board
              </button>
            )}
          </section>

          <section aria-label="Thank-you notes" className="relative overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))] p-6 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/botanical-accent.webp" alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -bottom-6 -right-4 h-44 w-auto rotate-[8deg] opacity-40" />
            <p className="relative font-script text-5xl leading-none text-sage-deep">Thank you ♡</p>
            {gifts.supported && gifts.recorded > 0 ? (
              <div className="relative mt-4">
                <p className="text-ink">
                  <span className="font-serif text-4xl font-medium">{gifts.due}</span> thank-you {gifts.due === 1 ? "note" : "notes"} remaining
                </p>
                <p className="mt-1 text-sm text-ink-2">{gifts.recorded} {gifts.recorded === 1 ? "gift" : "gifts"} noted on the Guest List.</p>
                {gifts.due > 0 && (
                  <Link href="/guests/list?thanks=1" className={`mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-sage-deep px-5 text-sm font-semibold text-white ${FOCUS_RING}`}>
                    See who&apos;s left <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </Link>
                )}
              </div>
            ) : (
              <div className="relative mt-4">
                <p className="text-ink-2">Your love and support mean the world to us.</p>
                <p className="mt-3 text-sm text-ink-2">When gifts arrive, note them on the household&apos;s card in the Guest List. Who gave what, and the thank-yous still to send, live there, and the count shows up here.</p>
                <Link href="/guests/list" className={`mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-sage-deep px-5 text-sm font-semibold text-sage-deep hover:bg-paper/60 ${FOCUS_RING}`}>
                  <Gift className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Open the Guest List
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>

      {dialog && (
        <RegistryDialog
          entry={dialog.entry}
          ideas={ideas}
          isFirst={entries.length === 0}
          onClose={() => setDialog(null)}
          onSave={(f) => saveRegistry(f, dialog.entry)}
        />
      )}
      {settingsOpen && <RegistrySettingsDialog settings={settings} host={host} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />}
    </div>
  );
}

function TaskRow({ title, done, onToggle, onBoard }: { title: string; done: boolean; onToggle: () => void; onBoard: boolean }) {
  return (
    <li>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1.5 text-sm">
        <input type="checkbox" checked={done} onChange={onToggle} className="h-5 w-5 shrink-0 accent-sage-deep" />
        <span className={done ? "text-ink-2 line-through" : "text-ink"}>{title}</span>
        {!onBoard && <span className="ml-auto shrink-0 text-xs text-ink-2">suggestion</span>}
      </label>
    </li>
  );
}
