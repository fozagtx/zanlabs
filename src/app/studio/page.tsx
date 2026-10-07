"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { SHARE_CHANNELS, type ShareChannel } from "@/lib/config";
import { shortAddr, usd } from "@/lib/format";
import type { BuiltTx, MarketView, MeView } from "@/lib/types";
import { Button, Card, Empty, Input, Pill, Skeleton } from "@/components/ui";
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

export default function StudioPage() {
  const s = useSession();
  if (!s.authenticated) return <Empty title="Creator studio" action={<Button onClick={s.login}>Sign in</Button>} />;
  if (!s.me) return <Skeleton className="m-4 h-96" />;
  if (s.me.role !== "creator") {
    return (
      <Empty
        title="Creator studio"
        body="Set up your creator page to post calls and see your stats."
        action={
          <Link href="/onboarding" className="inline-flex h-11 items-center rounded-2xl bg-coral px-4 font-semibold text-coral-ink">
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

  if (q.isLoading || !q.data) return <Skeleton className="m-4 h-96" />;
  const d = q.data;
  const funnel = Object.entries(d.funnel).sort((a, b) => b[1].trades - a[1].trades || b[1].visits - a[1].visits);

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Studio</h1>
          <Link href={`/@${me.handle}`} className="text-sm text-coral">
            zan/@{me.handle}
          </Link>
        </div>
        <Link href="/create" className="inline-flex h-11 items-center rounded-2xl bg-coral px-4 font-semibold text-coral-ink">
          New call
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Live and past calls" value={String(d.totals.markets)} />
        <Tile label="Your record" value={d.record.calls ? `${d.record.correct} of ${d.record.calls}` : "--"} />
        <Tile label="Fan picks" value={String(d.totals.buys)} />
        <Tile label="Unique fans trading" value={String(d.totals.uniqueWallets)} />
        <Tile label="Picked volume" value={usd(d.totals.volumeUsdc)} />
        <Tile label="Link visits" value={String(d.totals.visits)} />
      </div>
      <p className="text-xs text-muted">Counts only real activity through Zan links. Team wallets you declared are excluded.</p>

      <Card className="flex flex-col gap-2">
        <p className="font-semibold">Where your fans come from</p>
        {funnel.length ? (
          <table className="num w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-semibold">Channel</th>
                <th className="py-1 font-semibold">Shares</th>
                <th className="py-1 font-semibold">Visits</th>
                <th className="py-1 font-semibold">Picks</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map(([ch, f]) => (
                <tr key={ch} className="border-t border-line">
                  <td className="py-1.5">{SHARE_CHANNELS[ch as ShareChannel] ?? (ch === "direct" ? "Direct" : ch)}</td>
                  <td>{f.shares}</td>
                  <td>{f.visits}</td>
                  <td>{f.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">Share a call to start seeing which channels bring fans.</p>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <p className="font-semibold">Your calls</p>
        {d.markets.length ? (
          d.markets.map((r) => (
            <Card key={r.market.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/m/${r.market.slug}`} className="line-clamp-2 font-semibold">
                  {r.market.question}
                </Link>
                <StatusPill m={r.market} />
              </div>
              <p className="num text-xs text-muted">
                {r.market.kind === "panta"
                  ? `${r.buys} picks · ${r.uniqueWallets} fans · ${usd(r.volumeUsdc)} · ${r.visits} visits`
                  : `${r.market.counts.calls} free calls · ${r.visits} visits`}
              </p>
              {r.market.restrictedFlag ? <Pill tone="warn">A declared team wallet traded this market</Pill> : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setShare(r.market)}>
                  <Share2 className="size-3.5" /> Share
                </Button>
                {r.market.kind === "panta" && r.market.pantaMarketId ? (
                  <Button size="sm" variant="outline" loading={claiming === r.market.id} onClick={() => claimFees(r.market)}>
                    Claim creator fees
                  </Button>
                ) : null}
              </div>
            </Card>
          ))
        ) : (
          <Empty title="No calls yet" action={<Link href="/create" className="text-sm font-semibold text-coral">Post your first call</Link>} />
        )}
        {d.drafts.length ? <p className="text-xs text-muted">{d.drafts.length} unfinished draft(s) were not published and cost nothing.</p> : null}
      </div>

      <Card className="flex flex-col gap-2">
        <p className="font-semibold">Restricted wallets</p>
        <p className="text-xs text-muted">Team, manager and family wallets can&apos;t trade your markets here and are watched on Panta.</p>
        {me.creator?.restricted.map((r) => (
          <p key={r.wallet} className="num text-sm">
            {shortAddr(r.wallet, 6)} <span className="text-muted">({r.relation})</span>
          </p>
        ))}
        <div className="flex gap-2">
          <Input placeholder="Solana address" value={rw.wallet} onChange={(e) => setRw((v) => ({ ...v, wallet: e.target.value }))} className="flex-[2]" />
          <Input placeholder="editor" value={rw.relation} onChange={(e) => setRw((v) => ({ ...v, relation: e.target.value }))} className="flex-1" />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={rw.wallet.trim().length < 32}
          onClick={async () => {
            try {
              s.setMe(await api<MeView>("/api/creator/restricted", { body: { wallet: rw.wallet.trim(), relation: rw.relation.trim() || "team" } }));
              setRw({ wallet: "", relation: "" });
              toast.success("Added.");
            } catch (e) {
              toast.error((e as ApiError).message);
            }
          }}
        >
          Add wallet
        </Button>
      </Card>

      <PoweredByPanta className="self-center" />

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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="num text-xl font-black">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
