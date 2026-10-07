import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { displayName, firstName } from "@/lib/auth-names";

// Server only. The digest is worked out inside the database by a function that only answers to a secret and only ever
// reads shared planning data: payments, follow-ups, quotes, votes, RSVPs. Private notes and surprises are never touched.
export type DigestItem = { tone: "urgent" | "soon" | "info"; text: string; path: string };
export type DigestRow = { user_id: string; email: string; frequency: "weekly" | "daily"; items: DigestItem[] };

export async function loadDigest(secret: string): Promise<{ rows: DigestRow[]; error?: string }> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("reminder_digest", { p_secret: secret });
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as DigestRow[] };
}

const isMonday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto", weekday: "short" }) === "Mon";

// Daily: whenever something is overdue or soon. Weekly: Monday's summary, plus anything overdue any day.
export function shouldSend(row: DigestRow): boolean {
  const urgent = row.items.some((i) => i.tone === "urgent");
  const soon = row.items.some((i) => i.tone === "soon");
  if (row.frequency === "daily") return urgent || soon;
  return urgent || (isMonday() && row.items.length > 0);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const DOT = { urgent: "#6e2a36", soon: "#c9a86a", info: "#9fb39a" } as const;

export function renderDigest(row: DigestRow, siteUrl: string) {
  const name = firstName(row.email) || displayName(row.email);
  const base = siteUrl.replace(/\/$/, "");
  const urgent = row.items.filter((i) => i.tone === "urgent").length;
  const subject = row.items.length === 0 ? "Nothing needs you right now ♡" : urgent > 0 ? `${urgent} thing${urgent === 1 ? "" : "s"} need${urgent === 1 ? "s" : ""} you · The Wedding Room` : `Your wedding to-do's · The Wedding Room`;
  const lines = row.items.map((i) => `${i.text} — ${base}${i.path}`);
  const text = [`Hi ${name},`, "", row.items.length ? "Here's what needs a look:" : "Nothing needs you right now. Enjoy the quiet.", "", ...lines, "", `Open The Wedding Room: ${base}/`].join("\n");
  const li = row.items
    .map((i) => `<tr><td style="padding:7px 12px 7px 0;vertical-align:top"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${DOT[i.tone]}"></span></td><td style="padding:5px 0;font-size:16px;line-height:1.4"><a href="${esc(base + i.path)}" style="color:#24301f;text-decoration:none">${esc(i.text)}</a></td></tr>`)
    .join("");
  const html = `<div style="background:#f7f3ea;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#24301f"><div style="max-width:520px;margin:0 auto;background:#fffdf8;border:1px solid #d9d2c2;border-radius:20px;padding:28px">
<p style="margin:0;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#4e5a47">The Wedding Room</p>
<h1 style="margin:10px 0 4px;font-size:28px;font-weight:300">Hi ${esc(name)} ♡</h1>
<p style="margin:0 0 16px;color:#4e5a47;font-size:16px">${row.items.length ? "Here's what needs a look." : "Nothing needs you right now. Enjoy the quiet."}</p>
<table role="presentation" style="border-collapse:collapse;width:100%">${li}</table>
<p style="margin:24px 0 0"><a href="${esc(base)}/" style="display:inline-block;background:#4a5a2a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-family:Arial,sans-serif;font-size:15px">Open The Wedding Room</a></p>
<p style="margin:22px 0 0;font-size:12px;color:#4e5a47;font-family:Arial,sans-serif">Change how often you get these on your Dashboard, under Needs attention.</p>
</div></div>`;
  return { subject, html, text };
}

// Sends through your own Gmail (an app password, no domain needed). GMAIL_USER and GMAIL_APP_PASSWORD live in Vercel.

// Sends through your own Gmail (an app password, no domain needed). GMAIL_USER and GMAIL_APP_PASSWORD live in Vercel.
export async function sendEmail(to: string, mail: { subject: string; html: string; text: string }): Promise<{ ok: boolean; error?: string; detail?: string }> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""); // Google shows app passwords in groups of four
  if (!user || !pass) return { ok: false, error: "Email isn't set up yet." };
  try {
    const tx = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    const info = await tx.sendMail({ from: `The Wedding Room <${user}>`, to, ...mail });
    const mask = (a: string) => `${a.slice(0, 2)}…@${a.split("@")[1] ?? ""}`;
    if (info.rejected.length) return { ok: false, error: `Gmail rejected the address ${mask(to)}.` };
    return { ok: true, detail: `from ${mask(user)} to ${mask(to)}` };
  } catch (e) {
    return { ok: false, error: `Gmail said: ${e instanceof Error ? e.message.slice(0, 160) : "couldn't send"}` };
  }
}
