// Server-only: real emails live in env vars (Vercel / .env.local), never in
// source, since this repo is public. Import only from server components,
// server actions or route handlers — never from a "use client" file.
const NAME_TO_EMAIL: Record<string, string | undefined> = {
  ariel: process.env.AUTH_EMAIL_ARIEL,
  fred: process.env.AUTH_EMAIL_FRED,
};

export function emailForName(name: string): string | null {
  return NAME_TO_EMAIL[name.trim().toLowerCase()] ?? null;
}

export function displayName(email: string | undefined | null): string {
  if (!email) return "";
  const match = Object.entries(NAME_TO_EMAIL).find(([, e]) => e === email);
  return match ? match[0][0].toUpperCase() + match[0].slice(1) : email;
}

// Sign-in takes a first name today (the Ariel/Fred prototype) or, for the accounts to come, an email address.
// Everything that needs "who is this" goes through here, so moving to email + profiles later touches one place.
export function resolveLoginEmail(identifier: string): string | null {
  const v = identifier.trim();
  if (v.includes("@")) return v.toLowerCase();
  return emailForName(v);
}

export function firstName(email: string | undefined | null): string {
  const name = displayName(email);
  if (!name) return "";
  const first = name.includes("@") ? name.split("@")[0].split(/[._-]/)[0] : name;
  return first.charAt(0).toUpperCase() + first.slice(1);
}
