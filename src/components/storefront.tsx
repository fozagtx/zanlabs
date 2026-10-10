"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Check, Link2, Radio, Share2 } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { pct } from "@/lib/format";
import type { MarketView } from "@/lib/types";
import { CallBadge, Countdown, StatusPill, VerifiedDot } from "./market-bits";
import { Avatar, Button, Empty, Pill, StatRow, Tabs } from "./ui";

type Tab = "live" | "settled";

const PROVIDER_LABEL: Record<string, string> = { x: "X", instagram: "Instagram", tiktok: "TikTok" };
const socialUrl = (p: string, u: string) => (p === "x" ? `https://x.com/${u}` : p === "instagram" ? `https://instagram.com/${u}` : `https://www.tiktok.com/@${u}`);

// The loader caps the list it sends; say so instead of implying an exact total.
const MARKET_LIST_CAP = 60;

/** A creator's link page: the one link they put in every bio, listing their markets. */
export function Storefront({
  creator,
  markets,
  record,
}: {
  creator: { handle: string; displayName: string | null; avatarUrl: string | null; bio: string | null; socials: { provider: string; username: string | null }[] };
  markets: MarketView[];
  record: { calls: number; correct: number };
}) {
  const s = useSession();
  const isMe = s.me?.handle === creator.handle;
  const [tab, setTab] = useState<Tab>("live");
  const live = markets.filter((m) => m.status === "live" || m.status === "closed");
  const settled = markets.filter((m) => m.status === "resolved" || m.status === "void");
  const verified = creator.socials.filter((x): x is { provider: string; username: string } => Boolean(x.username));

  // "now" is read after mount so the server and client render the same ring.
  const [now, setNow] = useState<number | null>(null);
  // The OS share sheet (WhatsApp, Instagram, ...) exists on most phones but not every desktop browser.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    setCanShare(typeof navigator.share === "function");
  }, []);
  const closingSoon = now !== null && markets.some((m) => m.status === "live" && m.endAt > now && m.endAt - now <= 86_400);

  const profileUrl = () => `${location.origin}/@${creator.handle}`;

  async function copyProfileLink() {
    const url = profileUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success(isMe ? "Link copied. Put it in your bio." : "Link copied.");
    } catch {
      window.prompt("Copy:", url);
    }
  }

  async function shareProfile() {
    try {
      await navigator.share({ title: `@${creator.handle} on Zan`, url: profileUrl() });
    } catch (e) {
      if ((e as Error).name !== "AbortError") void copyProfileLink();
    }
  }

  const list = tab === "live" ? live : settled;

  return (
    <div className="flex flex-col pb-10">
      {/* Instagram-style header */}
      <header className="flex flex-col items-center px-4 pt-6 text-center">
        <Avatar src={creator.avatarUrl} name={creator.handle} size={96} ring={closingSoon ? "lit" : "dim"} />
        <h1 className="mt-3 max-w-full truncate text-[22px] font-bold tracking-[-0.01em]">{creator.displayName || `@${creator.handle}`}</h1>
        <p className="mt-0.5 inline-flex max-w-full items-center gap-1 text-[15px] text-fg-2">
          <span className="truncate">@{creator.handle}</span>
          {verified.length ? <VerifiedDot title={`Verified on ${verified.map((v) => PROVIDER_LABEL[v.provider] ?? v.provider).join(", ")}`} /> : null}
        </p>
        {creator.bio ? <p className="mt-3 max-w-xs whitespace-pre-line text-[15px] leading-[1.45] text-fg/90">{creator.bio}</p> : null}
        {verified.length ? (
          <ul className="mt-2 flex flex-wrap justify-center gap-x-1.5" aria-label="Verified accounts">
            {verified.map((x) => {
              const label = PROVIDER_LABEL[x.provider] ?? x.provider;
              return (
                <li key={x.provider}>
                  <a
                    href={socialUrl(x.provider, x.username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`@${x.username} on ${label}, verified (opens in a new tab)`}
                    className="inline-flex min-h-11 items-center transition-opacity active:opacity-60"
                  >
                    <Pill>
                      <span className="text-fg-2">{label}</span>
                      <Check className="text-accent" strokeWidth={3} aria-hidden />
                      <span className="max-w-[9rem] truncate">@{x.username}</span>
                    </Pill>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </header>

      <StatRow
        className="mt-4 px-4"
        items={[
          { label: "Calls", value: markets.length >= MARKET_LIST_CAP ? `${MARKET_LIST_CAP}+` : markets.length },
          { label: "Called it", value: record.calls ? pct(record.correct / record.calls) : "--" },
        ]}
      />
      {record.calls ? (
        <p className="num mt-1 text-center text-[11px] text-fg-3">
          Right on {record.correct} of {record.calls} settled calls
        </p>
      ) : null}

      <div className="mt-4 flex gap-2 px-4">
        <Button type="button" variant={isMe ? "primary" : "secondary"} size="md" className="flex-1" onClick={copyProfileLink}>
          <Link2 className="size-4" aria-hidden /> Copy link
        </Button>
        {canShare ? (
          <Button type="button" variant="secondary" size="md" className="flex-1" onClick={shareProfile}>
            <Share2 className="size-4" aria-hidden /> Share profile
          </Button>
        ) : null}
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        label={`@${creator.handle}'s calls`}
        className="sticky top-[var(--top-bar-h)] z-10 mt-6 bg-canvas"
        options={[
          { value: "live", label: "Live", count: live.length },
          { value: "settled", label: "Settled", count: settled.length },
        ]}
      />

      <div role="tabpanel" className="px-4">
        {list.length ? (
          <ul>
            {list.map((m) => (
              <MarketRow key={m.id} m={m} />
            ))}
          </ul>
        ) : tab === "live" ? (
          <Empty icon={<Radio />} title="No live calls" body={`When @${creator.handle} posts a call, it shows up here.`} />
        ) : (
          <Empty icon={<CalendarCheck />} title="No settled calls yet" body="Calls land here once the result is in." />
        )}
      </div>
    </div>
  );
}

/** Compact market row: question, status, the creator's call, the YES chance and the countdown. */
function MarketRow({ m }: { m: MarketView }) {
  const showChance = m.kind === "panta" && m.yes !== null && !m.outcome;
  return (
    <li className="border-b border-hairline last:border-b-0">
      <Link href={`/m/${m.slug}`} className="flex min-h-12 items-start gap-3 py-4 transition-opacity active:opacity-60">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-semibold leading-[1.35]">{m.question}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusPill m={m} />
            <CallBadge m={m} />
          </div>
          {m.status === "live" ? <Countdown endAt={m.endAt} className="mt-2" /> : null}
        </div>
        {showChance ? (
          <div className="shrink-0 pt-0.5 text-right">
            <span className="sr-only">{pct(m.yes)} chance YES</span>
            <p className="num text-[22px] font-semibold leading-none tracking-[-0.02em] text-yes" aria-hidden>
              {pct(m.yes)}
            </p>
            <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-yes" aria-hidden>
              <Check className="size-3" strokeWidth={3} /> Yes
            </p>
          </div>
        ) : null}
      </Link>
    </li>
  );
}
