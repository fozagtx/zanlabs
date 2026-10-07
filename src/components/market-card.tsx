"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, MessageSquare, Share2, Users, X } from "lucide-react";
import type { MarketView } from "@/lib/types";
import { usdCompact } from "@/lib/format";
import { CallBadge, Countdown, CreatorChip, ProbabilityBar, StatusPill } from "./market-bits";
import { PickSheet } from "./pick-sheet";
import { ShareSheet } from "./share-sheet";
import { PoweredByPanta } from "./brand";
import { Button } from "./ui";

// Full-height feed card. Swipes navigate; only taps on YES/NO commit.
export function MarketCard({ m }: { m: MarketView }) {
  const [pick, setPick] = useState<"yes" | "no" | null>(null);
  const [share, setShare] = useState<{ side?: "yes" | "no" } | null>(null);
  const open = m.status === "live" && m.endAt * 1000 > Date.now();
  const tradable = m.kind === "forecast" ? open : m.buyable;

  return (
    <article className="flex h-full min-h-[480px] flex-col px-4 py-3">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[28px] border border-line bg-gradient-to-b from-surface-2 to-surface p-5">
        {m.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.12]" />
        ) : null}
        <div className="relative flex items-start justify-between gap-3">
          <CreatorChip creator={m.creator} sub={m.kind === "forecast" ? "Free call" : m.category} />
          <StatusPill m={m} />
        </div>

        <Link href={`/m/${m.slug}`} className="relative mt-6 block">
          <h2 className="text-[26px] font-extrabold leading-[1.15] tracking-tight">{m.question}</h2>
        </Link>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <CallBadge m={m} />
          {open ? <Countdown endAt={m.endAt} /> : null}
        </div>

        <div className="flex-1" />

        <div className="relative flex flex-col gap-3">
          {m.kind === "panta" ? (
            <ProbabilityBar yes={m.yes} />
          ) : (
            <p className="num text-sm text-muted">
              {m.counts.calls > 0 ? `${m.counts.callsYes} called YES · ${m.counts.callsNo} called NO` : "Be the first to call it"}
            </p>
          )}
          <div className="num flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> {m.kind === "panta" ? `${m.counts.traders} traders` : `${m.counts.calls} calls`}
            </span>
            {m.kind === "panta" && m.volumeUsdc !== null ? <span>{usdCompact(m.volumeUsdc)} volume</span> : null}
            <Link href={`/m/${m.slug}#talk`} className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" aria-hidden /> {m.counts.comments}
            </Link>
            <button onClick={() => setShare({})} className="ml-auto inline-flex h-9 items-center gap-1 rounded-full px-2 font-semibold text-ink" aria-label="Share">
              <Share2 className="size-4" /> Share
            </button>
          </div>
          {tradable ? (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" variant="yes" onClick={() => setPick("yes")}>
                <Check className="size-5" strokeWidth={3} /> YES
              </Button>
              <Button size="lg" variant="no" onClick={() => setPick("no")}>
                <X className="size-5" strokeWidth={3} /> NO
              </Button>
            </div>
          ) : (
            <Link href={`/m/${m.slug}`} className="inline-flex h-14 items-center justify-center rounded-2xl border border-line font-semibold">
              See result
            </Link>
          )}
          {m.kind === "panta" ? <PoweredByPanta className="self-center" /> : null}
        </div>
      </div>

      <PickSheet
        open={pick !== null}
        onOpenChange={(o) => !o && setPick(null)}
        initialSide={pick ?? "yes"}
        refCode={null}
        target={{ slug: m.slug, question: m.question, creatorHandle: m.creator.handle, kind: m.kind, buyable: m.buyable, pantaUrl: m.pantaUrl }}
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
    </article>
  );
}
