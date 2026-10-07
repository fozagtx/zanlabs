// Referral codes carried by every share link: ?r=<creator>.<channel>[.<sharer>]
// creator = creator handle, channel = SHARE_CHANNELS key, sharer = a fan's refCode
// when a fan reshares. The same code is sent to Panta as the attribution userId.

import { SHARE_CHANNELS, type ShareChannel } from "./config";

export type Ref = { creator: string; channel: ShareChannel; sharer?: string };

const PART = /^[a-z0-9_]{1,24}$/;

export const REF_COOKIE = "zan_ref";
export const VISITOR_COOKIE = "zan_vid";

export function parseRef(raw: string | null | undefined): Ref | null {
  if (!raw) return null;
  const [creator, channel, sharer] = raw.trim().toLowerCase().split(".");
  if (!creator || !PART.test(creator)) return null;
  if (!channel || !(channel in SHARE_CHANNELS)) return null;
  if (sharer !== undefined && !PART.test(sharer)) return null;
  return { creator, channel: channel as ShareChannel, ...(sharer ? { sharer } : {}) };
}

export function formatRef(ref: Ref): string {
  return [ref.creator, ref.channel, ref.sharer].filter(Boolean).join(".");
}

/** Panta attribution id: namespaced and at most 64 characters. */
export function pantaUserId(ref: Ref | null): string | undefined {
  return ref ? `zan:${formatRef(ref)}`.slice(0, 64) : "zan:direct";
}

export function shareUrl(base: string, slug: string, ref: Ref): string {
  const u = new URL(`/m/${slug}`, base);
  u.searchParams.set("r", formatRef(ref));
  return u.toString();
}
