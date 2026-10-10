"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Clock, ShieldAlert, X } from "lucide-react";
import { countdown, pct } from "@/lib/format";
import type { MarketView } from "@/lib/types";
import { Avatar, Pill, cn } from "./ui";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Robinhood-style hero: the giant YES chance with a NO sub-line. `yes` is 0..1. */
export function ChanceHero({ yes, size = "lg", className }: { yes: number | null; size?: "md" | "lg"; className?: string }) {
  const y = yes === null || !Number.isFinite(yes) ? null : clamp01(yes);
  return (
    <div className={cn("flex flex-col", className)} role="img" aria-label={y === null ? "No price yet" : `${pct(y)} chance YES, ${pct(1 - y)} NO`}>
      <p className={cn("inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.06em]", y === null ? "text-fg-3" : "text-yes")} aria-hidden>
        <Check className="size-3.5" strokeWidth={3} /> Yes
      </p>
      <div className="mt-1 flex items-baseline gap-2" aria-hidden>
        <span
          className={cn(
            "num font-semibold leading-none tracking-[-0.04em] transition-colors duration-200",
            size === "lg" ? "text-[56px]" : "text-[40px]",
            y === null ? "text-fg-3" : "text-yes",
          )}
        >
          {pct(y)}
        </span>
        <span className={cn("font-semibold text-fg-2", size === "lg" ? "text-[17px]" : "text-[15px]")}>chance</span>
      </div>
      <p className="num mt-2 inline-flex items-center gap-1 text-[13px] text-fg-2" aria-hidden>
        {y === null ? (
          "No price yet"
        ) : (
          <>
            <X className="size-3.5 text-no" strokeWidth={3} />
            <span className="font-semibold text-no">No</span>
            <span>{pct(1 - y)}</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Thin YES/NO split bar with ✓/✕ labels. `yes` is 0..1. */
export function ProbabilityBar({ yes, size = "md", className }: { yes: number | null; size?: "sm" | "md"; className?: string }) {
  const y = yes === null || !Number.isFinite(yes) ? null : clamp01(yes);
  return (
    <div className={cn("w-full", className)} role="img" aria-label={y === null ? "No price yet" : `${pct(y)} chance YES, ${pct(1 - y)} NO`}>
      <div className={cn("relative w-full overflow-hidden rounded-full", size === "sm" ? "h-[3px]" : "h-1", y === null ? "bg-white/15" : "bg-no")}>
        {y === null ? null : <div className="absolute inset-y-0 left-0 rounded-full bg-yes" style={{ width: `${y * 100}%` }} />}
      </div>
      <div className={cn("num flex justify-between font-semibold", size === "sm" ? "mt-1 text-[11px]" : "mt-1.5 text-[13px]")} aria-hidden>
        <span className={cn("inline-flex items-center gap-1", y === null ? "text-fg-3" : "text-yes")}>
          <Check className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={3} /> YES {pct(y)}
        </span>
        <span className={cn("inline-flex items-center gap-1", y === null ? "text-fg-3" : "text-no")}>
          NO {pct(y === null ? null : 1 - y)} <X className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={3} />
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
    <span
      suppressHydrationWarning
      className={cn("num inline-flex items-center gap-1 text-[13px] font-medium", closed ? "text-fg-3" : endAt - now < 3600 ? "text-warn" : "text-fg-2", className)}
    >
      <Clock className="size-3.5 shrink-0" aria-hidden />
      {closed ? "Closed" : `Closes in ${countdown(endAt, now)}`}
    </span>
  );
}

/** Small accent check that marks a creator with at least one verified social account. */
export function VerifiedDot({ title = "Verified", className }: { title?: string; className?: string }) {
  return (
    <span className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-white", className)} title={title}>
      <Check className="size-2.5" strokeWidth={4} aria-hidden />
      <span className="sr-only">{title}</span>
    </span>
  );
}

export function CreatorChip({
  creator,
  size = 36,
  sub,
  ring = "none",
  className,
}: {
  creator: MarketView["creator"];
  size?: number;
  sub?: ReactNode;
  ring?: "lit" | "dim" | "none";
  className?: string;
}) {
  const verified = creator.socials.filter((s) => s.username);
  return (
    <Link href={`/@${creator.handle}`} className={cn("flex min-h-11 min-w-0 items-center gap-2.5", className)}>
      <Avatar src={creator.avatarUrl} name={creator.handle} size={size} ring={ring} />
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[15px] font-semibold">
          <span className="truncate">@{creator.handle}</span>
          {verified.length ? <VerifiedDot title={`Verified on ${verified.map((v) => v.provider).join(", ")}`} /> : null}
        </span>
        {sub ? <span className="block truncate text-[13px] text-fg-2">{sub}</span> : null}
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
      {m.creatorCall === "yes" ? <Check strokeWidth={3} aria-hidden /> : <X strokeWidth={3} aria-hidden />}
      <span className="truncate">
        @{m.creator.handle} says {m.creatorCall.toUpperCase()}
        {right ? " · called it" : wrong ? " · missed" : ""}
      </span>
    </Pill>
  );
}

export function StatusPill({ m }: { m: MarketView }) {
  if (m.status === "resolved" && m.outcome) {
    return (
      <Pill tone={m.outcome === "yes" ? "yes" : m.outcome === "no" ? "no" : "muted"}>
        {m.outcome === "yes" ? <Check strokeWidth={3} aria-hidden /> : m.outcome === "no" ? <X strokeWidth={3} aria-hidden /> : null}
        {m.outcome === "void" ? "Cancelled" : `Resolved ${m.outcome.toUpperCase()}`}
      </Pill>
    );
  }
  if (m.status === "void") return <Pill tone="muted">Cancelled</Pill>;
  if (m.kind === "forecast") return <Pill tone="coral">Free call</Pill>;
  if (m.status === "closed") return <Pill tone="muted">Awaiting Panta result</Pill>;
  if (m.phase === "secondary") return <Pill tone="muted">Trading on panta.market</Pill>;
  return (
    <Pill tone="coral">
      <span className="size-1.5 rounded-full bg-fg" aria-hidden />
      Live
    </Pill>
  );
}

export function RestrictedNotice({ m }: { m: MarketView }) {
  if (!m.restrictedFlag) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-warn/10 px-4 py-3.5 text-[13px] leading-[1.45] text-warn" role="note">
      <ShieldAlert className="mt-px size-4 shrink-0" aria-hidden />
      <span>A wallet the creator declared as team or family traded this market on Panta. We show this so everyone can weigh it.</span>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Price chart                                                               */
/* ------------------------------------------------------------------------ */

type Point = { t: number; yes: number };
export type ChartRange = "1D" | "1W" | "All";
const RANGES: ChartRange[] = ["1D", "1W", "All"];
const RANGE_SEC: Record<Exclude<ChartRange, "All">, number> = { "1D": 86_400, "1W": 7 * 86_400 };
const RANGE_COPY: Record<ChartRange, string> = { "1D": "past 24h", "1W": "past week", All: "over the period shown" };

// Clip the series to the range. The price before the window and the latest
// price carried to "now" keep the line continuous (prices hold between trades).
function windowed(sorted: Point[], range: ChartRange, now: number | null, endAt?: number): Point[] {
  if (!sorted.length) return [];
  const last = sorted[sorted.length - 1];
  let end = Math.max(last.t, now ?? last.t);
  if (endAt !== undefined && Number.isFinite(endAt)) end = Math.max(last.t, Math.min(end, endAt));
  const start = range === "All" ? sorted[0].t : end - RANGE_SEC[range];
  const out: Point[] = [];
  let before: Point | undefined;
  for (const p of sorted) {
    if (p.t < start) before = p;
    else out.push(p);
  }
  if (before) out.unshift({ t: start, yes: before.yes });
  if (out.length && out[out.length - 1].t < end) out.push({ t: end, yes: out[out.length - 1].yes });
  return out;
}

function timeLabel(t: number, range: ChartRange) {
  const d = new Date(t * 1000);
  return range === "1D"
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/**
 * Robinhood-style YES chance line on a fixed 0–100% scale with a dashed 50%
 * baseline. Range chips (1D, 1W, All) filter client-side; drag across the
 * chart to read a point. `points` are `{ t: unix seconds, yes: 0..1 }`.
 */
export function PriceChart({
  points,
  height = 168,
  ranges = true,
  readout,
  defaultRange = "All",
  endAt,
  className,
}: {
  points: Point[];
  height?: number;
  /** Show the 1D / 1W / All chips. */
  ranges?: boolean;
  /** Show the change / scrub readout above the chart. Defaults to `ranges`. */
  readout?: boolean;
  defaultRange?: ChartRange;
  /** Market close (unix seconds): the line is not carried past it. */
  endAt?: number;
  className?: string;
}) {
  const [range, setRange] = useState<ChartRange>(defaultRange);
  // "now" is read after mount so server and client render the same markup.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60_000);
    return () => clearInterval(t);
  }, []);
  const [scrub, setScrub] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const showReadout = readout ?? ranges;

  const sorted = useMemo(() => points.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.yes)).sort((a, b) => a.t - b.t), [points]);
  const series = useMemo(() => windowed(sorted, ranges ? range : "All", now, endAt), [sorted, range, ranges, now, endAt]);

  const W = 1000;
  const H = Math.max(32, height);
  const PAD = Math.min(8, H * 0.1);
  const t0 = series.length ? series[0].t : 0;
  const t1 = series.length ? series[series.length - 1].t : 1;
  const span = Math.max(1, t1 - t0);
  const xOf = (t: number) => ((t - t0) / span) * W;
  const yOf = (v: number) => PAD + (1 - clamp01(v)) * (H - PAD * 2);
  const d = series.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.yes).toFixed(1)}`).join(" ");

  const first = series[0];
  const last = series[series.length - 1];
  const active = scrub !== null && series[scrub] ? series[scrub] : null;
  const marker = active ?? last;
  const delta = first && last ? Math.round((last.yes - first.yes) * 100) : 0;

  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = areaRef.current;
    if (!el || series.length < 2) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width)));
    const target = t0 + ratio * span;
    let lo = 0;
    let hi = series.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (series[mid].t < target) lo = mid;
      else hi = mid;
    }
    setScrub(target - series[lo].t <= series[hi].t - target ? lo : hi);
  }

  const summary =
    series.length >= 2 && first && last
      ? `YES chance ${RANGE_COPY[ranges ? range : "All"]}: from ${pct(first.yes)} to ${pct(last.yes)}`
      : "Not enough price history yet";

  return (
    <div className={cn("w-full", className)}>
      {showReadout ? (
        <div className="num flex h-6 items-center gap-1.5 text-[13px] font-medium">
          {now === null || series.length < 2 ? (
            <span className="text-fg-3">{series.length < 2 ? "Not enough price history yet" : " "}</span>
          ) : active ? (
            <>
              <span className="font-semibold text-yes">
                <Check className="mr-0.5 inline size-3.5 align-[-2px]" strokeWidth={3} aria-hidden />
                {pct(active.yes)}
              </span>
              <span className="text-fg-2">{timeLabel(active.t, ranges ? range : "All")}</span>
            </>
          ) : (
            <>
              <span className={cn("inline-flex items-center gap-0.5 font-semibold", delta > 0 ? "text-yes" : delta < 0 ? "text-no" : "text-fg-2")}>
                {delta > 0 ? <ArrowUpRight className="size-4" aria-hidden /> : delta < 0 ? <ArrowDownRight className="size-4" aria-hidden /> : null}
                {delta === 0 ? "No change" : `YES ${delta > 0 ? "+" : "−"}${Math.abs(delta)} pts`}
              </span>
              <span className="text-fg-2">
                {ranges && range !== "All" ? RANGE_COPY[range] : `since ${new Date(first.t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
              </span>
            </>
          )}
        </div>
      ) : null}

      <div
        ref={areaRef}
        className={cn("relative w-full touch-pan-y select-none", showReadout && "mt-2")}
        style={{ height: H }}
        onPointerMove={showReadout ? onMove : undefined}
        onPointerDown={showReadout ? onMove : undefined}
        onPointerLeave={() => setScrub(null)}
        onPointerCancel={() => setScrub(null)}
        onPointerUp={(e) => (e.pointerType === "mouse" ? null : setScrub(null))}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" role="img" aria-label={summary}>
          <line x1="0" x2={W} y1={yOf(0.5)} y2={yOf(0.5)} stroke="var(--color-fg-3)" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          {series.length >= 2 ? (
            <path d={d} fill="none" stroke="var(--color-yes)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
        {ranges || showReadout ? (
          <span className="num pointer-events-none absolute left-0 -translate-y-full pb-0.5 text-[11px] text-fg-3" style={{ top: yOf(0.5) }} aria-hidden>
            50%
          </span>
        ) : null}
        {active ? <span className="pointer-events-none absolute inset-y-0 w-px bg-fg-3" style={{ left: `${(xOf(active.t) / W) * 100}%` }} aria-hidden /> : null}
        {marker && series.length >= 1 ? (
          <span
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yes ring-4 ring-yes/20"
            style={{ left: `${series.length >= 2 ? (xOf(marker.t) / W) * 100 : 100}%`, top: yOf(marker.yes) }}
            aria-hidden
          />
        ) : null}
      </div>

      {ranges ? (
        <div className="mt-3 flex gap-1" role="group" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => {
                setRange(r);
                setScrub(null);
              }}
              className={cn(
                "num inline-flex h-9 min-w-12 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors duration-150",
                range === r ? "bg-yes/15 text-yes" : "text-fg-2 hover:text-fg",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Compact chart without chips or readout (v1 API). Renders nothing with fewer than 2 points. */
export function Sparkline({ points, className }: { points: { t: number; yes: number }[]; className?: string }) {
  if (points.length < 2) return null;
  return <PriceChart points={points} height={64} ranges={false} readout={false} className={className} />;
}
