"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, CircleCheck, Coins, Gavel, Megaphone, ShieldAlert, type LucideIcon } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { relTime } from "@/lib/format";
import { Button, Empty, SectionLabel, Skeleton, cn } from "@/components/ui";

type Item = { id: string; kind: string; title: string; body: string | null; url: string | null; read: boolean; createdAt: number };

// One icon per notification kind (see notify() callers); anything new falls back to a bell.
const KIND: Record<string, { icon: LucideIcon; label: string; tone?: "warn" }> = {
  resolved: { icon: CircleCheck, label: "Result" },
  new_market: { icon: Megaphone, label: "New call" },
  creator_fees: { icon: Coins, label: "Creator fees" },
  settle_call: { icon: Gavel, label: "Settle your call" },
  restricted_trade: { icon: ShieldAlert, label: "Restricted trade", tone: "warn" },
};

function Row({ n }: { n: Item }) {
  const k = KIND[n.kind] ?? { icon: Bell, label: "Notification" };
  const Icon = k.icon;
  return (
    <li className="border-b border-hairline last:border-b-0">
      <Link href={n.url ?? "#"} className="flex items-start gap-3 py-3.5 transition-opacity active:opacity-60">
        <span
          className={cn(
            "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full",
            k.tone === "warn" ? "bg-warn/15 text-warn" : "bg-card text-fg",
          )}
        >
          <Icon className="size-5" aria-hidden />
          <span className="sr-only">{k.label}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className={cn("min-w-0 flex-1 text-[15px] leading-[1.35]", n.read ? "font-medium text-fg" : "font-semibold text-fg")}>{n.title}</span>
            <span className="num shrink-0 pt-px text-[13px] text-fg-3">{relTime(n.createdAt)}</span>
          </span>
          {n.body ? <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[1.45] text-fg-2">{n.body}</span> : null}
        </span>
        <span className="flex h-5 w-2.5 shrink-0 items-center justify-end">
          {n.read ? null : (
            <>
              <span className="size-2 rounded-full bg-accent" aria-hidden />
              <span className="sr-only">Unread</span>
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function Notifications() {
  const s = useSession();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ items: Item[] }>("/api/me/notifications"), enabled: s.authenticated });

  // Mark as read once seen.
  useEffect(() => {
    if (q.data?.items.some((i) => !i.read)) {
      void api("/api/me/notifications", { body: {} }).then(() => s.refreshMe());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  if (!s.authenticated) {
    return (
      <Empty
        icon={<Bell aria-hidden />}
        title="Notifications"
        body="Sign in to hear when your calls resolve."
        action={
          <Button size="lg" onClick={s.login}>
            Sign in
          </Button>
        }
      />
    );
  }
  if (q.isLoading) {
    return (
      <div className="px-4 pt-6" aria-busy>
        <Skeleton className="h-6 w-40 rounded-full" />
        <div className="mt-4 flex flex-col">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 border-b border-hairline py-3.5 last:border-b-0">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-4/5 rounded-full" />
                <Skeleton className="mt-2 h-3 w-3/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const items = q.data?.items ?? [];
  const fresh = items.filter((n) => !n.read);
  const earlier = items.filter((n) => n.read);
  return (
    <div className="flex flex-col px-4 pb-8 pt-6">
      <h1 className="text-[22px] font-bold tracking-[-0.01em]">Notifications</h1>
      {items.length ? (
        fresh.length && earlier.length ? (
          <>
            <SectionLabel className="mt-6">New</SectionLabel>
            <ul className="mt-1">
              {fresh.map((n) => (
                <Row key={n.id} n={n} />
              ))}
            </ul>
            <SectionLabel className="mt-6">Earlier</SectionLabel>
            <ul className="mt-1">
              {earlier.map((n) => (
                <Row key={n.id} n={n} />
              ))}
            </ul>
          </>
        ) : (
          <ul className="mt-3">
            {items.map((n) => (
              <Row key={n.id} n={n} />
            ))}
          </ul>
        )
      ) : (
        <Empty
          icon={<Bell aria-hidden />}
          title="All quiet"
          body="We'll tell you when markets you're in resolve, when creators you follow post, and when winnings are ready."
        />
      )}
    </div>
  );
}
