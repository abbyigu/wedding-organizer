"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/auth/update-password`,
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

        {mode === "signin" ? (
          <form onSubmit={signIn} className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
              placeholder="you@example.com"
            />
            <label className="text-sm font-semibold" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
              placeholder="••••••••"
            />
            <button
              type="submit"
              disabled={status === "busy"}
              className="mt-2 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60"
            >
              {status === "busy" ? "Signing in…" : "Sign in"}
            </button>
            {status === "error" && <p className="text-sm text-wine">{error}</p>}
            <button
              type="button"
              onClick={() => { setMode("reset"); setStatus("idle"); setError(""); }}
              className="mt-1 text-left text-sm text-ink-2 underline underline-offset-2"
            >
              Forgot password?
            </button>
          </form>
        ) : status === "sent" ? (
          <p className="mt-6 text-ink-2">
            Check <b className="text-ink">{email}</b> for a link to set a new password.
          </p>
        ) : (
          <form onSubmit={sendReset} className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={status === "busy"}
              className="mt-2 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60"
            >
              {status === "busy" ? "Sending…" : "Send reset link"}
            </button>
            {status === "error" && <p className="text-sm text-wine">{error}</p>}
            <button
              type="button"
              onClick={() => { setMode("signin"); setStatus("idle"); setError(""); }}
              className="mt-1 text-left text-sm text-ink-2 underline underline-offset-2"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
