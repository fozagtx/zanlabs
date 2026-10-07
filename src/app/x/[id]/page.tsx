"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, X } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { countdown, localDateTime, usdCompact } from "@/lib/format";
import { PickSheet } from "@/components/pick-sheet";
import { ProbabilityBar } from "@/components/market-bits";
import { PoweredByPanta } from "@/components/brand";
import { Button, Card, Empty, Pill, Skeleton } from "@/components/ui";

type Catalog = {
  marketId: string;
  title: string | null;
  description: string | null;
  category: string | null;
  image: string | null;
  phase: string | null;
  yes: number | null;
  volumeUsdc: number | null;
  endTime: number | null;
  resolutionTime: number | null;
  onChain: boolean;
  buyable: boolean;
  pantaUrl: string | null;
  resolutionRule: string | null;
  sources: string[];
};

// A Panta catalog market (not created by a Zan creator). Same trade flow,
// attributed to Zan; no creator, so no creator fee line.
export default function CatalogMarket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pick, setPick] = useState<"yes" | "no" | null>(null);
  const q = useQuery({
    queryKey: ["catalog-market", id],
    queryFn: () => api<{ market: Catalog }>(`/api/catalog/${id}`, { auth: false }),
    refetchInterval: 20_000,
  });
  if (q.isLoading) return <Skeleton className="m-4 h-80" />;
  if (q.error || !q.data) return <Empty title="Couldn't load this market" body={(q.error as ApiError | null)?.message} />;
  const m = q.data.market;

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-4">
      {m.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt="" className="aspect-video w-full rounded-3xl object-cover" />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {m.category ? <Pill tone="muted">{m.category}</Pill> : null}
        <Pill tone={m.buyable ? "coral" : "muted"}>{m.buyable ? "Live" : m.phase ?? "Unavailable"}</Pill>
        {!m.onChain ? <Pill tone="warn">Not found on Solana</Pill> : null}
      </div>
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{m.title ?? "Untitled market"}</h1>
      <Card className="flex flex-col gap-3">
        <ProbabilityBar yes={m.yes} />
        <div className="num flex justify-between text-xs text-muted">
          <span>{m.volumeUsdc !== null ? `${usdCompact(m.volumeUsdc)} volume` : ""}</span>
          <span>{m.endTime ? (countdown(m.endTime) === "closed" ? "Closed" : `Closes ${localDateTime(m.endTime)}`) : ""}</span>
        </div>
        <PoweredByPanta />
      </Card>
      {m.description || m.resolutionRule ? (
        <Card className="flex flex-col gap-2 text-sm text-muted">
          <p className="font-semibold text-ink">How this resolves</p>
          <p className="whitespace-pre-wrap">{m.resolutionRule ?? m.description}</p>
          {m.sources.map((s) => (
            <a key={s} href={s} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-coral underline">
              {s}
            </a>
          ))}
        </Card>
      ) : null}
      {m.pantaUrl ? (
        <a href={m.pantaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
          View on panta.market <ExternalLink className="size-3.5" />
        </a>
      ) : null}

      <div className="safe-bottom fixed inset-x-0 bottom-[4.25rem] z-20 border-t border-line/60 bg-bg/95 px-4 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2">
          {m.buyable ? (
            <>
              <Button size="lg" variant="yes" className="flex-1" onClick={() => setPick("yes")}>
                <Check className="size-5" strokeWidth={3} /> YES
              </Button>
              <Button size="lg" variant="no" className="flex-1" onClick={() => setPick("no")}>
                <X className="size-5" strokeWidth={3} /> NO
              </Button>
            </>
          ) : (
            <div className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-line text-sm font-semibold text-muted">Not buyable in the app</div>
          )}
        </div>
      </div>

      <PickSheet
        open={pick !== null}
        onOpenChange={(o) => !o && setPick(null)}
        initialSide={pick ?? "yes"}
        refCode={null}
        target={{ pantaMarketId: m.marketId, question: m.title ?? "Panta market", kind: "panta", buyable: m.buyable, pantaUrl: m.pantaUrl }}
      />
    </div>
  );
}
