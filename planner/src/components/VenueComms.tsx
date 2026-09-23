"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import { normalizeUrl } from "@/lib/ideas";
import { BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { COMM_KIND_LABELS, COMM_KINDS, formatShortDate } from "@/lib/vendors";

export type VenueComm = { id: string; venue_id: string; occurred_on: string; kind: string; contact: string; notes: string; follow_up_date: string | null; follow_up_done: boolean; link: string; created_at: string };

const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

// The conversation with a venue, oldest first. Follow-ups feed the Dashboard, so nothing here is a separate to-do list.
export default function VenueComms({ venueId, defaultContact, initial, missing }: { venueId: string; defaultContact: string; initial: VenueComm[]; missing: boolean }) {
  const confirm = useConfirm();
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [comms, setComms] = useState(initial);
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<string>("inquiry");
  const [contact, setContact] = useState(defaultContact);
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const due = comms.filter((c) => c.follow_up_date && !c.follow_up_done).sort((a, b) => (a.follow_up_date as string).localeCompare(b.follow_up_date as string));
  const timeline = [...comms].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.created_at.localeCompare(b.created_at));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const row = { venue_id: venueId, occurred_on: date, kind, contact: contact.trim(), notes: notes.trim(), follow_up_date: followUp || null, link: link.trim() ? normalizeUrl(link) : "" };
    const { data, error: err } = await supabase.from("venue_communications").insert(row).select().single();
    if (err) return setError(`${err.message} Has migration 049 been run?`);
    setComms((cs) => [...cs, data as VenueComm]);
    setNotes("");
    setFollowUp("");
    setLink("");
  }

  async function toggleDone(c: VenueComm) {
    const done = !c.follow_up_done;
    setComms((cs) => cs.map((x) => (x.id === c.id ? { ...x, follow_up_done: done } : x)));
    await supabase.from("venue_communications").update({ follow_up_done: done }).eq("id", c.id);
  }

  async function remove(c: VenueComm) {
    if (!(await confirm("Remove this entry from the history?", "Remove"))) return;
    setComms((cs) => cs.filter((x) => x.id !== c.id));
    await supabase.from("venue_communications").delete().eq("id", c.id);
  }

  if (missing) return <p role="status" className="rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_18%,var(--paper))] px-5 py-4 text-sm">Contact history needs one small database update (migration 049).</p>;

  return (
    <div className="space-y-8 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
      {due.length > 0 && (
        <section aria-labelledby="vf-h" className="rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_10%,var(--paper))] px-5 py-4">
          <h3 id="vf-h" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Follow-ups</h3>
          <ul className="mt-2">
            {due.map((c) => {
              const late = (c.follow_up_date as string) < today;
              return (
                <li key={c.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={c.follow_up_done} onChange={() => toggleDone(c)} className="h-4 w-4 accent-sage-deep" />
                    <span className={`w-16 shrink-0 text-sm font-medium ${late ? "text-wine" : ""}`}>{formatShortDate(c.follow_up_date)}</span>
                    <span className="text-sm">{c.notes || COMM_KIND_LABELS[c.kind] || "Follow up"}{late && <span className="ml-2 text-wine">overdue</span>}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="vl-h">
        <h3 id="vl-h" className="font-serif text-2xl font-light">Log a conversation</h3>
        <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-6">
          <label className="sm:col-span-2"><span className={LABEL}>Date</span><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} /></label>
          <label className="sm:col-span-2"><span className={LABEL}>What happened</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={FIELD}>
              {COMM_KINDS.map((k) => <option key={k} value={k}>{COMM_KIND_LABELS[k]}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2"><span className={LABEL}>Spoke with</span><input value={contact} onChange={(e) => setContact(e.target.value)} className={FIELD} /></label>
          <label className="sm:col-span-6"><span className={LABEL}>Notes</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was said, what was promised" className={FIELD} /></label>
          <label className="sm:col-span-2"><span className={LABEL}>Follow up on</span><input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={FIELD} /></label>
          <label className="sm:col-span-2"><span className={LABEL}>Link <span className="font-normal normal-case">(email, doc)</span></span><input value={link} onChange={(e) => setLink(e.target.value)} className={FIELD} /></label>
          <div className="flex items-end sm:col-span-2"><button type="submit" className={`${BTN_PRIMARY} w-full`}><Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />Add entry</button></div>
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
      </section>

      {timeline.length === 0 ? (
        <p className="text-ink-2">Nothing logged yet. Add the first inquiry above, and any follow-up will show up on your dashboard.</p>
      ) : (
        <ol>
          {timeline.map((c) => (
            <li key={c.id} className="flex gap-4 border-t border-line py-3 first:border-t-0">
              <span className="w-14 shrink-0 pt-0.5 text-sm text-ink-2">{formatShortDate(c.occurred_on)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{COMM_KIND_LABELS[c.kind] ?? c.kind}{c.contact && <span className="font-normal text-ink-2"> · {c.contact}</span>}</span>
                {c.notes && <span className="block whitespace-pre-line text-[15px] text-ink-2">{c.notes}</span>}
                {c.follow_up_date && <span className={`block text-sm ${c.follow_up_done ? "text-ink-2 line-through" : ""}`}>Follow up {formatShortDate(c.follow_up_date)}</span>}
                {c.link && <a href={c.link} target="_blank" rel="noreferrer" className={`rounded text-sm text-green underline underline-offset-2 ${FOCUS_RING}`}>Open link ↗</a>}
              </span>
              <button onClick={() => remove(c)} aria-label={`Remove ${COMM_KIND_LABELS[c.kind] ?? "entry"} from ${formatShortDate(c.occurred_on)}`} className={`-my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
