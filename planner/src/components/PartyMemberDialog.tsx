"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { useDialog } from "@/lib/use-dialog";
import { ROLE_SUGGESTIONS, SIDES, type Side, type WeddingPartyMember } from "@/lib/wedding-party";

const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

export type MemberForm = Pick<WeddingPartyMember, "name" | "role" | "side" | "email" | "phone" | "attire" | "notes"> &
  Required<Pick<WeddingPartyMember, "photo_url" | "attire_colour" | "attire_hex" | "flowers" | "accessories">>;

const blank = (side: Side): MemberForm => ({
  name: "", role: "", side, email: "", phone: "", attire: "", notes: "", photo_url: "", attire_colour: "", attire_hex: "", flowers: "", accessories: "",
});

export default function PartyMemberDialog({
  member,
  defaultSide = "Ariel",
  onClose,
  onSave,
  onRemove,
}: {
  member?: WeddingPartyMember;
  defaultSide?: Side;
  onClose: () => void;
  onSave: (f: MemberForm) => Promise<string | null>;
  onRemove?: () => void;
}) {
  const ref = useDialog(true, onClose);
  const [f, setF] = useState<MemberForm>(
    member
      ? {
          name: member.name, role: member.role, side: member.side, email: member.email, phone: member.phone, attire: member.attire, notes: member.notes,
          photo_url: member.photo_url ?? "", attire_colour: member.attire_colour ?? "", attire_hex: member.attire_hex ?? "", flowers: member.flowers ?? "", accessories: member.accessories ?? "",
        }
      : blank(defaultSide),
  );
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MemberForm>(k: K, v: MemberForm[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setErr("Add a name first.");
    setSaving(true);
    const error = await onSave({ ...f, name: f.name.trim() });
    setSaving(false);
    if (error) setErr(error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={member ? `${member.name}'s profile` : "Add a member"} tabIndex={-1} className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-paper p-6 shadow-lg">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light">{member ? "Their profile" : "Add someone to the party"}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-bg">
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
            <div>
              <label htmlFor="pm-name" className={LABEL}>Name</label>
              <input id="pm-name" autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="pm-role" className={LABEL}>Role</label>
              <input id="pm-role" list="pm-roles" value={f.role} onChange={(e) => set("role", e.target.value)} placeholder="Maid of Honour, Groomswoman…" className={FIELD} />
              <datalist id="pm-roles">{ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
            </div>
            <div>
              <label htmlFor="pm-side" className={LABEL}>Standing with</label>
              <select id="pm-side" value={f.side} onChange={(e) => set("side", e.target.value as Side)} className={FIELD}>
                {SIDES.map((s) => <option key={s} value={s}>{s === "Both" ? "Both of us" : `${s}'s side`}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pm-photo" className={LABEL}>Photo link</label>
              <input id="pm-photo" type="url" value={f.photo_url} onChange={(e) => set("photo_url", e.target.value)} placeholder="https://…" className={FIELD} />
            </div>
            <div>
              <label htmlFor="pm-email" className={LABEL}>Email</label>
              <input id="pm-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="pm-phone" className={LABEL}>Phone</label>
              <input id="pm-phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={FIELD} />
            </div>
          </div>

          <p className={`${LABEL} mt-6`}>Attire &amp; flowers</p>
          <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
            <div>
              <label htmlFor="pm-colour" className="block text-sm text-ink-2">Colour name</label>
              <div className="mt-1 flex items-center gap-2">
                <input id="pm-hex" type="color" aria-label="Pick the colour" value={f.attire_hex || "#ffffff"} onChange={(e) => set("attire_hex", e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-bg p-1" />
                <input id="pm-colour" value={f.attire_colour} onChange={(e) => set("attire_colour", e.target.value)} placeholder="Cabernet, Olive, Navy…" className={`${FIELD} mt-0`} />
              </div>
              {f.attire_hex && (
                <button type="button" onClick={() => set("attire_hex", "")} className="mt-1 text-xs font-semibold text-ink-2 underline">Clear swatch</button>
              )}
            </div>
            <div>
              <label htmlFor="pm-flowers" className="block text-sm text-ink-2">Flowers</label>
              <input id="pm-flowers" value={f.flowers} onChange={(e) => set("flowers", e.target.value)} placeholder="Bouquet, LEGO boutonnière" className={FIELD} />
            </div>
            <div>
              <label htmlFor="pm-acc" className="block text-sm text-ink-2">Accessories</label>
              <input id="pm-acc" value={f.accessories} onChange={(e) => set("accessories", e.target.value)} placeholder="Tie, shoes, jewellery" className={FIELD} />
            </div>
            <div>
              <label htmlFor="pm-attire" className="block text-sm text-ink-2">Style &amp; sizing</label>
              <input id="pm-attire" value={f.attire} onChange={(e) => set("attire", e.target.value)} placeholder="Floor-length, size M…" className={FIELD} />
            </div>
          </div>

          <label htmlFor="pm-notes" className={`${LABEL} mt-4`}>Notes</label>
          <textarea id="pm-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} className={FIELD} />

          {err && <p role="alert" className="mt-3 text-sm text-wine">{err}</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            {onRemove ? (
              <button type="button" onClick={onRemove} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-wine hover:bg-bg">
                <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Remove
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-2 hover:bg-bg">Cancel</button>
              <button disabled={saving} className="rounded-full bg-surface-green px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : member ? "Save" : "Add to the party"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
