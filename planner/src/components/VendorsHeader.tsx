"use client";

import { useRouter } from "next/navigation";
import { CircleCheck, Coins, FileText, Heart, Users } from "lucide-react";
import DashboardTopBar, { type SearchItem } from "@/components/DashboardTopBar";
import VendorsTabs from "@/components/VendorsTabs";
import { fmt } from "@/lib/venues";

export type VendorStats = { potential: number; booked: number; favourites: number; awaiting: number; spend: number };

export default function VendorsHeader({ userName, partner, items, stats }: { userName: string; partner: string; items: SearchItem[]; stats: VendorStats }) {
  const router = useRouter();
  const cells = [
    { n: stats.potential, label: "potential vendors", Icon: Users },
    { n: stats.booked, label: "booked", Icon: CircleCheck },
    { n: stats.favourites, label: "favourites", Icon: Heart },
    { n: stats.awaiting, label: "awaiting quotes", Icon: FileText },
    { n: stats.spend > 0 ? `~${fmt(stats.spend)}` : "—", label: "estimated spend", Icon: Coins },
  ];
  return (
    <>
      <DashboardTopBar userName={userName} partner={partner} items={items} notices={[]} placeholder="Search vendors, categories, or keywords…" onSelect={(item) => router.push(`${item.href}&t=${Date.now()}`)} />

      <section className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col justify-center">
          <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
            Build the team that brings it all <span className="font-script text-[1.15em] text-wine">to life.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-2">From first idea to signed contract — find the people who will make your day unforgettable.</p>
        </div>
        <div className="relative min-h-[13rem] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/photo-flower-table.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_40%]" />
          <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/10 to-transparent" />
          <p aria-hidden className="absolute right-6 top-1/2 hidden -translate-y-1/2 -rotate-6 text-right font-script text-4xl leading-[1.05] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] sm:block">
            People create
            <br />
            the magic ♡
          </p>
        </div>
      </section>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl bg-[color-mix(in_srgb,var(--sage)_10%,var(--paper))] px-5 py-5 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-line">
        {cells.map(({ n, label, Icon }) => (
          <div key={label} className="flex items-center gap-3 lg:px-4 lg:first:pl-1">
            <Icon className="h-7 w-7 shrink-0 text-ink-2" strokeWidth={1.25} aria-hidden />
            <div>
              <dd className="font-serif text-2xl font-light leading-none">{n}</dd>
              <dt className="mt-1 text-sm text-ink-2">{label}</dt>
            </div>
          </div>
        ))}
      </dl>

      <VendorsTabs />
    </>
  );
}
