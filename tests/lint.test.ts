import { describe, expect, it } from "vitest";
import { isHttpUrl, lintMarket, type LintInput } from "@/lib/lint";

const now = 1_800_000_000;
const base: LintInput = {
  question: "Will Arsenal beat Chelsea on 12 Oct 2026?",
  resolutionRule:
    "Resolves YES if Arsenal wins the Premier League match against Chelsea per the official result. A draw or Chelsea win resolves NO.",
  sources: ["https://www.premierleague.com/results"],
  category: "sports",
  startTime: now + 3900,
  endTime: now + 86400,
  resolutionTime: now + 86400 + 4 * 3600,
  kind: "panta",
  creatorUsernames: ["adafootball"],
  nowSec: now,
};

describe("lintMarket", () => {
  it("accepts an externally verifiable match market as tier A", () => {
    const r = lintMarket(base);
    expect(r.tier).toBe("A");
    expect(r.ok).toBe(true);
  });

  it("routes questions about the creator to free calls (tier B)", () => {
    const r = lintMarket({ ...base, question: "Will my next video hit 1M views by Friday?" });
    expect(r.tier).toBe("B");
    expect(r.ok).toBe(false); // not allowed as real money
    expect(lintMarket({ ...base, kind: "forecast", question: "Will my next video hit 1M views by Friday?" }).ok).toBe(true);
  });

  it("treats the creator's own social profile as a creator-controlled source", () => {
    const r = lintMarket({ ...base, sources: ["https://www.tiktok.com/@adafootball"] });
    expect(r.tier).toBe("B");
  });

  it("blocks prohibited topics (tier C)", () => {
    expect(lintMarket({ ...base, question: "Will the striker be injured before the final?" }).tier).toBe("C");
    expect(lintMarket({ ...base, question: "Will the singer be arrested this year?" }).tier).toBe("C");
  });

  it("does not flag artist names that contain common words", () => {
    expect(lintMarket({ ...base, question: "Will Lil Baby top the Hot 100 on 10 Oct?" }).tier).toBe("A");
  });

  it("enforces Panta's one-hour start delay for real-money markets", () => {
    const r = lintMarket({ ...base, startTime: now + 600 });
    expect(r.checks.find((c) => c.id === "start_delay")?.pass).toBe(false);
    expect(r.ok).toBe(false);
  });

  it("requires start < end <= resolution", () => {
    const r = lintMarket({ ...base, resolutionTime: base.endTime - 1 });
    expect(r.checks.find((c) => c.id === "time_order")?.pass).toBe(false);
  });

  it("rejects private or malformed source URLs", () => {
    expect(isHttpUrl("http://localhost:3000/x")).toBe(false);
    expect(isHttpUrl("https://192.168.1.4/a")).toBe(false);
    expect(isHttpUrl("ftp://example.com")).toBe(false);
    expect(isHttpUrl("https://www.bbc.co.uk/sport")).toBe(true);
    expect(lintMarket({ ...base, sources: ["not a url"] }).ok).toBe(false);
  });

  it("warns (but does not block) on vague wording", () => {
    const r = lintMarket({ ...base, question: "Will Arsenal go viral after beating Chelsea on 12 Oct?" });
    const c = r.checks.find((x) => x.id === "not_vague");
    expect(c?.pass).toBe(false);
    expect(c?.severity).toBe("warning");
  });
});
