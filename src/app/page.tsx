"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import type { MarketView } from "@/lib/types";
import { MarketCard } from "@/components/market-card";
import { Avatar, Button, Empty, Segmented, Skeleton, cn } from "@/components/ui";

type Tab = "for-you" | "following" | "closing" | "settled";

export default function Home() {
  const s = useSession();
  const [tab, setTab] = useState<Tab>("for-you");
  const q = useQuery({
    queryKey: ["feed", tab, s.authenticated],
    queryFn: () => api<{ items: MarketView[]; needsAuth?: boolean }>(`/api/markets?tab=${tab}`),
    refetchInterval: 30_000,
  });
  const items = q.data?.items ?? [];

  // Creators with a call closing in the next 24h get a lit ring.
  const ring = useMemo(() => {
    const now = Date.now() / 1000;
    const seen = new Map<string, { creator: MarketView["creator"]; hot: boolean }>();
    for (const m of items) {
      const hot = m.status === "live" && m.endAt - now < 86400 && m.endAt > now;
      const prev = seen.get(m.creator.handle);
      seen.set(m.creator.handle, { creator: m.creator, hot: Boolean(prev?.hot || hot) });
    }
    return [...seen.values()].sort((a, b) => Number(b.hot) - Number(a.hot)).slice(0, 12);
  }, [items]);

  // Fill the screen between the top bar and bottom nav; the feed scrolls inside.
  return (
    <div className="-mb-24 flex h-[calc(100dvh-3.5rem-4.5rem)] flex-col">
      <div className="px-4 pt-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "for-you", label: "For you" },
            { value: "following", label: "Following" },
            { value: "closing", label: "Closing soon" },
            { value: "settled", label: "Settled" },
          ]}
        />
      </div>

      {ring.length ? (
        <ul className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto px-4 pt-3" aria-label="Creators">
          {ring.map(({ creator, hot }) => (
            <li key={creator.handle}>
              <Link href={`/@${creator.handle}`} className="flex w-14 flex-col items-center gap-1">
                <span className={cn("rounded-full p-[3px]", hot ? "bg-gradient-to-tr from-coral to-peach" : "bg-line")}>
                  <span className="block rounded-full bg-bg p-[2px]">
                    <Avatar src={creator.avatarUrl} name={creator.handle} size={44} className="ring-0" />
                  </span>
                </span>
                <span className="w-full truncate text-center text-[11px] text-muted">@{creator.handle}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {q.isLoading ? (
        <div className="p-4">
          <Skeleton className="h-[60dvh] w-full rounded-[28px]" />
        </div>
      ) : items.length ? (
        <div className="snap-feed no-scrollbar mt-1 min-h-0 flex-1 overflow-y-auto">
          {items.map((m) => (
            <div key={m.id} className="h-full">
              <MarketCard m={m} />
            </div>
          ))}
        </div>
      ) : q.data?.needsAuth ? (
        <Empty title="Follow creators to fill this tab" body="Sign in, then follow creators from their profiles." action={<Button onClick={s.login}>Sign in</Button>} />
      ) : (
        <Empty
          title={tab === "settled" ? "Nothing settled yet" : "No calls here yet"}
          body={
            <>
              Creators post calls about matches, charts, shows and prices. Fans back them or fade them.
              <br />
              Meanwhile, browse live markets on Panta.
            </>
          }
          action={
            <div className="flex gap-2">
              <Link href="/create" className="inline-flex h-11 items-center rounded-2xl bg-coral px-4 font-semibold text-coral-ink">
                Post a call
              </Link>
              <Link href="/explore" className="inline-flex h-11 items-center rounded-2xl border border-line px-4 font-semibold">
                Explore
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
