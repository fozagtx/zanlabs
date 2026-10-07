"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Flag, Flame, Hand, Laugh } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { relTime } from "@/lib/format";
import type { MarketView } from "@/lib/types";
import { Avatar, Button, Pill, Segmented, Textarea, cn } from "./ui";

const BADGES: Record<string, { label: string; tone: "yes" | "no" | "coral" | "muted" }> = {
  yes_holder: { label: "YES holder", tone: "yes" },
  no_holder: { label: "NO holder", tone: "no" },
  both_holder: { label: "Holds both", tone: "muted" },
  called_yes: { label: "Called YES", tone: "yes" },
  called_no: { label: "Called NO", tone: "no" },
  creator: { label: "Creator", tone: "coral" },
};

type Comment = { id: string; body: string; badge: string | null; author: string; avatarUrl: string | null; createdAt: number };

export function Comments({ slug }: { slug: string }) {
  const s = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "yes" | "no" | "creator">("all");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const q = useQuery({
    queryKey: ["comments", slug, filter],
    queryFn: () => api<{ items: Comment[] }>(`/api/markets/${slug}/comments?filter=${filter}`, { auth: false }),
    refetchInterval: 15_000,
  });

  async function post() {
    if (!s.authenticated) return s.login();
    setPosting(true);
    try {
      await api(`/api/markets/${slug}/comments`, { body: { body } });
      setBody("");
      await qc.invalidateQueries({ queryKey: ["comments", slug] });
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setPosting(false);
    }
  }

  async function report(id: string) {
    if (!s.authenticated) return s.login();
    try {
      const r = await api<{ hidden: boolean }>("/api/comments/report", { body: { commentId: id } });
      toast.success(r.hidden ? "Comment hidden." : "Reported. Thanks.");
      if (r.hidden) await qc.invalidateQueries({ queryKey: ["comments", slug] });
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Comments">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Talk</h2>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "yes", label: "YES" },
            { value: "no", label: "NO" },
            { value: "creator", label: "Creator" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          placeholder={s.authenticated ? "Say why you're right…" : "Sign in to join the conversation"}
          className="min-h-16"
          onFocus={() => (!s.authenticated ? s.login() : undefined)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={post} loading={posting} disabled={!body.trim()}>
            Post
          </Button>
        </div>
      </div>
      {q.data?.items.length ? (
        <ul className="flex flex-col gap-3">
          {q.data.items.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar src={c.avatarUrl} name={c.author} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-bold text-ink">{c.author}</span>
                  {c.badge && BADGES[c.badge] ? <Pill tone={BADGES[c.badge].tone}>{BADGES[c.badge].label}</Pill> : null}
                  <span className="text-muted">{relTime(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px]">{c.body}</p>
              </div>
              <button aria-label="Report comment" onClick={() => report(c.id)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                <Flag className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-muted">{q.isLoading ? "Loading…" : "No comments yet. Start it."}</p>
      )}
    </section>
  );
}

type Activity = { signature: string; who: string; side: "yes" | "no" | null; amount: string; at: number | null };

export function ActivityTicker({ slug }: { slug: string }) {
  const q = useQuery({
    queryKey: ["activity", slug],
    queryFn: () => api<{ items: Activity[] }>(`/api/markets/${slug}/activity`, { auth: false }),
    refetchInterval: 20_000,
  });
  const items = q.data?.items ?? [];
  if (!items.length) return null;
  return (
    <section aria-label="Recent picks" className="flex flex-col gap-2">
      <h2 className="text-base font-bold">Recent picks</h2>
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
        {items.slice(0, 8).map((a) => (
          <li key={a.signature} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="truncate">
              <span className="font-semibold">{a.who}</span> backed{" "}
              <span className={cn("font-bold", a.side === "yes" ? "text-yes" : a.side === "no" ? "text-no" : "text-muted")}>
                {a.side ? a.side.toUpperCase() : "a side"}
              </span>{" "}
              <span className="text-muted">({a.amount})</span>
            </span>
            <span className="num shrink-0 text-xs text-muted">{relTime(a.at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const RX: { kind: "fire" | "cap" | "eyes" | "clap"; label: string; icon: React.ReactNode }[] = [
  { kind: "fire", label: "Hot take", icon: <Flame className="size-4" /> },
  { kind: "cap", label: "Cap", icon: <Laugh className="size-4" /> },
  { kind: "eyes", label: "Watching", icon: <Eye className="size-4" /> },
  { kind: "clap", label: "Respect", icon: <Hand className="size-4" /> },
];

export function Reactions({ m, mine }: { m: MarketView; mine: string[] }) {
  const s = useSession();
  const [counts, setCounts] = useState(m.reactions);
  const [active, setActive] = useState<Set<string>>(new Set(mine));
  async function toggle(kind: (typeof RX)[number]["kind"]) {
    if (!s.authenticated) return s.login();
    const on = !active.has(kind);
    setActive((prev) => {
      const n = new Set(prev);
      if (on) n.add(kind);
      else n.delete(kind);
      return n;
    });
    setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (on ? 1 : -1)) }));
    try {
      await api(`/api/markets/${m.slug}/react`, { body: { kind } });
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  }
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Reactions">
      {RX.map((r) => (
        <button
          key={r.kind}
          onClick={() => toggle(r.kind)}
          aria-pressed={active.has(r.kind)}
          className={cn(
            "num inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
            active.has(r.kind) ? "border-coral bg-coral/15 text-ink" : "border-line text-muted",
          )}
        >
          {r.icon} {r.label} {counts[r.kind] > 0 ? counts[r.kind] : ""}
        </button>
      ))}
    </div>
  );
}

export function FollowButton({ handle, initial }: { handle: string; initial: boolean }) {
  const s = useSession();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (s.me?.handle === handle) return null;
  return (
    <Button
      size="sm"
      variant={following ? "outline" : "primary"}
      loading={busy}
      onClick={async () => {
        if (!s.authenticated) return s.login();
        setBusy(true);
        try {
          const r = await api<{ following: boolean }>("/api/follow", { body: { handle } });
          setFollowing(r.following);
        } catch (e) {
          toast.error((e as ApiError).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
