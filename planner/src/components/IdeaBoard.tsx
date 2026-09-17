"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { blankIdea, groupIdeasByCategory, IDEA_CATEGORIES, normalizeUrl, type IdeaPin } from "@/lib/ideas";

export default function IdeaBoard({
  initialIdeas,
  userName,
}: {
  initialIdeas: IdeaPin[];
  userName: string;
}) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const grouped = groupIdeasByCategory(ideas);
  const categoryOptions = [...new Set([...IDEA_CATEGORIES, ...ideas.map((i) => i.category).filter(Boolean)])];

  function scheduleIdeaSave(id: string, patch: Partial<IdeaPin>) {
    setIdeas((is) => is.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("idea_pins").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addIdea() {
    setError("");
    const { data, error } = await supabase.from("idea_pins").insert(blankIdea(ideas.length)).select().single();
    if (error) setError(error.message);
    else if (data) setIdeas((is) => [data as IdeaPin, ...is]);
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
        <Link href="/private" className="text-sm text-ink-2 underline underline-offset-2">← Private</Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Idea board</h1>
            <p className="mt-2 max-w-2xl text-ink-2">Dresses, decor, flowers — only visible to you.</p>
          </div>
          <button onClick={addIdea} className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-[#F7F3EA]">＋ Add idea</button>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        {ideas.length === 0 ? (
          <p className="mt-8 text-sm text-ink-2">
            Nothing pinned yet. On Pinterest, right-click a pin → Copy image address for the preview, and copy the pin&apos;s page link too.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <datalist id="idea-categories">
              {categoryOptions.map((c) => <option key={c} value={c} />)}
            </datalist>
            {grouped.map(([category, list]) => (
              <details key={category} open className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                <summary className="cursor-pointer select-none list-none bg-bg px-4 py-3 font-serif text-lg font-medium marker:content-none">
                  <span className="mr-2 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                  {category} <span className="text-sm font-normal text-ink-2">({list.length})</span>
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
                          onBlur={(e) => scheduleIdeaSave(i.id, { category: e.target.value || "Other" })}
                          placeholder="Category"
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-ink-2 outline-none focus:border-line focus:bg-paper"
                        />
                        <input
                          defaultValue={i.pin_url}
                          onChange={(e) => scheduleIdeaSave(i.id, { pin_url: e.target.value })}
                          placeholder="Pinterest link"
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none focus:border-line focus:bg-paper"
                        />
                        <input
                          defaultValue={i.image_url}
                          onChange={(e) => scheduleIdeaSave(i.id, { image_url: e.target.value })}
                          placeholder="Image URL (for preview)"
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-ink-2 outline-none focus:border-line focus:bg-paper"
                        />
                        <textarea
                          defaultValue={i.note}
                          onChange={(e) => scheduleIdeaSave(i.id, { note: e.target.value })}
                          placeholder="Note…"
                          rows={2}
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none focus:border-line focus:bg-paper"
                        />
                        {i.pin_url && (
                          <a href={normalizeUrl(i.pin_url)} target="_blank" rel="noreferrer" className="mt-auto text-xs font-semibold text-sage-deep underline underline-offset-2">
                            Open on Pinterest →
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
