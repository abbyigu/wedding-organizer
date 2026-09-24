"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { firstName, resolveLoginEmail } from "@/lib/auth-names";
import { REMEMBER_COOKIE } from "@/lib/supabase/remember";

export type AuthResult = { error?: string; ok?: boolean; name?: string };

export async function signInWithName(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const identifier = String(formData.get("identifier") || "");
  const password = String(formData.get("password") || "");
  const remember = formData.get("remember") === "on";
  const email = resolveLoginEmail(identifier);
  if (!email) return { error: "That name isn't recognized." };

  // Recorded before signing in, so the session cookies are written the way the choice asks.
  (await cookies()).set(REMEMBER_COOKIE, remember ? "1" : "0", { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect name or password." };

  // The page shows a brief "Welcome back" and then moves on to the Dashboard.
  return { ok: true, name: firstName(email) };
}

export async function requestPasswordReset(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = resolveLoginEmail(String(formData.get("identifier") || ""));
  if (!email) return { error: "That name isn't recognized." };

  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
