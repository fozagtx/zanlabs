// Short, URL-safe identifiers for slugs and referral codes.
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o/1/l to avoid misreads on QR captions

export function shortId(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function isValidHandle(h: string): boolean {
  return HANDLE_RE.test(h) && !RESERVED.has(h);
}

const RESERVED = new Set([
  "admin", "api", "app", "about", "create", "explore", "help", "login", "logout", "me", "panta",
  "portfolio", "settings", "studio", "support", "traction", "wallet", "zan", "onboarding", "notifications",
]);
