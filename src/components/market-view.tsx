"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronRight, ExternalLink, Share2, X } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { localDateTime, relTime, usdCompact } from "@/lib/format";
import type { MarketView as MV } from "@/lib/types";
import { CallBadge, Countdown, CreatorChip, ProbabilityBar, RestrictedNotice, Sparkline, StatusPill } from "./market-bits";
import { ActivityTicker, Comments, FollowButton, Reactions } from "./social";
import { PickSheet } from "./pick-sheet";
import { ShareSheet } from "./share-sheet";
import { PoweredByPanta } from "./brand";
import { Button, Card, Input, Pill } from "./ui";

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
  const [showRule, setShowRule] = useState(false);

  // Record the visit from a shared link once per visitor.
  useEffect(() => {
    if (refCode) void api("/api/share", { body: { slug: initial.slug, event: "visit", ref: refCode }, auth: false }).catch(() => {});
  }, [refCode, initial.slug]);

  const open = m.status === "live" && m.endAt * 1000 > Date.now();
  const tradable = m.kind === "forecast" ? open : m.buyable;
  const isCreator = viewer?.isCreator ?? false;

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-4">
      <div className="flex items-center justify-between gap-3">
        <CreatorChip creator={m.creator} size={44} sub={m.creator.displayName ?? undefined} />
        {viewer && !isCreator ? <FollowButton handle={m.creator.handle} initial={viewer.following} /> : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill m={m} />
          <CallBadge m={m} />
          {open ? <Countdown endAt={m.endAt} /> : null}
        </div>
        <h1 className="text-[28px] font-extrabold leading-[1.12] tracking-tight">{m.question}</h1>
        {viewer?.call ? <Pill tone={viewer.call === "yes" ? "yes" : "no"}>You called {viewer.call.toUpperCase()}</Pill> : null}
      </div>

      <RestrictedNotice m={m} />

      {m.kind === "panta" ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="num text-4xl font-black text-yes">{m.yes === null ? "--" : `${Math.round(m.yes * 100)}%`}</p>
              <p className="text-xs text-muted">chance YES</p>
            </div>
            <div className="num text-right text-xs text-muted">
              <p>{m.counts.traders} traders</p>
              {m.volumeUsdc !== null ? <p>{usdCompact(m.volumeUsdc)} volume</p> : null}
            </div>
          </div>
          <ProbabilityBar yes={m.yes} />
          {history.data?.points.length ? <Sparkline points={history.data.points} /> : null}
          <p className="text-[11px] text-muted" suppressHydrationWarning>
            {m.lastSyncedAt ? `Odds as of ${relTime(m.lastSyncedAt)}` : "Odds not synced yet"} · <PoweredByPanta />
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Free call · no money, no prizes</p>
          <p className="num text-sm text-muted">
            {m.counts.calls > 0 ? `${m.counts.callsYes} called YES · ${m.counts.callsNo} called NO` : "Be the first to call it."}
          </p>
          <p className="text-xs text-muted">This question is about something the creator can influence, so it runs without money.</p>
        </Card>
      )}

      <Reactions m={m} mine={viewer?.reactions ?? []} />

      <Card className="flex flex-col gap-2">
        <button className="flex items-center justify-between text-left" onClick={() => setShowRule((v) => !v)} aria-expanded={showRule}>
          <span className="font-semibold">How this resolves</span>
          <ChevronRight className={`size-4 transition-transform ${showRule ? "rotate-90" : ""}`} />
        </button>
        {showRule ? (
          <div className="flex flex-col gap-2 text-sm text-muted">
            <p className="whitespace-pre-wrap">{m.resolutionRule}</p>
            <ul className="flex flex-col gap-1">
              {m.sources.map((src) => (
                <li key={src}>
                  <a href={src} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-coral underline">
                    {src} <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="num">Trading closes {localDateTime(m.endAt)} · result expected {localDateTime(m.resolutionAt)}</p>
            {m.kind === "panta" ? (
              <p>
                Panta resolves this market, not the creator: its resolver checks the sources above, posts a result with a dispute window, then
                settles on-chain.
              </p>
            ) : (
              <p>The creator settles free calls and must link evidence.</p>
            )}
          </div>
        ) : null}
      </Card>

      <ResolutionTracker m={m} isCreator={isCreator} />

      <ActivityTicker slug={m.slug} />

      <div id="talk">
        <Comments slug={m.slug} />
      </div>

      <p className="text-center text-xs text-muted">
        {m.kind === "panta" ? `@${m.creator.handle} earns a share of trading fees from this market.` : "Free call: no money changes hands."}{" "}
        <Link href="/about" className="underline">
          How Zan works
        </Link>
      </p>

      {/* Thumb-zone action bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-[4.25rem] z-20 border-t border-line/60 bg-bg/95 px-4 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {tradable && !isCreator ? (
            <>
              <Button size="lg" variant="yes" className="flex-1" onClick={() => setPick("yes")}>
                <Check className="size-5" strokeWidth={3} /> YES
              </Button>
              <Button size="lg" variant="no" className="flex-1" onClick={() => setPick("no")}>
                <X className="size-5" strokeWidth={3} /> NO
              </Button>
            </>
          ) : m.kind === "panta" && m.phase === "secondary" && m.pantaUrl ? (
            <a href={m.pantaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 flex-1 items-center justify-center rounded-2xl border border-line font-semibold">
              Trade on panta.market <ExternalLink className="ml-1 size-4" />
            </a>
          ) : (
            <div className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-line text-sm font-semibold text-muted">
              {isCreator
                ? "This is your call. Share it!"
                : m.outcome
                  ? "Settled"
                  : m.endAt * 1000 <= Date.now()
                    ? "Trading closed"
                    : m.startAt * 1000 > Date.now()
                      ? `Opens ${relTime(m.startAt)}`
                      : "Not buyable in the app right now"}
            </div>
          )}
          <Button size="lg" variant="outline" aria-label="Share" onClick={() => setShare({})}>
            <Share2 className="size-5" />
          </Button>
        </div>
      </div>

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

function ResolutionTracker({ m, isCreator }: { m: MV; isCreator: boolean }) {
  const [outcome, setOutcome] = useState<"yes" | "no" | "void">("yes");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const closed = m.endAt * 1000 <= Date.now();

  if (m.outcome) {
    return (
      <Card className="flex flex-col gap-1">
        <p className="font-semibold">{m.outcome === "void" ? "Cancelled" : `Resolved ${m.outcome.toUpperCase()}`}</p>
        {m.kind === "panta" ? (
          <p className="text-sm text-muted">
            Settled by Panta.{" "}
            <Link className="text-coral underline" href="/portfolio">
              Claim any winnings in Picks
            </Link>
            .
          </p>
        ) : m.resolutionNote ? (
          <a href={m.resolutionNote} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-coral underline">
            Evidence from the creator
          </a>
        ) : null}
      </Card>
    );
  }
  if (!closed) return null;
  if (m.kind === "panta") {
    return (
      <Card>
        <p className="font-semibold">Awaiting Panta&apos;s result</p>
        <p className="text-sm text-muted">Panta&apos;s resolver posts a result with a short dispute window, then settles on-chain. Winners claim in Picks.</p>
      </Card>
    );
  }
  if (!isCreator) {
    return (
      <Card>
        <p className="font-semibold">Waiting for @{m.creator.handle} to settle</p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <p className="font-semibold">Settle your free call</p>
      <div className="grid grid-cols-3 gap-2">
        {(["yes", "no", "void"] as const).map((o) => (
          <Button key={o} variant={outcome === o ? (o === "void" ? "outline" : o) : "outline"} onClick={() => setOutcome(o)}>
            {o === "void" ? "Void" : o.toUpperCase()}
          </Button>
        ))}
      </div>
      <Input placeholder="Public link that proves the result" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
      <Button
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
    </Card>
  );
}
