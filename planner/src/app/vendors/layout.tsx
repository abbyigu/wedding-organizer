import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import VendorsTabs from "@/components/VendorsTabs";
import { displayName } from "@/lib/auth-names";

export default async function VendorsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden">
          <div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">Vendors</h1>
            <p className="mt-2 text-ink-2">From first idea to signed contract.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/botanical-accent.png" alt="" aria-hidden className="pointer-events-none absolute -right-6 -top-12 hidden h-40 w-auto rotate-[8deg] opacity-30 sm:block" />
        </div>
        <VendorsTabs />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
