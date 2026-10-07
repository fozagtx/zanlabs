"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clock, ShieldAlert, X } from "lucide-react";
import { countdown, pct } from "@/lib/format";
import type { MarketView } from "@/lib/types";
import { Avatar, Pill, cn } from "./ui";

export function ProbabilityBar({ yes, size = "md" }: { yes: number | null; size?: "sm" | "md" }) {
  const y = yes === null ? null : Math.min(1, Math.max(0, yes));
  const h = size === "sm" ? "h-2" : "h-3";
  return (
    <div className="w-full" aria-label={y === null ? "No price yet" : `${pct(y)} chance YES`}>
      <div className={cn("flex w-full overflow-hidden rounded-full bg-no/30", h)}>
        <div className="bg-yes transition-[width] duration-500 ease-out" style={{ width: `${y === null ? 50 : y * 100}%`, opacity: y === null ? 0.25 : 1 }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-xs font-semibold">
        <span className="flex items-center gap-1 text-yes">
          <Check className="size-3.5" aria-hidden /> YES {pct(y)}
        </span>
        <span className="flex items-center gap-1 text-no">
          NO {pct(y === null ? null : 1 - y)} <X className="size-3.5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

export function Countdown({ endAt, className }: { endAt: number; className?: string }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000 * 30);
    return () => clearInterval(t);
  }, []);
  const closed = endAt <= now;
  return (
    <span className={cn("num inline-flex items-center gap-1 text-xs font-semibold", closed ? "text-muted" : endAt - now < 3600 ? "text-warn" : "text-muted", className)}>
      <Clock className="size-3.5" aria-hidden />
      {closed ? "Closed" : `Closes in ${countdown(endAt, now)}`}
    </span>
  );
}

export function CreatorChip({ creator, size = 36, sub }: { creator: MarketView["creator"]; size?: number; sub?: React.ReactNode }) {
  const verified = creator.socials.filter((s) => s.username);
  return (
    <Link href={`/@${creator.handle}`} className="flex min-w-0 items-center gap-2.5">
      <Avatar src={creator.avatarUrl} name={creator.handle} size={size} />
      <span className="min-w-0">
        <span className="flex items-center gap-1 truncate text-[15px] font-bold">
          @{creator.handle}
          {verified.length ? <span className="inline-flex size-4 items-center justify-center rounded-full bg-coral text-[10px] text-coral-ink" title={`Verified on ${verified.map((v) => v.provider).join(", ")}`}>✓</span> : null}
        </span>
        {sub ? <span className="block truncate text-xs text-muted">{sub}</span> : null}
      </span>
    </Link>
  );
}

export function CallBadge({ m }: { m: Pick<MarketView, "creatorCall" | "creator" | "outcome"> }) {
  if (!m.creatorCall) return null;
  const right = m.outcome === m.creatorCall;
  const wrong = m.outcome && m.outcome !== "void" && m.outcome !== m.creatorCall;
  return (
    <Pill tone={m.creatorCall === "yes" ? "yes" : "no"}>
      @{m.creator.handle} says {m.creatorCall.toUpperCase()}
      {right ? " · called it" : wrong ? " · missed" : ""}
    </Pill>
  );
}

export function StatusPill({ m }: { m: MarketView }) {
  if (m.status === "resolved" && m.outcome) {
    return <Pill tone={m.outcome === "yes" ? "yes" : m.outcome === "no" ? "no" : "muted"}>{m.outcome === "void" ? "Cancelled" : `Resolved ${m.outcome.toUpperCase()}`}</Pill>;
  }
  if (m.status === "void") return <Pill tone="muted">Cancelled</Pill>;
  if (m.kind === "forecast") return <Pill tone="coral">Free call</Pill>;
  if (m.status === "closed") return <Pill tone="muted">Awaiting Panta result</Pill>;
  if (m.phase === "secondary") return <Pill tone="muted">Trading on panta.market</Pill>;
  return <Pill tone="coral">Live</Pill>;
}

export function RestrictedNotice({ m }: { m: MarketView }) {
  if (!m.restrictedFlag) return null;
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>A wallet the creator declared as team or family traded this market on Panta. We show this so everyone can weigh it.</span>
    </div>
  );
}

export function Sparkline({ points, className }: { points: { t: number; yes: number }[]; className?: string }) {
  if (points.length < 2) return null;
  const w = 320;
  const h = 64;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t || t0 + 1;
  const d = points
    .map((p, i) => {
      const x = ((p.t - t0) / Math.max(1, t1 - t0)) * w;
      const y = h - p.yes * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-16 w-full", className)} preserveAspectRatio="none" role="img" aria-label="YES chance over time">
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} stroke="var(--color-line)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="var(--color-yes)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
