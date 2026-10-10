"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AtSign, Check, MapPin, Plus, Sparkles, Trash2, Wallet } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { shortAddr } from "@/lib/format";
import type { MeView } from "@/lib/types";
import { Button, Checkbox, Empty, IconButton, Input, Label, ListRow, Pill, SectionLabel, Skeleton, Spinner, Textarea, cn } from "@/components/ui";

const PROVIDERS = [
  { key: "x" as const, label: "X" },
  { key: "instagram" as const, label: "Instagram" },
  { key: "tiktok" as const, label: "TikTok" },
];

// Creator onboarding: profile, verified socials, eligibility, disclosure, and
// the team wallets that may not trade the creator's markets.
export default function Onboarding() {
  const s = useSession();
  const router = useRouter();
  const me = s.me;
  const uid = useId();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [over18, setOver18] = useState(false);
  const [audience, setAudience] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [restricted, setRestricted] = useState<{ wallet: string; relation: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    setHandle((h) => h || me.handle || me.socials.find((x) => x.provider === "x")?.username?.toLowerCase() || "");
    setName((n) => n || me.displayName || "");
  }, [me]);

  if (!s.authenticated) {
    return (
      <Empty
        icon={<Sparkles />}
        title="Turn your takes into markets"
        body="Post calls on matches, charts, shows and prices. Your fans back you or fade you, and you earn a share of trading fees set by Panta."
        action={
          <Button type="button" size="lg" onClick={s.login}>
            Sign in to start
          </Button>
        }
      />
    );
  }
  if (!me) return <OnboardingSkeleton />;

  const wallet = s.activeWallet;
  const ready = handle.length >= 3 && name.trim() && over18 && audience && disclosure && wallet;
  const missing =
    handle.length < 3
      ? "Pick a handle of at least 3 characters."
      : !name.trim()
        ? "Add a display name."
        : !(over18 && audience && disclosure)
          ? "Agree to the ground rules to continue."
          : !wallet
            ? "Waiting for your wallet…"
            : null;

  async function submit() {
    setBusy(true);
    try {
      const m = await api<MeView>("/api/creator/onboard", {
        body: {
          handle,
          displayName: name.trim(),
          bio: bio.trim() || undefined,
          createWallet: wallet,
          over18: true,
          audienceAdult: true,
          disclosure: true,
          restricted: restricted.filter((r) => r.wallet.trim()).map((r) => ({ wallet: r.wallet.trim(), relation: r.relation.trim() || "team" })),
        },
      });
      s.setMe(m);
      toast.success(m.creator?.realMoneyEnabled ? "You're set up. Post your first call." : "You're set up for free calls. Real-money markets aren't available in your region yet.");
      router.push("/create");
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  const ids = { handle: `${uid}-handle`, name: `${uid}-name`, bio: `${uid}-bio` };

  return (
    <div className="flex flex-col">
      <header className="px-4 pt-5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em]">Set up your creator page</h1>
        <p className="mt-1 text-[15px] leading-[1.45] text-fg-2">
          Takes about a minute. Your page lives at <span className="font-semibold text-fg">zan/@{handle || "you"}</span>.
        </p>
      </header>

      {/* Profile */}
      <section className="px-4 pt-8" aria-label="Profile">
        <SectionLabel>Profile</SectionLabel>
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.handle} hint="3–20 letters, numbers or underscores">
              Handle
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-fg-3" aria-hidden>
                @
              </span>
              <Input
                id={ids.handle}
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="yourhandle"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.name}>Display name</Label>
            <Input id={ids.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={40} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.bio} hint="Optional">
              Bio
            </Label>
            <Textarea id={ids.bio} value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))} placeholder="What do you make calls about?" className="min-h-20" />
            <p className="num -mt-1 text-right text-[11px] text-fg-3">{bio.length}/160</p>
          </div>
        </div>
      </section>

      {/* Socials */}
      <section className="px-4 pt-8" aria-label="Verify your socials">
        <SectionLabel>Verify your socials</SectionLabel>
        <p className="mt-1 text-[13px] leading-[1.45] text-fg-2">Linking proves the page is really you and adds a verified badge.</p>
        <div className="mt-1">
          {PROVIDERS.map((p) => {
            const linked = me.socials.find((x) => x.provider === p.key);
            return (
              <Row
                key={p.key}
                icon={<AtSign />}
                title={p.label}
                sub={linked ? `@${linked.username ?? "linked"}` : "Not linked"}
                right={
                  linked ? (
                    <Pill tone="accent">
                      <Check strokeWidth={3} aria-hidden /> Verified
                    </Pill>
                  ) : (
                    <Button type="button" size="md" variant="secondary" aria-label={`Link ${p.label}`} onClick={() => s.linkSocial(p.key)}>
                      Link
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      </section>

      {/* Market wallet */}
      <section className="px-4 pt-8" aria-label="Your market wallet">
        <SectionLabel>Your market wallet</SectionLabel>
        <div className="mt-1">
          <Row
            icon={<Wallet />}
            title="Market wallet"
            wrap
            sub={
              wallet ? (
                <span className="num break-all text-fg-2">{wallet}</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-3.5" /> Creating your wallet…
                </span>
              )
            }
          />
        </div>
        <p className="mt-2 text-[13px] leading-[1.45] text-fg-2">
          This wallet creates your markets and receives your creator fees. Creating a real-money market costs a fee set by Panta (paid in USDC from this wallet).
        </p>
      </section>

      {/* Team wallets */}
      <section className="px-4 pt-8" aria-label="Team, manager and family wallets">
        <SectionLabel>Team, manager and family wallets</SectionLabel>
        <p className="mt-1 text-[13px] leading-[1.45] text-fg-2">
          People close to you may know things fans don&apos;t. Their wallets can&apos;t trade your markets here, and we flag it publicly if they trade them elsewhere on
          Panta.
        </p>
        {restricted.length ? (
          <ul className="mt-1">
            {restricted.map((r, i) => (
              <li key={i} className="flex items-start gap-2 border-b border-hairline py-3 last:border-b-0">
                <div className="grid min-w-0 flex-1 gap-2">
                  <Input
                    value={r.wallet}
                    onChange={(e) => setRestricted((rs) => rs.map((x, j) => (j === i ? { ...x, wallet: e.target.value } : x)))}
                    placeholder="Solana address"
                    aria-label={`Wallet ${i + 1} address`}
                    autoComplete="off"
                    spellCheck={false}
                    className="num"
                  />
                  <Input
                    value={r.relation}
                    onChange={(e) => setRestricted((rs) => rs.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))}
                    placeholder="editor"
                    aria-label={`Wallet ${i + 1} relation, for example editor`}
                  />
                </div>
                <IconButton label={`Remove wallet ${i + 1}`} size="lg" onClick={() => setRestricted((rs) => rs.filter((_, j) => j !== i))}>
                  <Trash2 className="size-[18px] text-fg-2" aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : null}
        <Button type="button" size="md" variant="secondary" className="mt-3 w-full" onClick={() => setRestricted((rs) => [...rs, { wallet: "", relation: "" }])}>
          <Plus className="size-4" aria-hidden /> Add wallet
        </Button>
        {me.creator?.restricted.length ? (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-3">Already declared</p>
            <div className="mt-1">
              {me.creator.restricted.map((r) => (
                <ListRow key={r.wallet} label={<span className="num text-fg">{shortAddr(r.wallet)}</span>} value={r.relation} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Ground rules */}
      <section className="px-4 pt-8" aria-label="The ground rules">
        <SectionLabel>The ground rules</SectionLabel>
        <div className="mt-2 flex flex-col gap-1">
          <Checkbox checked={over18} onChange={setOver18}>
            I&apos;m 18 or older.
          </Checkbox>
          <Checkbox checked={audience} onChange={setAudience}>
            My audience is mostly adults, and I won&apos;t promote markets to people under 18.
          </Checkbox>
          <Checkbox checked={disclosure} onChange={setDisclosure}>
            I&apos;ll keep the &quot;#ad · I earn fees&quot; label on posts promoting real-money markets, and I won&apos;t create markets on things I or my team
            control.
          </Checkbox>
        </div>
        <div className="mt-3">
          <ListRow
            icon={<MapPin />}
            label="Detected region"
            value={me.detectedCountry ?? "unknown"}
            sub={me.realMoneyRegion ? "Real-money markets are available." : "Real-money markets aren't available here; you can post free calls."}
          />
        </div>
      </section>

      <div className="sticky bottom-[var(--bottom-nav-h)] z-20 mt-8 border-t border-hairline bg-raised/95 px-4 py-3 backdrop-blur-xl">
        {missing ? <p className="mb-2 text-center text-[13px] text-fg-2">{missing}</p> : null}
        <Button type="button" size="lg" className="w-full" loading={busy} disabled={!ready} onClick={submit}>
          {me.role === "creator" ? "Save" : "Create my page"}
        </Button>
      </div>
    </div>
  );
}

function Row({ icon, title, sub, right, wrap }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; wrap?: boolean }) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-hairline py-3 last:border-b-0">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-fg [&_svg]:size-[18px]" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-[1.35] text-fg">{title}</span>
        {sub ? <span className={cn("mt-0.5 block text-[13px] leading-[1.35] text-fg-3", !wrap && "truncate")}>{sub}</span> : null}
      </span>
      {right ? <span className="shrink-0">{right}</span> : null}
    </div>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="flex flex-col px-4 pt-5" aria-busy>
      <Skeleton className="h-7 w-56 rounded-full" />
      <Skeleton className="mt-2 h-4 w-64 rounded-full" />
      <Skeleton className="mt-8 h-12 w-full" />
      <Skeleton className="mt-4 h-12 w-full" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  );
}
