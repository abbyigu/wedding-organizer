"use client";

import { useConfirm } from "@/components/ConfirmProvider";
import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { blankWeddingPartyMember, ROLE_SUGGESTIONS, SIDES, type Side, type WeddingPartyMember } from "@/lib/wedding-party";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function WeddingParty({ initialMembers, userName }: { initialMembers: WeddingPartyMember[]; userName: string }) {
  const confirm = useConfirm();
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  function scheduleSave(id: string, patch: Partial<WeddingPartyMember>) {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("wedding_party").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addMember() {
    setError("");
    const { data, error } = await supabase.from("wedding_party").insert(blankWeddingPartyMember(members.length)).select().single();
    if (error) setError(error.message);
    else if (data) setMembers((ms) => [...ms, data as WeddingPartyMember]);
  }

  async function removeMember(id: string) {
    if (!(await confirm("Remove this person from the wedding party?"))) return;
    setMembers((ms) => ms.filter((m) => m.id !== id));
    await supabase.from("wedding_party").delete().eq("id", id);
  }

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Wedding Party</h1>
            <p className="mt-2 text-ink-2">Everyone standing up with you — roles, sides, attire and contact info.</p>
          </div>
          <button onClick={addMember} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add member
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <datalist id="wedding-party-roles">
          {ROLE_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>

        <div className="mt-6 flex flex-col gap-3">
          {members.length === 0 && (
            <p className="rounded-2xl border border-line bg-paper p-6 text-center text-sm text-ink-2 shadow-sm">
              Nothing yet — add your maid of honor, best man, bridesmaids, groomsmen, officiant, and anyone else standing up with you.
            </p>
          )}
          {members.map((m) => (
            <details key={m.id} className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
              <summary className="flex cursor-pointer select-none list-none items-center gap-3 bg-bg px-4 py-3 marker:content-none">
                <span className="mr-1 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                <input
                  defaultValue={m.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => scheduleSave(m.id, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-lg font-medium outline-none focus:border-line focus:bg-paper"
                />
                <input
                  list="wedding-party-roles"
                  defaultValue={m.role}
                  placeholder="Role"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => scheduleSave(m.id, { role: e.target.value })}
                  className="w-36 shrink-0 rounded border border-line bg-paper px-2 py-1 text-xs"
                />
                <select
                  defaultValue={m.side}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => scheduleSave(m.id, { side: e.target.value as Side })}
                  className="shrink-0 rounded border border-line bg-paper px-2 py-1 text-xs"
                >
                  {SIDES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeMember(m.id);
                  }}
                  aria-label={`Remove ${m.name}`}
                  className={`shrink-0 rounded-full p-2.5 text-ink-2 hover:bg-paper hover:text-wine ${FOCUS_RING}`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </button>
              </summary>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="wedding-party-f1" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Email</label>
                  <input id="wedding-party-f1"
                    defaultValue={m.email}
                    onChange={(e) => scheduleSave(m.id, { email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wedding-party-f2" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Phone</label>
                  <input id="wedding-party-f2"
                    defaultValue={m.phone}
                    onChange={(e) => scheduleSave(m.id, { phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wedding-party-f3" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Attire / sizing</label>
                  <textarea id="wedding-party-f3"
                    defaultValue={m.attire}
                    onChange={(e) => scheduleSave(m.id, { attire: e.target.value })}
                    rows={2}
                    placeholder="Dress colour/style, suit size, measurements…"
                    className="mt-1 w-full rounded-lg border border-line bg-bg p-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="wedding-party-f4" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Notes</label>
                  <textarea id="wedding-party-f4"
                    defaultValue={m.notes}
                    onChange={(e) => scheduleSave(m.id, { notes: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-line bg-bg p-2 text-sm"
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
