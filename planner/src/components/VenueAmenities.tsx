"use client";

import { AMENITY_SECTIONS } from "@/lib/venue-profile";
import type { Venue } from "@/lib/venues";

const FIELD = "mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-sage-deep";

export default function VenueAmenities({ v, update }: { v: Venue; update: (patch: Partial<Venue>, wait?: number) => void }) {
  const a = v.amenities ?? {};
  const set = (key: string, val: string, wait = 800) => update({ amenities: { ...a, [key]: val } }, wait);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-2">Everything here is optional. Fill in what you learn on tours and calls; empty answers stay out of the way.</p>
      {AMENITY_SECTIONS.map((s, i) => {
        const filled = s.fields.filter((f) => (a[f.key] ?? "").trim() !== "").length;
        return (
          <details key={s.title} open={filled > 0 || i === 0} className="group rounded-2xl border border-line bg-paper shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:content-none">
              <span className="font-serif text-xl font-medium">{s.title}</span>
              <span className="text-sm text-ink-2">{filled} of {s.fields.length} answered</span>
            </summary>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 border-t border-line px-5 py-4 sm:grid-cols-2">
              {s.fields.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`am-${f.key}`} className="text-sm font-semibold">{f.label}</label>
                  {f.options ? (
                    <select id={`am-${f.key}`} value={a[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value, 0)} className={FIELD}>
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input id={`am-${f.key}`} value={a[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className={FIELD} />
                  )}
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
