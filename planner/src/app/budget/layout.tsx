import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import BudgetHeader from "@/components/BudgetHeader";
import { displayName } from "@/lib/auth-names";
import { partnerName } from "@/lib/ideas";
import { BUDGET_GROUPS } from "@/lib/budget-extras";

export default async function BudgetLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);
  const { data: vendors } = await supabase.from("vendors").select("id, name, category");

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <BudgetHeader
          userName={userName}
          partner={partnerName(userName || "Ariel")}
          items={[
            ...BUDGET_GROUPS.map((g) => ({ label: g, hint: "Category", href: "/budget/builder" })),
            ...(vendors ?? []).map((v) => ({ label: v.name, hint: v.category || "Vendor", href: `/vendors/${v.id}` })),
          ]}
        />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
