"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ExternalLink, X } from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { DEFAULT_STAKE, MAX_SINGLE_STAKE, STAKE_PRESETS } from "@/lib/config";
import { usd } from "@/lib/format";
import { errorMessage } from "@/lib/panta/errors";
import type { BuiltTx, MeView, SubmitResult } from "@/lib/types";
import { Sheet } from "./sheet";
import { TxTimeline } from "./tx-timeline";
import { PoweredByPanta } from "./brand";
import { Button, Checkbox, Input, cn } from "./ui";

export type PickTarget = {
  slug?: string;
  pantaMarketId?: string;
  question: string;
  creatorHandle?: string;
  kind: "panta" | "forecast";
  buyable: boolean;
  pantaUrl: string | null;
};

type Quote = {
  intentId: string;
  side: "yes" | "no";
  amountUsdc: number;
  shares: number;
  avgPrice: number | null;
  feeUsdc: number | null;
  expiresAt: string | null;
  receivedAt: number;
};

type Step = "amount" | "age" | "fund" | "free" | "review" | "running" | "done" | "error";

export function PickSheet({
  open,
  onOpenChange,
  target,
  initialSide,
  refCode,
  onPicked,
  onShare,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: PickTarget;
  initialSide: "yes" | "no";
  refCode: string | null;
  onPicked?: (r: { side: "yes" | "no"; free: boolean }) => void;
  onShare?: (side: "yes" | "no") => void;
}) {
  const s = useSession();
  const run = useTxRunner();
  const [side, setSide] = useState<"yes" | "no">(initialSide);
  const [amount, setAmount] = useState<number>(DEFAULT_STAKE);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState<Step>("amount");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over18, setOver18] = useState(false);
  const [balance, setBalance] = useState<{ sol: number; usdc: number } | null>(null);
  const pendingContinue = useRef(false);

  useEffect(() => {
    if (open) {
      setSide(initialSide);
      setStep(target.kind === "forecast" ? "free" : "amount");
      setQuote(null);
      setResult(null);
      setError(null);
      setPhase("idle");
    }
  }, [open, initialSide, target.kind]);

  // Resume after the login modal closes.
  useEffect(() => {
    if (pendingContinue.current && s.authenticated && s.me) {
      pendingContinue.current = false;
      void next(s.me);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.authenticated, s.me]);

  const wallet = s.activeWallet;

  async function next(me: MeView | null = s.me) {
    setError(null);
    if (!s.configured) return setError(errorMessage("AUTH_NOT_CONFIGURED"));
    if (!s.authenticated || !me) {
      pendingContinue.current = true;
      s.login();
      return;
    }
    if (target.kind === "forecast" || !me.realMoneyRegion) return setStep("free");
    if (!target.buyable) return setError(errorMessage("MARKET_NOT_IN_PRIMARY"));
    if (!me.ageAttested) return setStep("age");
    if (!wallet) return setError("Your wallet is still being created. Try again in a few seconds.");
    setBusy(true);
    try {
      const bal = await api<{ sol: number; usdc: number }>(`/api/wallet/balance?address=${wallet}`);
      setBalance(bal);
      if (bal.usdc < amount || bal.sol < 0.003) {
        setStep("fund");
        return;
      }
      await getQuote();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function getQuote() {
    const q = await api<Omit<Quote, "receivedAt">>("/api/trade/quote", {
      body: { slug: target.slug, pantaMarketId: target.pantaMarketId, side, amount, wallet, ref: refCode ?? undefined },
    });
    setQuote({ ...q, receivedAt: Date.now() });
    setStep("review");
  }

  async function confirm() {
    if (!quote || !wallet) return;
    setError(null);
    setStep("running");
    setPhase("preparing");
    try {
      let q = quote;
      if (Date.now() - q.receivedAt > 75_000) {
        // Panta quotes live ~90s; refresh silently before building.
        const fresh = await api<Omit<Quote, "receivedAt">>("/api/trade/quote", {
          body: { slug: target.slug, pantaMarketId: target.pantaMarketId, side, amount, wallet, ref: refCode ?? undefined },
        });
        q = { ...fresh, receivedAt: Date.now() };
        setQuote(q);
      }
      const built = await api<BuiltTx>("/api/trade/build", { body: { intentId: q.intentId } });
      const res = await run(built, wallet, setPhase);
      setResult(res);
      if (res.status === "failed") {
        setError(res.message ?? errorMessage("TX_FAILED"));
        setStep("error");
      } else {
        setStep("done");
        onPicked?.({ side, free: false });
      }
    } catch (e) {
      if (isUserRejection(e)) {
        setStep("review");
        setPhase("idle");
        return;
      }
      const err = e as ApiError;
      if (err.code === "QUOTE_STALE" || err.code === "QUOTE_EXPIRED") {
        toast.message("The price moved. Here's a fresh one.");
        try {
          await getQuote();
          return;
        } catch {
          /* fall through */
        }
      }
      setError(err.message ?? "Something went wrong.");
      setStep("error");
    }
  }

  async function confirmAge() {
    setBusy(true);
    try {
      const me = await api<MeView>("/api/me/eligibility", { body: { over18: true } });
      s.setMe(me);
      setStep("amount");
      await next(me);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function freeCall(chosen: "yes" | "no") {
    if (!target.slug) return setError("Free calls aren't available on this market.");
    if (!s.authenticated) {
      s.login();
      return;
    }
    setBusy(true);
    try {
      await api(`/api/markets/${target.slug}/forecast`, { body: { side: chosen } });
      setSide(chosen);
      setStep("done");
      onPicked?.({ side: chosen, free: true });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  const title =
    step === "done" ? "You're in" : step === "free" ? "Make your call" : step === "running" ? "Placing your pick" : `Back ${side.toUpperCase()}`;

  return (
    <Sheet open={open} onOpenChange={(o) => (step === "running" ? null : onOpenChange(o))} title={title} description={target.question} dismissible={step !== "running"}>
      {step === "amount" ? (
        <div className="flex flex-col gap-4">
          <SideToggle side={side} onChange={setSide} />
          <div>
            <p className="mb-2 text-sm font-semibold">How much?</p>
            <div className="grid grid-cols-4 gap-2">
              {STAKE_PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setAmount(v);
                    setCustom("");
                  }}
                  className={cn("num h-12 rounded-2xl border text-base font-bold", amount === v && !custom ? "border-coral bg-coral/15 text-ink" : "border-line bg-bg text-muted")}
                >
                  ${v}
                </button>
              ))}
              <Input
                inputMode="decimal"
                placeholder="Other"
                aria-label="Custom amount in dollars"
                value={custom}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setCustom(v);
                  const n = Number(v);
                  if (n > 0) setAmount(Math.min(n, MAX_SINGLE_STAKE));
                }}
                className="num h-12 text-center"
              />
            </div>
            <p className="mt-2 text-xs text-muted">Paid in USDC (digital dollars). Small amounts are the point here.</p>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button size="lg" variant={side} loading={busy} onClick={() => next()} disabled={!(amount >= 1)}>
            Review {usd(amount)} on {side.toUpperCase()}
          </Button>
          <PoweredByPanta className="self-center" />
        </div>
      ) : null}

      {step === "age" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">Real-money picks are for adults only. Confirm once and you&apos;re set.</p>
          <Checkbox checked={over18} onChange={setOver18}>
            I&apos;m 18 or older and allowed to make real-money predictions where I live.
          </Checkbox>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button size="lg" loading={busy} disabled={!over18} onClick={confirmAge}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === "fund" && balance ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Your wallet has <span className="num font-bold">{usd(balance.usdc)}</span> USDC
            {balance.sol < 0.003 ? " and needs a little SOL (about $0.50) for network fees" : ""}.
          </p>
          {balance.usdc < amount ? (
            <p className="text-sm text-muted">
              Add at least <span className="num font-semibold text-ink">{usd(amount - balance.usdc)}</span> USDC to make this pick.
            </p>
          ) : null}
          <Link href="/wallet" className="inline-flex h-12 items-center justify-center rounded-2xl bg-coral font-semibold text-coral-ink">
            Add funds
          </Link>
          <Button variant="outline" loading={busy} onClick={() => next()}>
            I&apos;ve added funds
          </Button>
        </div>
      ) : null}

      {step === "free" ? (
        <div className="flex flex-col gap-4">
          {target.kind === "forecast" ? (
            <p className="text-sm text-muted">This is a free call: no money, no prizes. Your call counts toward your accuracy with @{target.creatorHandle}.</p>
          ) : (
            <p className="text-sm text-muted">Real-money picks aren&apos;t available in your region. Make a free call instead; it counts toward your accuracy.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" variant="yes" loading={busy && side === "yes"} onClick={() => freeCall("yes")}>
              <Check className="size-5" /> YES
            </Button>
            <Button size="lg" variant="no" loading={busy && side === "no"} onClick={() => freeCall("no")}>
              <X className="size-5" /> NO
            </Button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      ) : null}

      {step === "review" && quote ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-bg p-4">
            <p className="num text-lg font-bold">
              Put in {usd(quote.amountUsdc)} → about {usd(quote.shares, 2)} back if {side.toUpperCase()} wins
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
              <li>If {side === "yes" ? "NO" : "YES"} wins, you lose your {usd(quote.amountUsdc)}.</li>
              {quote.feeUsdc !== null ? <li className="num">Includes a {usd(quote.feeUsdc)} trading fee.</li> : null}
              <li>The price can move up to 1% before it confirms.</li>
              <li>You hold until the result. There&apos;s no early cash-out in this app.</li>
              {target.creatorHandle ? <li>@{target.creatorHandle} earns a share of trading fees from this market.</li> : null}
            </ul>
            <p className="mt-3 text-xs text-muted">Estimate from Panta. The final payout is set when Panta resolves the market.</p>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button size="lg" variant={side} onClick={confirm}>
            Confirm {usd(quote.amountUsdc)} on {side.toUpperCase()}
          </Button>
          <button className="text-sm font-semibold text-muted" onClick={() => setStep("amount")}>
            Change amount
          </button>
          <PoweredByPanta className="self-center" />
        </div>
      ) : null}

      {step === "running" ? (
        <div className="flex flex-col gap-4">
          <TxTimeline phase={phase} />
          <p className="text-xs text-muted">Keep this open. It usually takes a few seconds.</p>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className={cn("inline-flex size-14 items-center justify-center rounded-full", side === "yes" ? "bg-yes text-yes-ink" : "bg-no text-no-ink")}>
            <Check className="size-7" strokeWidth={3} />
          </span>
          {result ? (
            <p className="num text-lg font-bold">
              You hold about {quote ? quote.shares.toFixed(2) : ""} {side.toUpperCase()}
            </p>
          ) : (
            <p className="text-lg font-bold">You called {side.toUpperCase()}</p>
          )}
          <p className="text-sm text-muted">We&apos;ll let you know when it resolves.</p>
          {onShare ? (
            <Button className="w-full" onClick={() => onShare(side)}>
              Share my pick
            </Button>
          ) : null}
          {result?.explorerUrl ? (
            <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
              View on Solscan <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}

      {step === "error" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-danger">{error}</p>
          {result?.explorerUrl ? (
            <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-muted underline">
              View transaction
            </a>
          ) : null}
          {target.pantaUrl && error === errorMessage("MARKET_NOT_IN_PRIMARY") ? (
            <a href={target.pantaUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-coral underline">
              Open on panta.market
            </a>
          ) : null}
          <Button variant="outline" onClick={() => setStep("amount")}>
            Try again
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function SideToggle({ side, onChange }: { side: "yes" | "no"; onChange: (s: "yes" | "no") => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Side">
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          role="radio"
          aria-checked={side === v}
          onClick={() => onChange(v)}
          className={cn(
            "flex h-12 items-center justify-center gap-1.5 rounded-2xl border text-base font-bold",
            side === v ? (v === "yes" ? "border-yes bg-yes/15 text-yes" : "border-no bg-no/15 text-no") : "border-line bg-bg text-muted",
          )}
        >
          {v === "yes" ? <Check className="size-4" /> : <X className="size-4" />} {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
