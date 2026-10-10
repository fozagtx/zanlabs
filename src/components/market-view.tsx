"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Ban, Check, ChevronDown, ExternalLink, Hourglass, Share, X } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { relTime, usdCompact } from "@/lib/format";
import type { MarketView as MV } from "@/lib/types";
import { CallBadge, ChanceHero, Countdown, CreatorChip, PriceChart, RestrictedNotice, StatusPill } from "./market-bits";
import { ActivityTicker, Comments, FollowButton, Reactions } from "./social";
import { PickSheet } from "./pick-sheet";
import { ShareSheet } from "./share-sheet";
import { PoweredByPanta } from "./brand";
import { TopBarMode } from "./nav";
import { Avatar, Button, IconButton, Input, ListRow, Pill, SectionLabel, Skeleton, TradeButton, cn } from "./ui";

type Viewer = { call: "yes" | "no" | null; reactions: string[]; following: boolean; isCreator: boolean } | null;

export function MarketView({ initial, refCode }: { initial: MV; refCode: string | null }) {
  const s = useSession();
  const q = useQuery({
    queryKey: ["market", initial.slug, s.authenticated],
    queryFn: () => api<{ market: MV; viewer: Viewer }>(`/api/markets/${initial.slug}`),
    initialData: { market: initial, viewer: null },
    refetchInterval: 15_000,
  });
  const m = q.data.market;
  const viewer = q.data.viewer;
  const history = useQuery({
    queryKey: ["history", m.slug],
    queryFn: () => api<{ points: { t: number; yes: number }[] }>(`/api/markets/${m.slug}/history`, { auth: false }),
    enabled: m.kind === "panta",
    refetchInterval: 60_000,
  });
  const [pick, setPick] = useState<"yes" | "no" | null>(null);
  const [share, setShare] = useState<{ side?: "yes" | "no" } | null>(null);

  // Record the visit from a shared link once per visitor.
  useEffect(() => {
    if (refCode) void api("/api/share", { body: { slug: initial.slug, event: "visit", ref: refCode }, auth: false }).catch(() => {});
  }, [refCode, initial.slug]);

  const open = m.status === "live" && m.endAt * 1000 > Date.now();
  const tradable = m.kind === "forecast" ? open : m.buyable;
  const isCreator = viewer?.isCreator ?? false;
  const free = m.kind === "forecast";
  const points = history.data?.points ?? [];

  return (
    <div className="flex flex-col">
      <PageHeader>
        <BackButton />
        <CreatorChip creator={m.creator} size={34} ring="lit" className="min-w-0 pl-1" />
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-1">
          {viewer && !isCreator ? <FollowButton handle={m.creator.handle} initial={viewer.following} /> : null}
          <IconButton label="Share" onClick={() => setShare({})}>
            <Share className="size-[22px]" aria-hidden />
          </IconButton>
        </div>
      </PageHeader>

      <div className="flex flex-col px-4 pb-28 pt-3">
        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill m={m} />
          <CallBadge m={m} />
          {open ? <Countdown endAt={m.endAt} /> : null}
          {viewer?.call ? (
            <Pill tone={viewer.call === "yes" ? "yes" : "no"}>
              {viewer.call === "yes" ? <Check strokeWidth={3} aria-hidden /> : <X strokeWidth={3} aria-hidden />}
              You called {viewer.call.toUpperCase()}
            </Pill>
          ) : null}
        </div>

        <h1 className="mt-3 text-[27px] font-bold leading-[1.15] tracking-[-0.02em]">{m.question}</h1>

        {/* Hero: Panta chance + chart, or free-call counts */}
        {free ? (
          <CallCounts m={m} className="mt-6" />
        ) : (
          <section aria-label="Chance" className="mt-6 flex flex-col">
            <ChanceHero yes={m.yes} />
            <div className="mt-5">
              {history.isLoading ? (
                <Skeleton className="h-[248px]" />
              ) : points.length >= 2 ? (
                <PriceChart points={points} endAt={m.endAt} />
              ) : (
                <ChartEmpty text={history.isError ? "Chart unavailable right now" : "Chart builds as people trade"} />
              )}
            </div>
          </section>
        )}

        {/* Meta row */}
        <p className="num mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-2">
          {free ? (
            <span>
              {m.counts.calls} {m.counts.calls === 1 ? "call" : "calls"}
            </span>
          ) : (
            <span>
              {m.counts.traders} {m.counts.traders === 1 ? "trader" : "traders"}
            </span>
          )}
          {!free && m.volumeUsdc !== null ? (
            <>
              <Dot />
              <span>{usdCompact(m.volumeUsdc)} volume</span>
            </>
          ) : null}
          <Dot />
          <span suppressHydrationWarning>
            {m.endAt * 1000 <= Date.now() ? "Closed" : "Closes"} {shortDate(m.endAt)}
          </span>
        </p>
        {!free ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-fg-3">
            <span suppressHydrationWarning>{m.lastSyncedAt ? `Odds as of ${relTime(m.lastSyncedAt)}` : "Odds not synced yet"}</span>
            <Dot />
            <PoweredByPanta className="text-[11px]" />
          </p>
        ) : null}

        <CallCard m={m} className="mt-6" />

        {m.restrictedFlag ? (
          <div className="mt-4">
            <RestrictedNotice m={m} />
          </div>
        ) : null}

        <Reactions m={m} mine={viewer?.reactions ?? []} key={viewer ? "viewer" : "anon"} className="-mx-4 mt-6 px-4" />

        {/* How this resolves */}
        <section aria-labelledby="resolves-h" className="mt-8">
          <SectionLabel>
            <span id="resolves-h">How this resolves</span>
          </SectionLabel>
          <div className="mt-1">
            <RuleRow text={m.resolutionRule} />
            {m.sources.map((src) => (
              <SourceRow key={src} href={src} />
            ))}
            <ListRow label="Trading closes" value={<When sec={m.endAt} />} />
            <ListRow label="Result expected" value={<When sec={m.resolutionAt} />} />
            <ListRow
              label="Who resolves"
              value={free ? "Creator, with evidence" : "Panta resolver"}
              sub={
                free
                  ? "The creator settles free calls and must link evidence."
                  : "Panta resolves this market, not the creator: its resolver checks the sources above, posts a result with a dispute window, then settles on-chain."
              }
            />
          </div>
        </section>

        <ResolutionTracker m={m} isCreator={isCreator} />

        <div className="mt-8 empty:hidden">
          <ActivityTicker slug={m.slug} />
        </div>

        <div id="talk" className="mt-8 scroll-mt-[calc(var(--top-bar-h)+8px)]">
          <Comments slug={m.slug} />
        </div>

        <p className="mt-8 text-center text-[11px] leading-[1.45] text-fg-3">
          {m.kind === "panta" ? `@${m.creator.handle} earns a share of trading fees from this market.` : "Free call: no money changes hands."}{" "}
          <Link href="/about" className="font-semibold text-fg-2 underline underline-offset-2">
            How Zan works
          </Link>
        </p>
      </div>

      {/* Thumb-zone action bar, above the bottom nav */}
      <StickyBar>
        {tradable && !isCreator ? (
          <>
            <TradeButton
              side="yes"
              size="lg"
              pct={free ? null : m.yes}
              label={free ? "Call YES" : undefined}
              onClick={() => setPick("yes")}
            />
            <TradeButton
              side="no"
              size="lg"
              pct={free || m.yes === null ? null : 1 - m.yes}
              label={free ? "Call NO" : undefined}
              onClick={() => setPick("no")}
            />
          </>
        ) : m.kind === "panta" && m.phase === "secondary" && m.pantaUrl ? (
          <a
            href={m.pantaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[52px] flex-1 items-center justify-center gap-1.5 rounded-full bg-card text-base font-semibold text-fg transition-[scale,background-color] duration-[120ms] ease-out hover:bg-card-2 active:scale-[0.97]"
          >
            Trade on panta.market <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : isCreator ? (
          <Button type="button" size="lg" className="flex-1" onClick={() => setShare({})}>
            <Share className="size-5" aria-hidden /> This is your call. Share it!
          </Button>
        ) : (
          <div className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-card px-4 text-[15px] font-semibold text-fg-2" suppressHydrationWarning>
            {m.outcome
              ? "Settled"
              : m.endAt * 1000 <= Date.now()
                ? "Trading closed"
                : m.startAt * 1000 > Date.now()
                  ? `Opens ${relTime(m.startAt)}`
                  : "Not buyable in the app right now"}
          </div>
        )}
      </StickyBar>

      <PickSheet
        open={pick !== null}
        onOpenChange={(o) => !o && setPick(null)}
        initialSide={pick ?? "yes"}
        refCode={refCode}
        target={{ slug: m.slug, question: m.question, creatorHandle: m.creator.handle, kind: m.kind, buyable: m.buyable, pantaUrl: m.pantaUrl }}
        onPicked={() => void q.refetch()}
        onShare={(side) => {
          setPick(null);
          setShare({ side });
        }}
      />
      <ShareSheet
        open={share !== null}
        onOpenChange={(o) => !o && setShare(null)}
        pickSide={share?.side}
        market={{ slug: m.slug, question: m.question, kind: m.kind, creatorHandle: m.creator.handle, creatorCall: m.creatorCall }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Page chrome shared with the catalog market page (/x/[id])                 */
/* ------------------------------------------------------------------------ */

/** Sticky page header that replaces the global top bar while mounted. Gains a hairline once the page scrolls. */
export function PageHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <TopBarMode variant="hidden" />
      <header
        className={cn(
          "safe-top sticky top-0 z-30 border-b bg-canvas/85 backdrop-blur-xl transition-colors duration-200",
          scrolled ? "border-hairline" : "border-transparent",
        )}
      >
        <div className="flex h-14 items-center gap-1 px-2">{children}</div>
      </header>
    </>
  );
}

/** Back arrow: goes back when there is history in this tab, home otherwise (e.g. opened from a shared link). */
export function BackButton() {
  const router = useRouter();
  return (
    <IconButton label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>
      <ArrowLeft className="size-6" aria-hidden />
    </IconButton>
  );
}

/** Thumb-zone bar pinned above the bottom nav. */
export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[var(--bottom-nav-h)] z-20 border-t border-hairline bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">{children}</div>
    </div>
  );
}

/** Expandable resolution rule, styled as an info row. */
export function RuleRow({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 160 || text.split("\n").length > 3;
  const body = (
    <span className={cn("mt-1 block whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-fg", long && !expanded && "line-clamp-3")}>{text}</span>
  );
  if (!long) {
    return (
      <div className="border-b border-hairline py-3.5 last:border-b-0">
        <span className="block text-[13px] text-fg-2">Rule</span>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded((v) => !v)}
      className="block w-full border-b border-hairline py-3.5 text-left transition-opacity last:border-b-0 active:opacity-60"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-fg-2">Rule</span>
        <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-fg-2">
          {expanded ? "Less" : "More"}
          <ChevronDown className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
        </span>
      </span>
      {body}
    </button>
  );
}

/** A resolution source link as an info row (host on the right). Keeps rel=nofollow for user-supplied links. */
export function SourceRow({ href }: { href: string }) {
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    /* show the raw text */
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={href}
      className="flex min-h-12 w-full items-center gap-3 border-b border-hairline py-3.5 transition-opacity last:border-b-0 active:opacity-60"
    >
      <span className="flex-1 text-[15px] text-fg-2">Source</span>
      <span className="min-w-0 max-w-[65%] truncate text-right text-[15px] font-medium text-fg">{host}</span>
      <ExternalLink className="size-4 shrink-0 text-fg-3" aria-hidden />
    </a>
  );
}

/** Local date and time, e.g. "Tue 12 Oct, 20:00". Rendered on the client's clock. */
export function When({ sec }: { sec: number | null | undefined }) {
  return <span suppressHydrationWarning>{sec ? fullDate(sec) : "--"}</span>;
}

export function ChartEmpty({ text, height = 168 }: { text: string; height?: number }) {
  return (
    <div className="relative flex w-full items-center justify-center" style={{ height }}>
      <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-fg-3/50" />
      <p className="relative bg-canvas px-3 text-[13px] font-medium text-fg-3">{text}</p>
    </div>
  );
}

export function Dot() {
  return (
    <span aria-hidden className="text-fg-3">
      ·
    </span>
  );
}

function fullDate(sec: number) {
  return new Date(sec * 1000).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function shortDate(sec: number) {
  return new Date(sec * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ------------------------------------------------------------------------ */
/* Market sections                                                           */
/* ------------------------------------------------------------------------ */

/** Free-call hero: YES and NO call counts instead of a chance. */
function CallCounts({ m, className }: { m: MV; className?: string }) {
  const { calls, callsYes, callsNo } = m.counts;
  return (
    <section aria-label="Calls so far" className={cn("flex flex-col", className)}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-3">Free call · no money, no prizes</p>
      {calls > 0 ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-yes">
                <Check className="size-3.5" strokeWidth={3} aria-hidden /> Yes
              </p>
              <p className="num mt-1 text-[48px] font-semibold leading-none tracking-[-0.04em] text-yes">{callsYes}</p>
              <p className="mt-1.5 text-[13px] text-fg-2">called YES</p>
            </div>
            <div className="text-right">
              <p className="inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-no">
                No <X className="size-3.5" strokeWidth={3} aria-hidden />
              </p>
              <p className="num mt-1 text-[48px] font-semibold leading-none tracking-[-0.04em] text-no">{callsNo}</p>
              <p className="mt-1.5 text-[13px] text-fg-2">called NO</p>
            </div>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-no" aria-hidden>
            <div className="h-full rounded-full bg-yes" style={{ width: `${(callsYes / calls) * 100}%` }} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-[22px] font-bold tracking-[-0.01em]">No calls yet</p>
          <p className="mt-1 text-[15px] text-fg-2">Be the first to call it.</p>
        </>
      )}
      <p className="mt-3 text-[13px] leading-[1.45] text-fg-3">This question is about something the creator can influence, so it runs without money.</p>
    </section>
  );
}

/** "@creator says YES": the creator's stance, and how it went once settled. */
function CallCard({ m, className }: { m: MV; className?: string }) {
  if (!m.creatorCall) return null;
  const side = m.creatorCall;
  const SIDE = side.toUpperCase();
  const OTHER = side === "yes" ? "NO" : "YES";
  const right = m.outcome === side;
  const wrong = Boolean(m.outcome && m.outcome !== "void" && m.outcome !== side);
  const line = right
    ? "Called it."
    : wrong
      ? "Missed this one."
      : m.outcome === "void"
        ? "This market was cancelled."
        : m.kind === "forecast"
          ? `Agree with ${SIDE}, or call ${OTHER}.`
          : `Back the call with ${SIDE}, or fade it with ${OTHER}.`;
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5", className)}>
      <Avatar src={m.creator.avatarUrl} name={m.creator.handle} size={44} ring="lit" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold">
          <span className="truncate">@{m.creator.handle} says</span>
          <span className={cn("inline-flex shrink-0 items-center gap-0.5 font-bold", side === "yes" ? "text-yes" : "text-no")}>
            {side === "yes" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <X className="size-4" strokeWidth={3} aria-hidden />}
            {SIDE}
          </span>
        </p>
        <p className="mt-0.5 text-[13px] text-fg-2">{line}</p>
      </div>
    </div>
  );
}

function StatusBlock({ icon, tone = "default", title, children }: { icon: ReactNode; tone?: "yes" | "no" | "default"; title: ReactNode; children?: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3.5", tone === "yes" ? "bg-yes/10" : tone === "no" ? "bg-no/10" : "bg-card")}>
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-[18px]",
          tone === "yes" ? "bg-yes text-yes-ink" : tone === "no" ? "bg-no text-no-ink" : "bg-card-2 text-fg",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 pt-1.5">
        <p className="text-[15px] font-semibold leading-tight">{title}</p>
        {children ? <div className="mt-1 text-[13px] leading-[1.45] text-fg-2">{children}</div> : null}
      </div>
    </div>
  );
}

function ResolutionTracker({ m, isCreator }: { m: MV; isCreator: boolean }) {
  const [outcome, setOutcome] = useState<"yes" | "no" | "void">("yes");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const closed = m.endAt * 1000 <= Date.now();

  if (m.outcome) {
    return (
      <div className="mt-6">
        <StatusBlock
          tone={m.outcome === "void" ? "default" : m.outcome}
          icon={m.outcome === "yes" ? <Check strokeWidth={3} aria-hidden /> : m.outcome === "no" ? <X strokeWidth={3} aria-hidden /> : <Ban aria-hidden />}
          title={m.outcome === "void" ? "Cancelled" : `Resolved ${m.outcome.toUpperCase()}`}
        >
          {m.kind === "panta" ? (
            <p>
              Settled by Panta.{" "}
              <Link className="font-semibold text-fg underline underline-offset-2" href="/portfolio">
                Claim any winnings in Picks
              </Link>
              .
            </p>
          ) : m.resolutionNote ? (
            <a href={m.resolutionNote} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-fg underline underline-offset-2">
              Evidence from the creator <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </StatusBlock>
      </div>
    );
  }
  if (!closed) return null;
  if (m.kind === "panta") {
    return (
      <div className="mt-6">
        <StatusBlock icon={<Hourglass aria-hidden />} title="Awaiting Panta's result">
          Panta&apos;s resolver posts a result with a short dispute window, then settles on-chain. Winners claim in Picks.
        </StatusBlock>
      </div>
    );
  }
  if (!isCreator) {
    return (
      <div className="mt-6">
        <StatusBlock icon={<Hourglass aria-hidden />} title={`Waiting for @${m.creator.handle} to settle`} />
      </div>
    );
  }
  return (
    <section aria-labelledby="settle-h" className="mt-8 flex flex-col gap-3">
      <SectionLabel>
        <span id="settle-h">Settle your free call</span>
      </SectionLabel>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Result">
        {(["yes", "no", "void"] as const).map((o) => {
          const on = outcome === o;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setOutcome(o)}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold transition-[scale,background-color,color] duration-[120ms] ease-out active:scale-[0.97]",
                on ? (o === "yes" ? "bg-yes text-yes-ink" : o === "no" ? "bg-no text-no-ink" : "bg-fg text-canvas") : "bg-card text-fg-2 hover:bg-card-2",
              )}
            >
              {o === "yes" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : o === "no" ? <X className="size-4" strokeWidth={3} aria-hidden /> : <Ban className="size-4" aria-hidden />}
              {o === "void" ? "Void" : o.toUpperCase()}
            </button>
          );
        })}
      </div>
      <Input
        type="url"
        inputMode="url"
        aria-label="Evidence link"
        placeholder="Public link that proves the result"
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
      />
      <Button
        type="button"
        size="lg"
        loading={busy}
        disabled={!/^https?:\/\//.test(evidence)}
        onClick={async () => {
          setBusy(true);
          try {
            await api(`/api/markets/${m.slug}/resolve`, { body: { outcome, evidenceUrl: evidence } });
            toast.success("Settled. Your fans have been notified.");
            location.reload();
          } catch (e) {
            toast.error((e as ApiError).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Settle as {outcome.toUpperCase()}
      </Button>
    </section>
  );
}
