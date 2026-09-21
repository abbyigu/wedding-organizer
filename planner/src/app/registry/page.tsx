import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Registry from "@/components/Registry";
import { displayName } from "@/lib/auth-names";
import type { Guest } from "@/lib/guests";
import type { PlanningTask } from "@/lib/planning-tasks";
import { DEFAULT_SETTINGS, thankYouDue, type IdeaImage, type RegistryEntry, type RegistrySettings } from "@/lib/registry";

export const dynamic = "force-dynamic";

export default async function RegistryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: entries }, { data: settings, error: settingsError }, { data: tasks }, { data: guests, error: guestsError }, { data: pins }] = await Promise.all([
    supabase.from("registries").select("*").order("sort_order", { ascending: true }),
    supabase.from("registry_settings").select("slug, couple, guest_note").eq("id", true).maybeSingle(),
    supabase.from("planning_tasks").select("*").eq("category", "Registry").order("sort_order", { ascending: true }),
    supabase.from("guests").select("gift_received, thank_you_required, thank_you_sent"),
    supabase.from("idea_pins").select("id, title, image_url").neq("image_url", "").order("sort_order", { ascending: true }),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "the-wedding-room.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const given = (guests ?? []) as Pick<Guest, "gift_received" | "thank_you_required" | "thank_you_sent">[];
  return (
    <Registry
      initialEntries={(entries ?? []) as RegistryEntry[]}
      initialTasks={(tasks ?? []) as PlanningTask[]}
      settings={(settings as RegistrySettings | null) ?? DEFAULT_SETTINGS}
      needsMigration={Boolean(settingsError)}
      ideas={(pins ?? []) as IdeaImage[]}
      gifts={{ supported: !guestsError, recorded: given.filter((g) => g.gift_received).length, due: given.filter(thankYouDue).length }}
      origin={`${proto}://${host}`}
      userName={displayName(user?.email)}
    />
  );
}
