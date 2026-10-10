"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Compass, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import type { MarketView } from "@/lib/types";
import { MarketCard } from "@/components/market-card";
import { TopBarSlot } from "@/components/nav";
import { Button, Empty, Skeleton, Tabs, cn } from "@/components/ui";

type Tab = "for-you" | "following" | "closing" | "settled";

const DAY = 86_400;

// Secondary feeds, shown as chips under the floating "Following | For you" tabs.
const FILTERS: { value: Extract<Tab, "closing" | "settled">; label: string }[] = [
  { value: "closing", label: "Closing soon" },
  { value: "settled", label: "Settled" },
];

const linkButton = (variant: "primary" | "secondary") =>
  cn(
    "inline-flex h-11 select-none items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[scale,background-color] duration-[120ms] ease-out active:scale-[0.97]",
    variant === "primary" ? "bg-brand text-black hover:bg-white/90" : "bg-card text-fg hover:bg-card-2",
  );

export default function Home() {
  const s = useSession();
  const [tab, setTab] = useState<Tab>("for-you");
  const q = useQuery({
    queryKey: ["feed", tab, s.authenticated],
    queryFn: () => api<{ items: MarketView[]; needsAuth?: boolean }>(`/api/markets?tab=${tab}`),
    refetchInterval: 30_000,
  });
  const items = useMemo(() => q.data?.items ?? [], [q.data]);

  // Creators with a call closing in the next 24h get a lit story ring on the rail.
  const hot = useMemo(() => {
    const now = Date.now() / 1000;
    const set = new Set<string>();
    for (const m of items) {
      if (m.status === "live" && m.endAt > now && m.endAt - now < DAY) set.add(m.creator.handle);
    }
    return set;
  }, [items]);

  let body: ReactNode;
  if (q.isLoading) {
    body = <FeedSkeleton />;
  } else if (items.length) {
    body = (
      // Keyed by tab so switching feeds starts at the top.
      <div key={tab} className="snap-feed no-scrollbar h-full overflow-y-auto" aria-label="Calls">
        {items.map((m, i) => (
          <MarketCard key={m.id} m={m} ring={hot.has(m.creator.handle) ? "lit" : "dim"} eager={i < 2} />
        ))}
      </div>
    );
  } else if (q.isError && !q.data) {
    body = (
      <FeedMessage
        icon={<CircleAlert />}
        title="Couldn't load calls"
        body="Check your connection and try again."
        action={
          <Button variant="secondary" onClick={() => q.refetch()} loading={q.isFetching}>
            Try again
          </Button>
        }
      />
    );
  } else if (q.data?.needsAuth) {
    body = (
      <FeedMessage
        icon={<Users />}
        title="Follow creators to fill this tab"
        body="Sign in, then follow creators from their profiles. Their calls show up here."
        action={<Button onClick={s.login}>Sign in</Button>}
      />
    );
  } else if (tab === "following") {
    body = (
      <FeedMessage
        icon={<Users />}
        title="No live calls from creators you follow"
        body="When a creator you follow posts a call, it lands here."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setTab("for-you")}>See For you</Button>
            <Link href="/explore" className={linkButton("secondary")}>
              <Compass className="size-4" aria-hidden />
              Explore
            </Link>
          </div>
        }
      />
    );
  } else if (tab === "settled") {
    body = (
      <FeedMessage
        icon={<Sparkles />}
        title="Nothing settled yet"
        body="When calls close and get their result, they show up here with who called it."
        action={
          <Button variant="secondary" onClick={() => setTab("for-you")}>
            Back to For you
          </Button>
        }
      />
    );
  } else {
    body = (
      <FeedMessage
        icon={<Sparkles />}
        title="No calls here yet"
        body={
          <>
            Creators post calls about matches, charts, shows and prices. Fans back them or fade them.
            <br />
            Meanwhile, browse live markets on Panta.
          </>
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/create" className={linkButton("primary")}>
              Post a call
            </Link>
            <Link href="/explore" className={linkButton("secondary")}>
              <Compass className="size-4" aria-hidden />
              Explore
            </Link>
          </div>
        }
      />
    );
  }

  // Full-bleed from the very top (the top bar floats over it) down to the
  // bottom nav. -mb-24 cancels the layout's bottom padding so pages fit exactly.
  return (
    <div className="relative -mb-24 h-[calc(100dvh-var(--bottom-nav-h))] overflow-hidden bg-canvas">
      <h1 className="sr-only">Home</h1>
      <TopBarSlot>
        <Tabs
          label="Feed"
          align="center"
          value={tab}
          onChange={setTab}
          options={[
            { value: "following", label: "Following" },
            { value: "for-you", label: "For you" },
          ]}
          className="legible"
        />
      </TopBarSlot>

      <div className="pointer-events-none absolute inset-x-0 top-[var(--top-bar-h)] z-20 flex justify-center gap-1.5" role="group" aria-label="More feeds">
        {FILTERS.map((f) => {
          const active = tab === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(active ? "for-you" : f.value)}
              className="group pointer-events-auto inline-flex h-11 items-center px-0.5"
            >
              <span
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-semibold transition-[scale,background-color,color] duration-[120ms] ease-out group-active:scale-[0.96]",
                  active ? "bg-fg text-canvas" : "bg-black/35 text-fg ring-1 ring-white/15 backdrop-blur-md hover:bg-black/50",
                )}
              >
                {f.label}
              </span>
            </button>
          );
        })}
      </div>

      {body}
    </div>
  );
}

/** Centered message over black, clear of the floating tabs and chips. */
function FeedMessage({ icon, title, body, action }: { icon: ReactNode; title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 pb-6 pt-[calc(var(--top-bar-h)+2.75rem)]">
      <Empty icon={icon} title={title} body={body} action={action} className="py-0" />
    </div>
  );
}

/** Full-height placeholder shaped like a feed page. */
function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading calls" className="relative h-full">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 flex flex-col gap-4 px-4 pb-3">
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="h-4 w-28 rounded-full bg-card-2" />
            <div className="h-7 w-11/12 rounded-lg bg-card-2" />
            <div className="h-7 w-2/3 rounded-lg bg-card-2" />
            <div className="h-6 w-44 rounded-full bg-card-2" />
            <div className="mt-1 h-1 w-full rounded-full bg-card-2" />
          </div>
          <div className="flex w-12 shrink-0 flex-col items-center gap-5">
            <div className="size-12 rounded-full bg-card-2" />
            <div className="size-10 rounded-full bg-card-2" />
            <div className="size-10 rounded-full bg-card-2" />
            <div className="size-10 rounded-full bg-card-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-[52px] rounded-full bg-card-2" />
          <div className="h-[52px] rounded-full bg-card-2" />
        </div>
        <div className="h-5" />
      </div>
    </div>
  );
}
