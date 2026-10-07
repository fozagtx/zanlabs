"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trophy } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { pct } from "@/lib/format";
import type { MarketView } from "@/lib/types";
import { LEADERBOARD_MIN_CALLS } from "@/lib/config";
import { CallBadge, Countdown, StatusPill } from "./market-bits";
import { FollowButton } from "./social";
import { Avatar, Card, Pill, Segmented, cn } from "./ui";

type Leader = { userId: string; name: string; avatarUrl: string | null; calls: number; correct: number; accuracy: number; beatCreator: number };

export function Storefront({
  creator,
  markets,
  record,
  leaders,
}: {
  creator: { handle: string; displayName: string | null; avatarUrl: string | null; bio: string | null; socials: { provider: string; username: string | null }[]; followers: number };
  markets: MarketView[];
  record: { calls: number; correct: number };
  leaders: Leader[];
}) {
  const s = useSession();
  const [tab, setTab] = useState<"live" | "settled" | "fans">("live");
  const viewer = useQuery({
    queryKey: ["follow-state", creator.handle, s.authenticated],
    queryFn: () => (markets[0] ? api<{ viewer: { following: boolean } | null }>(`/api/markets/${markets[0].slug}`) : Promise.resolve({ viewer: null })),
    enabled: s.authenticated && markets.length > 0,
  });
  const live = markets.filter((m) => m.status === "live" || m.status === "closed");
  const settled = markets.filter((m) => m.status === "resolved" || m.status === "void");
  const socialUrl = (p: string, u: string) => (p === "x" ? `https://x.com/${u}` : p === "instagram" ? `https://instagram.com/${u}` : `https://www.tiktok.com/@${u}`);

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 pt-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar src={creator.avatarUrl} name={creator.handle} size={88} />
        <h1 className="text-2xl font-extrabold">@{creator.handle}</h1>
        {creator.displayName ? <p className="text-sm text-muted">{creator.displayName}</p> : null}
        {creator.bio ? <p className="max-w-xs text-sm">{creator.bio}</p> : null}
        <div className="flex flex-wrap justify-center gap-1.5">
          {creator.socials
            .filter((x) => x.username)
            .map((x) => (
              <a key={x.provider} href={socialUrl(x.provider, x.username!)} target="_blank" rel="noopener noreferrer">
                <Pill tone="coral">
                  {x.provider === "x" ? "X" : x.provider === "instagram" ? "Instagram" : "TikTok"} ✓ @{x.username}
                </Pill>
              </a>
            ))}
        </div>
        <p className="num text-sm text-muted">
          {creator.followers} followers · {record.calls ? `called it ${record.correct} of ${record.calls}` : "no settled calls yet"}
        </p>
        <div className="flex gap-2">
          <FollowButton handle={creator.handle} initial={Boolean(viewer.data?.viewer?.following)} key={String(viewer.data?.viewer?.following)} />
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold"
            onClick={() => {
              const url = `${location.origin}/@${creator.handle}`;
              navigator.clipboard.writeText(url).then(() => toast.success("Profile link copied. Put it in your bio."), () => window.prompt("Copy:", url));
            }}
          >
            <Copy className="size-3.5" /> Link
          </button>
        </div>
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        className="self-center"
        options={[
          { value: "live", label: `Live ${live.length}` },
          { value: "settled", label: `Settled ${settled.length}` },
          { value: "fans", label: "Top fans" },
        ]}
      />

      {tab === "fans" ? (
        <Card className="flex flex-col gap-2">
          <p className="flex items-center gap-2 font-semibold">
            <Trophy className="size-4 text-coral" /> Most accurate fans
          </p>
          {leaders.length ? (
            <ol className="flex flex-col gap-2">
              {leaders.map((l, i) => (
                <li key={l.userId} className="num flex items-center gap-3 text-sm">
                  <span className="w-5 text-muted">{i + 1}</span>
                  <Avatar src={l.avatarUrl} name={l.name} size={28} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{l.name}</span>
                  <span>{pct(l.accuracy)}</span>
                  <span className="text-xs text-muted">
                    {l.correct}/{l.calls}
                    {l.beatCreator ? ` · beat @${creator.handle} ${l.beatCreator}×` : ""}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Fans appear here after {LEADERBOARD_MIN_CALLS} settled calls. Ranked by accuracy, never by money.</p>
          )}
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {(tab === "live" ? live : settled).map((m) => (
            <li key={m.id}>
              <Link href={`/m/${m.slug}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
                <span className="font-semibold leading-snug">{m.question}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusPill m={m} />
                  <CallBadge m={m} />
                  {m.kind === "panta" && m.yes !== null && !m.outcome ? <span className={cn("num text-xs font-bold text-yes")}>{pct(m.yes)} YES</span> : null}
                  {m.status === "live" ? <Countdown endAt={m.endAt} /> : null}
                </span>
              </Link>
            </li>
          ))}
          {(tab === "live" ? live : settled).length === 0 ? <p className="py-8 text-center text-sm text-muted">Nothing here yet.</p> : null}
        </ul>
      )}
    </div>
  );
}
