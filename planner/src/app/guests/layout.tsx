import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import GuestsHeader from "@/components/GuestsHeader";
import { displayName } from "@/lib/auth-names";
import { partnerName } from "@/lib/ideas";

export default async function GuestsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);
  const { data: guests } = await supabase.from("guests").select("id, name, plus_one, category");

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <GuestsHeader
          userName={userName}
          partner={partnerName(userName || "Ariel")}
          items={(guests ?? []).map((g) => ({ label: g.name, hint: g.category || "Household", href: `/guests/list?q=${encodeURIComponent(g.name)}` }))}
        />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
