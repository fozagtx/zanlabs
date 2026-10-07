"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/client/api";
import { CATEGORIES } from "@/lib/config";
import { countdown, usdCompact } from "@/lib/format";
import type { CatalogMarket } from "@/lib/types";
import { PoweredByPanta } from "@/components/brand";
import { Button, Empty, Skeleton, cn } from "@/components/ui";

// Market discovery across Panta's live catalog (primary phase only, since
// that's what the API can buy). List rows have no prices by Panta's design;
// open a market to see live odds.
export default function Explore() {
  const [category, setCategory] = useState<string>("");
  const q = useInfiniteQuery({
    queryKey: ["catalog", category],
    queryFn: ({ pageParam }) =>
      api<{ items: CatalogMarket[]; nextCursor: string | null }>(
        `/api/catalog?${new URLSearchParams({ ...(category ? { category } : {}), ...(pageParam ? { cursor: pageParam } : {}) })}`,
        { auth: false },
      ),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const err = q.error as ApiError | null;

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Explore</h1>
        <p className="text-sm text-muted">Live markets across Panta. Creator calls live on your home feed.</p>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {["", ...CATEGORIES].map((c) => (
          <button
            key={c || "all"}
            onClick={() => setCategory(c)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold capitalize",
              category === c ? "border-coral bg-coral/15 text-ink" : "border-line text-muted",
            )}
          >
            {c || "All"}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : err ? (
        <Empty title="Explore isn't available right now" body={err.message} />
      ) : items.length ? (
        <ul className="flex flex-col gap-3">
          {items.map((m) => (
            <li key={m.marketId}>
              <Link href={`/x/${m.marketId}`} className="flex gap-3 rounded-2xl border border-line bg-surface p-3 hover:bg-surface-2">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" className="size-16 shrink-0 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <span className="size-16 shrink-0 rounded-xl bg-surface-2" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-semibold leading-snug">{m.title ?? "Untitled market"}</span>
                  <span className="num mt-1 flex flex-wrap gap-x-3 text-xs capitalize text-muted">
                    {m.category ? <span>{m.category}</span> : null}
                    {m.volumeUsdc !== null ? <span>{usdCompact(m.volumeUsdc)} volume</span> : null}
                    {m.endTime ? <span>{countdown(m.endTime) === "closed" ? "closed" : `closes in ${countdown(m.endTime)}`}</span> : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No live markets in this category" />
      )}

      {q.hasNextPage ? (
        <Button variant="outline" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
          Load more
        </Button>
      ) : null}
      <PoweredByPanta className="self-center pb-4" />
    </div>
  );
}
