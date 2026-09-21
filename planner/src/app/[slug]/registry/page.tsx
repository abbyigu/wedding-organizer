import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RegistryCover, { coverSrc, TYPE_ICON } from "@/components/RegistryCover";
import { REGISTRY_TYPES, typeOf, type RegistryType } from "@/lib/registry";
import { normalizeUrl } from "@/lib/ideas";

export const dynamic = "force-dynamic";
// A link to share with guests, not a page for search engines.
export const metadata: Metadata = { title: "Registry", robots: { index: false, follow: false } };

type PublicRegistry = { id: string; name: string; type: RegistryType; url: string; description: string; image_path: string | null; image_url: string | null; primary: boolean };
type PublicPage = { couple: string; note: string; registries: PublicRegistry[] };

// Everything on this page comes from one database function that returns public fields only —
// no notes, tasks, budget or guests are reachable from here.
export default async function GuestRegistryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_registry", { p_slug: slug });
  const page = data as PublicPage | null;
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-bg px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
      <div className="mx-auto max-w-4xl">
        <header className="relative text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.webp" alt="" aria-hidden className="pointer-events-none absolute -left-2 -top-4 hidden h-32 w-auto -rotate-12 -scale-x-100 opacity-40 sm:block" />
          <p className="-rotate-2 font-script text-3xl text-ink-2 sm:text-4xl">Gifts for good beginnings ♡</p>
          <h1 className="mt-2 font-serif text-5xl font-light tracking-[-0.02em] sm:text-7xl">{page.couple}</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-2">Registry</p>
        </header>

        <section aria-label={`A note from ${page.couple}`} className="mx-auto mt-10 max-w-xl text-center">
          <p className="font-serif text-lg italic leading-relaxed text-ink-2 sm:text-xl">&ldquo;{page.note}&rdquo;</p>
        </section>

        {page.registries.length === 0 ? (
          <p className="mx-auto mt-14 max-w-md text-center text-ink-2">Our registry is coming soon. Thank you for thinking of us.</p>
        ) : (
          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {page.registries.map((r) => {
              const t = typeOf(r);
              const Icon = TYPE_ICON[t];
              const info = REGISTRY_TYPES[t];
              return (
                <li key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                  <RegistryCover src={coverSrc({ image_path: r.image_path, idea_id: null }) || (r.image_url ? normalizeUrl(r.image_url) : "")} type={t} className="aspect-[16/9]" />
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-ink-2">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> {info.kicker}
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-medium leading-tight">{r.name}</h2>
                    {r.description && <p className="mt-1 text-ink-2">{r.description}</p>}
                    <a
                      href={normalizeUrl(r.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface-sage-deep px-5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:mt-auto sm:justify-start"
                    >
                      {info.cta} <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-16 text-center">
          <p className="font-script text-6xl text-sage-deep">Thank you ♡</p>
          <p className="mt-2 text-ink-2">Your love and support mean the world to us.</p>
        </footer>
      </div>
    </main>
  );
}
