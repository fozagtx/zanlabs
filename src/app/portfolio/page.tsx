"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { shortAddr, usd } from "@/lib/format";
import type { BuiltTx } from "@/lib/types";
import { Button, Card, Empty, Pill, Segmented, Skeleton } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { TxTimeline } from "@/components/tx-timeline";
import { PoweredByPanta } from "@/components/brand";

type Position = {
  wallet: string;
  pantaMarketId: string;
  slug: string | null;
  question: string;
  side: "yes" | "no";
  shares: number;
  phase: string | null;
  outcome: "yes" | "no" | null;
  claimable: boolean;
  claimed: boolean;
  price: number | null;
  estValueUsdc: number | null;
};
type Call = { side: "yes" | "no"; slug: string; question: string; outcome: "yes" | "no" | "void" | null; endAt: number };
type Data = { positions: Position[]; calls: Call[]; record: { decided: number; correct: number }; pantaError: string | null };

export default function Portfolio() {
  const s = useSession();
  const run = useTxRunner();
  const [tab, setTab] = useState<"open" | "won" | "lost" | "calls">("open");
  const [claiming, setClaiming] = useState<Position | null>(null);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const q = useQuery({ queryKey: ["positions", s.me?.id], queryFn: () => api<Data>("/api/positions"), enabled: s.authenticated && Boolean(s.me) });

  if (!s.authenticated) {
    return <Empty title="Your picks live here" body="Sign in to see your positions, claim winnings and track your calls." action={<Button onClick={s.login}>Sign in</Button>} />;
  }
  if (q.isLoading || !q.data) return <Skeleton className="m-4 h-64" />;

  const d = q.data;
  const open = d.positions.filter((p) => !p.outcome);
  const won = d.positions.filter((p) => p.outcome && p.outcome === p.side);
  const lost = d.positions.filter((p) => p.outcome && p.outcome !== p.side);
  const claimable = won.filter((p) => p.claimable && !p.claimed);
  const list = tab === "open" ? open : tab === "won" ? won : tab === "lost" ? lost : [];

  async function claim(p: Position) {
    setClaiming(p);
    setPhase("preparing");
    try {
      const built = await api<BuiltTx & { amountUsdc: number | null }>("/api/claim/build", { body: { pantaMarketId: p.pantaMarketId, wallet: p.wallet, kind: "claim" } });
      const res = await run(built, p.wallet, setPhase);
      if (res.status === "confirmed") toast.success("Winnings claimed.");
      else if (res.status === "failed") toast.error(res.message ?? "The claim failed.");
      await q.refetch();
    } catch (e) {
      if (!isUserRejection(e)) toast.error((e as ApiError).message);
    } finally {
      setClaiming(null);
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Your picks</h1>
          <p className="num text-sm text-muted">
            {d.record.decided > 0 ? `Called it ${d.record.correct} of ${d.record.decided}` : "No settled picks yet"}
          </p>
        </div>
        <PoweredByPanta />
      </div>

      {d.pantaError ? <p className="rounded-2xl bg-warn/10 p-3 text-sm text-warn">Couldn&apos;t load some positions from Panta right now. Pull to refresh in a moment.</p> : null}

      {claimable.length ? (
        <Card className="flex flex-col gap-3 border-yes/40">
          <p className="font-semibold">You have winnings to claim</p>
          {claimable.map((p) => (
            <div key={`${p.wallet}${p.pantaMarketId}${p.side}`} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm">{p.question}</span>
              <Button size="sm" variant="yes" onClick={() => claim(p)} loading={claiming?.pantaMarketId === p.pantaMarketId}>
                Claim ~{usd(p.shares)}
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: `Open ${open.length}` },
          { value: "won", label: `Won ${won.length}` },
          { value: "lost", label: `Lost ${lost.length}` },
          { value: "calls", label: `Free calls ${d.calls.length}` },
        ]}
      />

      {tab !== "calls" ? (
        list.length ? (
          <ul className="flex flex-col gap-2">
            {list.map((p) => (
              <li key={`${p.wallet}${p.pantaMarketId}${p.side}`}>
                <Link href={p.slug ? `/m/${p.slug}` : `/x/${p.pantaMarketId}`} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-3">
                  <span className="line-clamp-2 font-semibold">{p.question}</span>
                  <span className="num flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Pill tone={p.side === "yes" ? "yes" : "no"}>{p.side.toUpperCase()}</Pill>
                    <span>{p.shares.toFixed(2)} shares</span>
                    <span>{p.estValueUsdc !== null ? `≈ ${usd(p.estValueUsdc)}` : "value pending"}</span>
                    {p.claimed ? <Pill tone="muted">Claimed</Pill> : null}
                    <span className="ml-auto">{shortAddr(p.wallet)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title={tab === "open" ? "No open picks" : tab === "won" ? "No wins yet" : "No losses. Nice."} action={<Link href="/" className="text-sm font-semibold text-coral">Find a call</Link>} />
        )
      ) : d.calls.length ? (
        <ul className="flex flex-col gap-2">
          {d.calls.map((c) => (
            <li key={c.slug}>
              <Link href={`/m/${c.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
                <span className="min-w-0 truncate text-sm font-semibold">{c.question}</span>
                <span className="flex shrink-0 gap-1">
                  <Pill tone={c.side === "yes" ? "yes" : "no"}>{c.side.toUpperCase()}</Pill>
                  {c.outcome && c.outcome !== "void" ? <Pill tone={c.outcome === c.side ? "yes" : "muted"}>{c.outcome === c.side ? "Right" : "Wrong"}</Pill> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No free calls yet" />
      )}

      <Sheet open={claiming !== null} onOpenChange={() => {}} title="Claiming winnings" dismissible={false}>
        <TxTimeline phase={phase} />
      </Sheet>
    </div>
  );
}
