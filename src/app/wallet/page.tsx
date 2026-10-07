"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, KeyRound, LogOut, RefreshCw } from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { shortAddr, usd } from "@/lib/format";
import type { BuiltTx, MeView } from "@/lib/types";
import { Button, Card, Empty, Input, Label, Pill, Skeleton } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { TxTimeline } from "@/components/tx-timeline";

type Limits = { dailyLimitUsdc: number; pendingLimitUsdc: number | null; pendingEffectiveAt: string | null; timeoutUntil: string | null; selfExcluded: boolean; spentTodayUsdc: number };

export default function WalletPage() {
  const s = useSession();
  if (!s.authenticated) {
    return <Empty title="Your wallet" body="Sign in with your phone or email. We create a Solana wallet for you; only you can move its funds." action={<Button onClick={s.login}>Sign in</Button>} />;
  }
  if (!s.me) return <Skeleton className="m-4 h-64" />;
  return <WalletInner me={s.me} />;
}

function WalletInner({ me }: { me: MeView }) {
  const s = useSession();
  const run = useTxRunner();
  const wallet = s.activeWallet;
  const bal = useQuery({
    queryKey: ["balance", wallet],
    queryFn: () => api<{ sol: number; usdc: number }>(`/api/wallet/balance?address=${wallet}`),
    enabled: Boolean(wallet),
  });
  const limits = useQuery({ queryKey: ["limits"], queryFn: () => api<Limits>("/api/me/limits") });
  const [qr, setQr] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("");
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [sending, setSending] = useState(false);
  const [newLimit, setNewLimit] = useState("");
  const [handle, setHandle] = useState(me.handle ?? "");

  useEffect(() => {
    if (wallet) QRCode.toDataURL(`solana:${wallet}`, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(null));
  }, [wallet]);

  async function withdraw() {
    if (!wallet) return;
    setSending(true);
    setPhase("preparing");
    try {
      const built = await api<BuiltTx>("/api/wallet/withdraw", { body: { wallet, to: to.trim(), amount: Number(amt) } });
      const res = await run(built, wallet, setPhase);
      if (res.status === "confirmed") {
        toast.success("Sent.");
        setAmt("");
        setTo("");
      } else if (res.status === "failed") toast.error(res.message ?? "Transfer failed.");
      await bal.refetch();
    } catch (e) {
      if (!isUserRejection(e)) toast.error((e as ApiError).message);
    } finally {
      setSending(false);
      setPhase("idle");
    }
  }

  async function limitAction(body: unknown, msg: string) {
    try {
      await api("/api/me/limits", { body });
      toast.success(msg);
      await limits.refetch();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  }

  const l = limits.data;
  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Wallet</h1>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Balance</p>
            <p className="num text-3xl font-black">{bal.data ? usd(bal.data.usdc) : "--"}</p>
            <p className="num text-xs text-muted">{bal.data ? `${bal.data.sol.toFixed(4)} SOL for network fees` : bal.isError ? "Couldn't read balance" : "Loading…"}</p>
          </div>
          <Button variant="ghost" aria-label="Refresh balance" onClick={() => bal.refetch()}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
        {me.wallets.length > 1 ? (
          <select
            className="h-11 rounded-xl border border-line bg-bg px-3 text-sm"
            value={wallet ?? ""}
            onChange={async (e) => {
              const m = await api<MeView>("/api/me", { method: "PATCH", body: { activeWallet: e.target.value } });
              s.setMe(m);
            }}
            aria-label="Active wallet"
          >
            {me.wallets.map((w) => (
              <option key={w.address} value={w.address}>
                {shortAddr(w.address, 6)} ({w.kind === "embedded" ? "Zan wallet" : "connected wallet"})
              </option>
            ))}
          </select>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">Add funds</p>
        <p className="text-sm text-muted">
          Send <b className="text-ink">USDC on Solana</b> to this address from an exchange or a friend, plus about 0.01 SOL for network fees.
        </p>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="Wallet address QR code" width={120} height={120} className="rounded-xl bg-white p-1" /> : <Skeleton className="size-[120px]" />}
          <div className="min-w-0 flex-1">
            <p className="num break-all text-xs">{wallet ?? "Creating your wallet…"}</p>
            {wallet ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(wallet).then(() => toast.success("Address copied."), () => window.prompt("Copy:", wallet))}
              >
                <Copy className="size-3.5" /> Copy address
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted">Only send on the Solana network. Funds sent on other networks can be lost.</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">Cash out</p>
        <p className="text-sm text-muted">Send USDC to an exchange deposit address or a local off-ramp, then withdraw to your bank or mobile money there.</p>
        <Label>To (Solana address)</Label>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient address" autoComplete="off" />
        <Label>Amount (USDC)</Label>
        <Input value={amt} inputMode="decimal" onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" />
        <Button loading={sending} disabled={!(Number(amt) > 0) || to.trim().length < 32 || !wallet} onClick={withdraw}>
          Send {amt ? usd(Number(amt)) : ""}
        </Button>
      </Card>

      <Card className="flex flex-col gap-3" >
        <div className="flex items-center justify-between">
          <p className="font-semibold">Play limits</p>
          {l?.selfExcluded ? <Pill tone="warn">Self-excluded</Pill> : l?.timeoutUntil ? <Pill tone="warn">On a break</Pill> : null}
        </div>
        {l ? (
          <>
            <p className="num text-sm text-muted">
              {usd(l.spentTodayUsdc)} of {usd(l.dailyLimitUsdc)} used today.
              {l.pendingLimitUsdc ? ` Raising to ${usd(l.pendingLimitUsdc)} on ${new Date(l.pendingEffectiveAt!).toLocaleString()}.` : ""}
              {l.timeoutUntil ? ` Break ends ${new Date(l.timeoutUntil).toLocaleString()}.` : ""}
            </p>
            <div className="flex gap-2">
              <Input value={newLimit} inputMode="decimal" onChange={(e) => setNewLimit(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="New daily limit ($)" />
              <Button variant="outline" disabled={!(Number(newLimit) >= 1)} onClick={() => limitAction({ action: "daily", amount: Number(newLimit) }, "Limit updated.")}>
                Set
              </Button>
            </div>
            <p className="text-xs text-muted">Lowering a limit is instant. Raising it takes effect after 24 hours.</p>
            <div className="grid grid-cols-3 gap-2">
              {([24, 168, 720] as const).map((h) => (
                <Button key={h} size="sm" variant="outline" onClick={() => limitAction({ action: "timeout", hours: h }, "Break started.")}>
                  {h === 24 ? "24h break" : h === 168 ? "7 days" : "30 days"}
                </Button>
              ))}
            </div>
            <button
              className="self-start text-xs font-semibold text-danger underline"
              onClick={() => {
                if (window.prompt('Type EXCLUDE to stop real-money picks on this account permanently.') === "EXCLUDE") {
                  void limitAction({ action: "exclude", confirm: "EXCLUDE" }, "Real-money picks are now off for this account.");
                }
              }}
            >
              Exclude myself from real-money picks
            </button>
          </>
        ) : (
          <Skeleton className="h-20" />
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">Profile</p>
        <Label hint="Shown on comments and leaderboards">Handle</Label>
        <div className="flex gap-2">
          <Input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} placeholder="yourname" />
          <Button
            variant="outline"
            onClick={async () => {
              try {
                s.setMe(await api<MeView>("/api/me", { method: "PATCH", body: { handle } }));
                toast.success("Saved.");
              } catch (e) {
                toast.error((e as ApiError).message);
              }
            }}
          >
            Save
          </Button>
        </div>
        {me.role === "creator" ? (
          <Link href="/studio" className="text-sm font-semibold text-coral">
            Open creator studio →
          </Link>
        ) : (
          <Link href="/onboarding" className="text-sm font-semibold text-coral">
            Are you a creator? Set up your page →
          </Link>
        )}
      </Card>

      <div className="flex flex-col gap-2 pb-6">
        {wallet && me.wallets.find((w) => w.address === wallet)?.kind === "embedded" ? (
          <Button variant="outline" onClick={() => s.exportWallet(wallet).catch((e) => toast.error((e as Error).message))}>
            <KeyRound className="size-4" /> Export wallet key
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => s.logout()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <Sheet open={sending} onOpenChange={() => {}} title="Sending USDC" dismissible={false}>
        <TxTimeline phase={phase} />
      </Sheet>
    </div>
  );
}
