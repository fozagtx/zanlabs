"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { countdown, usdCompact } from "@/lib/format";
import { PickSheet } from "@/components/pick-sheet";
import { ChanceHero } from "@/components/market-bits";
import { BackButton, Dot, PageHeader, RuleRow, SourceRow, StickyBar, When } from "@/components/market-view";
import { PoweredByPanta } from "@/components/brand";
import { Empty, ListRow, Pill, SectionLabel, Skeleton, TradeButton } from "@/components/ui";

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
  zanSlug: string | null;
};

function Header({ pantaUrl }: { pantaUrl?: string | null }) {
  return (
    <PageHeader>
      <BackButton />
      <span className="min-w-0 flex-1 truncate pl-1 text-[15px] font-semibold">Panta market</span>
      {pantaUrl ? (
        <a
          href={pantaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on panta.market"
          title="View on panta.market"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg transition-[scale,background-color] duration-[120ms] ease-out hover:bg-card active:scale-[0.97]"
        >
          <ExternalLink className="size-5" aria-hidden />
        </a>
      ) : null}
    </PageHeader>
  );
}

// A Panta catalog market (not created by a Zan creator). Same trade flow,
// attributed to Zan; no creator, so no creator fee line.
export default function CatalogMarket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [pick, setPick] = useState<"yes" | "no" | null>(null);
  const q = useQuery({
    queryKey: ["catalog-market", id],
    queryFn: () => api<{ market: Catalog }>(`/api/catalog/${id}`, { auth: false }),
    refetchInterval: 20_000,
  });
  // Creator markets live on their own page (creator, social layer, integrity checks).
  const zanSlug = q.data?.market.zanSlug;
  useEffect(() => {
    if (zanSlug) router.replace(`/m/${zanSlug}`);
  }, [zanSlug, router]);
  if (q.isLoading || zanSlug) {
    return (
      <div className="flex flex-col">
        <Header />
        <div className="flex flex-col gap-4 px-4 pt-3" aria-busy>
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-48" />
          <Skeleton className="h-40 w-full" />
          <span className="sr-only">Loading market</span>
        </div>
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div className="flex flex-col">
        <Header />
        <Empty title="Couldn't load this market" body={(q.error as ApiError | null)?.message} />
      </div>
    );
  }
  const m = q.data.market;
  const closed = m.endTime ? countdown(m.endTime) === "closed" : false;

  return (
    <div className="flex flex-col">
      <Header pantaUrl={m.pantaUrl} />

      {m.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.image} alt="" className="aspect-[16/9] w-full bg-card object-cover" />
      ) : null}

      <div className="flex flex-col px-4 pb-28 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={m.buyable ? "coral" : "muted"}>
            {m.buyable ? <span className="size-1.5 rounded-full bg-fg" aria-hidden /> : null}
            {m.buyable ? "Live" : (m.phase ?? "Unavailable")}
          </Pill>
          {m.category ? (
            <Pill tone="muted" className="capitalize">
              {m.category}
            </Pill>
          ) : null}
          {!m.onChain ? <Pill tone="warn">Not found on Solana</Pill> : null}
        </div>

        <h1 className="mt-3 text-[27px] font-bold leading-[1.15] tracking-[-0.02em]">{m.title ?? "Untitled market"}</h1>

        <section aria-label="Chance" className="mt-6">
          <ChanceHero yes={m.yes} />
        </section>

        <p className="num mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-2">
          {m.volumeUsdc !== null ? <span>{usdCompact(m.volumeUsdc)} volume</span> : null}
          {m.volumeUsdc !== null && m.endTime ? <Dot /> : null}
          {m.endTime ? (
            <span suppressHydrationWarning>
              {closed ? "Closed" : "Closes"} {new Date(m.endTime * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            </span>
          ) : null}
        </p>
        <p className="mt-1.5 text-[11px] text-fg-3">
          <PoweredByPanta className="text-[11px]" />
        </p>

        <section aria-labelledby="resolves-h" className="mt-8">
          <SectionLabel>
            <span id="resolves-h">How this resolves</span>
          </SectionLabel>
          <div className="mt-1">
            {m.resolutionRule || m.description ? <RuleRow text={m.resolutionRule || m.description || ""} /> : null}
            {m.sources.map((s) => (
              <SourceRow key={s} href={s} />
            ))}
            {m.endTime ? <ListRow label="Trading closes" value={<When sec={m.endTime} />} /> : null}
            {m.resolutionTime ? <ListRow label="Result expected" value={<When sec={m.resolutionTime} />} /> : null}
            <ListRow label="Who resolves" value="Panta resolver" />
            {m.pantaUrl ? <ListRow label="View on panta.market" href={m.pantaUrl} icon={<ExternalLink aria-hidden />} chevron={false} /> : null}
          </div>
        </section>
      </div>

      <StickyBar>
        {m.buyable ? (
          <>
            <TradeButton side="yes" size="lg" pct={m.yes} onClick={() => setPick("yes")} />
            <TradeButton side="no" size="lg" pct={m.yes === null ? null : 1 - m.yes} onClick={() => setPick("no")} />
          </>
        ) : (
          <div className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-card px-4 text-[15px] font-semibold text-fg-2">Not buyable in the app</div>
        )}
      </StickyBar>

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
