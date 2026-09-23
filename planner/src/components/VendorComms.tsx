"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import { BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { COMM_KIND_LABELS, COMM_KINDS, formatShortDate, type Vendor, type VendorComm, type VendorFile } from "@/lib/vendors";

const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

// Logging an inquiry, reply or quote also moves the vendor's conversation status along, so the card stays current.
function statusFor(kind: string, v: Vendor): Partial<Vendor> {
  if (kind === "inquiry" && v.communication_status === "not_contacted") return { communication_status: "inquiry_sent" };
  if (kind === "response" && (v.communication_status === "not_contacted" || v.communication_status === "inquiry_sent")) return { communication_status: "replied" };
  if (kind === "quote") return { communication_status: "quote_received" };
  return {};
}

export default function VendorComms({
  vendor: v,
  comms,
  setComms,
  files,
  save,
}: {
  vendor: Vendor;
  comms: VendorComm[];
  setComms: (fn: (c: VendorComm[]) => VendorComm[]) => void;
  files: VendorFile[];
  save: { now: (patch: Partial<Vendor>) => void };
}) {
  const confirm = useConfirm();
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<string>("inquiry");
  const [contact, setContact] = useState(v.contact_name);
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [fileId, setFileId] = useState("");
  const [error, setError] = useState("");

  const due = comms.filter((c) => c.follow_up_date && !c.follow_up_done).sort((a, b) => (a.follow_up_date as string).localeCompare(b.follow_up_date as string));
  const timeline = [...comms].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on) || a.created_at.localeCompare(b.created_at));
  const fileName = (id: string | null) => files.find((f) => f.id === id)?.name || files.find((f) => f.id === id)?.kind;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const row = { vendor_id: v.id, occurred_on: date, kind, contact: contact.trim(), notes: notes.trim(), follow_up_date: followUp || null, file_id: fileId || null };
    const { data, error: err } = await supabase.from("vendor_communications").insert(row).select().single();
    if (err) return setError(`${err.message} Has migration 046 been run?`);
    setComms((cs) => [...cs, data as VendorComm]);
    const patch = statusFor(kind, v);
    if (Object.keys(patch).length) save.now(patch);
    setNotes("");
    setFollowUp("");
    setFileId("");
  }

  async function toggleDone(c: VendorComm) {
    const done = !c.follow_up_done;
    setComms((cs) => cs.map((x) => (x.id === c.id ? { ...x, follow_up_done: done } : x)));
    await supabase.from("vendor_communications").update({ follow_up_done: done }).eq("id", c.id);
  }

  async function remove(c: VendorComm) {
    if (!(await confirm("Remove this entry from the history?", "Remove"))) return;
    setComms((cs) => cs.filter((x) => x.id !== c.id));
    await supabase.from("vendor_communications").delete().eq("id", c.id);
  }

  return (
    <div className="space-y-8">
      {due.length > 0 && (
        <section aria-labelledby="follow-ups" className="rounded-2xl border border-line bg-[color-mix(in_srgb,var(--gold)_10%,var(--paper))] px-5 py-4">
          <h3 id="follow-ups" className="text-xs font-semibold uppercase tracking-wide text-ink-2">Follow-ups</h3>
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

      <section aria-labelledby="log-entry">
        <h3 id="log-entry" className="font-serif text-2xl font-light">Log a conversation</h3>
        <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-6">
          <label className="sm:col-span-2"><span className={LABEL}>Date</span><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} /></label>
          <label className="sm:col-span-2">
            <span className={LABEL}>What happened</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={FIELD}>
              {COMM_KINDS.map((k) => (
                <option key={k} value={k}>{COMM_KIND_LABELS[k]}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2"><span className={LABEL}>Spoke with</span><input value={contact} onChange={(e) => setContact(e.target.value)} className={FIELD} /></label>
          <label className="sm:col-span-6"><span className={LABEL}>Notes</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was said, what was promised" className={FIELD} /></label>
          <label className="sm:col-span-2"><span className={LABEL}>Follow up on</span><input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={FIELD} /></label>
          <label className="sm:col-span-2">
            <span className={LABEL}>Linked file</span>
            <select value={fileId} onChange={(e) => setFileId(e.target.value)} className={FIELD} disabled={files.length === 0}>
              <option value="">{files.length ? "None" : "No files yet"}</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>{f.name || f.kind}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end sm:col-span-2"><button type="submit" className={`${BTN_PRIMARY} w-full`}><Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />Add entry</button></div>
        </form>
        {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
      </section>

      {timeline.length === 0 ? (
        <p className="text-ink-2">Nothing logged yet. Add the first inquiry above and the follow-ups will show up on your dashboard.</p>
      ) : (
        <ol>
          {timeline.map((c) => (
            <li key={c.id} className="flex gap-4 border-t border-line py-3 first:border-t-0">
              <span className="w-14 shrink-0 pt-0.5 text-sm text-ink-2">{formatShortDate(c.occurred_on)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{COMM_KIND_LABELS[c.kind] ?? c.kind}{c.contact && <span className="font-normal text-ink-2"> · {c.contact}</span>}</span>
                {c.notes && <span className="block whitespace-pre-line text-[15px] text-ink-2">{c.notes}</span>}
                {c.follow_up_date && <span className={`block text-sm ${c.follow_up_done ? "text-ink-2 line-through" : ""}`}>Follow up {formatShortDate(c.follow_up_date)}</span>}
                {c.file_id && fileName(c.file_id) && <span className="block text-sm text-ink-2">File: {fileName(c.file_id)}</span>}
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
