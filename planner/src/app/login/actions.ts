"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailForName } from "@/lib/auth-names";

export type AuthResult = { error?: string; ok?: boolean };

export async function signInWithName(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") || "");
  const password = String(formData.get("password") || "");
  const email = emailForName(name);
  if (!email) return { error: "That name isn't recognized." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect name or password." };

  redirect("/");
}

export async function requestPasswordReset(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") || "");
  const email = emailForName(name);
  if (!email) return { error: "That name isn't recognized." };

  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
