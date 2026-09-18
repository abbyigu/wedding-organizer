import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DecisionDetail from "@/components/DecisionDetail";
import { displayName } from "@/lib/auth-names";
import type { DecisionOption, DecisionVote, GenericDecision } from "@/lib/decisions";

export const dynamic = "force-dynamic";

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: decision } = await supabase.from("decisions").select("*").eq("id", id).maybeSingle();
  if (!decision) notFound();
  if (decision.link_href) redirect(decision.link_href);

  const [{ data: options }, { data: votes }] = await Promise.all([
    supabase.from("decision_options").select("*").eq("decision_id", id).order("sort_order", { ascending: true }),
    supabase.from("decision_votes").select("*").eq("decision_id", id),
  ]);

  return (
    <DecisionDetail
      initialDecision={decision as GenericDecision}
      initialOptions={(options ?? []) as DecisionOption[]}
      initialVotes={(votes ?? []) as DecisionVote[]}
      userName={displayName(user?.email)}
      userId={user?.id ?? ""}
    />
  );
}
