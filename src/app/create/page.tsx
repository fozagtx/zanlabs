"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImagePlus, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { CATEGORIES, MIN_START_DELAY_SEC, START_DELAY_BUFFER_SEC, type Category } from "@/lib/config";
import { lintMarket } from "@/lib/lint";
import { TEMPLATES, type Template } from "@/lib/templates";
import { toDatetimeLocal, usd } from "@/lib/format";
import type { BuiltTx } from "@/lib/types";
import { Button, Card, Checkbox, Empty, Input, Label, Pill, Skeleton, Textarea, cn } from "@/components/ui";
import { TxTimeline } from "@/components/tx-timeline";
import { ShareSheet } from "@/components/share-sheet";
import { PoweredByPanta } from "@/components/brand";

type Draft = {
  question: string;
  resolutionRule: string;
  sources: string[];
  category: Category;
  closes: string; // datetime-local
  result: string; // datetime-local
};

type CreateQuote = {
  kind: "panta";
  slug: string;
  wallet: string;
  intentId: string;
  paymentUsdc: number;
  liquidityUsdc: number | null;
  platformUsdc: number | null;
};

const emptyDraft = (): Draft => {
  const now = Math.floor(Date.now() / 1000);
  return { question: "", resolutionRule: "", sources: [""], category: "sports", closes: toDatetimeLocal(now + 2 * 86400), result: toDatetimeLocal(now + 2 * 86400 + 4 * 3600) };
};

const toUnix = (local: string) => Math.floor(Date.parse(local) / 1000);

export default function CreatePage() {
  const s = useSession();
  if (!s.authenticated) {
    return <Empty title="Post a call" body="Sign in and set up your creator page to post calls your fans can back or fade." action={<Button onClick={s.login}>Sign in</Button>} />;
  }
  if (!s.me) return <Skeleton className="m-4 h-96" />;
  if (s.me.role !== "creator" || !s.me.creator) {
    return (
      <Empty
        title="Set up your creator page first"
        body="It takes a minute: handle, verified socials and the ground rules."
        action={
          <Link href="/onboarding" className="inline-flex h-11 items-center rounded-2xl bg-coral px-4 font-semibold text-coral-ink">
            Set up my page
          </Link>
        }
      />
    );
  }
  return <Studio />;
}

function Studio() {
  const s = useSession();
  const me = s.me!;
  const run = useTxRunner();
  const health = useQuery({ queryKey: ["health"], queryFn: () => api<{ llm: boolean; panta: boolean }>("/api/health", { auth: false }) });
  const [template, setTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [call, setCall] = useState<"yes" | "no" | null>(null);
  const [wantReal, setWantReal] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hotTake, setHotTake] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [quote, setQuote] = useState<CreateQuote | null>(null);
  const [balance, setBalance] = useState<{ sol: number; usdc: number } | null>(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [done, setDone] = useState<{ slug: string; kind: "panta" | "forecast" } | null>(null);
  const [share, setShare] = useState(false);

  // Fill the draft from the template's fields.
  useEffect(() => {
    if (!template || template.id === "custom") return;
    const out = template.build(fields);
    if (out) {
      setDraft({
        question: out.question,
        resolutionRule: out.resolutionRule,
        sources: out.sources,
        category: out.category,
        closes: toDatetimeLocal(out.endTime),
        result: toDatetimeLocal(out.resolutionTime),
      });
    }
  }, [template, fields]);

  const forecastTemplate = template?.kind === "forecast";
  const realAllowed = Boolean(me.creator?.realMoneyEnabled && me.realMoneyRegion && health.data?.panta !== false);
  const usernames = useMemo(() => [me.handle, ...me.socials.map((x) => x.username)].filter(Boolean).map((x) => x!.toLowerCase()), [me]);
  const now = Math.floor(Date.now() / 1000);
  const kindForLint: "panta" | "forecast" = forecastTemplate || !realAllowed || !wantReal ? "forecast" : "panta";
  const lint = lintMarket({
    question: draft.question,
    resolutionRule: draft.resolutionRule,
    sources: draft.sources.filter((x) => x.trim()),
    category: draft.category,
    startTime: kindForLint === "panta" ? now + MIN_START_DELAY_SEC + START_DELAY_BUFFER_SEC : now,
    endTime: toUnix(draft.closes),
    resolutionTime: toUnix(draft.result),
    kind: kindForLint,
    creatorUsernames: usernames,
  });
  const kind: "panta" | "forecast" = kindForLint === "panta" && lint.tier === "A" ? "panta" : "forecast";

  async function aiDraft() {
    setBusy("ai");
    try {
      const d = await api<{ question: string; resolutionRule: string; sources: string[]; category: Category; closesAtIso: string | null; resultAtIso: string | null; creatorControlled: boolean; notes: string | null }>(
        "/api/create/draft",
        { body: { hotTake, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } },
      );
      const closes = d.closesAtIso ? Math.floor(Date.parse(d.closesAtIso) / 1000) : toUnix(draft.closes);
      const result = d.resultAtIso ? Math.floor(Date.parse(d.resultAtIso) / 1000) : toUnix(draft.result);
      setTemplate(TEMPLATES.find((t) => t.id === "custom")!);
      setDraft({ question: d.question, resolutionRule: d.resolutionRule, sources: d.sources, category: d.category, closes: toDatetimeLocal(closes), result: toDatetimeLocal(result) });
      if (d.notes) toast.message(d.notes);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function generateCover() {
    setBusy("cover");
    try {
      const r = await api<{ imageUrl: string }>("/api/create/cover", { body: { question: draft.question } });
      setImageUrl(r.imageUrl);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function uploadCover(file: File) {
    if (file.size > 8_000_000) return toast.error("Images must be under 8 MB.");
    setBusy("cover");
    try {
      const up = await api<{ uploadUrl: string; fields: Record<string, string | number | boolean> }>("/api/create/image", { body: {} });
      const fd = new FormData();
      for (const [k, v] of Object.entries(up.fields)) fd.append(k, String(v));
      fd.append("file", file);
      const res = await fetch(up.uploadUrl, { method: "POST", body: fd });
      const j = (await res.json()) as { secure_url?: string };
      if (!res.ok || !j.secure_url) throw new Error("Upload failed.");
      setImageUrl(j.secure_url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function review() {
    setBusy("quote");
    try {
      const body = {
        kind,
        template: template?.id,
        question: draft.question.trim(),
        resolutionRule: draft.resolutionRule.trim(),
        sources: draft.sources.map((x) => x.trim()).filter(Boolean),
        category: draft.category,
        endTime: toUnix(draft.closes),
        resolutionTime: toUnix(draft.result),
        imageUrl: imageUrl ?? undefined,
        creatorCall: call,
      };
      const r = await api<CreateQuote | { kind: "forecast"; slug: string }>("/api/create/quote", { body });
      if (r.kind === "forecast") {
        setDone({ slug: r.slug, kind: "forecast" });
        return;
      }
      setQuote(r);
      try {
        setBalance(await api<{ sol: number; usdc: number }>(`/api/wallet/balance?address=${r.wallet}`));
      } catch {
        setBalance(null);
      }
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "TIER_FORECAST_ONLY") {
        setWantReal(false);
        toast.message(err.message);
      } else toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!quote) return;
    setBusy("publish");
    setPhase("preparing");
    try {
      const built = await api<BuiltTx>("/api/create/build", { body: { intentId: quote.intentId } });
      const res = await run(built, quote.wallet, setPhase);
      if (res.status === "confirmed") setDone({ slug: quote.slug, kind: "panta" });
      else if (res.status === "failed") toast.error(res.message ?? "The transaction failed.");
      else toast.message("Still confirming. Check your studio in a minute.");
    } catch (e) {
      if (!isUserRejection(e)) toast.error((e as ApiError).message);
      setPhase("idle");
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-yes text-yes-ink">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h1 className="text-2xl font-extrabold">Your call is live</h1>
        <p className="text-sm text-muted">{done.kind === "panta" ? "Fans can trade it once it opens. Share it where your audience is." : "Fans can make free calls on it now."}</p>
        <Button size="lg" className="w-full" onClick={() => setShare(true)}>
          Share to WhatsApp, Instagram, TikTok, X
        </Button>
        <Link href={`/m/${done.slug}`} className="text-sm font-semibold text-coral">
          View market
        </Link>
        <ShareSheet
          open={share}
          onOpenChange={setShare}
          market={{ slug: done.slug, question: draft.question, kind: done.kind, creatorHandle: me.handle!, creatorCall: call }}
        />
      </div>
    );
  }

  if (quote) {
    const short = balance ? balance.usdc < quote.paymentUsdc : false;
    const noSol = balance ? balance.sol < 0.01 : false;
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Review and publish</h1>
        <Card className="flex flex-col gap-2">
          <p className="text-lg font-bold">{draft.question}</p>
          <p className="text-sm text-muted">{call ? `Your public call: ${call.toUpperCase()}` : "No public call"}</p>
        </Card>
        <Card className="num flex flex-col gap-1.5 text-sm">
          <p className="text-base font-bold">Creating this market costs {usd(quote.paymentUsdc)} USDC</p>
          {quote.platformUsdc !== null ? <p className="text-muted">Panta fee {usd(quote.platformUsdc)}</p> : null}
          {quote.liquidityUsdc !== null ? <p className="text-muted">Starting liquidity {usd(quote.liquidityUsdc)}</p> : null}
          <p className="text-muted">Plus a small Solana network fee. Paid from {quote.wallet.slice(0, 4)}…{quote.wallet.slice(-4)}.</p>
          <p className="mt-1 text-muted">You earn a share of trading fees set by Panta; it becomes claimable in your studio when Panta allows.</p>
        </Card>
        {balance && (short || noSol) ? (
          <p className="rounded-2xl bg-warn/10 p-3 text-sm text-warn">
            {short ? `Your wallet has ${usd(balance.usdc)} USDC. ` : ""}
            {noSol ? "Add about 0.01 SOL for network fees. " : ""}
            <Link href="/wallet" className="underline">
              Add funds
            </Link>
          </p>
        ) : null}
        <Checkbox checked={consent} onChange={setConsent}>
          I understand this sends {usd(quote.paymentUsdc)} USDC to create a Panta market. Panta resolves it using my rule and sources; I can&apos;t change the
          result.
        </Checkbox>
        {phase !== "idle" ? <TxTimeline phase={phase} /> : null}
        <Button size="lg" loading={busy === "publish"} disabled={!consent || short} onClick={publish}>
          Sign and publish
        </Button>
        <button className="text-sm font-semibold text-muted" onClick={() => setQuote(null)} disabled={busy === "publish"}>
          Back to edit
        </button>
        <PoweredByPanta className="self-center" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 pt-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">What&apos;s your call?</h1>
        <p className="text-sm text-muted">Pick a template, or describe your hot take.</p>
      </div>

      {health.data?.llm ? (
        <Card className="flex flex-col gap-2">
          <Label hint="We'll turn it into a precise, resolvable question">Describe your hot take</Label>
          <Textarea value={hotTake} onChange={(e) => setHotTake(e.target.value)} placeholder="Arsenal beat Chelsea this Sunday, no debate" className="min-h-16" />
          <Button variant="outline" loading={busy === "ai"} disabled={hotTake.trim().length < 8} onClick={aiDraft}>
            <Wand2 className="size-4" /> Draft it for me
          </Button>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTemplate(t);
              setFields({});
              if (t.id === "custom" || t.kind === "forecast") setDraft(emptyDraft());
            }}
            className={cn("flex flex-col gap-1 rounded-2xl border p-3 text-left", template?.id === t.id ? "border-coral bg-coral/10" : "border-line bg-surface")}
          >
            <span className="flex items-center gap-1.5 font-semibold">
              {t.kind === "forecast" ? <Sparkles className="size-4 text-coral" /> : null}
              {t.name}
            </span>
            <span className="text-xs text-muted">{t.blurb}</span>
          </button>
        ))}
      </div>

      {template && template.fields.length ? (
        <Card className="flex flex-col gap-3">
          {template.fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <Label>{f.label}</Label>
              {f.type === "select" ? (
                <select className="h-11 rounded-xl border border-line bg-bg px-3" value={fields[f.key] ?? ""} onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}>
                  <option value="">Choose…</option>
                  {f.options!.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={f.type === "datetime" ? "datetime-local" : f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                  placeholder={f.placeholder}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </Card>
      ) : null}

      {template ? (
        <>
          <Card className="flex flex-col gap-3">
            <Label hint="One yes/no question with a date. 70 characters or fewer fits the share card.">Question</Label>
            <Textarea value={draft.question} onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))} className="min-h-16" />
            <Label hint="What makes it YES, what makes it NO, and which source decides">Resolution rule</Label>
            <Textarea value={draft.resolutionRule} onChange={(e) => setDraft((d) => ({ ...d, resolutionRule: e.target.value }))} />
            <Label hint="Official public pages, not social posts">Sources</Label>
            {draft.sources.map((src, i) => (
              <div key={i} className="flex gap-2">
                <Input type="url" value={src} placeholder="https://" onChange={(e) => setDraft((d) => ({ ...d, sources: d.sources.map((x, j) => (j === i ? e.target.value : x)) }))} />
                {draft.sources.length > 1 ? (
                  <Button variant="ghost" aria-label="Remove source" onClick={() => setDraft((d) => ({ ...d, sources: d.sources.filter((_, j) => j !== i) }))}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {draft.sources.length < 5 ? (
              <Button size="sm" variant="ghost" className="self-start" onClick={() => setDraft((d) => ({ ...d, sources: [...d.sources, ""] }))}>
                <Plus className="size-4" /> Add source
              </Button>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label hint="Before the outcome is known">Trading closes</Label>
                <Input type="datetime-local" value={draft.closes} onChange={(e) => setDraft((d) => ({ ...d, closes: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <Label hint="When the source will show it">Result expected</Label>
                <Input type="datetime-local" value={draft.result} onChange={(e) => setDraft((d) => ({ ...d, result: e.target.value }))} />
              </div>
            </div>
            <Label>Category</Label>
            <select className="h-11 rounded-xl border border-line bg-bg px-3 capitalize" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Category }))}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="font-semibold">Your public call</p>
            <p className="text-sm text-muted">Fans back you or fade you. You stake your reputation, not money.</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={call === "yes" ? "yes" : "outline"} onClick={() => setCall("yes")}>
                <Check className="size-4" /> YES
              </Button>
              <Button variant={call === "no" ? "no" : "outline"} onClick={() => setCall("no")}>
                <X className="size-4" /> NO
              </Button>
              <Button variant={call === null ? "primary" : "outline"} onClick={() => setCall(null)}>
                No call
              </Button>
            </div>
          </Card>

          <LintPanel lint={lint} kind={kind} />

          {!forecastTemplate && lint.tier === "A" ? (
            <Card className="flex flex-col gap-3">
              <p className="font-semibold">Market type</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!realAllowed}
                  onClick={() => setWantReal(true)}
                  className={cn("rounded-2xl border p-3 text-left disabled:opacity-40", kind === "panta" ? "border-coral bg-coral/10" : "border-line")}
                >
                  <span className="block font-semibold">Real money</span>
                  <span className="block text-xs text-muted">Fans trade USDC on Panta. You earn fees.</span>
                </button>
                <button onClick={() => setWantReal(false)} className={cn("rounded-2xl border p-3 text-left", kind === "forecast" ? "border-coral bg-coral/10" : "border-line")}>
                  <span className="block font-semibold">Free call</span>
                  <span className="block text-xs text-muted">No money. Bragging rights and leaderboards.</span>
                </button>
              </div>
              {!realAllowed ? <p className="text-xs text-muted">Real-money markets aren&apos;t available for your account or region yet.</p> : null}
            </Card>
          ) : null}

          {kind === "panta" ? (
            <Card className="flex flex-col gap-3">
              <p className="font-semibold">Cover image</p>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Market cover" className="aspect-square w-40 rounded-2xl object-cover" />
              ) : (
                <p className="text-sm text-muted">Panta shows this image on the market.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" loading={busy === "cover"} disabled={draft.question.trim().length < 10} onClick={generateCover}>
                  <Sparkles className="size-4" /> Generate from my call
                </Button>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold">
                  <ImagePlus className="size-4" /> Upload
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                </label>
              </div>
            </Card>
          ) : null}

          <Button size="lg" loading={busy === "quote"} disabled={!lint.ok || (kind === "panta" && !imageUrl)} onClick={review}>
            {kind === "panta" ? "Review cost" : "Publish free call"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function LintPanel({ lint, kind }: { lint: ReturnType<typeof lintMarket>; kind: "panta" | "forecast" }) {
  const tierCopy =
    lint.tier === "C"
      ? { tone: "warn" as const, text: "Not allowed" }
      : lint.tier === "B"
        ? { tone: "coral" as const, text: "Free call only: you can influence this" }
        : { tone: "yes" as const, text: kind === "panta" ? "Real money ready" : "Independent outcome" };
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Checklist</p>
        <Pill tone={tierCopy.tone}>{tierCopy.text}</Pill>
      </div>
      <ul className="flex flex-col gap-1.5">
        {lint.checks
          .filter((c) => !(kind === "forecast" && c.id === "independent_outcome"))
          .map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <span className={cn("mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full", c.pass ? "bg-yes text-yes-ink" : c.severity === "error" ? "bg-danger text-bg" : "bg-warn text-bg")}>
                {c.pass ? <Check className="size-3" /> : <X className="size-3" />}
              </span>
              <span className={c.pass ? "text-muted" : "text-ink"}>{c.label}</span>
            </li>
          ))}
      </ul>
      {lint.reasons.length ? <p className="text-xs text-muted">{lint.reasons.join(" ")}</p> : null}
    </Card>
  );
}
