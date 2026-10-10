"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ChartLine,
  Check,
  ChevronRight,
  Clapperboard,
  Coins,
  Flame,
  FlaskConical,
  Globe,
  Landmark,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import type { MarketView } from "@/lib/types";
import { usdCompact } from "@/lib/format";
import { CallBadge, Countdown, ProbabilityBar, StatusPill, VerifiedDot } from "./market-bits";
import { PickSheet } from "./pick-sheet";
import { ShareSheet } from "./share-sheet";
import { PoweredByPanta } from "./brand";
import { Avatar, TradeButton, cn } from "./ui";

const DAY_MS = 86_400_000;

/* Backdrops for markets without an image: near-black with a muted category
   tint, so the page still has a mood while color keeps meaning YES or NO. */
const THEMES: Record<string, { tint: string; base: string; icon: LucideIcon }> = {
  sports: { tint: "#123f52", base: "#071a24", icon: Trophy },
  crypto: { tint: "#2b2163", base: "#100c26", icon: Coins },
  entertainment: { tint: "#4d1640", base: "#1d0819", icon: Clapperboard },
  politics: { tint: "#1f2d57", base: "#0b1126", icon: Landmark },
  finance: { tint: "#45320f", base: "#1a1306", icon: ChartLine },
  science: { tint: "#0f4148", base: "#06191c", icon: FlaskConical },
  world: { tint: "#223452", base: "#0c1421", icon: Globe },
  other: { tint: "#2a2a33", base: "#111115", icon: Sparkles },
};

function themeFor(category: string) {
  return THEMES[category.toLowerCase()] ?? THEMES.other;
}

function categoryLabel(category: string) {
  const c = category.trim();
  return c ? c[0].toUpperCase() + c.slice(1) : "Other";
}

const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
function compact(n: number) {
  return compactFmt.format(Math.max(0, n));
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** Full-bleed image (or category gradient) behind a feed page. Decorative. */
function Backdrop({ m, eager }: { m: MarketView; eager: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const theme = themeFor(m.category);
  const Icon = theme.icon;
  const img = m.imageUrl && failed !== m.imageUrl ? m.imageUrl : null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(120% 70% at 85% 8%, ${theme.tint} 0%, transparent 62%), linear-gradient(165deg, ${theme.base} 0%, #050506 58%, #000 100%)`,
        }}
      />
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(img)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <Icon
          className="absolute left-1/2 top-[34%] size-[min(58vw,240px)] -translate-x-1/2 -translate-y-1/2 text-white/[0.06]"
          strokeWidth={1.25}
        />
      )}
    </div>
  );
}

/** Dark glass behind a translucent pill so its tint reads over a photo. */
function Glass({ children }: { children: ReactNode }) {
  return <span className="inline-flex max-w-full min-w-0 rounded-full bg-black/50 backdrop-blur-md">{children}</span>;
}

/** TikTok-style rail action: a 48px icon target with a legible count under it. */
function RailAction({
  icon,
  count,
  label,
  href,
  onClick,
  pressed,
}: {
  icon: ReactNode;
  count: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const body = (
    <>
      <span className="inline-flex size-12 items-center justify-center [&_svg]:size-8 [&_svg]:drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]">{icon}</span>
      <span aria-hidden className="num legible -mt-1 max-w-16 truncate text-[13px] font-semibold leading-4">
        {count}
      </span>
    </>
  );
  const cls = "flex w-12 select-none flex-col items-center text-fg transition-transform duration-[120ms] ease-out active:scale-[0.9]";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} className={cls}>
      {body}
    </button>
  );
}

/**
 * One full-screen page of the home feed. Swipes only move between pages;
 * money moves only after a tap on YES/NO and the confirm step in the sheet.
 * `ring` lights the creator's story ring (set by the feed per creator).
 */
export function MarketCard({ m, ring, eager = false }: { m: MarketView; ring?: "lit" | "dim"; eager?: boolean }) {
  const s = useSession();
  const [pick, setPick] = useState<"yes" | "no" | null>(null);
  const [share, setShare] = useState<{ side?: "yes" | "no" } | null>(null);

  const now = Date.now();
  const open = m.status === "live" && m.endAt * 1000 > now;
  const tradable = m.kind === "forecast" ? open : m.buyable;
  const free = m.kind === "forecast";
  const settled = m.status === "resolved" || m.status === "void";
  const awaiting = m.kind === "panta" && m.status === "closed";
  const secondary = m.kind === "panta" && m.status === "live" && m.phase === "secondary";
  const avatarRing = ring ?? (open && m.endAt * 1000 - now < DAY_MS ? "lit" : "dim");
  const isMe = Boolean(s.me?.handle && s.me.handle === m.creator.handle);
  const verified = m.creator.socials.filter((v) => v.username);
  const long = m.question.length > 80;
  const qid = `q-${m.id}`;

  // Fire reaction. Whether this viewer already reacted is not in the feed
  // payload, so the toggle is optimistic and the server's answer corrects it.
  // A refetch with a new count already includes this viewer's change.
  const [fireBase, setFireBase] = useState(m.reactions.fire);
  const [fireDelta, setFireDelta] = useState(0);
  const [fireMine, setFireMine] = useState<boolean | null>(null);
  const [fireBusy, setFireBusy] = useState(false);
  if (fireBase !== m.reactions.fire) {
    setFireBase(m.reactions.fire);
    setFireDelta(0);
  }
  const fireCount = Math.max(0, fireBase + fireDelta);

  async function toggleFire() {
    if (!s.authenticated) return s.login();
    if (fireBusy) return;
    const next = !(fireMine ?? false);
    setFireMine(next);
    setFireDelta((d) => d + (next ? 1 : -1));
    setFireBusy(true);
    try {
      const r = await api<{ kind: string; active: boolean }>(`/api/markets/${m.slug}/react`, { body: { kind: "fire" } });
      if (r.active !== next) {
        setFireMine(r.active);
        setFireDelta((d) => d + (r.active ? 2 : -2));
      }
    } catch (e) {
      setFireMine(!next);
      setFireDelta((d) => d + (next ? -1 : 1));
      toast.error((e as ApiError).message);
    } finally {
      setFireBusy(false);
    }
  }

  return (
    <article aria-labelledby={qid} className="relative isolate h-full w-full overflow-hidden bg-canvas">
      <Backdrop m={m} eager={eager} />
      <div aria-hidden className="scrim-top pointer-events-none absolute inset-x-0 top-0 h-[30%]" />
      <div aria-hidden className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 h-[75%]" />

      <div className="absolute inset-0 flex flex-col justify-end gap-4 px-4 pb-3 pt-[calc(var(--top-bar-h)+3rem)]">
        <div className="flex items-end gap-3">
          {/* Bottom-left: who, what, when, where the crowd is. */}
          <div className="flex min-w-0 flex-1 flex-col">
            <Link href={`/@${m.creator.handle}`} className="legible flex min-h-11 w-fit max-w-full flex-col justify-center">
              <span className="flex min-w-0 items-center gap-1.5 text-base font-bold">
                <span className="truncate">@{m.creator.handle}</span>
                {verified.length ? <VerifiedDot title={`Verified on ${verified.map((v) => v.provider).join(", ")}`} /> : null}
              </span>
              <span className="truncate text-[13px] font-medium text-white/75">{free ? "Free call" : categoryLabel(m.category)}</span>
            </Link>

            <Link href={`/m/${m.slug}`} className="mt-1 block">
              <h2
                id={qid}
                className={cn(
                  "legible line-clamp-5 font-bold tracking-[-0.02em] text-fg [@media(max-height:680px)]:line-clamp-3",
                  long ? "text-[24px] leading-[1.12]" : "text-[28px] leading-[1.1]",
                )}
              >
                {m.question}
              </h2>
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              {m.creatorCall ? (
                <Glass>
                  <CallBadge m={m} />
                </Glass>
              ) : null}
              {settled || awaiting ? (
                <Glass>
                  <StatusPill m={m} />
                </Glass>
              ) : (
                <Countdown endAt={m.endAt} className="legible" />
              )}
              {secondary ? (
                <Glass>
                  <StatusPill m={m} />
                </Glass>
              ) : null}
            </div>

            <div className="mt-3">
              {m.kind === "panta" ? (
                <ProbabilityBar yes={m.yes} className="legible" />
              ) : m.counts.calls > 0 ? (
                <p className="num legible flex flex-wrap items-center gap-x-2 text-[13px] font-semibold">
                  <span className="inline-flex items-center gap-1 text-yes">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    {m.counts.callsYes.toLocaleString("en-US")} called YES
                  </span>
                  <span aria-hidden className="text-white/50">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 text-no">
                    <X className="size-3.5" strokeWidth={3} aria-hidden />
                    {m.counts.callsNo.toLocaleString("en-US")} called NO
                  </span>
                </p>
              ) : (
                <p className="legible text-[13px] font-semibold text-fg">Be the first to call it</p>
              )}
            </div>

            {m.kind === "panta" || m.counts.calls > 0 ? (
              <p className="num legible mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-white/75">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" aria-hidden />
                  {m.kind === "panta" ? plural(m.counts.traders, "trader", "traders") : plural(m.counts.calls, "call", "calls")}
                </span>
                {m.kind === "panta" && m.volumeUsdc !== null ? <span>{usdCompact(m.volumeUsdc)} volume</span> : null}
              </p>
            ) : null}
          </div>

          {/* Right rail. */}
          <div role="group" aria-label="Actions" className="flex w-12 shrink-0 flex-col items-center gap-2.5 pb-0.5">
            <Link
              href={`/@${m.creator.handle}`}
              aria-label={isMe ? "Your profile" : `@${m.creator.handle}: view profile and follow`}
              className="relative mb-3 inline-flex size-12 items-center justify-center rounded-full transition-transform duration-[120ms] ease-out active:scale-[0.94]"
            >
              <Avatar src={m.creator.avatarUrl} name={m.creator.handle} size={48} ring={avatarRing} />
              {isMe ? null : (
                <span
                  aria-hidden
                  className="absolute -bottom-2.5 left-1/2 inline-flex size-5 -translate-x-1/2 items-center justify-center rounded-full bg-fg text-canvas shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
                >
                  <Plus className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </Link>
            <RailAction
              label={`Fire reaction, ${fireCount}`}
              pressed={fireMine === true}
              onClick={toggleFire}
              icon={<Flame className={cn(fireMine && "fill-current")} />}
              count={compact(fireCount)}
            />
            <RailAction
              label={`Comments, ${m.counts.comments}`}
              href={`/m/${m.slug}#talk`}
              icon={<MessageCircle />}
              count={compact(m.counts.comments)}
            />
            <RailAction label="Share" onClick={() => setShare({})} icon={<Share2 />} count="Share" />
          </div>
        </div>

        {/* Pinned above the bottom nav. Only these taps open the pick flow. */}
        <div className="flex flex-col gap-2">
          {tradable ? (
            <div className="grid grid-cols-2 gap-3">
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
            </div>
          ) : (
            <Link
              href={`/m/${m.slug}`}
              className="inline-flex h-[52px] w-full select-none items-center justify-center gap-1.5 rounded-full bg-card px-6 text-base font-semibold text-fg transition-[scale,background-color] duration-[120ms] ease-out hover:bg-card-2 active:scale-[0.97]"
            >
              {open ? "See market" : "See result"}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
          <div className="flex h-5 items-center justify-center">
            {m.kind === "panta" ? (
              <PoweredByPanta className="legible" />
            ) : (
              <span className="legible text-[11px] font-medium text-white/70">Free call: no money, no prizes</span>
            )}
          </div>
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
