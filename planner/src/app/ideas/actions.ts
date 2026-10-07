"use server";

const HOSTS = /^(www\.|m\.|vm\.|vt\.)?tiktok\.com$/i;
const ID = /\/video\/(\d{8,25})/;

export type TikTokResult = { ok: boolean; url?: string; id?: string; error?: string };

// Turns a pasted TikTok link (including the short vm.tiktok.com / vt.tiktok.com ones) into the full video link. Only TikTok addresses are ever fetched.
export async function resolveTikTok(raw: string): Promise<TikTokResult> {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return { ok: false, error: "That doesn't look like a link." };
  }
  if (u.protocol !== "https:" || !HOSTS.test(u.hostname)) return { ok: false, error: "That isn't a TikTok link." };

  let id = u.pathname.match(ID)?.[1];
  let final = `${u.origin}${u.pathname}`;
  if (!id) {
    try {
      const res = await fetch(u, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      const f = new URL(res.url);
      if (f.protocol === "https:" && HOSTS.test(f.hostname)) {
        id = f.pathname.match(ID)?.[1];
        final = `${f.origin}${f.pathname}`;
      }
    } catch {
      /* fall through to the friendly message */
    }
  }
  if (!id) return { ok: false, error: "Couldn't find the video in that link. In TikTok, tap Share, then Copy link." };
  return { ok: true, url: final, id };
}
