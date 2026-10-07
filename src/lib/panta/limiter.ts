// Client-side pacing for Panta's per-account rate limits (guides/errors.mdx):
// read 120/60s, positions 60/60s, quote 30/60s, build 20/60s,
// register 40/60s (register, trade report, submit, auth), upload 10/60s.
// One sliding window per family per server instance. Panta remains the source
// of truth (429 + Retry-After); this keeps a single instance from tripping it.

export type RateFamily = "read" | "positions" | "quote" | "build" | "register" | "upload";

const LIMITS: Record<RateFamily, number> = {
  read: 120,
  positions: 60,
  quote: 30,
  build: 20,
  register: 40,
  upload: 10,
};

const WINDOW_MS = 60_000;
const windows = new Map<RateFamily, number[]>();

function prune(family: RateFamily, now: number): number[] {
  const arr = (windows.get(family) ?? []).filter((t) => now - t < WINDOW_MS);
  windows.set(family, arr);
  return arr;
}

/**
 * Wait for a slot in the family's window. Resolves true when a slot was taken,
 * false if none frees up within maxWaitMs (caller should report RATE_LIMITED).
 */
export async function acquire(family: RateFamily, maxWaitMs = 4000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    const now = Date.now();
    const arr = prune(family, now);
    if (arr.length < LIMITS[family]) {
      arr.push(now);
      return true;
    }
    const waitFor = WINDOW_MS - (now - arr[0]) + 5;
    if (now + waitFor > deadline) return false;
    await new Promise((r) => setTimeout(r, Math.min(waitFor, 500)));
  }
}

export function familyFor(method: string, path: string): RateFamily {
  if (path.startsWith("/positions/")) return "positions";
  if (path === "/primaryorderquote/" || path === "/markets/create/quote/") return "quote";
  if (path === "/primaryorderbuild/" || path === "/markets/create/build/" || path.startsWith("/claim/")) return "build";
  if (
    path === "/markets/register/" ||
    path === "/primaryordersubmit/" ||
    (path === "/trades/" && method === "POST") ||
    path.startsWith("/auth/")
  )
    return "register";
  if (path === "/markets/create/image-upload/") return "upload";
  return "read";
}
