"use client";

import { useState } from "react";
import { FileText, Link2, Paperclip, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import { normalizeUrl } from "@/lib/ideas";
import { BTN, BTN_PRIMARY, FIELD, FOCUS_RING } from "@/components/VendorUi";
import { FILE_KIND_LABELS, FILE_KINDS, formatShortDate, type VendorFile } from "@/lib/vendors";

const BUCKET = "vendor-files";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-ink-2";

// Files belong to the vendor. Uploads go to a private bucket and are opened through a short-lived link.
export default function VendorFiles({ vendorId, files, setFiles }: { vendorId: string; files: VendorFile[]; setFiles: (fn: (f: VendorFile[]) => VendorFile[]) => void }) {
  const confirm = useConfirm();
  const supabase = createClient();
  const [kind, setKind] = useState<string>("quote");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function insert(row: Partial<VendorFile>) {
    const { data, error: err } = await supabase.from("vendor_files").insert({ vendor_id: vendorId, ...row }).select().single();
    if (err) {
      setError(`${err.message} Has migration 046 been run?`);
      return false;
    }
    setFiles((fs) => [...fs, data as VendorFile]);
    return true;
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!url.trim()) return;
    if (await insert({ kind, name: name.trim() || FILE_KIND_LABELS[kind], url: normalizeUrl(url) })) {
      setUrl("");
      setName("");
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${vendorId}/${crypto.randomUUID()}-${safe}`;
    const { error: err } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (err) {
      setBusy(false);
      return setError(`Couldn't upload that file (${err.message}). Has migration 046 been run?`);
    }
    await insert({ kind, name: name.trim() || file.name, storage_path: path });
    setBusy(false);
    setName("");
  }

  async function open(f: VendorFile) {
    if (f.url) return window.open(f.url, "_blank", "noopener,noreferrer");
    const { data, error: err } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 300);
    if (err || !data) return setError(err?.message ?? "Couldn't open that file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(f: VendorFile) {
    if (!(await confirm(`Remove “${f.name || FILE_KIND_LABELS[f.kind]}”?`, "Remove"))) return;
    setFiles((fs) => fs.filter((x) => x.id !== f.id));
    if (f.storage_path) await supabase.storage.from(BUCKET).remove([f.storage_path]);
    await supabase.from("vendor_files").delete().eq("id", f.id);
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="add-file">
        <h3 id="add-file" className="font-serif text-2xl font-light">Add a file</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-6">
          <label className="sm:col-span-2">
            <span className={LABEL}>Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={FIELD}>
              {FILE_KINDS.map((k) => (
                <option key={k} value={k}>{FILE_KIND_LABELS[k]}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-4"><span className={LABEL}>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Signed contract" className={FIELD} /></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className={`${BTN} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sage-deep`}>
            <Paperclip className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {busy ? "Uploading…" : "Upload a file"}
            <input type="file" disabled={busy} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
          </label>
          <span className="text-sm text-ink-2">or</span>
          <form onSubmit={addLink} className="flex min-w-[240px] flex-1 gap-2">
            <label className="flex-1"><span className="sr-only">Link to a file</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link" className={`${FIELD} !mt-0`} /></label>
            <button type="submit" className={BTN_PRIMARY}>Add link</button>
          </form>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-wine">{error}</p>}
      </section>

      {files.length === 0 ? (
        <p className="text-ink-2">No files yet. Quotes, contracts and invoices you add here stay with this vendor.</p>
      ) : (
        <ul>
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border-t border-line py-2 first:border-t-0">
              {f.url ? <Link2 className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden /> : <FileText className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden />}
              <button onClick={() => open(f)} className={`min-h-11 min-w-0 flex-1 rounded text-left ${FOCUS_RING}`}>
                <span className="block truncate font-medium underline-offset-2 hover:underline">{f.name || FILE_KIND_LABELS[f.kind]}</span>
                <span className="block text-sm text-ink-2">{FILE_KIND_LABELS[f.kind] ?? f.kind} · added {formatShortDate(f.created_at.slice(0, 10))}</span>
              </button>
              <button onClick={() => remove(f)} aria-label={`Remove ${f.name || FILE_KIND_LABELS[f.kind]}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
