"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { relTime } from "@/lib/format";
import { Button, Empty, Skeleton, cn } from "@/components/ui";

type Item = { id: string; kind: string; title: string; body: string | null; url: string | null; read: boolean; createdAt: number };

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

  if (!s.authenticated) return <Empty title="Notifications" body="Sign in to hear when your calls resolve." action={<Button onClick={s.login}>Sign in</Button>} />;
  if (q.isLoading) return <Skeleton className="m-4 h-64" />;
  const items = q.data?.items ?? [];
  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.url ?? "#"} className={cn("block rounded-2xl border p-3", n.read ? "border-line bg-surface" : "border-coral/50 bg-coral/10")}>
                <p className="font-semibold">{n.title}</p>
                {n.body ? <p className="line-clamp-2 text-sm text-muted">{n.body}</p> : null}
                <p className="mt-1 text-xs text-muted">{relTime(n.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="All quiet" body="We'll tell you when markets you're in resolve, when creators you follow post, and when winnings are ready." />
      )}
    </div>
  );
}
