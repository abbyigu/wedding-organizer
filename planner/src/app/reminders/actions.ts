"use server";

import { createClient } from "@/lib/supabase/server";
import { loadDigest, renderDigest, sendEmail } from "@/lib/reminders";

const FREQ = ["off", "weekly", "daily"] as const;
export type Result = { ok: boolean; message: string };

export async function setReminderFrequency(freq: string): Promise<Result> {
  if (!(FREQ as readonly string[]).includes(freq)) return { ok: false, message: "Unknown choice." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("reminder_prefs").upsert({ user_id: user.id, frequency: freq, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return error ? { ok: false, message: `${error.message} Has migration 053 been run?` } : { ok: true, message: freq === "off" ? "Reminders are off." : "Saved." };
}

// Sends this person their own digest right now, so they can see exactly what it looks like.
export async function sendMeATest(): Promise<Result> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, message: "Email isn't set up yet." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { rows, error } = await loadDigest(secret);
  if (error) return { ok: false, message: `${error} Has migration 053 been run, with its secret?` };
  const mine = rows.find((r) => r.user_id === user.id);
  if (!mine) return { ok: false, message: "Reminders are turned off. Pick Weekly or Daily first." };
  const out = await sendEmail(mine.email, renderDigest(mine, process.env.NEXT_PUBLIC_SITE_URL || "https://the-wedding-room.vercel.app"));
  return out.ok ? { ok: true, message: `Sent ${out.detail ?? ""}. Check your inbox, Spam and All Mail.` } : { ok: false, message: out.error ?? "Couldn't send." };
}
