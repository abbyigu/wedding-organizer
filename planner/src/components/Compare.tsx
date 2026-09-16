import Link from "next/link";
import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import { calcVenue, checklistPercent, fmt, STATUSES, type Assumptions, type Venue } from "@/lib/venues";

function cell(v?: string) {
  return v ? v : <span className="italic text-ink-2">—</span>;
}

type Row = { label: string; render: (v: Venue) => ReactNode };
type Section = { title: string; rows: Row[] };

function buildSections(assumptions: Assumptions, sharedVals: number[]): Section[] {
  const calc = (v: Venue) => calcVenue(v, assumptions, sharedVals);
  return [
  {
    title: "Money",
    rows: [
      {
        label: "All-in estimate",
        render: (v) => {
          const c = calc(v);
          return (
            <>
              {fmt(c.grand)}
              {c.venueSource !== "estimated" && <span className="ml-1 text-xs font-semibold text-sage-deep">({c.venueSource})</span>}
            </>
          );
        },
      },
      { label: "Cost per guest", render: (v) => fmt(calc(v).perGuest) },
      { label: "Quoted", render: (v) => (v.quoted_total != null ? fmt(v.quoted_total) : cell()) },
      { label: "Contracted", render: (v) => (v.contracted_total != null ? fmt(v.contracted_total) : cell()) },
      {
        label: "Deposit",
        render: (v) =>
          v.deposit_amount > 0 ? (
            <>
              {fmt(v.deposit_amount)} {v.deposit_paid ? "✓ paid" : v.deposit_due ? `due ${v.deposit_due}` : "unpaid"}
            </>
          ) : (
            cell()
          ),
      },
      {
        label: "Balance",
        render: (v) => (v.balance_due ? (v.balance_paid ? `✓ paid (due ${v.balance_due})` : `due ${v.balance_due}`) : cell()),
      },
      { label: "Quote completion", render: (v) => `${checklistPercent(v)}%` },
      { label: "Quote received", render: (v) => (v.quote_received ? "✓ Yes" : "Not yet") },
    ],
  },
  {
    title: "Fit",
    rows: [
      { label: "Status", render: (v) => STATUSES[v.status] },
      { label: "Favourite", render: (v) => (v.is_favourite ? "★ Yes" : "—") },
      { label: "Capacity", render: (v) => cell(v.capacity) },
      { label: "Location", render: (v) => cell(v.location) },
      { label: "Period", render: (v) => cell(v.period) },
    ],
  },
  {
    title: "How it's built",
    rows: [
      { label: "Turnkey level", render: (v) => cell(v.turnkey) },
      { label: "DIY we'd still do", render: (v) => cell(v.diy) },
      { label: "Team", render: (v) => cell(v.team) },
    ],
  },
  {
    title: "Character",
    rows: [
      { label: "Themes", render: (v) => cell(v.themes) },
      { label: "Colors on site", render: (v) => cell(v.colors) },
    ],
  },
  {
    title: "Notes",
    rows: [
      { label: "Main advantage", render: (v) => cell(v.pros) },
      { label: "Main concern", render: (v) => cell(v.cons) },
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
    ],
  },
  ];
}

export default function Compare({
  venues,
  allCount,
  filtered,
  userName,
  assumptions,
  sharedVals,
}: {
  venues: Venue[];
  allCount: number;
  filtered: boolean;
  userName: string;
  assumptions: Assumptions;
  sharedVals: number[];
}) {
  const SECTIONS = buildSections(assumptions, sharedVals);
  return (
    <div className="min-h-screen">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Detailed Comparison</h1>
        <p className="mt-2 max-w-2xl text-ink-2">
          Every venue, every category, side by side — the full research behind the{" "}
          <Link href="/" className="text-sage-deep underline underline-offset-2">dashboard</Link>.
        </p>

        {filtered && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--wait-bg,#F5EBD4)_100%,transparent)] px-4 py-2.5 text-sm text-[var(--wait,#a87a25)]">
            Comparing {venues.length} of {allCount} venues
            <Link href="/compare" className="rounded-full border border-current px-3 py-1 text-xs font-semibold">
              Show all venues
            </Link>
          </div>
        )}

        {venues.length === 0 ? (
          <p className="mt-8 text-ink-2">No venues yet — add some from the dashboard first.</p>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {SECTIONS.map((section) => (
              <details key={section.title} open className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                <summary className="cursor-pointer select-none list-none bg-bg px-4 py-3 font-serif text-lg font-medium marker:content-none">
                  <span className="mr-2 inline-block transition-transform [details[open]_&]:rotate-90">▸</span>
                  {section.title}
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="w-40 shrink-0 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-2">
                          Category
                        </th>
                        {venues.map((v) => (
                          <th key={v.id} className="min-w-48 px-4 py-3 text-left align-top">
                            <Link href={`/venues/${v.id}`} className="font-serif text-base font-medium text-ink hover:text-sage-deep">
                              {v.is_favourite ? "★ " : ""}
                              {v.name}
                            </Link>
                            <span className="mt-0.5 block text-xs font-normal text-ink-2">{v.location || "Location TBD"}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
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
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
