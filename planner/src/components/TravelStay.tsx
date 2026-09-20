"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { blankHotelBlock, type HotelBlock } from "@/lib/travel";
import GuestsComingLater from "@/components/GuestsComingLater";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function TravelStay({ initialBlocks }: { initialBlocks: HotelBlock[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [error, setError] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  function scheduleSave(id: string, patch: Partial<HotelBlock>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("hotel_blocks").update(patch).eq("id", id);
      if (error) setError(error.message);
    }, 700);
  }

  async function addBlock() {
    setError("");
    const { data, error } = await supabase.from("hotel_blocks").insert(blankHotelBlock(blocks.length)).select().single();
    if (error) setError(error.message);
    else if (data) setBlocks((bs) => [...bs, data as HotelBlock]);
  }

  async function removeBlock(id: string) {
    if (!confirm("Remove this hotel block?")) return;
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    await supabase.from("hotel_blocks").delete().eq("id", id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-medium">Accommodation</h2>
            <p className="mt-1 text-sm text-ink-2">Hotel blocks and room-booking details, in one place.</p>
          </div>
          <button onClick={addBlock} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-surface-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Add hotel block
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-wine">{error}</p>}

        <div className="mt-4 flex flex-col gap-3">
          {blocks.length === 0 && (
            <p className="rounded-2xl border border-line bg-paper p-6 text-center text-sm text-ink-2 shadow-sm">
              No hotel blocks yet — add one for Québec City, Île d&apos;Orléans, or wherever you&apos;ve reserved rooms.
            </p>
          )}
          {blocks.map((b) => (
            <div key={b.id} className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <input
                  defaultValue={b.name}
                  onChange={(e) => scheduleSave(b.id, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-serif text-lg font-medium outline-none focus:border-line focus:bg-bg"
                />
                <button onClick={() => removeBlock(b.id)} aria-label={`Remove ${b.name}`} className={`shrink-0 rounded-full p-2.5 text-ink-2 hover:bg-bg hover:text-wine ${FOCUS_RING}`}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </button>
              </div>
              <input
                defaultValue={b.location}
                onChange={(e) => scheduleSave(b.id, { location: e.target.value })}
                placeholder="Location / address"
                className="mt-0.5 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-ink-2 outline-none focus:border-line focus:bg-bg"
              />

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Rate / night</label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={b.rate ?? ""}
                    onChange={(e) => scheduleSave(b.id, { rate: e.target.value ? +e.target.value : null })}
                    placeholder="$"
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Booking deadline</label>
                  <input
                    type="date"
                    defaultValue={b.booking_deadline ?? ""}
                    onChange={(e) => scheduleSave(b.id, { booking_deadline: e.target.value || null })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Rooms reserved</label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={b.rooms_reserved}
                    onChange={(e) => scheduleSave(b.id, { rooms_reserved: +e.target.value || 0 })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Rooms still available</label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={b.rooms_available}
                    onChange={(e) => scheduleSave(b.id, { rooms_available: +e.target.value || 0 })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Min. nights</label>
                  <input
                    type="number"
                    min={1}
                    defaultValue={b.min_nights}
                    onChange={(e) => scheduleSave(b.id, { min_nights: +e.target.value || 1 })}
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-2">Booking link</label>
                  <input
                    defaultValue={b.booking_link}
                    onChange={(e) => scheduleSave(b.id, { booking_link: e.target.value })}
                    placeholder="https://…"
                    className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-2">Notes</label>
              <textarea
                defaultValue={b.notes}
                onChange={(e) => scheduleSave(b.id, { notes: e.target.value })}
                placeholder="Cancellation policy, accessibility, pet-friendly, confirmation codes…"
                rows={2}
                className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <GuestsComingLater
        title="Coming later"
        description="With guests travelling from Québec City, Rimouski, Rhode Island, New York, California, Maine, Chicago and Maryland, transportation logistics and per-household travel assignments matter — they're just not built yet."
        items={[
          "Airports, train stations & driving directions",
          "Ferry info, parking & shuttle routes",
          "Pickup / drop-off & carpool matching",
          "Which guests need transportation vs. are driving",
          "Per-household: staying at / arriving / transportation / events",
          "Which guests still need accommodation",
          "Border, passport & currency reminders",
          "Local weather, packing & Québec French tips",
        ]}
      />
    </div>
  );
}
