"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-8 shadow-sm">
        <p className="font-serif italic text-wine text-lg">Come as you are, stay as long as you like.</p>
        <h1 className="mt-2 font-serif text-3xl font-medium">The Wedding Room</h1>

        {status === "sent" ? (
          <p className="mt-6 text-ink-2">
            Check <b className="text-ink">{email}</b> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={sendLink} className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-2 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
            {status === "error" && <p className="text-sm text-wine">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
