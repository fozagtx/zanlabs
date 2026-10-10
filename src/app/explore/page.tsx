"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
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
    <div className="flex flex-col pb-8">
      <header className="px-4 pt-6">
        <h1 className="text-[22px] font-bold tracking-[-0.01em]">Explore</h1>
        <p className="mt-1 text-[13px] leading-[1.45] text-fg-2">Live markets across Panta. Creator calls live on your home feed.</p>
      </header>

      {/* Category chips: sticky under the top bar so the filter stays in reach while scrolling. */}
      <div className="sticky top-[var(--top-bar-h)] z-10 mt-3 bg-canvas/90 backdrop-blur-xl">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4" role="group" aria-label="Category">
          {["", ...CATEGORIES].map((c) => {
            const active = category === c;
            return (
              <button
                key={c || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className="group inline-flex h-11 shrink-0 items-center"
              >
                <span
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold capitalize transition-[scale,background-color,color] duration-[120ms] ease-out group-active:scale-[0.97]",
                    active ? "bg-fg text-canvas" : "bg-card text-fg-2 group-hover:text-fg",
                  )}
                >
                  {c || "All"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {q.isLoading ? (
          <ul className="mt-1" aria-busy>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-3 border-b border-hairline py-3 last:border-b-0">
                <Skeleton className="size-14 shrink-0 rounded-[14px]" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="mt-2 h-4 w-3/5 rounded-full" />
                  <Skeleton className="mt-2 h-3 w-2/5 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : err ? (
          <Empty icon={<Compass aria-hidden />} title="Explore isn't available right now" body={err.message} />
        ) : items.length ? (
          <ul className="mt-1">
            {items.map((m) => {
              const left = m.endTime ? countdown(m.endTime) : null;
              const meta = [
                m.category ? <span key="c" className="capitalize">{m.category}</span> : null,
                m.volumeUsdc !== null ? <span key="v">{usdCompact(m.volumeUsdc)} volume</span> : null,
                left ? <span key="t">{left === "closed" ? "Closed" : `Closes in ${left}`}</span> : null,
              ].filter(Boolean);
              return (
                <li key={m.marketId} className="border-b border-hairline last:border-b-0">
                  <Link href={`/x/${m.marketId}`} className="flex items-center gap-3 py-3 transition-opacity active:opacity-60">
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image} alt="" className="size-14 shrink-0 rounded-[14px] bg-card object-cover" loading="lazy" />
                    ) : (
                      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-card text-fg-3" aria-hidden>
                        <Compass className="size-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[15px] font-semibold leading-[1.35]">{m.title ?? "Untitled market"}</span>
                      {meta.length ? (
                        <span className="num mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-fg-2">
                          {meta.map((node, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5">
                              {i > 0 ? (
                                <span className="text-fg-3" aria-hidden>
                                  ·
                                </span>
                              ) : null}
                              {node}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon={<Compass aria-hidden />} title="No live markets in this category" />
        )}

        {q.hasNextPage ? (
          <Button variant="secondary" size="lg" className="mt-4 w-full" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            Load more
          </Button>
        ) : null}
        <div className="mt-6 flex justify-center">
          <PoweredByPanta className="inline-flex min-h-11 items-center" />
        </div>
      </div>
    </div>
  );
}
