"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { toast } from "sonner";
import { ArrowUpRight, AtSign, ChevronDown, Copy, Gauge, KeyRound, LogOut, Plus, RefreshCw, Sparkles, Store, TriangleAlert, Wallet } from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { shortAddr, usd } from "@/lib/format";
import type { BuiltTx, MeView } from "@/lib/types";
import { Button, Empty, IconButton, Input, Label, ListRow, Pill, SectionLabel, Skeleton, cn } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { TxTimeline } from "@/components/tx-timeline";

type Limits = { dailyLimitUsdc: number; pendingLimitUsdc: number | null; pendingEffectiveAt: string | null; timeoutUntil: string | null; selfExcluded: boolean; spentTodayUsdc: number };

export default function WalletPage() {
  const s = useSession();
  if (!s.authenticated) {
    return (
      <Empty
        icon={<Wallet aria-hidden />}
        title="Your wallet"
        body="Sign in with your phone or email. We create a Solana wallet for you; only you can move its funds."
        action={
          <Button size="lg" onClick={s.login}>
            Sign in
          </Button>
        }
      />
    );
  }
  if (!s.me) {
    return (
      <div className="px-4 pt-8" aria-busy>
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="mt-4 h-14 w-52" />
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Skeleton className="h-[52px] rounded-full" />
          <Skeleton className="h-[52px] rounded-full" />
        </div>
      </div>
    );
  }
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
  const [sheet, setSheet] = useState<"add" | "cashout" | "limits" | "handle" | null>(null);

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

  async function saveHandle() {
    try {
      s.setMe(await api<MeView>("/api/me", { method: "PATCH", body: { handle } }));
      toast.success("Saved.");
      setSheet(null);
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  }

  function copyAddress() {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet).then(
      () => toast.success("Address copied."),
      () => window.prompt("Copy:", wallet),
    );
  }

  const close = (open: boolean) => {
    if (!open) setSheet(null);
  };

  const l = limits.data;
  const limitStatus = l?.selfExcluded ? (
    <Pill tone="warn">Self-excluded</Pill>
  ) : l?.timeoutUntil ? (
    <Pill tone="warn">On a break</Pill>
  ) : null;
  const usedPct = l && l.dailyLimitUsdc > 0 ? Math.min(100, (l.spentTodayUsdc / l.dailyLimitUsdc) * 100) : 0;
  const embedded = wallet ? me.wallets.find((w) => w.address === wallet)?.kind === "embedded" : false;

  return (
    <div className="flex flex-col px-4 pb-8">
      <h1 className="sr-only">Wallet</h1>

      {/* Cash App-style balance hero */}
      <section aria-label="Balance" className="pt-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-fg-2">USDC balance</p>
            <p className={cn("num mt-3 truncate text-[56px] font-semibold leading-none tracking-[-0.04em]", !bal.data && "text-fg-3")} aria-live="polite">
              {bal.data ? usd(bal.data.usdc) : "--"}
            </p>
          </div>
          <IconButton label="Refresh balance" variant="secondary" onClick={() => bal.refetch()} disabled={!wallet}>
            <RefreshCw className={cn("size-[18px]", bal.isFetching && "animate-spin")} aria-hidden />
          </IconButton>
        </div>
        <p className="num mt-3 text-[11px] text-fg-3">
          {bal.data ? `${bal.data.sol.toFixed(4)} SOL for network fees` : bal.isError ? "Couldn't read balance" : "Loading…"}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => setSheet("add")}>
            <Plus className="size-[18px]" strokeWidth={2.5} aria-hidden />
            Add money
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setSheet("cashout")}>
            <ArrowUpRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
            Cash out
          </Button>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="wallet-money">
        <SectionLabel>
          <span id="wallet-money">Money</span>
        </SectionLabel>
        <div className="mt-1">
          <ListRow
            icon={<Wallet aria-hidden />}
            label="Wallet address"
            value={
              wallet ? (
                <span className="inline-flex items-center gap-1.5">
                  {shortAddr(wallet)}
                  <Copy className="size-3.5 text-fg-3" aria-hidden />
                </span>
              ) : (
                "Creating…"
              )
            }
            onClick={wallet ? copyAddress : undefined}
            chevron={false}
          />
          {me.wallets.length > 1 ? (
            <label className="flex min-h-12 w-full items-center gap-3 border-b border-hairline py-2">
              <span className="min-w-0 flex-1 text-[15px] text-fg-2">Active wallet</span>
              <span className="relative flex min-w-0 max-w-[65%] items-center">
                <select
                  className="num h-11 w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent pr-6 text-right text-[15px] font-medium text-fg focus:outline-none"
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
                <ChevronDown className="pointer-events-none absolute right-0 size-4 text-fg-3" aria-hidden />
              </span>
            </label>
          ) : null}
          <ListRow
            icon={<Gauge aria-hidden />}
            label="Play limits"
            sub={l ? <span className="num">{`${usd(l.spentTodayUsdc)} of ${usd(l.dailyLimitUsdc)} used today`}</span> : undefined}
            value={limitStatus ?? undefined}
            onClick={() => setSheet("limits")}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="wallet-profile">
        <SectionLabel>
          <span id="wallet-profile">Profile</span>
        </SectionLabel>
        <div className="mt-1">
          <ListRow icon={<AtSign aria-hidden />} label="Handle" value={me.handle ? `@${me.handle}` : "Add one"} onClick={() => setSheet("handle")} />
          {me.role === "creator" ? (
            <ListRow icon={<Store aria-hidden />} label="Creator studio" href="/studio" />
          ) : (
            <ListRow icon={<Sparkles aria-hidden />} label="Set up your creator page" sub="Are you a creator?" href="/onboarding" />
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="wallet-account">
        <SectionLabel>
          <span id="wallet-account">Account</span>
        </SectionLabel>
        <div className="mt-1">
          {wallet && embedded ? (
            <ListRow icon={<KeyRound aria-hidden />} label="Export wallet key" onClick={() => s.exportWallet(wallet).catch((e) => toast.error((e as Error).message))} />
          ) : null}
          <ListRow icon={<LogOut aria-hidden />} label="Sign out" tone="danger" chevron={false} onClick={() => s.logout()} />
        </div>
      </section>

      {/* Add money: address, QR and network warning */}
      <Sheet open={sheet === "add"} onOpenChange={close} title="Add money">
        <div className="flex flex-col items-center gap-5">
          <p className="w-full text-[15px] leading-[1.45] text-fg-2">
            Send <b className="font-semibold text-fg">USDC on Solana</b> to this address from an exchange or a friend, plus about 0.01 SOL for network fees.
          </p>
          <div className="rounded-[28px] bg-white p-3">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Wallet address QR code" width={200} height={200} className="block size-[200px]" />
            ) : (
              <div className="size-[200px] animate-pulse rounded-2xl bg-black/10" aria-hidden />
            )}
          </div>
          <div className="w-full rounded-2xl bg-card px-4 py-3.5">
            <p className="text-[13px] text-fg-3">Your Solana address</p>
            <p className="num mt-1 break-all font-mono text-[14px] leading-[1.5] text-fg">{wallet ?? "Creating your wallet…"}</p>
          </div>
          {wallet ? (
            <Button size="lg" className="w-full" onClick={copyAddress}>
              <Copy className="size-4" aria-hidden /> Copy address
            </Button>
          ) : null}
          <p role="note" className="flex w-full items-start gap-3 rounded-2xl bg-warn/10 px-4 py-3.5 text-[13px] leading-[1.45] text-warn">
            <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
            <span>Only send on the Solana network. Funds sent on other networks can be lost.</span>
          </p>
        </div>
      </Sheet>

      {/* Cash out: recipient, amount, send */}
      <Sheet
        open={sheet === "cashout"}
        onOpenChange={close}
        title="Cash out"
        description="Send USDC to an exchange deposit address or a local off-ramp, then withdraw to your bank or mobile money there."
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cashout-to">To (Solana address)</Label>
            <Input id="cashout-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient address" autoComplete="off" spellCheck={false} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cashout-amount" hint={bal.data ? <span className="num">Balance {usd(bal.data.usdc)}</span> : undefined}>
              Amount (USDC)
            </Label>
            <Input
              id="cashout-amount"
              className="num h-14 text-[22px] font-semibold"
              value={amt}
              inputMode="decimal"
              onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
            />
          </div>
          <Button
            size="lg"
            className="mt-1 w-full"
            loading={sending}
            disabled={!(Number(amt) > 0) || to.trim().length < 32 || !wallet}
            onClick={() => {
              setSheet(null);
              void withdraw();
            }}
          >
            <span className="num">Send {amt ? usd(Number(amt)) : ""}</span>
          </Button>
        </div>
      </Sheet>

      {/* Play limits: daily limit, breaks, self-exclusion */}
      <Sheet open={sheet === "limits"} onOpenChange={close} title="Play limits" description="Lowering a limit is instant. Raising it takes effect after 24 hours.">
        {l ? (
          <div className="flex flex-col gap-7">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-fg-2">Used today</p>
                {limitStatus}
              </div>
              <p className="num mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em]">
                {usd(l.spentTodayUsdc)} <span className="text-[17px] font-medium text-fg-3">of {usd(l.dailyLimitUsdc)}</span>
              </p>
              <div
                className="mt-3 h-1 overflow-hidden rounded-full bg-card"
                role="progressbar"
                aria-label="Daily limit used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(usedPct)}
              >
                <div className="h-full rounded-full bg-fg" style={{ width: `${usedPct}%` }} />
              </div>
              {l.pendingLimitUsdc || l.timeoutUntil ? (
                <p className="num mt-3 text-[13px] leading-[1.45] text-fg-2">
                  {l.pendingLimitUsdc ? `Raising to ${usd(l.pendingLimitUsdc)} on ${new Date(l.pendingEffectiveAt!).toLocaleString()}.` : ""}
                  {l.pendingLimitUsdc && l.timeoutUntil ? " " : ""}
                  {l.timeoutUntil ? `Break ends ${new Date(l.timeoutUntil).toLocaleString()}.` : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="daily-limit">Daily limit</Label>
              <div className="flex gap-2">
                <Input
                  id="daily-limit"
                  className="num"
                  value={newLimit}
                  inputMode="decimal"
                  onChange={(e) => setNewLimit(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="New daily limit ($)"
                />
                <Button
                  variant="secondary"
                  className="h-12 shrink-0"
                  disabled={!(Number(newLimit) >= 1)}
                  onClick={() => limitAction({ action: "daily", amount: Number(newLimit) }, "Limit updated.")}
                >
                  Set
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <SectionLabel as="h3">Take a break</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {([24, 168, 720] as const).map((h) => (
                  <Button key={h} variant="secondary" onClick={() => limitAction({ action: "timeout", hours: h }, "Break started.")}>
                    {h === 24 ? "24h break" : h === 168 ? "7 days" : "30 days"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-hairline pt-5">
              <Button
                variant="danger"
                className="w-full"
                onClick={() => {
                  if (window.prompt("Type EXCLUDE to stop real-money picks on this account permanently.") === "EXCLUDE") {
                    void limitAction({ action: "exclude", confirm: "EXCLUDE" }, "Real-money picks are now off for this account.");
                  }
                }}
              >
                Exclude myself from real-money picks
              </Button>
              <p className="text-center text-[11px] text-fg-3">This is permanent for this account.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3" aria-busy>
            <Skeleton className="h-16" />
            <Skeleton className="h-12" />
            <Skeleton className="h-11" />
          </div>
        )}
      </Sheet>

      {/* Profile handle */}
      <Sheet open={sheet === "handle"} onOpenChange={close} title="Profile">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-handle" hint="Shown on comments and leaderboards">
              Handle
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-fg-3" aria-hidden>
                @
              </span>
              <Input
                id="profile-handle"
                className="pl-9"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="yourname"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <Button size="lg" className="w-full" onClick={saveHandle}>
            Save
          </Button>
        </div>
      </Sheet>

      <Sheet open={sending} onOpenChange={() => {}} title="Sending USDC" dismissible={false}>
        <TxTimeline phase={phase} />
      </Sheet>
    </div>
  );
}
