"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Camera, Check, Link as LinkIcon, MessageCircle, Music2, User, X } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { Studio } from "@/components/studio";
import { PoweredByPanta } from "@/components/brand";
import { ListRow, Pill, Skeleton, cn } from "@/components/ui";

// Home. A creator lands on their studio; everyone else gets a short pitch
// pointing at Create. Fans never browse markets here: they arrive on a single
// market from a link a creator shared.
export default function Home() {
  const s = useSession();
  // Until we know who this is, show a neutral placeholder instead of flashing
  // the landing at a creator (or the studio at a fan). If the account can't
  // load, fall back to the landing rather than a placeholder that never ends.
  if (!s.ready || (s.authenticated && !s.me && !s.meFailed)) return <HomeSkeleton />;
  if (s.me?.role === "creator") return <Studio me={s.me} />;
  return <Landing fan={s.authenticated} />;
}

const linkButton = (variant: "primary" | "secondary") =>
  cn(
    "inline-flex h-[52px] w-full select-none items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-[scale,background-color] duration-[120ms] ease-out active:scale-[0.97]",
    variant === "primary" ? "bg-brand text-black hover:bg-white/90" : "bg-card text-fg hover:bg-card-2",
  );

// lucide has no brand marks, so each channel gets the same neutral glyph as in the share sheet.
const CHANNELS: { label: string; icon: ReactNode | null }[] = [
  { label: "WhatsApp", icon: <MessageCircle aria-hidden /> },
  { label: "Instagram", icon: <Camera aria-hidden /> },
  { label: "TikTok", icon: <Music2 aria-hidden /> },
  // The label already reads "X"; a glyph would repeat it.
  { label: "X", icon: null },
  { label: "Copy link", icon: <LinkIcon aria-hidden /> },
];

function Landing({ fan }: { fan: boolean }) {
  return (
    <div className="flex flex-col px-4 pb-10 pt-10">
      <section aria-labelledby="home-title">
        <h1 id="home-title" className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em]">
          Your take.
          <br />
          Your market.
        </h1>
        <p className="mt-4 text-[17px] leading-[1.45] text-fg-2">
          Post a question your fans argue about and share the link on WhatsApp, Instagram, TikTok or X. Fans pick YES or NO in USDC on Panta, and you earn
          a share of the fees.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/create" className={linkButton("primary")}>
            Create a market
          </Link>
          <Link href="/about" className={linkButton("secondary")}>
            How it works
          </Link>
        </div>
      </section>

      {fan ? (
        <div className="mt-6 border-y border-hairline">
          <ListRow href="/portfolio" icon={<User aria-hidden />} label="Your picks" sub="Open picks, results and free calls" />
        </div>
      ) : null}

      <section aria-labelledby="home-steps" className="mt-12">
        <h2 id="home-steps" className="text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-3">
          Three steps
        </h2>
        <ol className="mt-2">
          <Step n={1} title="Create">
            Write the question and make your call.
          </Step>
          <Step n={2} title="Share">
            Copy the link or post the story image.
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Share to">
              {CHANNELS.map((c) => (
                <li key={c.label}>
                  <Pill className="h-8 gap-1.5 px-3 text-[13px] [&_svg]:size-4">
                    {c.icon}
                    {c.label}
                  </Pill>
                </li>
              ))}
            </ul>
          </Step>
          <Step n={3} title="Fans pick">
            They tap your link and pick YES or NO.
            <span className="mt-3 flex gap-1.5" aria-hidden>
              <Pill tone="yes" className="h-8 px-3 text-[13px] [&_svg]:size-4">
                <Check strokeWidth={3} /> YES
              </Pill>
              <Pill tone="no" className="h-8 px-3 text-[13px] [&_svg]:size-4">
                <X strokeWidth={3} /> NO
              </Pill>
            </span>
          </Step>
        </ol>
        <p className="mt-4 text-[13px] leading-[1.45] text-fg-3">
          Real-money picks are for adults (18+) and only where they&apos;re allowed. Elsewhere you can make free calls.
        </p>
      </section>

      <PoweredByPanta className="mt-10 inline-flex min-h-11 items-center self-center" />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4 border-b border-hairline py-5 last:border-b-0">
      <span className="num inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-[15px] font-bold text-fg" aria-hidden>
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <h3 className="text-[17px] font-bold leading-tight tracking-[-0.01em]">{title}</h3>
        <div className="mt-1 text-[15px] leading-[1.45] text-fg-2">{children}</div>
      </div>
    </li>
  );
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col px-4 pt-10">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="mt-3 h-10 w-1/2" />
      <Skeleton className="mt-6 h-16 w-full" />
      <Skeleton className="mt-8 h-[52px] w-full rounded-full" />
      <Skeleton className="mt-3 h-[52px] w-full rounded-full" />
    </div>
  );
}
