import "server-only";
import { HttpError } from "./http";

// Small per-key sliding-window limiter for app endpoints (comments, shares,
// quotes) on top of Panta's own limits. Per server instance.
const buckets = new Map<string, number[]>();

export function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new HttpError(429, "RATE_LIMITED_APP");
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 10_000) buckets.clear();
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
