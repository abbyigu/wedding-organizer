"use client";

import { useActionState, useState } from "react";
import { signInWithName, requestPasswordReset, type AuthResult } from "./actions";

const initialState: AuthResult = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [signInState, signInAction, signingIn] = useActionState(signInWithName, initialState);
  const [resetState, resetAction, resetting] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-8 shadow-sm">
        <p className="font-serif italic text-wine text-lg">Come as you are, stay as long as you like.</p>
        <h1 className="mt-2 font-serif text-3xl font-medium">Our Wedding Room</h1>

        {mode === "signin" ? (
          <form action={signInAction} className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="username"
              className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
              placeholder="Ariel or Fred"
            />
            <label className="text-sm font-semibold" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
              placeholder="••••••••"
            />
            <button
              type="submit"
              disabled={signingIn}
              className="mt-2 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60"
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
            {signInState.error && <p className="text-sm text-wine">{signInState.error}</p>}
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="mt-1 text-left text-sm text-ink-2 underline underline-offset-2"
            >
              Forgot password?
            </button>
          </form>
        ) : resetState.ok ? (
          <p className="mt-6 text-ink-2">Check your email for a link to set a new password.</p>
        ) : (
          <form action={resetAction} className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="reset-name">Name</label>
            <input
              id="reset-name"
              name="name"
              type="text"
              required
              className="rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-sage-deep"
              placeholder="Ariel or Fred"
            />
            <button
              type="submit"
              disabled={resetting}
              className="mt-2 rounded-full bg-sage-deep px-4 py-2 font-semibold text-[#F7F3EA] disabled:opacity-60"
            >
              {resetting ? "Sending…" : "Send reset link"}
            </button>
            {resetState.error && <p className="text-sm text-wine">{resetState.error}</p>}
            <button
              type="button"
              onClick={() => setMode("signin")}
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
