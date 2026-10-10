"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trophy, TriangleAlert, X } from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { shortAddr, usd } from "@/lib/format";
import type { BuiltTx } from "@/lib/types";
import { Button, Empty, Pill, Skeleton, Tabs } from "@/components/ui";
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

/** YES/NO pill that always carries an icon and a label, never color alone. */
function SidePill({ side }: { side: "yes" | "no" }) {
  return (
    <Pill size="sm" tone={side}>
      {side === "yes" ? <Check strokeWidth={3} aria-hidden /> : <X strokeWidth={3} aria-hidden />}
      {side.toUpperCase()}
    </Pill>
  );
}

const findCall = (
  <Link
    href="/"
    className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-[15px] font-semibold text-black transition-[scale,background-color] duration-[120ms] ease-out hover:bg-white/90 active:scale-[0.97]"
  >
    Find a call
  </Link>
);

export default function Portfolio() {
  const s = useSession();
  const run = useTxRunner();
  const [tab, setTab] = useState<"open" | "won" | "lost" | "calls">("open");
  const [claiming, setClaiming] = useState<Position | null>(null);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const q = useQuery({ queryKey: ["positions", s.me?.id], queryFn: () => api<Data>("/api/positions"), enabled: s.authenticated && Boolean(s.me) });

  if (!s.authenticated) {
    return (
      <Empty
        icon={<Trophy aria-hidden />}
        title="Your picks live here"
        body="Sign in to see your positions, claim winnings and track your calls."
        action={
          <Button size="lg" onClick={s.login}>
            Sign in
          </Button>
        }
      />
    );
  }
  if (q.isLoading || !q.data) {
    return (
      <div className="px-4 pt-6" aria-busy>
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="mt-5 h-10 w-60" />
        <Skeleton className="mt-8 h-11 w-full rounded-full" />
        <div className="mt-2 flex flex-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 border-b border-hairline py-3.5 last:border-b-0">
              <div className="flex-1">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="mt-2 h-4 w-2/3 rounded-full" />
                <Skeleton className="mt-3 h-6 w-14 rounded-full" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
    <div className="flex flex-col px-4 pb-8">
      <header className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">Your picks</h1>
          <PoweredByPanta className="inline-flex min-h-11 items-center" />
        </div>
        {d.record.decided > 0 ? (
          <p className="num mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em]">
            <span className="text-fg-2">Called it </span>
            {d.record.correct}
            <span className="text-fg-3"> of </span>
            {d.record.decided}
          </p>
        ) : (
          <p className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-fg-2">No settled picks yet</p>
        )}
      </header>

      {d.pantaError ? (
        <p role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-warn/10 px-4 py-3.5 text-[13px] leading-[1.45] text-warn">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
          <span>Couldn&apos;t load some positions from Panta right now. Pull to refresh in a moment.</span>
        </p>
      ) : null}

      {claimable.length ? (
        <section className="mt-6 rounded-2xl bg-yes/10 px-4 pb-1 pt-4" aria-labelledby="claim-title">
          <h2 id="claim-title" className="flex items-center gap-2 text-[15px] font-bold text-yes">
            <Trophy className="size-4" aria-hidden />
            You have winnings to claim
          </h2>
          <ul className="mt-1">
            {claimable.map((p) => (
              <li key={`${p.wallet}${p.pantaMarketId}${p.side}`} className="flex items-center gap-3 border-b border-yes/15 py-3 last:border-b-0">
                <span className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-[1.35]">{p.question}</span>
                <Button variant="yes" className="shrink-0" onClick={() => claim(p)} loading={claiming?.pantaMarketId === p.pantaMarketId}>
                  <span className="num">Claim ~{usd(p.shares)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Tabs
        className="mt-6"
        label="Your picks"
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: "Open", count: open.length },
          { value: "won", label: "Won", count: won.length },
          { value: "lost", label: "Lost", count: lost.length },
          { value: "calls", label: "Free calls", count: d.calls.length },
        ]}
      />

      {tab !== "calls" ? (
        list.length ? (
          <ul>
            {list.map((p) => (
              <li key={`${p.wallet}${p.pantaMarketId}${p.side}`} className="border-b border-hairline last:border-b-0">
                <Link href={p.slug ? `/m/${p.slug}` : `/x/${p.pantaMarketId}`} className="flex items-start gap-3 py-3.5 transition-opacity active:opacity-60">
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] font-semibold leading-[1.35]">{p.question}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <SidePill side={p.side} />
                      {p.claimed ? (
                        <Pill size="sm" tone="muted">
                          Claimed
                        </Pill>
                      ) : null}
                      <span className="num text-[11px] text-fg-3">{shortAddr(p.wallet)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={p.estValueUsdc !== null ? "num block text-[15px] font-semibold text-fg" : "block text-[13px] font-medium text-fg-3"}>
                      {p.estValueUsdc !== null ? `≈ ${usd(p.estValueUsdc)}` : "Value pending"}
                    </span>
                    <span className="num mt-0.5 block text-[13px] text-fg-2">{p.shares.toFixed(2)} shares</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title={tab === "open" ? "No open picks" : tab === "won" ? "No wins yet" : "No losses. Nice."} action={findCall} />
        )
      ) : d.calls.length ? (
        <ul>
          {d.calls.map((c) => (
            <li key={c.slug} className="border-b border-hairline last:border-b-0">
              <Link href={`/m/${c.slug}`} className="flex items-center gap-3 py-3.5 transition-opacity active:opacity-60">
                <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-[1.35]">{c.question}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <SidePill side={c.side} />
                  {c.outcome && c.outcome !== "void" ? (
                    <Pill size="sm" tone={c.outcome === c.side ? "yes" : "muted"}>
                      {c.outcome === c.side ? "Right" : "Wrong"}
                    </Pill>
                  ) : null}
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
