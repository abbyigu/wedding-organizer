import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import VendorsHeader from "@/components/VendorsHeader";
import { displayName } from "@/lib/auth-names";
import { partnerName } from "@/lib/ideas";
import { isBooked, VENDOR_CATEGORIES, type Vendor, type VendorComm } from "@/lib/vendors";

export default async function VendorsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName = displayName(user?.email);

  const [{ data: rows }, { data: comms }] = await Promise.all([
    supabase.from("vendors").select("id, name, category, status"),
    supabase.from("vendor_communications").select("vendor_id, follow_up_date, follow_up_done"),
  ]);
  const vendors = (rows ?? []) as Pick<Vendor, "id" | "name" | "category" | "status">[];
  const today = new Date().toISOString().slice(0, 10);
  const due = new Set(((comms ?? []) as Pick<VendorComm, "vendor_id" | "follow_up_date" | "follow_up_done">[]).filter((c) => c.follow_up_date && !c.follow_up_done && c.follow_up_date <= today).map((c) => c.vendor_id));

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <VendorsHeader
          userName={userName}
          partner={partnerName(userName || "Ariel")}
          items={[
            ...vendors.map((v) => ({ label: v.name, hint: v.category, href: `/vendors/${v.id}` })),
            ...VENDOR_CATEGORIES.map((c) => ({ label: c, hint: "Category", href: `/vendors?category=${encodeURIComponent(c)}` })),
          ]}
          notices={due.size ? [{ label: `${due.size} vendor follow-up${due.size === 1 ? " is" : "s are"} due`, href: "/vendors" }] : []}
          counts={{ potential: vendors.filter((v) => !isBooked(v)).length, booked: vendors.filter(isBooked).length }}
        />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
