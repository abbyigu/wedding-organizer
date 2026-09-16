import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-serif italic text-wine">Come as you are, stay as long as you like.</p>
          <h1 className="font-serif text-3xl font-medium">The Wedding Room</h1>
        </div>
        <form action="/logout" method="post">
          <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-sage-deep">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-paper p-8 shadow-sm">
        <p className="text-ink-2">
          Signed in as <b className="text-ink">{user?.email}</b>.
        </p>
        <p className="mt-4 text-ink-2">
          Auth is wired up. Next: bring the venue dashboard, guest list and budget
          tracker over from the single-file artifact onto this shared Supabase data
          model.
        </p>
      </div>
    </main>
  );
}
