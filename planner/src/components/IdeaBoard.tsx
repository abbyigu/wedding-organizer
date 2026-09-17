"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { blankIdea, groupIdeasByCategory, IDEA_CATEGORIES, normalizeUrl, type IdeaPin, type IdeaVisibility } from "@/lib/ideas";

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
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const grouped = groupIdeasByCategory(ideas);
  const categoryOptions = [...new Set([...IDEA_CATEGORIES, ...ideas.map((i) => i.category).filter(Boolean)])];

  // Privacy is set per category, not per idea: if any of your own ideas in a
  // category are private, the whole category reads as private for you.
  function myCategoryVisibility(category: string): IdeaVisibility {
    const mine = ideas.filter((i) => i.category === category && i.owner_id === userId);
    return mine.some((i) => i.visibility === "private") ? "private" : "shared";
  }

  async function toggleCategoryVisibility(category: string) {
    const next: IdeaVisibility = myCategoryVisibility(category) === "shared" ? "private" : "shared";
    setIdeas((is) => is.map((i) => (i.category === category && i.owner_id === userId ? { ...i, visibility: next } : i)));
    const { error } = await supabase.from("idea_pins").update({ visibility: next }).eq("category", category).eq("owner_id", userId);
    if (error) setError(error.message);
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

  function changeCategory(idea: IdeaPin, category: string) {
    const finalCategory = category || "Other";
    scheduleIdeaSave(idea.id, { category: finalCategory, visibility: myCategoryVisibility(finalCategory) });
  }

  async function addIdea(category: string) {
    setError("");
    const idea = { ...blankIdea(ideas.length), category, visibility: myCategoryVisibility(category) };
    const { data, error } = await supabase.from("idea_pins").insert(idea).select().single();
    if (error) setError(error.message);
    else if (data) setIdeas((is) => [data as IdeaPin, ...is]);
  }

  function newCategory() {
    const name = window.prompt("New category name (e.g. Dress, Decor, Flowers)")?.trim();
    if (name) addIdea(name);
  }

  async function removeIdea(id: string) {
    if (!confirm("Delete this idea?")) return;
    setIdeas((is) => is.filter((i) => i.id !== id));
    await supabase.from("idea_pins").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/" className="text-sm text-ink-2 underline underline-offset-2">← Dashboard</Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Idea board</h1>
            <p className="mt-2 max-w-2xl text-ink-2">Dresses, decor, flowers — shared between the two of you.</p>
          </div>
          <button onClick={newCategory} className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-[#F7F3EA]">＋ New category</button>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        {ideas.length === 0 ? (
          <p className="mt-8 text-sm text-ink-2">
            Nothing here yet — start a category above, then paste in a Pinterest image address (right-click a pin → Copy image address).
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <datalist id="idea-categories">
              {categoryOptions.map((c) => <option key={c} value={c} />)}
            </datalist>
            {grouped.map(([category, list]) => (
              <details key={category} open className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2 bg-bg px-4 py-3 marker:content-none">
                  <span className="font-serif text-lg font-medium">
                    <span className="mr-2 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                    {category} <span className="text-sm font-normal text-ink-2">({list.length})</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCategoryVisibility(category);
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        myCategoryVisibility(category) === "private"
                          ? "bg-[color-mix(in_srgb,var(--wine)_15%,var(--paper))] text-wine"
                          : "bg-[color-mix(in_srgb,var(--sage)_25%,var(--paper))] text-sage-deep"
                      }`}
                    >
                      {myCategoryVisibility(category) === "private" ? "🔒 Private — only you" : "👥 Shared"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addIdea(category);
                      }}
                      className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-2 hover:border-sage-deep hover:text-ink"
                    >
                      ＋ Add
                    </button>
                  </span>
                </summary>
                <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((i) => (
                    <div key={i.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-bg">
                      {i.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={normalizeUrl(i.image_url)} alt={i.title} className="aspect-[3/4] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[3/4] w-full items-center justify-center bg-[color-mix(in_srgb,var(--wine)_12%,var(--paper))] text-3xl">📌</div>
                      )}
                      <div className="flex flex-1 flex-col gap-1 p-2">
                        <div className="flex items-start gap-1">
                          <input
                            defaultValue={i.title}
                            onChange={(e) => scheduleIdeaSave(i.id, { title: e.target.value })}
                            className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:border-line focus:bg-paper"
                          />
                          <button onClick={() => removeIdea(i.id)} aria-label={`Delete ${i.title}`} className="shrink-0 text-xs text-wine">×</button>
                        </div>
                        <input
                          list="idea-categories"
                          defaultValue={i.category}
                          onBlur={(e) => changeCategory(i, e.target.value)}
                          placeholder="Category"
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-ink-2 outline-none focus:border-line focus:bg-paper"
                        />
                        <input
                          defaultValue={i.image_url}
                          onChange={(e) => scheduleIdeaSave(i.id, { image_url: e.target.value })}
                          placeholder="Pinterest / image URL"
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none focus:border-line focus:bg-paper"
                        />
                        <textarea
                          defaultValue={i.note}
                          onChange={(e) => scheduleIdeaSave(i.id, { note: e.target.value })}
                          placeholder="Note…"
                          rows={2}
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none focus:border-line focus:bg-paper"
                        />
                        {i.image_url && (
                          <a href={normalizeUrl(i.image_url)} target="_blank" rel="noreferrer" className="mt-auto text-xs font-semibold text-sage-deep underline underline-offset-2">
                            Open →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
