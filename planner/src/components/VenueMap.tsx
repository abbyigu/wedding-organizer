"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { STATUSES, type Venue } from "@/lib/venues";

const PIN_COLOR: Record<Venue["status"], string> = {
  researching: "#4f6b4b",
  contacted: "#c9a86a",
  tour_booked: "#cf5873",
  quote_received: "#a5764c",
  finalist: "#2e4a32",
  out: "#9a9385",
};

export default function VenueMap({ venues }: { venues: (Venue & { lat: number; lng: number })[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || venues.length === 0) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      for (const v of venues) {
        const fill = v.is_favourite ? "#6e2a36" : PIN_COLOR[v.status];
        const icon = L.divIcon({
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<span style="display:flex;height:28px;width:28px;align-items:center;justify-content:center;border-radius:50%;background:${fill};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35);color:#fff;font-size:13px;line-height:1">${v.is_favourite ? "♥" : ""}</span>`,
        });
        // Popup built from DOM nodes so venue names are never parsed as HTML.
        const box = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = v.name;
        const meta = document.createElement("div");
        meta.textContent = [v.location, STATUSES[v.status]].filter(Boolean).join(" · ");
        const link = document.createElement("a");
        link.href = `/venues/${v.id}`;
        link.textContent = "View details →";
        link.style.cssText = "display:inline-block;margin-top:6px;font-weight:600;color:#4f6b4b";
        box.append(name, meta, link);
        L.marker([v.lat, v.lng], { icon, title: v.name, alt: v.name }).addTo(map).bindPopup(box);
      }

      if (venues.length === 1) map.setView([venues[0].lat, venues[0].lng], 11);
      else map.fitBounds(L.latLngBounds(venues.map((v) => [v.lat, v.lng] as [number, number])), { padding: [48, 48], maxZoom: 12 });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [venues]);

  return <div ref={el} role="region" aria-label="Map of your venues" className="h-[34rem] w-full overflow-hidden rounded-2xl border border-line bg-bg" />;
}
