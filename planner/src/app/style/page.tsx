import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import WeddingStyle from "@/components/WeddingStyle";
import { displayName } from "@/lib/auth-names";
import { loadStyle } from "@/lib/wedding-style";

export const dynamic = "force-dynamic";

export default async function StylePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    style,
    { data: decisions },
  ] = await Promise.all([supabase.auth.getUser(), loadStyle(supabase), supabase.from("decisions").select("id, title, option_type").eq("option_type", "palette").limit(1)]);
  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={displayName(user?.email)} />
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <WeddingStyle initial={style} paletteDecisionId={decisions?.[0]?.id ?? null} />
      </div>
    </div>
  );
}
