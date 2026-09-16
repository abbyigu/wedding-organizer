"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server-only: never exposed to the client bundle, never committed (values
// live in Vercel/​.env.local env vars, not in source).
const NAME_TO_EMAIL: Record<string, string | undefined> = {
  ariel: process.env.AUTH_EMAIL_ARIEL,
  fred: process.env.AUTH_EMAIL_FRED,
};

function lookupEmail(name: string): string | null {
  const email = NAME_TO_EMAIL[name.trim().toLowerCase()];
  return email ?? null;
}

export type AuthResult = { error?: string; ok?: boolean };

export async function signInWithName(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") || "");
  const password = String(formData.get("password") || "");
  const email = lookupEmail(name);
  if (!email) return { error: "That name isn't recognized." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect name or password." };

  redirect("/");
}

export async function requestPasswordReset(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") || "");
  const email = lookupEmail(name);
  if (!email) return { error: "That name isn't recognized." };

  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
