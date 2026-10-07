import { loadDigest, loadTargets, renderDigest, sendEmail, shouldSend } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron, which sends "Authorization: Bearer <CRON_SECRET>". ?dry=1 shows who would get what, without sending.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const { rows, error } = await loadDigest(secret);
  if (error) return Response.json({ error }, { status: 500 });

  const targets = await loadTargets(secret);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://the-wedding-room.vercel.app";
  const dry = new URL(req.url).searchParams.has("dry");
  const results = [];
  for (const row of rows) {
    const send = shouldSend(row);
    const out = !send || dry ? null : await sendEmail(targets.get(row.user_id) ?? row.email, renderDigest(row, site));
    results.push({ user: row.user_id, frequency: row.frequency, items: row.items.length, send, ...(out ? { sent: out.ok, error: out.error } : {}) });
  }
  return Response.json({ dry, results });
}
