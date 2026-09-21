"use client";

import { usePathname, useRouter } from "next/navigation";
import DashboardTopBar, { type SearchItem } from "@/components/DashboardTopBar";
import GuestsTabs from "@/components/GuestsTabs";

export default function GuestsHeader({ userName, partner, items }: { userName: string; partner: string; items: SearchItem[] }) {
  const router = useRouter();
  const overview = usePathname() === "/guests";
  return (
    <>
      <DashboardTopBar userName={userName} partner={partner} items={items} notices={[]} placeholder="Search guests, households, or keywords…" onSelect={(item) => router.push(item.href)} />

      {overview ? (
        <section className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col justify-center">
            <h1 className="font-serif text-5xl font-light tracking-[-0.02em] sm:text-6xl xl:text-[4.5rem]">Guests</h1>
            <p className="mt-3 font-serif text-3xl font-light leading-snug text-ink-2">
              The people who make
              <br />
              it all mean more.
            </p>
            <p className="mt-4 text-ink-2">From building the list to welcoming everyone.</p>
          </div>
          <div className="relative min-h-[13rem] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photo-candlelit-table.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_55%]" />
            <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/10 to-transparent" />
            <p aria-hidden className="absolute right-6 top-1/2 hidden -translate-y-1/2 -rotate-6 text-right font-script text-4xl leading-[1.05] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] sm:block">
              Good company,
              <br />
              brighter days ♡
            </p>
          </div>
        </section>
      ) : (
        <div className="mt-8">
          <h1 className="font-serif text-4xl font-light tracking-[-0.02em] sm:text-5xl">Guests</h1>
          <p className="mt-2 text-ink-2">The people who make it all mean more.</p>
        </div>
      )}

      <GuestsTabs />
    </>
  );
}
