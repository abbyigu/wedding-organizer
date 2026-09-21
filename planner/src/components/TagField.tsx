"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { colourHex, splitTags } from "@/lib/venue-profile";

// Edits a comma-separated text field as removable tags, so the saved data stays a plain string.
export default function TagField({ label, value, onChange, placeholder, swatches }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; swatches?: boolean }) {
  const [draft, setDraft] = useState("");
  const tags = splitTags(value);
  const commit = (raw: string) => {
    const next = splitTags(raw).filter((t) => !tags.some((x) => x.toLowerCase() === t.toLowerCase()));
    if (next.length) onChange([...tags, ...next].join(", "));
    setDraft("");
  };
  return (
    <div>
      <label className="text-sm font-semibold" htmlFor={`tag-${label}`}>{label}</label>
      <div className="mt-1 flex min-h-[2.75rem] flex-wrap items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1.5 focus-within:border-sage-deep">
        {tags.map((t) => {
          const hex = swatches ? colourHex(t) : undefined;
          return (
            <span key={t} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-3 pr-1 text-sm">
              {hex && <span aria-hidden className="h-3 w-3 rounded-full border border-line" style={{ backgroundColor: hex }} />}
              {t}
              <button type="button" onClick={() => onChange(tags.filter((x) => x !== t).join(", "))} aria-label={`Remove ${t}`} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-2 hover:text-wine">
                <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            </span>
          );
        })}
        <input
          id={`tag-${label}`}
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? commit(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            }
            if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1).join(", "));
          }}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-ink-2"
        />
      </div>
    </div>
  );
}
