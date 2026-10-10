"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Banknote,
  Bitcoin,
  Check,
  ChevronDown,
  ImagePlus,
  Music,
  PenLine,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  TriangleAlert,
  Trophy,
  Tv,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError, isUserRejection } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useTxRunner, type TxPhase } from "@/lib/client/use-tx";
import { CATEGORIES, MIN_START_DELAY_SEC, START_DELAY_BUFFER_SEC, type Category } from "@/lib/config";
import { lintMarket } from "@/lib/lint";
import { TEMPLATES, type Template } from "@/lib/templates";
import { shortAddr, toDatetimeLocal, usd } from "@/lib/format";
import type { BuiltTx } from "@/lib/types";
import { Button, Checkbox, Empty, IconButton, Input, Label, ListRow, Pill, SectionLabel, Skeleton, Spinner, Textarea, cn } from "@/components/ui";
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

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  match: Trophy,
  chart: Music,
  reality: Tv,
  award: Award,
  price: Bitcoin,
  custom: PenLine,
  "about-me": Sparkles,
};

const STEPS = ["Pick", "Details", "Publish"] as const;

// A Link that looks like the white primary Button (md).
const primaryLink =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-[15px] font-semibold text-black transition-[scale,background-color] duration-[120ms] ease-out hover:bg-white/90 active:scale-[0.97]";

// Sticky action bar that sits just above the bottom nav.
const stickyBar = "sticky bottom-[var(--bottom-nav-h)] z-20 border-t border-hairline bg-raised/95 px-4 py-3 backdrop-blur-xl";

export default function CreatePage() {
  const s = useSession();
  if (!s.authenticated) {
    return (
      <Empty
        icon={<PenLine />}
        title="Post a call"
        body="Sign in and set up your creator page to post calls your fans can back or fade."
        action={
          <Button type="button" size="lg" onClick={s.login}>
            Sign in
          </Button>
        }
      />
    );
  }
  if (!s.me) return <CreateSkeleton />;
  if (s.me.role !== "creator" || !s.me.creator) {
    return (
      <Empty
        icon={<Sparkles />}
        title="Set up your creator page first"
        body="It takes a minute: handle, verified socials and the ground rules."
        action={
          <Link href="/onboarding" className={primaryLink}>
            Set up my page
          </Link>
        }
      />
    );
  }
  return <Composer />;
}

function Composer() {
  const s = useSession();
  const me = s.me!;
  const run = useTxRunner();
  const uid = useId();
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
  // View only: re-open the template grid after one is picked.
  const [showTemplates, setShowTemplates] = useState(false);

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
      setShowTemplates(false);
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

  function pickTemplate(t: Template) {
    setTemplate(t);
    setFields({});
    if (t.id === "custom" || t.kind === "forecast") setDraft(emptyDraft());
    setShowTemplates(false);
  }

  /* ---------------------------------------------------------------------- */
  /* Done                                                                    */
  /* ---------------------------------------------------------------------- */

  if (done) {
    return (
      <div className="flex min-h-[calc(100dvh-var(--top-bar-h)-var(--bottom-nav-h)-2rem)] flex-col items-center justify-center px-6 py-12 text-center">
        <span className="inline-flex size-20 items-center justify-center rounded-full bg-fg text-canvas">
          <Check className="size-10" strokeWidth={3} aria-hidden />
        </span>
        <h1 className="mt-6 text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">Your call is live</h1>
        <p className="mt-2 max-w-xs text-[15px] leading-[1.45] text-fg-2">
          {done.kind === "panta" ? "Fans can trade it once it opens. Share it where your audience is." : "Fans can make free calls on it now."}
        </p>
        {draft.question ? <p className="mt-6 max-w-sm text-[17px] font-semibold leading-[1.3]">{draft.question}</p> : null}
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-2">
          <Button type="button" size="xl" className="w-full" onClick={() => setShare(true)}>
            <Share2 className="size-5" aria-hidden /> Share
          </Button>
          <p className="text-[13px] text-fg-3">WhatsApp, Instagram, TikTok, X</p>
          <Link href={`/m/${done.slug}`} className="mt-2 inline-flex h-11 items-center gap-1 rounded-full px-4 text-[15px] font-semibold text-fg transition-colors hover:bg-card">
            View market <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ShareSheet
          open={share}
          onOpenChange={setShare}
          market={{ slug: done.slug, question: draft.question, kind: done.kind, creatorHandle: me.handle!, creatorCall: call }}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Step 3: review and publish                                              */
  /* ---------------------------------------------------------------------- */

  if (quote) {
    const short = balance ? balance.usdc < quote.paymentUsdc : false;
    const noSol = balance ? balance.sol < 0.01 : false;
    const publishing = busy === "publish";
    return (
      <div className="flex flex-col">
        <StepHeader step={3} />

        <section className="px-4 pt-8" aria-label="Cost to create">
          <SectionLabel as="p">Cost to create</SectionLabel>
          <p className="num mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[56px] font-semibold leading-none tracking-[-0.04em]">{usd(quote.paymentUsdc)}</span>
            <span className="text-[17px] font-semibold text-fg-2">USDC</span>
          </p>
          <p className="mt-2 text-[13px] text-fg-2">Plus a small Solana network fee.</p>
        </section>

        <section className="px-4 pt-6" aria-label="Your call">
          <div className="rounded-2xl bg-card p-4">
            <p className="text-[17px] font-semibold leading-[1.3]">{draft.question}</p>
            <div className="mt-3">
              {call === "yes" ? (
                <Pill tone="yes">
                  <Check strokeWidth={3} aria-hidden /> Your public call: YES
                </Pill>
              ) : call === "no" ? (
                <Pill tone="no">
                  <X strokeWidth={3} aria-hidden /> Your public call: NO
                </Pill>
              ) : (
                <Pill tone="muted">No public call</Pill>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 pt-4" aria-label="Cost breakdown">
          <div>
            {quote.platformUsdc !== null ? <ListRow label="Panta fee" value={usd(quote.platformUsdc)} /> : null}
            {quote.liquidityUsdc !== null ? <ListRow label="Starting liquidity" value={usd(quote.liquidityUsdc)} /> : null}
            <ListRow label="Paid from wallet" value={shortAddr(quote.wallet)} />
            {balance ? <ListRow label="Wallet balance" value={`${usd(balance.usdc)} USDC`} /> : null}
          </div>
          <p className="mt-3 text-[13px] leading-[1.45] text-fg-2">
            You earn a share of trading fees set by Panta; it becomes claimable in your studio when Panta allows.
          </p>
        </section>

        {balance && (short || noSol) ? (
          <div role="note" className="mx-4 mt-4 flex items-start gap-3 rounded-2xl bg-warn/10 px-4 py-3.5 text-[13px] leading-[1.45] text-warn">
            <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
            <p>
              {short ? `Your wallet has ${usd(balance.usdc)} USDC. ` : ""}
              {noSol ? "Add about 0.01 SOL for network fees. " : ""}
              <Link href="/wallet" className="font-semibold underline underline-offset-2">
                Add funds
              </Link>
            </p>
          </div>
        ) : null}

        <section className="px-4 pt-6">
          <Checkbox checked={consent} onChange={setConsent}>
            I understand this sends {usd(quote.paymentUsdc)} USDC to create a Panta market. Panta resolves it using my rule and sources; I can&apos;t change the
            result.
          </Checkbox>
        </section>

        {phase !== "idle" ? (
          <section className="px-4 pt-6" aria-label="Publishing progress">
            <div className="rounded-2xl bg-card p-4">
              <TxTimeline phase={phase} />
            </div>
          </section>
        ) : null}

        <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-6">
          <Button type="button" variant="ghost" size="md" onClick={() => setQuote(null)} disabled={publishing}>
            <ArrowLeft className="size-4" aria-hidden /> Back to edit
          </Button>
          <PoweredByPanta />
        </div>

        <div className={stickyBar}>
          <Button type="button" size="lg" className="w-full" loading={publishing} disabled={!consent || short} onClick={publish}>
            Sign and publish
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Steps 1 and 2: pick a template, then fill in the details                */
  /* ---------------------------------------------------------------------- */

  const step = template ? 2 : 1;
  const pickerOpen = !template || showTemplates;
  const ctaBlocked = !lint.ok || (kind === "panta" && !imageUrl);
  const ctaHint = !lint.ok ? "Fix the checklist above to continue." : kind === "panta" && !imageUrl ? "Add a cover image to continue." : null;
  const SelectedIcon = template ? (TEMPLATE_ICONS[template.id] ?? PenLine) : null;
  const ids = {
    hotTake: `${uid}-hot-take`,
    question: `${uid}-question`,
    rule: `${uid}-rule`,
    sources: `${uid}-sources`,
    closes: `${uid}-closes`,
    result: `${uid}-result`,
    category: `${uid}-category`,
  };

  return (
    <div className="flex flex-col">
      <StepHeader step={step} sub={step === 1 ? "What's your call? Pick a template, or describe your hot take." : undefined} />

      {pickerOpen ? (
        <>
          {health.data?.llm ? (
            <section className="px-4 pt-6">
              <Label htmlFor={ids.hotTake} hint="We'll turn it into a precise, resolvable question">
                Describe your hot take
              </Label>
              <Textarea
                id={ids.hotTake}
                value={hotTake}
                onChange={(e) => setHotTake(e.target.value)}
                placeholder="Arsenal beat Chelsea this Sunday, no debate"
                className="mt-2 min-h-20"
              />
              <Button type="button" variant="secondary" size="md" className="mt-3 w-full" loading={busy === "ai"} disabled={hotTake.trim().length < 8} onClick={aiDraft}>
                <Wand2 className="size-4" aria-hidden /> Draft it for me
              </Button>
            </section>
          ) : null}

          <section className="px-4 pt-6" aria-label="Templates">
            <SectionLabel action={template ? <button type="button" className="inline-flex h-11 items-center px-1" onClick={() => setShowTemplates(false)}>Cancel</button> : undefined}>
              {health.data?.llm ? "Or start from a template" : "Start from a template"}
            </SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => {
                const Icon = TEMPLATE_ICONS[t.id] ?? PenLine;
                const selected = template?.id === t.id;
                const wide = t.kind === "forecast";
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickTemplate(t)}
                    className={cn(
                      "flex rounded-2xl bg-card p-4 text-left transition-[scale,background-color] duration-[120ms] ease-out hover:bg-card-2 active:scale-[0.97]",
                      wide ? "col-span-2 min-h-[88px] items-center gap-4" : "min-h-[136px] flex-col items-start gap-3",
                      selected && "bg-card-2 ring-2 ring-fg",
                    )}
                  >
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-fg">
                      <Icon className="size-[22px]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold leading-tight">{t.name}</span>
                      <span className="mt-1 block text-[13px] leading-[1.35] text-fg-2">{t.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : template && SelectedIcon ? (
        <section className="px-4 pt-6" aria-label="Template">
          <div className="flex items-center gap-3 rounded-2xl bg-card py-2 pl-3 pr-2">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10">
              <SelectedIcon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{template.name}</span>
              <span className="block truncate text-[13px] text-fg-2">{template.blurb}</span>
            </span>
            <Button type="button" variant="ghost" size="md" onClick={() => setShowTemplates(true)}>
              Change
            </Button>
          </div>
        </section>
      ) : null}

      {template && template.fields.length ? (
        <section className="px-4 pt-8" aria-label={`${template.name} details`}>
          <SectionLabel>{template.name}</SectionLabel>
          <div className="mt-3 flex flex-col gap-4">
            {template.fields.map((f) => {
              const id = `${uid}-tf-${f.key}`;
              return (
                <Field key={f.key} id={id} label={f.label}>
                  {f.type === "select" ? (
                    <Select id={id} value={fields[f.key] ?? ""} onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}>
                      <option value="">Choose…</option>
                      {f.options!.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={id}
                      type={f.type === "datetime" ? "datetime-local" : f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                      placeholder={f.placeholder}
                      value={fields[f.key] ?? ""}
                      onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </section>
      ) : null}

      {template ? (
        <>
          <section className="px-4 pt-8" aria-label="The call">
            <SectionLabel>The call</SectionLabel>
            <div className="mt-3 flex flex-col gap-4">
              <Field id={ids.question} label="Question" hint="One yes/no question with a date. 70 characters or fewer fits the share card.">
                <Textarea id={ids.question} value={draft.question} onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))} className="min-h-20" />
                <p className={cn("num -mt-1 text-right text-[11px]", draft.question.trim().length > 70 ? "text-warn" : "text-fg-3")} aria-live="polite">
                  {draft.question.trim().length}/70
                </p>
              </Field>

              <Field id={ids.rule} label="Resolution rule" hint="What makes it YES, what makes it NO, and which source decides">
                <Textarea id={ids.rule} value={draft.resolutionRule} onChange={(e) => setDraft((d) => ({ ...d, resolutionRule: e.target.value }))} />
              </Field>

              <div className="flex flex-col gap-2" role="group" aria-labelledby={ids.sources}>
                <Label hint="Official public pages, not social posts">
                  <span id={ids.sources}>Sources</span>
                </Label>
                {draft.sources.map((src, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={src}
                      placeholder="https://"
                      aria-label={`Source ${i + 1}`}
                      onChange={(e) => setDraft((d) => ({ ...d, sources: d.sources.map((x, j) => (j === i ? e.target.value : x)) }))}
                    />
                    {draft.sources.length > 1 ? (
                      <IconButton label={`Remove source ${i + 1}`} size="lg" onClick={() => setDraft((d) => ({ ...d, sources: d.sources.filter((_, j) => j !== i) }))}>
                        <Trash2 className="size-[18px] text-fg-2" aria-hidden />
                      </IconButton>
                    ) : null}
                  </div>
                ))}
                {draft.sources.length < 5 ? (
                  <Button type="button" size="md" variant="ghost" className="-ml-2 self-start px-3" onClick={() => setDraft((d) => ({ ...d, sources: [...d.sources, ""] }))}>
                    <Plus className="size-4" aria-hidden /> Add source
                  </Button>
                ) : null}
              </div>

              <Field id={ids.closes} label="Trading closes" hint="Before the outcome is known">
                <Input id={ids.closes} type="datetime-local" value={draft.closes} onChange={(e) => setDraft((d) => ({ ...d, closes: e.target.value }))} />
              </Field>
              <Field id={ids.result} label="Result expected" hint="When the source will show it">
                <Input id={ids.result} type="datetime-local" value={draft.result} onChange={(e) => setDraft((d) => ({ ...d, result: e.target.value }))} />
              </Field>

              <Field id={ids.category} label="Category">
                <Select id={ids.category} className="capitalize" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Category }))}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>

          <section className="px-4 pt-8" aria-label="Your public call">
            <SectionLabel>Your public call</SectionLabel>
            <p className="mt-1 text-[13px] leading-[1.45] text-fg-2">Fans back you or fade you. You stake your reputation, not money.</p>
            <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Your public call">
              <CallToggle active={call === "yes"} activeClass="bg-yes text-yes-ink" onClick={() => setCall("yes")}>
                <Check className={cn("size-4", call !== "yes" && "text-yes")} strokeWidth={3} aria-hidden /> Yes
              </CallToggle>
              <CallToggle active={call === "no"} activeClass="bg-no text-no-ink" onClick={() => setCall("no")}>
                <X className={cn("size-4", call !== "no" && "text-no")} strokeWidth={3} aria-hidden /> No
              </CallToggle>
              <CallToggle active={call === null} activeClass="bg-fg text-canvas" onClick={() => setCall(null)}>
                No call
              </CallToggle>
            </div>
          </section>

          <LintPanel lint={lint} kind={kind} />

          {!forecastTemplate && lint.tier === "A" ? (
            <section className="px-4 pt-8" aria-label="Market type">
              <SectionLabel>Market type</SectionLabel>
              <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Market type">
                <TypeCard
                  selected={kind === "panta"}
                  disabled={!realAllowed}
                  onClick={() => setWantReal(true)}
                  icon={<Banknote />}
                  title="Real money"
                  body="Fans trade USDC on Panta. You earn fees."
                />
                <TypeCard
                  selected={kind === "forecast"}
                  onClick={() => setWantReal(false)}
                  icon={<Sparkles />}
                  title="Free call"
                  body="No money, no prizes. Just your fans' calls."
                />
              </div>
              {!realAllowed ? <p className="mt-2 text-[13px] leading-[1.45] text-fg-3">Real-money markets aren&apos;t available for your account or region yet.</p> : null}
            </section>
          ) : null}

          {kind === "panta" ? (
            <section className="px-4 pt-8" aria-label="Cover image">
              <SectionLabel>Cover image</SectionLabel>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-card">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Market cover" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-fg-3">
                      <ImagePlus className="size-6" aria-hidden />
                    </span>
                  )}
                  {busy === "cover" ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55">
                      <Spinner className="text-fg" />
                    </span>
                  ) : null}
                </div>
                <p className="min-w-0 flex-1 text-[13px] leading-[1.45] text-fg-2">
                  Panta shows this image on the market.{imageUrl ? "" : " Real-money calls need one."}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="md" variant="secondary" loading={busy === "cover"} disabled={draft.question.trim().length < 10} onClick={generateCover}>
                  <Sparkles className="size-4" aria-hidden /> Generate from my call
                </Button>
                <label className="inline-flex h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-full bg-card px-5 text-[15px] font-semibold text-fg transition-[scale,background-color] duration-[120ms] ease-out focus-within:ring-2 focus-within:ring-fg hover:bg-card-2 active:scale-[0.97]">
                  <ImagePlus className="size-4" aria-hidden /> Upload
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                </label>
              </div>
            </section>
          ) : null}

          <div className={cn(stickyBar, "mt-8")}>
            {ctaHint ? <p className="mb-2 text-center text-[13px] text-fg-2">{ctaHint}</p> : null}
            <Button type="button" size="lg" className="w-full" loading={busy === "quote"} disabled={ctaBlocked} onClick={review}>
              {kind === "panta" ? "Review cost" : "Publish free call"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Pieces                                                                    */
/* ------------------------------------------------------------------------ */

function StepHeader({ step, sub }: { step: 1 | 2 | 3; sub?: string }) {
  return (
    <header className="px-4 pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[22px] font-bold tracking-[-0.01em]">New call</h1>
        <p className="num text-[13px] font-medium text-fg-2">Step {step} of 3</p>
      </div>
      {sub ? <p className="mt-1 text-[15px] leading-[1.45] text-fg-2">{sub}</p> : null}
      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={label} aria-current={state === "current" ? "step" : undefined}>
              <span aria-hidden className={cn("block h-1 rounded-full transition-colors duration-200", state === "todo" ? "bg-hairline" : "bg-fg")} />
              <span className={cn("num mt-2 flex items-center gap-1 text-[13px] font-semibold", state === "todo" ? "text-fg-3" : state === "current" ? "text-fg" : "text-fg-2")}>
                {state === "done" ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <span>{n}</span>}
                {label}
                {state === "done" ? <span className="sr-only"> (done)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-2xl border border-transparent bg-card pl-4 pr-11 text-base text-fg transition-colors focus:border-fg-3 focus:bg-card-2 focus:outline-none",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
    </div>
  );
}

function CallToggle({ active, activeClass, onClick, children }: { active: boolean; activeClass: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-[15px] font-semibold transition-[scale,background-color,color] duration-[120ms] ease-out active:scale-[0.97]",
        active ? activeClass : "bg-card text-fg-2 hover:bg-card-2 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function TypeCard({
  selected,
  disabled,
  onClick,
  icon,
  title,
  body,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex min-h-[132px] flex-col items-start gap-3 rounded-2xl bg-card p-4 text-left transition-[scale,background-color] duration-[120ms] ease-out hover:bg-card-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        selected && "bg-card-2 ring-2 ring-fg",
      )}
    >
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute right-4 top-4 inline-flex size-5 items-center justify-center rounded-full border-2",
          selected ? "border-fg bg-fg text-canvas" : "border-fg-3",
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3.5} /> : null}
      </span>
      <span>
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="mt-1 block text-[13px] leading-[1.35] text-fg-2">{body}</span>
      </span>
    </button>
  );
}

function LintPanel({ lint, kind }: { lint: ReturnType<typeof lintMarket>; kind: "panta" | "forecast" }) {
  const tierCopy =
    lint.tier === "C"
      ? { tone: "warn" as const, text: "Not allowed" }
      : lint.tier === "B"
        ? { tone: "default" as const, text: "Free call only: you can influence this" }
        : { tone: "yes" as const, text: kind === "panta" ? "Real money ready" : "Independent outcome" };
  const checks = lint.checks.filter((c) => !(kind === "forecast" && c.id === "independent_outcome"));
  return (
    <section className="px-4 pt-8" aria-label="Checklist">
      <SectionLabel action={<Pill tone={tierCopy.tone}>{tierCopy.text}</Pill>}>Checklist</SectionLabel>
      <ul className="mt-2">
        {checks.map((c) => (
          <li key={c.id} className="flex min-h-11 items-start gap-3 border-b border-hairline py-2.5 last:border-b-0">
            <span
              aria-hidden
              className={cn(
                "mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                c.pass ? "bg-fg text-canvas" : c.severity === "error" ? "bg-no/15 text-no" : "bg-warn/15 text-warn",
              )}
            >
              {c.pass ? <Check className="size-3" strokeWidth={3.5} /> : <X className="size-3" strokeWidth={3.5} />}
            </span>
            <span className={cn("text-[15px] leading-[1.35]", c.pass ? "text-fg-2" : "text-fg")}>
              <span className="sr-only">{c.pass ? "Done: " : c.severity === "error" ? "Needs a fix: " : "Worth a look: "}</span>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
      {lint.reasons.length ? <p className="mt-2 text-[13px] leading-[1.45] text-fg-3">{lint.reasons.join(" ")}</p> : null}
    </section>
  );
}

function CreateSkeleton() {
  return (
    <div className="flex flex-col px-4 pt-5" aria-busy>
      <Skeleton className="h-7 w-32 rounded-full" />
      <Skeleton className="mt-4 h-1 w-full rounded-full" />
      <div className="mt-8 grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[136px]" />
        ))}
      </div>
    </div>
  );
}
