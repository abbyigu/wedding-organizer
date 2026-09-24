"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { signInWithName, requestPasswordReset, type AuthResult } from "./actions";

const initialState: AuthResult = {};
const LAST_NAME_KEY = "wr-last-name";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
const INPUT = "h-12 w-full rounded-xl border border-line bg-bg pl-11 pr-3 text-[16px] text-ink placeholder:text-ink-2/70 focus:border-sage-deep focus:outline-none focus:ring-2 focus:ring-sage-deep/30";

// Only a first name is remembered on this device, to say hello. Nothing sensitive is stored.
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const readName = () => {
  try {
    return localStorage.getItem(LAST_NAME_KEY) ?? "";
  } catch {
    return "";
  }
};

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [show, setShow] = useState(false);
  const [signInState, signInAction, signingIn] = useActionState(signInWithName, initialState);
  const [resetState, resetAction, resetting] = useActionState(requestPasswordReset, initialState);
  const lastName = useSyncExternalStore(subscribe, readName, () => "");

  // A short "Welcome back", then on to the Dashboard.
  useEffect(() => {
    if (!signInState.ok) return;
    try {
      localStorage.setItem(LAST_NAME_KEY, signInState.name ?? "");
    } catch {}
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => router.replace("/"), calm ? 500 : 750);
    return () => clearTimeout(t);
  }, [signInState, router]);

  return (
    <>
      <div className="w-full max-w-[26rem] rounded-3xl border border-[color-mix(in_srgb,var(--gold)_40%,var(--line))] bg-paper p-7 shadow-[0_1px_2px_rgba(60,50,30,0.05)] sm:p-9">
        <p className="font-serif text-[17px] italic leading-snug text-wine">Come as you are, stay as long as you like.</p>
        <h1 className="mt-2 font-serif text-[1.9rem] font-light tracking-[-0.01em] sm:text-4xl">Our Wedding Room</h1>
        {lastName && mode === "signin" && <p className="mt-1 font-script text-2xl leading-none text-sage-deep">Welcome back, {lastName} ♡</p>}

        {mode === "signin" ? (
          <form action={signInAction} className="mt-6 flex flex-col gap-4" aria-busy={signingIn}>
            <div>
              <label htmlFor="identifier" className="text-sm font-semibold">Name</label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
                <input key={lastName} id="identifier" name="identifier" type="text" required autoComplete="username" defaultValue={lastName} placeholder="Ariel or Fred" className={INPUT} />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-semibold">Password</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
                <input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Your password" className={`${INPUT} pr-12`} />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className={`absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-2 hover:text-ink ${FOCUS}`}>
                  {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" name="remember" defaultChecked className="h-[18px] w-[18px] accent-sage-deep" />
                Remember me
              </label>
              <button type="button" onClick={() => setMode("reset")} className={`min-h-11 rounded text-sm text-ink-2 underline underline-offset-2 hover:text-ink ${FOCUS}`}>Forgot password?</button>
            </div>

            <button type="submit" disabled={signingIn || Boolean(signInState.ok)} className={`flex h-12 items-center justify-center gap-2 rounded-full bg-surface-olive px-6 text-[16px] font-medium text-white transition-colors hover:bg-[color-mix(in_srgb,var(--surface-olive)_82%,black)] disabled:opacity-70 ${FOCUS}`}>
              {signingIn || signInState.ok ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden /></>}
            </button>
            <p role="alert" className={signInState.error ? "-mt-1 text-sm text-wine" : "sr-only"}>{signInState.error}</p>
          </form>
        ) : resetState.ok ? (
          <div className="mt-6">
            <p role="status" className="text-ink-2">Check your email for a link to set a new password.</p>
            <button type="button" onClick={() => setMode("signin")} className={`mt-3 min-h-11 rounded text-sm text-ink-2 underline underline-offset-2 hover:text-ink ${FOCUS}`}>Back to sign in</button>
          </div>
        ) : (
          <form action={resetAction} className="mt-6 flex flex-col gap-4" aria-busy={resetting}>
            <div>
              <label htmlFor="reset-identifier" className="text-sm font-semibold">Name</label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden />
                <input id="reset-identifier" name="identifier" type="text" required defaultValue={lastName} key={lastName} placeholder="Ariel or Fred" className={INPUT} />
              </div>
            </div>
            <button type="submit" disabled={resetting} className={`flex h-12 items-center justify-center rounded-full bg-surface-olive px-6 text-[16px] font-medium text-white hover:bg-[color-mix(in_srgb,var(--surface-olive)_82%,black)] disabled:opacity-70 ${FOCUS}`}>{resetting ? "Sending…" : "Send reset link"}</button>
            <p role="alert" className={resetState.error ? "-mt-1 text-sm text-wine" : "sr-only"}>{resetState.error}</p>
            <button type="button" onClick={() => setMode("signin")} className={`min-h-11 self-start rounded text-sm text-ink-2 underline underline-offset-2 hover:text-ink ${FOCUS}`}>Back to sign in</button>
          </form>
        )}
      </div>

      {signInState.ok && (
        <div role="status" aria-live="polite" className="wr-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
          <p className="font-serif text-4xl font-light sm:text-5xl">Welcome back{signInState.name ? `, ${signInState.name}` : ""} ♡</p>
          <p className="font-script text-3xl text-sage-deep">Let&apos;s see where we left off.</p>
        </div>
      )}
    </>
  );
}
