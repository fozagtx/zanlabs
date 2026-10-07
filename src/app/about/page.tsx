import Link from "next/link";
import type { Metadata } from "next";
import { PoweredByPanta } from "@/components/brand";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "How it works" };

const H = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <h2 id={id} className="mt-6 text-lg font-bold">
    {children}
  </h2>
);

export default function About() {
  return (
    <article className="flex flex-col gap-2 px-4 pb-12 pt-4 text-[15px] leading-relaxed text-ink/90">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">How {APP_NAME} works</h1>
      <p>
        Creators post calls about things fans already argue about: matches, charts, award shows, reality TV, prices. Fans back the call or fade it.
        Real-money markets run on Panta, a prediction-market protocol on Solana, in USDC.
      </p>

      <H>For fans</H>
      <ul className="list-disc pl-5">
        <li>Open a creator&apos;s link. No sign-up needed to look.</li>
        <li>Pick YES or NO and an amount (from $1). We show what you put in, what you get back if you&apos;re right, and the fee before you confirm.</li>
        <li>Sign in with phone or email; we create a Solana wallet only you control. You confirm every transaction.</li>
        <li>You hold until the result. When Panta resolves the market, winners claim in Picks.</li>
      </ul>

      <H>For creators</H>
      <ul className="list-disc pl-5">
        <li>Turn a take into a precise question with a template. A checklist makes sure a neutral party can resolve it.</li>
        <li>Creating a real-money market costs a fee set by Panta, paid from your wallet. You earn a share of trading fees set by Panta.</li>
        <li>Share a story image with a QR code and short link to WhatsApp Status, Instagram Stories, TikTok or X. Every share is tracked.</li>
        <li>Questions about things you control (your own uploads, followers, views) run as free calls with no money.</li>
      </ul>

      <H id="resolution">Who decides the result</H>
      <p>
        Panta resolves real-money markets, not the creator. Its resolver checks the sources named in the rule, posts a result with a dispute window and
        settles on-chain. Creators settle free calls themselves and must link evidence.
      </p>

      <H id="integrity">Fair play</H>
      <ul className="list-disc pl-5">
        <li>Creators can&apos;t trade their own markets. Wallets they declare for their team, manager or family can&apos;t either, and we flag it publicly if they trade on Panta directly.</li>
        <li>Markets about death, injury, violence, crime, minors or private lives are blocked.</li>
        <li>Creators label promotions &quot;#ad · I earn fees&quot;. The label is printed on every share image.</li>
        <li>Leaderboards rank accuracy, never money. Team wallets are excluded from all stats.</li>
      </ul>

      <H id="responsible">Play responsibly</H>
      <ul className="list-disc pl-5">
        <li>Real-money picks are for adults (18+) and only where they&apos;re allowed. Elsewhere you can make free calls.</li>
        <li>Daily limits are on by default ($25). Lowering is instant; raising waits 24 hours. Take a break or exclude yourself anytime in Wallet.</li>
        <li>Only stake what you&apos;re happy to lose. Prices are estimates until Panta settles the market.</li>
      </ul>

      <H>Fees and custody</H>
      <p>
        We never hold your funds or keys. Panta prepares unsigned transactions, your wallet signs, we broadcast them and report the trade to Panta so the
        creator gets credit. Panta charges a trading fee on each pick (shown before you confirm).
      </p>

      <div className="mt-6 flex items-center justify-between">
        <Link href="/traction" className="text-sm font-semibold text-coral">
          See live traction →
        </Link>
        <PoweredByPanta />
      </div>
    </article>
  );
}
