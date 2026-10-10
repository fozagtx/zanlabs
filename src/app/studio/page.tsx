"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, HandCoins, Megaphone, Plus, Share2, ShieldAlert, Wallet } from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { SHARE_CHANNELS, type ShareChannel } from "@/lib/config";
import { shortAddr, usd } from "@/lib/format";
import type { BuiltTx, MarketView, MeView } from "@/lib/types";
import { Button, Empty, Input, Label, ListRow, Pill, SectionLabel, Skeleton, StatRow } from "@/components/ui";
import { StatusPill } from "@/components/market-bits";
import { ShareSheet } from "@/components/share-sheet";
import { Sheet } from "@/components/sheet";
import { TxTimeline } from "@/components/tx-timeline";
import { PoweredByPanta } from "@/components/brand";

type Row = { market: MarketView; buys: number; uniqueWallets: number; volumeUsdc: number; shares: number; visits: number };
type Data = {
  markets: Row[];
  drafts: { id: string; slug: string; question: string }[];
  totals: { markets: number; buys: number; volumeUsdc: number; shares: number; visits: number; uniqueWallets: number };
  funnel: Record<string, { shares: number; visits: number; trades: number }>;
  record: { calls: number; correct: number };
};

// A Link that looks like the white primary Button.
const primaryLink =
  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-[15px] font-semibold text-black transition-[scale,background-color] duration-[120ms] ease-out hover:bg-white/90 active:scale-[0.97]";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function StudioPage() {
  const s = useSession();
  if (!s.authenticated) {
    return (
      <Empty
        icon={<BarChart3 />}
        title="Creator studio"
        body="Sign in to see your calls, where your fans come from and your record."
        action={
          <Button type="button" size="lg" onClick={s.login}>
            Sign in
          </Button>
        }
      />
    );
  }
  if (!s.me) return <StudioSkeleton />;
  if (s.me.role !== "creator") {
    return (
      <Empty
        icon={<BarChart3 />}
        title="Creator studio"
        body="Set up your creator page to post calls and see your stats."
        action={
          <Link href="/onboarding" className={primaryLink}>
            Set up
          </Link>
        }
      />
    );
  }
  return <Dashboard me={s.me} />;
}

function Dashboard({ me }: { me: MeView }) {
  const s = useSession();
  const run = useTxRunner();
  const uid = useId();
  const q = useQuery({ queryKey: ["studio"], queryFn: () => api<Data>("/api/creator/markets"), refetchInterval: 30_000 });
  const [share, setShare] = useState<MarketView | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [rw, setRw] = useState({ wallet: "", relation: "" });

  async function claimFees(m: MarketView) {
    if (!m.pantaMarketId || !me.creator) return;
    setClaiming(m.id);
    setPhase("preparing");
    try {
      const built = await api<BuiltTx & { amountUsdc: number | null }>("/api/claim/build", {
        body: { pantaMarketId: m.pantaMarketId, wallet: me.creator.createWallet, kind: "creator_fee" },
      });
      const res = await run(built, me.creator.createWallet, setPhase);
      if (res.status === "confirmed") toast.success(built.amountUsdc ? `Claimed ${usd(built.amountUsdc)} in creator fees.` : "Creator fees claimed.");
      else if (res.status === "failed") toast.error(res.message ?? "The claim failed.");
    } catch (e) {
      if (!isUserRejection(e)) toast.message((e as ApiError).message);
    } finally {
      setClaiming(null);
      setPhase("idle");
    }
  }

  async function addRestricted() {
    try {
      s.setMe(await api<MeView>("/api/creator/restricted", { body: { wallet: rw.wallet.trim(), relation: rw.relation.trim() || "team" } }));
      setRw({ wallet: "", relation: "" });
      toast.success("Added.");
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  }

  if (q.isLoading || !q.data) return <StudioSkeleton />;
  const d = q.data;
  const funnel = Object.entries(d.funnel).sort((a, b) => b[1].trades - a[1].trades || b[1].visits - a[1].visits);
  const restricted = me.creator?.restricted ?? [];

  return (
    <div className="flex flex-col pb-6">
      {/* Robinhood-style header: one big number, then the sub-stats. */}
      <header className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-[-0.01em]">Studio</h1>
            <Link href={`/@${me.handle}`} className="-my-2 inline-flex h-11 max-w-full items-center text-[15px] text-fg-2 transition-colors hover:text-fg">
              <span className="truncate">zan/@{me.handle}</span>
            </Link>
          </div>
          <Link href="/create" className={primaryLink}>
            <Plus className="size-4" strokeWidth={2.5} aria-hidden /> New call
          </Link>
        </div>

        <div className="mt-8">
          <SectionLabel as="p">Picked volume</SectionLabel>
          <p className="num mt-3 text-[56px] font-semibold leading-none tracking-[-0.04em]">{usd(d.totals.volumeUsdc)}</p>
          <p className="mt-2 text-[13px] leading-[1.45] text-fg-2">Counts only real activity through Zan links. Team wallets you declared are excluded.</p>
        </div>

        <StatRow
          className="mt-6 border-y border-hairline py-3"
          items={[
            { label: "Calls", value: d.totals.markets },
            { label: "Fan picks", value: d.totals.buys },
            { label: "Unique fans", value: d.totals.uniqueWallets },
            { label: "Visits", value: d.totals.visits },
            { label: "Record", value: d.record.calls ? `${d.record.correct}/${d.record.calls}` : "--" },
          ]}
        />
      </header>

      {/* Channel funnel */}
      <section className="px-4 pt-8" aria-label="Where your fans come from">
        <SectionLabel>Where your fans come from</SectionLabel>
        <div className="mt-1">
          {funnel.length ? (
            funnel.map(([ch, f]) => (
              <ListRow
                key={ch}
                icon={<Megaphone />}
                label={<span className="text-fg">{SHARE_CHANNELS[ch as ShareChannel] ?? (ch === "direct" ? "Direct" : ch)}</span>}
                sub={<span className="num">{`${plural(f.shares, "share", "shares")} · ${plural(f.visits, "visit", "visits")}`}</span>}
                value={plural(f.trades, "pick", "picks")}
              />
            ))
          ) : (
            <p className="py-3.5 text-[15px] leading-[1.45] text-fg-2">Share a call to start seeing which channels bring fans.</p>
          )}
        </div>
      </section>

      {/* Calls */}
      <section className="px-4 pt-8" aria-label="Your calls">
        <SectionLabel>Your calls</SectionLabel>
        {d.markets.length ? (
          <ul className="mt-1">
            {d.markets.map((r) => (
              <li key={r.market.id} className="border-b border-hairline py-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <Link href={`/m/${r.market.slug}`} className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-[1.35] transition-opacity active:opacity-60">
                    {r.market.question}
                  </Link>
                  <span className="shrink-0">
                    <StatusPill m={r.market} />
                  </span>
                </div>
                <p className="num mt-1.5 text-[13px] text-fg-2">
                  {r.market.kind === "panta"
                    ? `${r.buys} picks · ${r.uniqueWallets} fans · ${usd(r.volumeUsdc)} · ${r.visits} visits`
                    : `${r.market.counts.calls} free calls · ${r.visits} visits`}
                </p>
                {r.market.restrictedFlag ? (
                  <Pill tone="warn" className="mt-2">
                    <ShieldAlert aria-hidden /> A declared team wallet traded this market
                  </Pill>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" className="h-11" onClick={() => setShare(r.market)}>
                    <Share2 className="size-4" aria-hidden /> Share
                  </Button>
                  {r.market.kind === "panta" && r.market.pantaMarketId ? (
                    <Button type="button" size="sm" variant="secondary" className="h-11" loading={claiming === r.market.id} onClick={() => claimFees(r.market)}>
                      {claiming === r.market.id ? null : <HandCoins className="size-4" aria-hidden />} Claim creator fees
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No calls yet"
            body="Post a call and share it where your audience is."
            action={
              <Link href="/create" className={primaryLink}>
                Post your first call
              </Link>
            }
          />
        )}
        {d.drafts.length ? <p className="mt-2 text-[13px] text-fg-3">{d.drafts.length} unfinished draft(s) were not published and cost nothing.</p> : null}
      </section>

      {/* Restricted wallets */}
      <section className="px-4 pt-8" aria-label="Restricted wallets">
        <SectionLabel>Restricted wallets</SectionLabel>
        <p className="mt-1 text-[13px] leading-[1.45] text-fg-2">Team, manager and family wallets can&apos;t trade your markets here and are watched on Panta.</p>
        <div className="mt-1">
          {restricted.length ? (
            restricted.map((r) => <ListRow key={r.wallet} icon={<Wallet />} label={<span className="num text-fg">{shortAddr(r.wallet, 6)}</span>} value={r.relation} />)
          ) : (
            <p className="py-3.5 text-[15px] text-fg-3">None declared yet.</p>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-raised p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${uid}-rw-wallet`}>Wallet address</Label>
            <Input
              id={`${uid}-rw-wallet`}
              placeholder="Solana address"
              autoComplete="off"
              spellCheck={false}
              className="num"
              value={rw.wallet}
              onChange={(e) => setRw((v) => ({ ...v, wallet: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${uid}-rw-relation`} hint="Who they are to you">
              Relation
            </Label>
            <Input id={`${uid}-rw-relation`} placeholder="editor" value={rw.relation} onChange={(e) => setRw((v) => ({ ...v, relation: e.target.value }))} />
          </div>
          <Button type="button" size="md" variant="secondary" className="w-full" disabled={rw.wallet.trim().length < 32} onClick={addRestricted}>
            <Plus className="size-4" aria-hidden /> Add wallet
          </Button>
        </div>
      </section>

      <PoweredByPanta className="mt-8 self-center" />

      {share ? (
        <ShareSheet
          open
          onOpenChange={(o) => !o && setShare(null)}
          market={{ slug: share.slug, question: share.question, kind: share.kind, creatorHandle: share.creator.handle, creatorCall: share.creatorCall }}
        />
      ) : null}
      <Sheet open={claiming !== null} onOpenChange={() => {}} title="Claiming creator fees" dismissible={false}>
        <TxTimeline phase={phase} />
      </Sheet>
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div className="flex flex-col px-4 pt-5" aria-busy>
      <div className="flex items-start justify-between">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <Skeleton className="mt-10 h-4 w-28 rounded-full" />
      <Skeleton className="mt-3 h-14 w-56" />
      <Skeleton className="mt-6 h-16 w-full" />
      <Skeleton className="mt-8 h-40 w-full" />
    </div>
  );
}
