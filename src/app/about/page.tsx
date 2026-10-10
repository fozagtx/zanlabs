import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ChartNoAxesColumn } from "lucide-react";
import { PoweredByPanta } from "@/components/brand";
import { ListRow, SectionLabel } from "@/components/ui";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "How it works" };

const body = "text-[15px] leading-[1.6] text-fg/90";

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-[calc(var(--top-bar-h)+16px)]">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** Long-form list as hairline rows. `numbered` for steps that happen in order. */
function Rows({ items, numbered }: { items: ReactNode[]; numbered?: boolean }) {
  const List = numbered ? "ol" : "ul";
  return (
    <List>
      {items.map((it, i) => (
        <li key={i} className={`flex gap-3 border-b border-hairline py-3.5 last:border-b-0 ${body}`}>
          {numbered ? (
            <span className="num inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-[12px] font-semibold text-fg-2" aria-hidden>
              {i + 1}
            </span>
          ) : (
            <span className="mt-[0.66em] size-1.5 shrink-0 rounded-full bg-fg-3" aria-hidden />
          )}
          <span className="min-w-0 flex-1">{it}</span>
        </li>
      ))}
    </List>
  );
}

export default function About() {
  return (
    <article className="flex flex-col px-4 pb-12 pt-6">
      <h1 className="text-[22px] font-bold tracking-[-0.01em] text-fg">How {APP_NAME} works</h1>
      <p className={`mt-3 ${body}`}>
        Creators post calls about things fans already argue about: matches, charts, award shows, reality TV, prices. Fans back the call or fade it.
        Real-money markets run on Panta, a prediction-market protocol on Solana, in USDC.
      </p>

      <Section title="For fans">
        <Rows
          numbered
          items={[
            <>Open a creator&apos;s link. No sign-up needed to look.</>,
            <>
              Pick YES or NO and an amount (from $1). We show what you put in, what you get back if you&apos;re right, and the fee before you confirm.
            </>,
            <>Sign in with phone or email; we create a Solana wallet only you control. You confirm every transaction.</>,
            <>You hold until the result. When Panta resolves the market, winners claim in Picks.</>,
          ]}
        />
      </Section>

      <Section title="For creators">
        <Rows
          items={[
            <>Turn a take into a precise question with a template. A checklist makes sure a neutral party can resolve it.</>,
            <>Creating a real-money market costs a fee set by Panta, paid from your wallet. You earn a share of trading fees set by Panta.</>,
            <>Share a story image with a QR code and short link to WhatsApp Status, Instagram Stories, TikTok or X. Every share is tracked.</>,
            <>Questions about things you control (your own uploads, followers, views) run as free calls with no money.</>,
          ]}
        />
      </Section>

      <Section id="resolution" title="Who decides the result">
        <p className={body}>
          Panta resolves real-money markets, not the creator. Its resolver checks the sources named in the rule, posts a result with a dispute window and
          settles on-chain. Creators settle free calls themselves and must link evidence.
        </p>
      </Section>

      <Section id="integrity" title="Fair play">
        <Rows
          items={[
            <>
              Creators can&apos;t trade their own markets. Wallets they declare for their team, manager or family can&apos;t either, and we flag it publicly if
              they trade on Panta directly.
            </>,
            <>Markets about death, injury, violence, crime, minors or private lives are blocked.</>,
            <>Creators label promotions &quot;#ad · I earn fees&quot;. The label is printed on every share image.</>,
            <>Leaderboards rank accuracy, never money. Team wallets are excluded from all stats.</>,
          ]}
        />
      </Section>

      <Section id="responsible" title="Play responsibly">
        <Rows
          items={[
            <>Real-money picks are for adults (18+) and only where they&apos;re allowed. Elsewhere you can make free calls.</>,
            <>Daily limits are on by default ($25). Lowering is instant; raising waits 24 hours. Take a break or exclude yourself anytime in Wallet.</>,
            <>Only stake what you&apos;re happy to lose. Prices are estimates until Panta settles the market.</>,
          ]}
        />
      </Section>

      <Section title="Fees and custody">
        <p className={body}>
          We never hold your funds or keys. Panta prepares unsigned transactions, your wallet signs, we broadcast them and report the trade to Panta so the
          creator gets credit. Panta charges a trading fee on each pick (shown before you confirm).
        </p>
      </Section>

      <div className="mt-10 border-t border-hairline">
        <ListRow href="/traction" icon={<ChartNoAxesColumn aria-hidden />} label="See live traction" />
      </div>
      <div className="mt-4 flex justify-center">
        <PoweredByPanta className="inline-flex min-h-11 items-center" />
      </div>
    </article>
  );
}
