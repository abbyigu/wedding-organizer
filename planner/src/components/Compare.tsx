import Link from "next/link";
import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import { calcVenue, DEFAULT_ASSUMPTIONS, fmt, STATUSES, type Venue } from "@/lib/venues";

function cell(v?: string) {
  return v ? v : <span className="italic text-ink-2">—</span>;
}

const ROWS: { label: string; render: (v: Venue) => ReactNode }[] = [
  { label: "Status", render: (v) => STATUSES[v.status] },
  { label: "Estimated all-in", render: (v) => fmt(calcVenue(v, DEFAULT_ASSUMPTIONS, []).grand) },
  { label: "Quote received", render: (v) => (v.quote_received ? "✓ Yes" : "Not yet") },
  { label: "Capacity", render: (v) => cell(v.capacity) },
  { label: "Location", render: (v) => cell(v.location) },
  { label: "Period", render: (v) => cell(v.period) },
  { label: "Turnkey level", render: (v) => cell(v.turnkey) },
  { label: "DIY we'd still do", render: (v) => cell(v.diy) },
  { label: "Team", render: (v) => cell(v.team) },
  { label: "Themes", render: (v) => cell(v.themes) },
  { label: "Colors on site", render: (v) => cell(v.colors) },
  { label: "What we love", render: (v) => cell(v.pros) },
  { label: "What worries us", render: (v) => cell(v.cons) },
  { label: "Contact", render: (v) => cell(v.contact) },
  {
    label: "Website",
    render: (v) =>
      v.website ? (
        <a href={v.website} target="_blank" rel="noreferrer" className="text-sage-deep underline underline-offset-2">
          Visit site
        </a>
      ) : (
        cell()
      ),
  },
];

export default function Compare({ venues, userName }: { venues: Venue[]; userName: string }) {
  return (
    <div className="min-h-screen">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Detailed Comparison</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Every venue, every category, side by side — the full research behind the{" "}
          <Link href="/" className="text-sage-deep underline underline-offset-2">dashboard</Link>.
        </p>

        {venues.length === 0 ? (
          <p className="mt-8 text-ink-2">No venues yet — add some from the dashboard first.</p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-paper shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg">
                  <th className="w-40 shrink-0 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">
                    Category
                  </th>
                  {venues.map((v) => (
                    <th key={v.id} className="min-w-48 px-4 py-3 text-left align-top">
                      <Link href={`/venues/${v.id}`} className="font-serif text-base font-medium text-ink hover:text-sage-deep">
                        {v.name}
                      </Link>
                      <span className="mt-0.5 block text-xs font-normal text-ink-2">{v.location || "Location TBD"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-line last:border-0 odd:bg-[color-mix(in_srgb,var(--bg)_45%,transparent)]">
                    <th className="px-4 py-3 text-left align-top text-xs font-semibold uppercase tracking-wide text-ink-2">
                      {row.label}
                    </th>
                    {venues.map((v) => (
                      <td key={v.id} className="px-4 py-3 align-top">
                        {row.render(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
