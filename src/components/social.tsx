"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Eye, Flag, Flame, Hand, Laugh, MessageCircle, X } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { relTime } from "@/lib/format";
import type { MarketView } from "@/lib/types";
import { Avatar, Button, IconButton, Pill, SectionLabel, Skeleton, Tabs, cn, type ButtonSize, type PillTone } from "./ui";

/* ------------------------------------------------------------------------ */
/* Comments (Threads-style)                                                  */
/* ------------------------------------------------------------------------ */

const BADGES: Record<string, { label: string; tone: PillTone; side?: "yes" | "no" }> = {
  yes_holder: { label: "YES holder", tone: "yes", side: "yes" },
  no_holder: { label: "NO holder", tone: "no", side: "no" },
  both_holder: { label: "Holds both", tone: "muted" },
  called_yes: { label: "Called YES", tone: "yes", side: "yes" },
  called_no: { label: "Called NO", tone: "no", side: "no" },
  creator: { label: "Creator", tone: "coral" },
};

const MAX_COMMENT = 500;

type Comment = { id: string; body: string; badge: string | null; author: string; avatarUrl: string | null; createdAt: number };
type Filter = "all" | "yes" | "no" | "creator";

/** "2m ago" → "2m" (Threads-style compact time). */
function ago(sec: number | null | undefined) {
  if (!sec) return "";
  return relTime(sec).replace(/ ago$/, "");
}

export function Comments({ slug }: { slug: string }) {
  const s = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || posting) return;
    void post();
  }

  const items = q.data?.items ?? [];
  const me = s.me;

  return (
    <section className="flex flex-col" aria-label="Comments">
      <h2 className="text-[17px] font-bold tracking-[-0.01em]">Talk</h2>

      <Tabs<Filter>
        value={filter}
        onChange={setFilter}
        label="Filter comments"
        className="mt-1"
        options={[
          { value: "all", label: "All" },
          {
            value: "yes",
            label: (
              <>
                <Check className="size-4" strokeWidth={3} aria-hidden /> YES
              </>
            ),
          },
          {
            value: "no",
            label: (
              <>
                <X className="size-4" strokeWidth={3} aria-hidden /> NO
              </>
            ),
          },
          { value: "creator", label: "Creator" },
        ]}
      />

      {/* Composer bar */}
      <form onSubmit={onSubmit} className="flex items-end gap-2.5 border-b border-hairline py-3">
        {me ? (
          <span className="pb-1">
            <Avatar src={me.avatarUrl} name={me.handle ?? me.displayName ?? "you"} size={34} />
          </span>
        ) : null}
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`comment-${slug}`} className="sr-only">
            Add a comment
          </label>
          <textarea
            id={`comment-${slug}`}
            rows={1}
            value={body}
            maxLength={MAX_COMMENT}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_COMMENT))}
            placeholder={s.authenticated ? "Say why you're right…" : "Sign in to join the conversation"}
            onFocus={() => (!s.authenticated ? s.login() : undefined)}
            className="block max-h-32 min-h-11 w-full resize-none rounded-[22px] border border-transparent bg-card px-4 py-[11px] text-base leading-[1.35] text-fg [field-sizing:content] placeholder:text-fg-3 transition-colors focus:border-fg-3 focus:bg-card-2 focus:outline-none"
          />
        </div>
        <Button type="submit" size="md" className="px-4" loading={posting} disabled={!body.trim()}>
          Post
        </Button>
      </form>
      {body.length > MAX_COMMENT - 100 ? (
        <p className="num pt-1.5 text-right text-[11px] text-fg-3" aria-live="polite">
          {body.length}/{MAX_COMMENT}
        </p>
      ) : null}

      {items.length ? (
        <ul className="flex flex-col">
          {items.map((c) => {
            const badge = c.badge ? BADGES[c.badge] : undefined;
            return (
              <li key={c.id} className="flex gap-3 border-b border-hairline py-4 last:border-b-0">
                <Avatar src={c.avatarUrl} name={c.author} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="truncate text-[15px] font-semibold text-fg">{c.author}</span>
                    {badge ? (
                      <Pill tone={badge.tone} size="sm">
                        {badge.side === "yes" ? <Check strokeWidth={3} aria-hidden /> : badge.side === "no" ? <X strokeWidth={3} aria-hidden /> : null}
                        {badge.label}
                      </Pill>
                    ) : null}
                    <span className="num text-[13px] text-fg-3">
                      <span aria-hidden>· </span>
                      {ago(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-fg">{c.body}</p>
                </div>
                <IconButton label="Report comment" onClick={() => report(c.id)} className="-mr-2 -mt-2.5 text-fg-3 hover:text-fg">
                  <Flag className="size-4" aria-hidden />
                </IconButton>
              </li>
            );
          })}
        </ul>
      ) : q.isLoading ? (
        <div className="flex flex-col" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3 border-b border-hairline py-4 last:border-b-0">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-3.5 w-32 rounded-full" />
                <Skeleton className="h-3.5 w-full rounded-full" />
              </div>
            </div>
          ))}
          <span className="sr-only">Loading comments</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-card text-fg-2">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <p className="text-[15px] font-semibold">No comments yet</p>
          <p className="text-[13px] text-fg-2">Start it.</p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Activity ticker                                                           */
/* ------------------------------------------------------------------------ */

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
    <section aria-label="Recent picks" className="flex flex-col">
      <SectionLabel>Recent picks</SectionLabel>
      <ul className="mt-1 flex flex-col">
        {items.slice(0, 8).map((a) => (
          <li key={a.signature} className="flex min-h-11 items-center gap-2.5 border-b border-hairline py-2.5 text-[13px] last:border-b-0">
            <span
              aria-hidden
              className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                a.side === "yes" ? "bg-yes/15 text-yes" : a.side === "no" ? "bg-no/15 text-no" : "bg-card text-fg-3",
              )}
            >
              {a.side === "yes" ? <Check className="size-3.5" strokeWidth={3} /> : a.side === "no" ? <X className="size-3.5" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <span className="num min-w-0 flex-1 truncate text-fg-2">
              <span className="font-semibold text-fg">{a.who}</span> backed{" "}
              {a.side ? (
                <span className={cn("font-bold", a.side === "yes" ? "text-yes" : "text-no")}>{a.side.toUpperCase()}</span>
              ) : (
                "a side"
              )}
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {a.amount}
            </span>
            {a.at ? <span className="num shrink-0 text-fg-3">{ago(a.at)}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Reactions                                                                 */
/* ------------------------------------------------------------------------ */

const RX: { kind: "fire" | "cap" | "eyes" | "clap"; label: string; icon: ReactNode }[] = [
  { kind: "fire", label: "Hot take", icon: <Flame className="size-4" aria-hidden /> },
  { kind: "cap", label: "Cap", icon: <Laugh className="size-4" aria-hidden /> },
  { kind: "eyes", label: "Watching", icon: <Eye className="size-4" aria-hidden /> },
  { kind: "clap", label: "Respect", icon: <Hand className="size-4" aria-hidden /> },
];

export function Reactions({ m, mine, className }: { m: MarketView; mine: string[]; className?: string }) {
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
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto", className)} role="group" aria-label="Reactions">
      {RX.map((r) => {
        const on = active.has(r.kind);
        return (
          <button
            key={r.kind}
            type="button"
            onClick={() => toggle(r.kind)}
            aria-pressed={on}
            className={cn(
              "num inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold",
              "transition-[scale,background-color,color] duration-[120ms] ease-out active:scale-[0.97]",
              on ? "bg-fg text-canvas" : "bg-card text-fg-2 hover:bg-card-2 hover:text-fg",
            )}
          >
            {r.icon}
            {r.label}
            {counts[r.kind] > 0 ? <span className={cn("font-medium", on ? "text-canvas/70" : "text-fg-3")}>{counts[r.kind]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Follow                                                                    */
/* ------------------------------------------------------------------------ */

export function FollowButton({
  handle,
  initial,
  size = "sm",
  className,
}: {
  handle: string;
  initial: boolean;
  /** Defaults to "sm"; the hit area is padded to 44px either way. */
  size?: ButtonSize;
  className?: string;
}) {
  const s = useSession();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (s.me?.handle === handle) return null;
  return (
    <Button
      type="button"
      size={size}
      variant={following ? "secondary" : "primary"}
      loading={busy}
      // Small pills keep a 44px touch target via an invisible extension.
      className={cn(size === "sm" && "relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']", className)}
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
      {following && !busy ? <Check className="size-4" strokeWidth={3} aria-hidden /> : null}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
