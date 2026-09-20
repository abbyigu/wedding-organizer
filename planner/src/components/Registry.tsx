"use client";

import { useConfirm } from "@/components/ConfirmProvider";
import { useRef, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { normalizeUrl } from "@/lib/ideas";
import { blankRegistryEntry, type RegistryEntry } from "@/lib/registry";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function Registry({ initialEntries, userName }: { initialEntries: RegistryEntry[]; userName: string }) {
  const confirm = useConfirm();
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  function scheduleSave(id: string, patch: Partial<RegistryEntry>) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("registries").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addEntry() {
    setError("");
    const { data, error } = await supabase.from("registries").insert(blankRegistryEntry(entries.length)).select().single();
    if (error) setError(error.message);
    else if (data) setEntries((es) => [...es, data as RegistryEntry]);
  }

  async function removeEntry(id: string) {
    if (!(await confirm("Remove this registry?"))) return;
    setEntries((es) => es.filter((e) => e.id !== id));
    await supabase.from("registries").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Registry</h1>
            <p className="mt-2 text-ink-2">Where you&apos;re registered, so it&apos;s easy to share with guests.</p>
          </div>
          <button onClick={addEntry} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add registry
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-6 flex flex-col gap-3">
          {entries.length === 0 && (
            <p className="rounded-2xl border border-line bg-paper p-6 text-center text-sm text-ink-2 shadow-sm">
              Nothing yet — add the stores you&apos;ve registered with (Amazon, Bed Bath & Beyond, a honeymoon fund, anywhere else).
            </p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <input
                  defaultValue={e.store_name}
                  onChange={(ev) => scheduleSave(e.id, { store_name: ev.target.value })}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-lg font-medium outline-none focus:border-line focus:bg-bg"
                />
                {e.url && (
                  <a href={normalizeUrl(e.url)} target="_blank" rel="noreferrer" className={`shrink-0 rounded-full p-2.5 text-ink-2 hover:bg-bg hover:text-sage-deep ${FOCUS_RING}`} aria-label={`Open ${e.store_name}`}>
                    <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </a>
                )}
                <button onClick={() => removeEntry(e.id)} aria-label={`Remove ${e.store_name}`} className={`shrink-0 rounded-full p-2.5 text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              <input
                aria-label="Registry link"
                defaultValue={e.url}
                onChange={(ev) => scheduleSave(e.id, { url: ev.target.value })}
                placeholder="Registry link"
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm"
              />
              <textarea
                aria-label="Notes"
                defaultValue={e.notes}
                onChange={(ev) => scheduleSave(e.id, { notes: ev.target.value })}
                placeholder="Notes (optional)"
                rows={1}
                className="mt-2 w-full rounded-lg border border-line bg-bg p-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
