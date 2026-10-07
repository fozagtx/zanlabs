// In-app browser detection. Instagram, TikTok, Facebook and X open links in
// embedded webviews where Google sign-in is blocked (disallowed_useragent),
// passkeys are unreliable and wallet extensions don't exist.

export type BrowserKind = "instagram" | "tiktok" | "facebook" | "x" | "snapchat" | "webview" | "browser";

export function detectBrowser(ua: string | null | undefined): BrowserKind {
  const s = ua ?? "";
  if (/Instagram/i.test(s)) return "instagram";
  if (/BytedanceWebview|musical_ly|TikTok|trill_/i.test(s)) return "tiktok";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(s)) return "facebook";
  if (/Twitter|TwitterAndroid/i.test(s)) return "x";
  if (/Snapchat/i.test(s)) return "snapchat";
  if (/; wv\)/.test(s)) return "webview";
  return "browser";
}

export function isInAppBrowser(kind: BrowserKind): boolean {
  return kind !== "browser";
}

export function isAndroid(ua: string | null | undefined): boolean {
  return /Android/i.test(ua ?? "");
}

export function isIOS(ua: string | null | undefined): boolean {
  return /iPhone|iPad|iPod/i.test(ua ?? "");
}

/** Best-effort "open in real browser" link. Undocumented schemes; they can break with app updates. */
export function externalBrowserUrl(url: string, ua: string | null | undefined): string | null {
  if (isAndroid(ua)) {
    const u = new URL(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;end`;
  }
  if (isIOS(ua)) return `x-safari-${url}`;
  return null;
}

export function phantomBrowseUrl(url: string, origin: string): string {
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(origin)}`;
}
