"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-8 shadow-sm">
        <h1 className="font-serif text-3xl font-medium">Set a new password</h1>
        <form onSubmit={save} className="mt-6 flex flex-col gap-3">
          <label className="text-sm font-semibold" htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
            placeholder="At least 8 characters"
          />
          <button
            type="submit"
            disabled={status === "busy"}
            className="mt-2 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60"
          >
            {status === "busy" ? "Saving…" : "Save password"}
          </button>
          {status === "error" && <p className="text-sm text-wine">{error}</p>}
        </form>
      </div>
    </main>
  );
}
