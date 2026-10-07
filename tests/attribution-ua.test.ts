import { describe, expect, it } from "vitest";
import { formatRef, pantaUserId, parseRef, shareUrl } from "@/lib/attribution";
import { detectBrowser, externalBrowserUrl, isInAppBrowser } from "@/lib/ua";
import { familyFor } from "@/lib/panta/limiter";
import { getTemplate } from "@/lib/templates";

describe("referral codes", () => {
  it("parses creator.channel[.sharer]", () => {
    expect(parseRef("ada.wa_status")).toEqual({ creator: "ada", channel: "wa_status" });
    expect(parseRef("ada.ig_story.k3jx9q")).toEqual({ creator: "ada", channel: "ig_story", sharer: "k3jx9q" });
    expect(parseRef("ada.unknown")).toBeNull();
    expect(parseRef("<script>.wa_chat")).toBeNull();
    expect(parseRef(null)).toBeNull();
  });

  it("round-trips and namespaces the Panta attribution id", () => {
    const r = parseRef("ada.x_post")!;
    expect(formatRef(r)).toBe("ada.x_post");
    expect(pantaUserId(r)).toBe("zan:ada.x_post");
    expect(pantaUserId(null)).toBe("zan:direct");
    expect(pantaUserId({ creator: "a".repeat(24), channel: "wa_status", sharer: "b".repeat(24) })!.length).toBeLessThanOrEqual(64);
  });

  it("builds share URLs", () => {
    expect(shareUrl("https://zan.app", "abc12345", { creator: "ada", channel: "qr" })).toBe("https://zan.app/m/abc12345?r=ada.qr");
  });
});

describe("in-app browser detection", () => {
  it("detects Instagram, TikTok, Facebook and generic webviews", () => {
    expect(detectBrowser("Mozilla/5.0 (iPhone) Instagram 300.0")).toBe("instagram");
    expect(detectBrowser("Mozilla/5.0 (Linux; Android 14; wv) BytedanceWebview/d8a21c6")).toBe("tiktok");
    expect(detectBrowser("Mozilla/5.0 [FBAN/FBIOS;FBAV/450.0]")).toBe("facebook");
    expect(detectBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36")).toBe("webview");
    expect(isInAppBrowser(detectBrowser("Mozilla/5.0 (Macintosh) Safari/605"))).toBe(false);
  });

  it("builds an Android Chrome intent escape link", () => {
    const u = externalBrowserUrl("https://zan.app/m/abc?r=ada.ig_story", "Mozilla/5.0 (Linux; Android 14) Instagram");
    expect(u).toBe("intent://zan.app/m/abc?r=ada.ig_story#Intent;scheme=https;package=com.android.chrome;end");
  });
});

describe("Panta rate-limit families", () => {
  it("maps paths to the documented families", () => {
    expect(familyFor("POST", "/primaryorderquote/")).toBe("quote");
    expect(familyFor("POST", "/primaryorderbuild/")).toBe("build");
    expect(familyFor("POST", "/claim/creator-fees/build/")).toBe("build");
    expect(familyFor("POST", "/trades/")).toBe("register");
    expect(familyFor("GET", "/positions/")).toBe("positions");
    expect(familyFor("GET", "/markets/abc/")).toBe("read");
  });
});

describe("templates", () => {
  it("builds a Panta-valid match market that closes at kickoff", () => {
    const t = getTemplate("match")!;
    const out = t.build({
      team: "Arsenal",
      opponent: "Chelsea",
      competition: "Premier League",
      kickoff: "2026-10-18T16:30:00Z",
      source: "https://www.premierleague.com/results",
    })!;
    expect(out.question).toMatch(/^Will Arsenal beat Chelsea on/);
    expect(out.resolutionRule).toMatch(/YES/);
    expect(out.resolutionRule).toMatch(/NO/);
    expect(out.endTime).toBe(Date.parse("2026-10-18T16:30:00Z") / 1000);
    expect(out.resolutionTime).toBeGreaterThan(out.endTime);
    expect(out.category).toBe("sports");
  });

  it("returns null until required fields are filled", () => {
    expect(getTemplate("price")!.build({ asset: "SOL" })).toBeNull();
  });
});
