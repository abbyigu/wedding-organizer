import { createClient } from "@/lib/supabase/server";
import BudgetNotes, { type BudgetNote } from "@/components/BudgetNotes";

export const dynamic = "force-dynamic";

export default async function BudgetNotesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("budget_notes").select("*");
  return (
    <section className="max-w-2xl">
      <h2 className="font-serif text-3xl font-medium">Budget notes</h2>
      <p className="text-ink-2">Reminders, decisions and ideas about the money.</p>
      <BudgetNotes initialNotes={(data ?? []) as BudgetNote[]} missing={!!error} />
    </section>
  );
}
