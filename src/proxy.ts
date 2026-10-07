import { NextResponse, type NextRequest } from "next/server";

// First-touch attribution. A visitor id and the first valid ?r= referral code
// are stored as cookies so a fan who lands from a creator's story and signs up
// later is still credited to that creator and channel.

const REF_COOKIE = "zan_ref";
const VISITOR_COOKIE = "zan_vid";
const REF_RE = /^[a-z0-9_]{1,24}\.(wa_chat|wa_status|ig_story|tt_bio|x_post|qr|copy|native)(\.[a-z0-9_]{1,24})?$/;
const MAX_AGE = 60 * 60 * 24 * 30;

export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const secure = req.nextUrl.protocol === "https:";
  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure, httpOnly: true, path: "/" });
  }
  const r = req.nextUrl.searchParams.get("r")?.toLowerCase();
  if (r && REF_RE.test(r) && !req.cookies.get(REF_COOKIE)) {
    res.cookies.set(REF_COOKIE, r, { maxAge: MAX_AGE, sameSite: "lax", secure, httpOnly: true, path: "/" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)"],
};
