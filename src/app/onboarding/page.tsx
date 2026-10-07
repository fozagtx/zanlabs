"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { shortAddr } from "@/lib/format";
import type { MeView } from "@/lib/types";
import { Button, Card, Checkbox, Empty, Input, Label, Pill, Skeleton, Textarea } from "@/components/ui";

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
        title="Turn your takes into markets"
        body="Post calls on matches, charts, shows and prices. Your fans back you or fade you, and you earn a share of trading fees set by Panta."
        action={<Button onClick={s.login}>Sign in to start</Button>}
      />
    );
  }
  if (!me) return <Skeleton className="m-4 h-96" />;

  const wallet = s.activeWallet;
  const ready = handle.length >= 3 && name.trim() && over18 && audience && disclosure && wallet;

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

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Set up your creator page</h1>
        <p className="text-sm text-muted">Takes about a minute. Your page lives at zan/@{handle || "you"}.</p>
      </div>

      <Card className="flex flex-col gap-3">
        <Label hint="3–20 letters, numbers or underscores">Handle</Label>
        <Input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="yourhandle" maxLength={20} />
        <Label>Display name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={40} />
        <Label hint="Optional">Bio</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))} placeholder="What do you make calls about?" className="min-h-16" />
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">Verify your socials</p>
        <p className="text-sm text-muted">Linking proves the page is really you and adds a verified badge.</p>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => {
            const linked = me.socials.find((x) => x.provider === p.key);
            return linked ? (
              <Pill key={p.key} tone="yes">
                {p.label}: @{linked.username ?? "linked"}
              </Pill>
            ) : (
              <Button key={p.key} size="sm" variant="outline" onClick={() => s.linkSocial(p.key)}>
                Link {p.label}
              </Button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">Your market wallet</p>
        <p className="text-sm text-muted">
          This wallet creates your markets and receives your creator fees. Creating a real-money market costs a fee set by Panta (paid in USDC from this
          wallet).
        </p>
        <p className="num rounded-xl bg-bg p-3 text-xs">{wallet ?? "Creating your wallet…"}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">Team, manager and family wallets</p>
        <p className="text-sm text-muted">
          People close to you may know things fans don&apos;t. Their wallets can&apos;t trade your markets here, and we flag it publicly if they trade them elsewhere on
          Panta.
        </p>
        {restricted.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={r.wallet}
              onChange={(e) => setRestricted((rs) => rs.map((x, j) => (j === i ? { ...x, wallet: e.target.value } : x)))}
              placeholder="Solana address"
              className="flex-[2]"
            />
            <Input
              value={r.relation}
              onChange={(e) => setRestricted((rs) => rs.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))}
              placeholder="editor"
              className="flex-1"
            />
            <Button variant="ghost" aria-label="Remove" onClick={() => setRestricted((rs) => rs.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="self-start" onClick={() => setRestricted((rs) => [...rs, { wallet: "", relation: "" }])}>
          <Plus className="size-4" /> Add wallet
        </Button>
        {me.creator?.restricted.length ? (
          <p className="text-xs text-muted">Already declared: {me.creator.restricted.map((r) => `${shortAddr(r.wallet)} (${r.relation})`).join(", ")}</p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">The ground rules</p>
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
        <p className="text-xs text-muted">
          Detected region: <b>{me.detectedCountry ?? "unknown"}</b>.{" "}
          {me.realMoneyRegion ? "Real-money markets are available." : "Real-money markets aren't available here; you can post free calls."}
        </p>
      </Card>

      <Button size="lg" loading={busy} disabled={!ready} onClick={submit}>
        {me.role === "creator" ? "Save" : "Create my page"}
      </Button>
    </div>
  );
}
