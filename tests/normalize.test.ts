import { describe, expect, it } from "vitest";
import { normalizeMarket, toAmountString, toPrice, toSide, toUnixSeconds, usdcFromBase } from "@/lib/panta/normalize";

describe("Panta normalization", () => {
  it("handles decimal and 1e9-scaled prices", () => {
    expect(toPrice("0.43")).toBeCloseTo(0.43);
    expect(toPrice("430000000")).toBeCloseTo(0.43);
    expect(toPrice(null)).toBeNull();
    expect(toPrice("-1")).toBeNull();
  });

  it("handles unix seconds, milliseconds and ISO timestamps", () => {
    expect(toUnixSeconds(1_790_000_000)).toBe(1_790_000_000);
    expect(toUnixSeconds(1_790_000_000_000)).toBe(1_790_000_000);
    expect(toUnixSeconds("2026-10-12T18:00:00Z")).toBe(Date.parse("2026-10-12T18:00:00Z") / 1000);
    expect(toUnixSeconds("garbage")).toBeNull();
  });

  it("falls back through price fields and fills the missing side", () => {
    const m = normalizeMarket({ marketId: "m1", yesPrice: null, primaryYesPrice: "0.62", phase: "primary" });
    expect(m.yes).toBeCloseTo(0.62);
    expect(m.no).toBeCloseTo(0.38);
  });

  it("falls back to question/description when title is empty", () => {
    expect(normalizeMarket({ marketId: "m", title: "", question: "Q?" }).title).toBe("Q?");
    expect(normalizeMarket({ marketId: "m", title: " ", description: "D" }).title).toBe("D");
  });

  it("reads outcome only for resolved markets", () => {
    expect(normalizeMarket({ marketId: "m", phase: "resolved", outcome: "YES" }).outcome).toBe("yes");
    expect(normalizeMarket({ marketId: "m", phase: "primary", outcome: "YES" }).outcome).toBeNull();
    expect(normalizeMarket({ marketId: "m", resolved: true, result: "no" }).phase).toBe("resolved");
  });

  it("formats amounts the way Panta expects", () => {
    expect(toAmountString(5)).toBe("5.00");
    expect(toAmountString(1.005)).toBe("1.00");
    expect(toAmountString(0.29)).toBe("0.29");
    expect(toAmountString(20)).toBe("20.00");
    expect(usdcFromBase("50000000")).toBe(50);
    expect(toSide("No")).toBe("no");
  });
});
