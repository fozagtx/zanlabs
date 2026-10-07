"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import { SHARE_CHANNELS, type ShareChannel } from "@/lib/config";
import { usd } from "@/lib/format";
import { PoweredByPanta } from "@/components/brand";
import { Card, Skeleton } from "@/components/ui";

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

// Public, honest traction. Real activity only; team wallets excluded.
export default function Traction() {
  const q = useQuery({ queryKey: ["traction"], queryFn: () => api<T>("/api/traction", { auth: false }), refetchInterval: 60_000 });
  if (!q.data) return <Skeleton className="m-4 h-96" />;
  const t = q.data;
  const tiles: [string, string][] = [
    ["Creators with calls", String(t.creatorsWithMarkets)],
    ["Live markets", String(t.liveMarkets)],
    ["Markets created", String(t.totalMarkets)],
    ["Fan picks", String(t.buys)],
    ["Unique funded wallets", String(t.uniqueFundedWallets)],
    ["Repeat traders", String(t.repeatTraders)],
    ["Picked volume", usd(t.buyVolumeUsdc)],
    ["Free calls", String(t.freeCalls)],
  ];
  return (
    <div className="flex flex-col gap-4 px-4 pb-10 pt-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Traction</h1>
        <p className="text-sm text-muted">Live numbers from the app database. Team and test wallets are excluded. No seeded data.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-3">
            <p className="num text-xl font-black">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>
      <Card className="flex flex-col gap-2">
        <p className="font-semibold">Picks by share channel</p>
        {t.tradesByChannel.length ? (
          t.tradesByChannel.map((c) => (
            <p key={c.channel} className="num flex justify-between text-sm">
              <span>{SHARE_CHANNELS[c.channel as ShareChannel] ?? (c.channel === "direct" ? "Direct" : c.channel)}</span>
              <span>{c.trades}</span>
            </p>
          ))
        ) : (
          <p className="text-sm text-muted">No picks yet.</p>
        )}
      </Card>
      <Card className="flex flex-col gap-1">
        <p className="font-semibold">Verified by Panta attribution</p>
        {t.panta ? (
          <>
            <p className="num text-sm">Attributed volume: {t.panta.attributedVolumeUsdc !== null ? usd(t.panta.attributedVolumeUsdc) : "--"}</p>
            <p className="num text-sm">Attributed trades: {t.panta.attributedTrades ?? "--"}</p>
            <p className="num text-sm">Markets created via API: {t.panta.marketsCreated ?? "--"}</p>
          </>
        ) : (
          <p className="text-sm text-muted">Panta account metrics aren&apos;t available right now.</p>
        )}
        <PoweredByPanta className="mt-1" />
      </Card>
      <p className="text-xs text-muted">Updated {new Date(t.generatedAt * 1000).toLocaleString()}</p>
    </div>
  );
}
