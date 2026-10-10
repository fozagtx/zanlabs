"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, CircleAlert, ExternalLink, Share, ShieldCheck, Wallet, X } from "lucide-react";
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
import { Keypad } from "./keypad";
import { Button, Checkbox, TradeButton, cn } from "./ui";

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

// Quick amounts ($1 $5 $10 $25), bounded by the single-pick limit.
const QUICK_AMOUNTS = Array.from(new Set<number>([...STAKE_PRESETS, 25]))
  .filter((v) => v >= 1 && v <= MAX_SINGLE_STAKE)
  .sort((a, b) => a - b);

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
  // What the keypad shows; `amount` is its numeric value.
  const [entry, setEntry] = useState<string>(String(DEFAULT_STAKE));
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

  function setEntryAmount(v: string) {
    setEntry(v);
    const n = Number(v);
    setAmount(Number.isFinite(n) ? Math.min(n, MAX_SINGLE_STAKE) : 0);
  }

  const title =
    step === "done" ? "You're in" : step === "free" ? "Make your call" : step === "running" ? "Placing your pick" : `Back ${side.toUpperCase()}`;
  const SIDE = side.toUpperCase();
  const OTHER = side === "yes" ? "NO" : "YES";
  const SideIcon = side === "yes" ? Check : X;
  const sideText = side === "yes" ? "text-yes" : "text-no";

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (step === "running" ? null : onOpenChange(o))}
      title={title}
      description={target.question}
      dismissible={step !== "running"}
      hideHeader
    >
      {step === "amount" ? (
        <div className="flex flex-col">
          <Context question={target.question} />
          <SideToggle side={side} onChange={setSide} className="mt-3" />

          {/* Hero amount (Cash App) */}
          <div className="flex flex-col items-center pt-6 pb-1 [@media(max-height:700px)]:pt-4">
            <p
              className={cn(
                "num text-[56px] font-semibold leading-none tracking-[-0.04em] transition-colors duration-150",
                amount > 0 ? "text-fg" : "text-fg-3",
              )}
              aria-live="polite"
            >
              ${entry}
            </p>
            <p className="mt-2.5 flex min-h-9 max-w-[19rem] items-start justify-center text-center text-[13px] leading-[1.4] text-fg-3">
              {amount > 0 && amount < 1 ? "The minimum is $1" : "Paid in USDC (digital dollars). Small amounts are the point here."}
            </p>
          </div>

          <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Quick amounts">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={amount === v}
                onClick={() => setEntryAmount(String(v))}
                className={cn(
                  "num relative inline-flex h-9 min-w-14 items-center justify-center rounded-full px-4 text-[15px] font-semibold",
                  "transition-[scale,background-color,color] duration-[120ms] ease-out active:scale-[0.97]",
                  "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                  amount === v ? "bg-fg text-canvas" : "bg-card text-fg hover:bg-card-2",
                )}
              >
                ${v}
              </button>
            ))}
          </div>

          <Keypad
            value={entry}
            onChange={setEntryAmount}
            max={MAX_SINGLE_STAKE}
            decimals={2}
            disabled={busy}
            className="mt-3 [@media(max-height:700px)]:[&>button]:h-12"
          />

          {error ? (
            <p className="mt-2 text-center text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button size="xl" variant={side} className="mt-3 w-full" loading={busy} onClick={() => next()} disabled={!(amount >= 1)}>
            {busy ? null : <SideIcon className="size-5" strokeWidth={3} aria-hidden />}
            Review {usd(amount)} on {SIDE}
          </Button>
          <PoweredByPanta className="mt-3 self-center" />
        </div>
      ) : null}

      {step === "age" ? (
        <div className="flex flex-col">
          <StepHero icon={<ShieldCheck />} title="Confirm your age" body="Real-money picks are for adults only. Confirm once and you're set." />
          <div className="mt-6 rounded-2xl bg-card px-4 py-3">
            <Checkbox checked={over18} onChange={setOver18}>
              I&apos;m 18 or older and allowed to make real-money predictions where I live.
            </Checkbox>
          </div>
          {error ? (
            <p className="mt-3 text-center text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" size="xl" className="mt-6 w-full" loading={busy} disabled={!over18} onClick={confirmAge}>
            Continue
          </Button>
        </div>
      ) : null}

      {step === "fund" && balance ? (
        <div className="flex flex-col">
          <div className="flex flex-col items-center pt-2 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-card text-fg">
              <Wallet className="size-6" aria-hidden />
            </span>
            <p className="num mt-5 text-[56px] font-semibold leading-none tracking-[-0.04em]">{usd(balance.usdc)}</p>
            <p className="mt-2 text-[15px] text-fg-2">USDC in your wallet</p>
          </div>
          <div className="mt-6 flex flex-col gap-1.5 text-center text-[15px] leading-[1.45]">
            {balance.usdc < amount ? (
              <p>
                Add at least <span className="num font-semibold">{usd(amount - balance.usdc)}</span> USDC to make this pick.
              </p>
            ) : null}
            {balance.sol < 0.003 ? <p className="text-fg-2">Your wallet also needs a little SOL (about $0.50) for network fees.</p> : null}
          </div>
          <Link
            href="/wallet"
            className="mt-6 inline-flex h-[60px] w-full items-center justify-center rounded-full bg-brand text-[17px] font-semibold text-black transition-[scale] duration-[120ms] ease-out active:scale-[0.97]"
          >
            Add funds
          </Link>
          <Button type="button" size="lg" variant="secondary" className="mt-2 w-full" loading={busy} onClick={() => next()}>
            I&apos;ve added funds
          </Button>
          {error ? (
            <p className="mt-3 text-center text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "free" ? (
        <div className="flex flex-col">
          <div className="flex flex-col items-center pt-2 text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-3">Free call · no money</p>
            <h3 className="mt-2 text-[22px] font-bold leading-[1.2] tracking-[-0.01em]">{target.question}</h3>
            <p className="mt-3 text-[15px] leading-[1.45] text-fg-2">
              {target.kind === "forecast"
                ? `This is a free call: no money, no prizes. Your call counts toward your accuracy${target.creatorHandle ? ` with @${target.creatorHandle}` : ""}.`
                : "Real-money picks aren't available in your region. Make a free call instead; it counts toward your accuracy."}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <TradeButton side="yes" size="xl" label="Call YES" loading={busy && side === "yes"} disabled={busy} onClick={() => freeCall("yes")} />
            <TradeButton side="no" size="xl" label="Call NO" loading={busy && side === "no"} disabled={busy} onClick={() => freeCall("no")} />
          </div>
          {error ? (
            <p className="mt-3 text-center text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "review" && quote ? (
        <div className="flex flex-col">
          <Context question={target.question} side={side} />

          {/* Hero payout */}
          <p className="flex flex-col items-center pt-6 text-center">
            <span className="block text-[17px] font-medium text-fg-2">You get about</span>
            <span className={cn("num mt-2 block text-[56px] font-semibold leading-none tracking-[-0.04em]", sideText)}>{usd(quote.shares, 2)}</span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[17px] font-semibold">
              if
              <span className={cn("inline-flex items-center gap-1", sideText)}>
                <SideIcon className="size-[18px]" strokeWidth={3} aria-hidden />
                {SIDE}
              </span>
              wins
            </span>
          </p>

          <div className="mt-6">
            <Row label="You put in" value={usd(quote.amountUsdc)} />
            {quote.feeUsdc !== null ? <Row label="Trading fee (included)" value={usd(quote.feeUsdc)} /> : null}
          </div>

          <ul className="mt-3 flex flex-col gap-1.5 text-[13px] leading-[1.45] text-fg-2">
            <li>
              If {OTHER} wins, you lose your <span className="num">{usd(quote.amountUsdc)}</span>.
            </li>
            <li>The price can move up to 1% before it confirms.</li>
            <li>You hold until the result. There&apos;s no early cash-out in this app.</li>
            {target.creatorHandle ? <li>@{target.creatorHandle} earns a share of trading fees from this market.</li> : null}
            <li className="text-fg-3">Estimate from Panta. The final payout is set when Panta resolves the market.</li>
          </ul>

          {error ? (
            <p className="mt-3 text-center text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" size="xl" variant={side} className="mt-5 w-full" onClick={confirm}>
            <SideIcon className="size-5" strokeWidth={3} aria-hidden />
            Confirm {usd(quote.amountUsdc)} on {SIDE}
          </Button>
          <Button type="button" variant="ghost" className="mt-1 w-full text-fg-2" onClick={() => setStep("amount")}>
            Change amount
          </Button>
          <PoweredByPanta className="mt-1 self-center" />
        </div>
      ) : null}

      {step === "running" ? (
        <div className="flex flex-col">
          <div className="pt-2">
            <h3 className="text-[22px] font-bold tracking-[-0.01em]">Placing your pick</h3>
            <p className="num mt-1 inline-flex items-center gap-1 text-[15px] text-fg-2">
              {usd(quote?.amountUsdc ?? amount)} on
              <span className={cn("inline-flex items-center gap-0.5 font-semibold", sideText)}>
                <SideIcon className="size-4" strokeWidth={3} aria-hidden />
                {SIDE}
              </span>
            </p>
          </div>
          <div className="mt-6">
            <TxTimeline phase={phase} />
          </div>
          <p className="mt-6 text-[13px] text-fg-3">Keep this open. It usually takes a few seconds.</p>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="flex flex-col items-center pt-4 text-center">
          <span className={cn("inline-flex size-20 items-center justify-center rounded-full", side === "yes" ? "bg-yes text-yes-ink" : "bg-no text-no-ink")}>
            <Check className="size-10" strokeWidth={3} aria-hidden />
          </span>
          {result ? (
            <p className="num mt-6 text-[26px] font-bold leading-tight tracking-[-0.02em]">
              You hold about {quote ? quote.shares.toFixed(2) : ""} <span className={sideText}>{SIDE}</span>
            </p>
          ) : (
            <p className="mt-6 text-[26px] font-bold leading-tight tracking-[-0.02em]">
              You called <span className={sideText}>{SIDE}</span>
            </p>
          )}
          <p className="mt-2 text-[15px] text-fg-2">We&apos;ll let you know when it resolves.</p>
          {onShare ? (
            <Button type="button" size="xl" className="mt-8 w-full" onClick={() => onShare(side)}>
              <Share className="size-5" aria-hidden />
              Share my pick
            </Button>
          ) : null}
          {result?.explorerUrl ? (
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex h-11 items-center gap-1.5 px-3 text-[15px] font-semibold text-fg-2 transition-colors hover:text-fg"
            >
              View on Solscan <ExternalLink className="size-4" aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}

      {step === "error" ? (
        <div className="flex flex-col">
          <div className="flex flex-col items-center pt-2 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
              <CircleAlert className="size-7" aria-hidden />
            </span>
            <h3 className="mt-4 text-[22px] font-bold tracking-[-0.01em]">That didn&apos;t go through</h3>
            <p className="mt-2 text-[15px] leading-[1.45] text-fg-2" role="alert">
              {error}
            </p>
          </div>
          <div className="mt-4 flex flex-col items-center">
            {result?.explorerUrl ? (
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-1.5 px-3 text-[15px] font-semibold text-fg-2 underline-offset-2 hover:underline"
              >
                View transaction <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
            {target.pantaUrl && error === errorMessage("MARKET_NOT_IN_PRIMARY") ? (
              <a
                href={target.pantaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-1.5 px-3 text-[15px] font-semibold text-fg underline-offset-2 hover:underline"
              >
                Open on panta.market <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
          <Button type="button" size="lg" variant="secondary" className="mt-4 w-full" onClick={() => setStep("amount")}>
            Try again
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}

/** Small context line at the top of a step: the side (when chosen) and the question. */
function Context({ question, side }: { question: string; side?: "yes" | "no" }) {
  return (
    <p className="line-clamp-2 text-center text-[13px] leading-[1.4] text-fg-2">
      {side ? (
        <span className={cn("mr-1.5 inline-flex items-center gap-0.5 font-bold", side === "yes" ? "text-yes" : "text-no")}>
          {side === "yes" ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <X className="size-3.5" strokeWidth={3} aria-hidden />}
          {side.toUpperCase()}
        </span>
      ) : null}
      {question}
    </p>
  );
}

function StepHero({ icon, title, body }: { icon: ReactNode; title: string; body: ReactNode }) {
  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-card text-fg [&_svg]:size-7">{icon}</span>
      <h3 className="mt-4 text-[22px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-[15px] leading-[1.45] text-fg-2">{body}</p>
    </div>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-3 text-[15px] last:border-b-0">
      <span className="text-fg-2">{label}</span>
      <span className="num font-medium text-fg">{value}</span>
    </div>
  );
}

/** Segmented YES/NO side toggle, tinted in the side color when selected. */
function SideToggle({ side, onChange, className }: { side: "yes" | "no"; onChange: (s: "yes" | "no") => void; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-1 rounded-full bg-card p-1", className)} role="radiogroup" aria-label="Side">
      {(["yes", "no"] as const).map((v) => {
        const on = side === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-[15px] font-bold transition-colors duration-150",
              on ? (v === "yes" ? "bg-yes/20 text-yes" : "bg-no/20 text-no") : "text-fg-2 hover:text-fg",
            )}
          >
            {v === "yes" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <X className="size-4" strokeWidth={3} aria-hidden />}
            {v.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
