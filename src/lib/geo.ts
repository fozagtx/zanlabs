import "server-only";
import { env } from "./env";

// Country detection from the hosting edge. Unknown country fails closed:
// real money stays off and the visitor gets free calls only.

export function countryFromHeaders(h: Headers): string | null {
  const c =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    h.get("cloudfront-viewer-country") ||
    env.devCountry() ||
    null;
  if (!c) return null;
  const up = c.toUpperCase();
  return /^[A-Z]{2}$/.test(up) && up !== "XX" && up !== "T1" ? up : null;
}

export function realMoneyAllowed(country: string | null): boolean {
  if (!country) return false;
  return !env.blockedCountries().has(country);
}
