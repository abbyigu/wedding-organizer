"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "@/components/NavBar";
import { STATUS_ORDER, STATUSES, checklistPercent, type Status, type Venue } from "@/lib/venues";

export default function Board({ initialVenues, userName }: { initialVenues: Venue[]; userName: string }) {
  const [venues, setVenues] = useState(initialVenues);

  async function moveStatus(v: Venue, status: Status) {
    setVenues((vs) => vs.map((x) => (x.id === v.id ? { ...x, status } : x)));
    const supabase = createClient();
    await supabase.from("venues").update({ status }).eq("id", v.id);
  }

  return (
    <div className="min-h-screen">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Venue Status Board</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Every venue&rsquo;s stage in the pipeline — change a venue&rsquo;s stage from its card here or from its profile.
        </p>

        {venues.length === 0 ? (
          <p className="mt-8 text-ink-2">No venues yet — add some from the dashboard first.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {STATUS_ORDER.map((status) => {
              const col = venues.filter((v) => v.status === status);
              return (
                <div key={status} className="flex flex-col gap-3 rounded-2xl border border-line bg-bg p-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="font-serif text-base font-medium">{STATUSES[status]}</h2>
                    <span className="text-xs font-semibold text-ink-2">{col.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {col.map((v) => (
                      <div key={v.id} className="rounded-xl border border-line bg-paper p-3 shadow-sm">
                        <Link href={`/venues/${v.id}`} className="font-semibold text-ink hover:text-sage-deep">
                          {v.is_favourite ? "★ " : ""}
                          {v.name}
                        </Link>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-sage-deep" style={{ width: `${checklistPercent(v)}%` }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-ink-2">{checklistPercent(v)}% quote</span>
                          <select
                            value={v.status}
                            onChange={(e) => moveStatus(v, e.target.value as Status)}
                            aria-label={`Move ${v.name}`}
                            className="rounded-full border border-line bg-bg px-2 py-0.5 text-xs font-semibold"
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>{STATUSES[s]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {col.length === 0 && <p className="px-1 text-xs italic text-ink-2">Nothing here</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
