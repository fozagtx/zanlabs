import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";

// Exercises the server-side Panta gateway against a local HTTP stand-in to
// check headers, trailing slashes, attribution ids, 429 retry and error mapping.

type Seen = { method: string; url: string; headers: http.IncomingHttpHeaders; body: string };
const seen: Seen[] = [];
let rateLimitOnce = true;
let server: http.Server;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen.push({ method: req.method!, url: req.url!, headers: req.headers, body });
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/v1/primaryorderquote/") {
        if (rateLimitOnce) {
          rateLimitOnce = false;
          res.statusCode = 429;
          res.setHeader("Retry-After", "0");
          return res.end(JSON.stringify({ code: "RATE_LIMITED", message: "slow down" }));
        }
        return res.end(JSON.stringify({ quoteId: "qt_1", marketId: "m", side: "yes", amountUsdc: "5.00", shares: "8.06", avgPrice: "0.62", feeUsdc: "0.10" }));
      }
      if (req.url === "/api/v1/markets/create/quote/") {
        res.statusCode = 400;
        return res.end(JSON.stringify({ code: "INVALID_MARKET_PARAMS", message: "bad", field: "startTime" }));
      }
      if (req.url?.startsWith("/api/v1/markets/abc/")) {
        return res.end(JSON.stringify({ marketId: "abc", title: "", question: "Q?", primaryYesPrice: "620000000", phase: "primary" }));
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ code: "MARKET_NOT_FOUND" }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  process.env.PANTA_API_URL = `http://127.0.0.1:${port}/api/v1`;
  process.env.PANTA_API_KEY = "pk_test_local";
});

afterAll(() => server.close());

describe("Panta gateway", () => {
  it("sends the key server-side, attribution id, and retries once on 429", async () => {
    const { pantaApi } = await import("@/lib/panta/client");
    const q = await pantaApi.orderQuote({ wallet: "W", marketId: "m", side: "yes", amountUsdc: "5.00", userId: "zan:ada.wa_status" });
    expect(q.quoteId).toBe("qt_1");
    const calls = seen.filter((s) => s.url === "/api/v1/primaryorderquote/");
    expect(calls).toHaveLength(2);
    expect(calls[1].headers["x-api-key"]).toBe("pk_test_local");
    expect(calls[1].headers["x-user-id"]).toBe("zan:ada.wa_status");
    expect(JSON.parse(calls[1].body)).toMatchObject({ amountUsdc: "5.00", side: "yes", userId: "zan:ada.wa_status" });
  });

  it("maps Panta error envelopes to PantaError with code and field", async () => {
    const { pantaApi, PantaError } = await import("@/lib/panta/client");
    await expect(
      pantaApi.createQuote({
        wallet: "W",
        question: "Q?",
        resolutionRule: "r",
        sourcesOfTruth: ["https://x.org"],
        category: "sports",
        startTime: 1,
        endTime: 2,
        resolutionTime: 3,
        imageUrl: "https://img",
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof PantaError && e.code === "INVALID_MARKET_PARAMS" && e.field === "startTime");
  });

  it("requires trailing slashes and normalizes market detail", async () => {
    const { panta } = await import("@/lib/panta/client");
    const { normalizeMarket } = await import("@/lib/panta/normalize");
    await expect(panta("/markets")).rejects.toThrow(/trailing slash/);
    const n = normalizeMarket(await panta("/markets/abc/"));
    expect(n.title).toBe("Q?");
    expect(n.yes).toBeCloseTo(0.62);
  });
});
