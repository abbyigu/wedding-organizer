import { createClient } from "@/lib/supabase/server";
import Compare from "@/components/Compare";
import { displayName } from "@/lib/auth-names";
import { getBudgetContext } from "@/lib/budget-context";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .order("sort_order", { ascending: true });

  const idList = ids ? ids.split(",").filter(Boolean) : [];
  const filtered = idList.length ? (venues ?? []).filter((v) => idList.includes(v.id)) : venues ?? [];

  const { assumptions, sharedVals } = await getBudgetContext(supabase);

  return (
    <Compare
      venues={filtered}
      allCount={(venues ?? []).length}
      filtered={idList.length > 0}
      userName={displayName(user?.email)}
      assumptions={assumptions}
      sharedVals={sharedVals}
    />
  );
}
