import "server-only";
import { env } from "./env";

// Country detection from the hosting edge. Unknown country fails closed:
// real money stays off and the visitor gets free calls only.

export function countryFromHeaders(h: Headers): string | null {
  // Only the header the hosting platform sets (and strips from clients) is
  // trusted. Default: Vercel. Behind Cloudflare set GEO_HEADER=cf-ipcountry.
  const header = (process.env.GEO_HEADER || "x-vercel-ip-country").toLowerCase();
  let c = h.get(header);
  if (!c && process.env.NODE_ENV !== "production") c = env.devCountry() ?? null;
  if (!c) return null;
  const up = c.toUpperCase();
  return /^[A-Z]{2}$/.test(up) && up !== "XX" && up !== "T1" ? up : null;
}

export function realMoneyAllowed(country: string | null): boolean {
  if (!country) return false;
  return !env.blockedCountries().has(country);
}
