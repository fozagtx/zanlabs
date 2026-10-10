"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import { SHARE_CHANNELS, type ShareChannel } from "@/lib/config";
import { usd } from "@/lib/format";
import { PoweredByPanta } from "@/components/brand";
import { ListRow, SectionLabel, Skeleton, StatRow } from "@/components/ui";

type T = {
  creatorsWithMarkets: number;
  liveMarkets: number;
  totalMarkets: number;
  buys: number;
  uniqueFundedWallets: number;
  repeatTraders: number;
  buyVolumeUsdc: number;
  freeCalls: number;
  tradesByChannel: { channel: string; trades: number }[];
  panta: { attributedVolumeUsdc: number | null; attributedTrades: number | null; marketsCreated: number | null } | null;
  generatedAt: number;
};

const n = (v: number) => v.toLocaleString("en-US");

// Public, honest traction. Real activity only; team wallets excluded.
export default function Traction() {
  const q = useQuery({ queryKey: ["traction"], queryFn: () => api<T>("/api/traction", { auth: false }), refetchInterval: 60_000 });
  if (!q.data) {
    return (
      <div className="px-4 pt-6" aria-busy>
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="mt-8 h-4 w-32 rounded-full" />
        <Skeleton className="mt-3 h-14 w-56" />
        <Skeleton className="mt-8 h-16 w-full" />
        <Skeleton className="mt-8 h-40 w-full" />
      </div>
    );
  }
  const t = q.data;
  return (
    <div className="flex flex-col px-4 pb-10 pt-6">
      <header>
        <h1 className="text-[22px] font-bold tracking-[-0.01em]">Traction</h1>
        <p className="mt-1 text-[13px] leading-[1.45] text-fg-2">Live numbers from the app database. Team and test wallets are excluded. No seeded data.</p>
      </header>

      {/* Robinhood-style hero: one big number */}
      <section className="mt-8" aria-label="Picked volume">
        <p className="text-[13px] font-semibold text-fg-2">Picked volume</p>
        <p className="num mt-3 text-[56px] font-semibold leading-none tracking-[-0.04em]">{usd(t.buyVolumeUsdc)}</p>
      </section>

      <StatRow
        className="mt-8 border-y border-hairline py-3"
        items={[
          { label: "Fan picks", value: n(t.buys) },
          { label: "Unique funded wallets", value: n(t.uniqueFundedWallets) },
          { label: "Repeat traders", value: n(t.repeatTraders) },
        ]}
      />
      <StatRow
        className="border-b border-hairline py-3"
        items={[
          { label: "Creators with calls", value: n(t.creatorsWithMarkets) },
          { label: "Live markets", value: n(t.liveMarkets) },
          { label: "Markets created", value: n(t.totalMarkets) },
          { label: "Free calls", value: n(t.freeCalls) },
        ]}
      />

      <section className="mt-8" aria-labelledby="traction-channels">
        <SectionLabel>
          <span id="traction-channels">Picks by share channel</span>
        </SectionLabel>
        <div className="mt-1">
          {t.tradesByChannel.length ? (
            t.tradesByChannel.map((c) => (
              <ListRow
                key={c.channel}
                label={SHARE_CHANNELS[c.channel as ShareChannel] ?? (c.channel === "direct" ? "Direct" : c.channel)}
                value={n(c.trades)}
              />
            ))
          ) : (
            <ListRow label={<span className="text-fg-3">No picks yet.</span>} />
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="traction-panta">
        <SectionLabel action={<PoweredByPanta className="inline-flex min-h-11 items-center" />}>
          <span id="traction-panta">Verified by Panta attribution</span>
        </SectionLabel>
        <div className="mt-1">
          {t.panta ? (
            <>
              <ListRow label="Attributed volume" value={t.panta.attributedVolumeUsdc !== null ? usd(t.panta.attributedVolumeUsdc) : "--"} />
              <ListRow label="Attributed trades" value={t.panta.attributedTrades !== null ? n(t.panta.attributedTrades) : "--"} />
              <ListRow label="Markets created via API" value={t.panta.marketsCreated !== null ? n(t.panta.marketsCreated) : "--"} />
            </>
          ) : (
            <ListRow label={<span className="text-fg-3">Panta account metrics aren&apos;t available right now.</span>} />
          )}
        </div>
      </section>

      <p className="num mt-8 text-[11px] text-fg-3">Updated {new Date(t.generatedAt * 1000).toLocaleString()}</p>
    </div>
  );
}
