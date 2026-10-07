# Zan — creator calls fans can back or fade

**Creators turn their hot takes into prediction markets their audience can trade, and share them where their fans already are: WhatsApp Status, Instagram Stories, TikTok and X.** Fans tap the link, sign in with a phone number or email, and back or fade the creator's call with a dollar. Real-money markets run on [Panta](https://panta.market) (Solana, USDC); calls about things the creator controls run as free calls.

Built for the Colosseum Crypto World's Fair · Panta API Sidetrack (creator and community products lane).

> Powered by Panta

## How it works

1. **A creator makes a call.** Pick a template (match result, chart position, reality show, award, crypto price) or describe the take. A live checklist makes sure a neutral party can resolve it. The creator posts a public call ("I say YES"), signs the Panta market creation with their own wallet, and earns a share of trading fees set by Panta.
2. **They share it.** One tap produces a 9:16 story image with live odds, a QR code and a short link, plus WhatsApp, X and copy-link options. Every link carries a referral code (`?r=<creator>.<channel>`), so the dashboard shows which channel brought which fans.
3. **Fans back it or fade it.** The landing page works without login inside Instagram, TikTok and X in-app browsers. Fans pick YES/NO from $1, see "Put in $5 → about $8.06 back if YES wins", sign with an embedded wallet, and claim winnings after Panta resolves the market. Every buy and win is reported to Panta's attribution API with the creator's referral code.

## What it does, and what it won't do

| Does | Won't |
| --- | --- |
| Creates Panta markets from the creator's own wallet (fee quote → build → sign → broadcast → register) | Hold user funds or keys. Panta builds unsigned transactions; the user's wallet signs |
| Buys YES/NO in Panta's primary phase (quote → build → sign → submit → verify) and reports to `POST /trades/` | Let creators resolve real-money markets. Panta resolves them |
| Claims winnings and creator fees; reads positions; explores Panta's catalog | Let creators or their declared team wallets trade their own markets |
| Free calls for creator-controlled questions and for fans in regions where real money is off | Run real money in blocked regions (US, UK, India, Brazil, Kenya, Nigeria by default; configurable) |
| Comments with YES/NO holder badges, reactions, follows, accuracy leaderboards, notifications | Rank people by money, add a token or points-for-volume, or show seeded/fake activity |
| Story, square and link-preview images with QR + short link; per-channel funnel | Post on the creator's behalf. Sharing goes through the user's own share sheet |

## Run it

Requirements: Node 20.9+.

```bash
npm install
cp .env.example .env.local   # fill in keys (see below)
npm run dev                  # http://localhost:3000
```

Without any keys the app still runs: it uses an embedded Postgres (PGlite in `.data/`), shows empty states, and explains which feature needs which key.

| Key | Needed for |
| --- | --- |
| `PANTA_API_KEY` | Everything Panta: catalog, quotes, trades, market creation, claims, attribution. `pk_live_` is mainnet; `pk_test_` shows a sandbox banner |
| `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET` | Sign-in (phone, email, Google, Apple, X, wallet) and embedded Solana wallets. Enable SMS, email and the X/Instagram/TikTok OAuth providers in the Privy dashboard |
| `SOLANA_RPC_URL` | Broadcasting and confirming transactions. Use a paid RPC (Helius etc.); the public endpoint rate-limits |
| `DATABASE_URL` | Production Postgres (Supabase, Neon). Migrations in `drizzle/` run automatically on first access |
| `CRON_SECRET` | `/api/cron/sync` (Vercel Cron every 5 minutes): price history, outcomes, team-wallet monitor, reminders, finishing stuck transactions |
| `GEO_HEADER` | Only if not on Vercel: the country header your host sets (e.g. `cf-ipcountry`). Real money stays off when the country is unknown |
| `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL` | Optional "Draft it for me": any chat-completions compatible endpoint with JSON output |

Deploy on Vercel: import the repo, set the variables above, and set `NEXT_PUBLIC_APP_URL` to the production URL (used in share links, QR codes and link previews).

```bash
npm run typecheck   # TypeScript
npm test            # unit tests: linter, normalization, attribution, tx safety, Panta gateway
npm run build       # production build
```

## Integrity and compliance by design

- **Three market tiers.** A: independently verifiable outcomes run with real money. B: anything the creator or their circle can influence ("Will my next video hit 1M?") becomes a free call. C: death, injury, violence, crime, minors and private lives are blocked. The same linter runs in the browser and on the server.
- **Restricted traders.** Creators declare team, manager and family wallets. Those wallets can't trade the creator's markets in the app, and the cron job checks Panta's trade history and flags the market publicly if they trade it anywhere.
- **Disclosure.** Every creator share image and caption carries "#ad · I earn fees", and every Panta surface shows "Powered by Panta".
- **Geofencing and age.** Real money needs a known, allowed country (from the hosting edge, failing closed) and an 18+ confirmation. Elsewhere fans make free calls.
- **Responsible play.** $1 default stake, a $25 daily limit on by default (raising waits 24 hours), breaks, self-exclusion, no confetti, no "bet" language.
- **Honest numbers.** `/traction` shows unique funded wallets, repeat traders and picks by channel from real records, next to Panta's own attribution totals. `EXCLUDED_WALLETS` keeps team wallets out.

## Tech

Next.js 16 (App Router) PWA · Tailwind 4 · Privy embedded Solana wallets · `@solana/web3.js` · Drizzle + Postgres (PGlite locally) · `next/og` share cards · TanStack Query. See [docs/TECH.md](docs/TECH.md) for the architecture, every Panta endpoint and where it's used, the transaction pipeline and the data model.

## Status

- Implemented end to end against Panta's published API contract (docs commit of 17 Sep 2026); unit tests cover the market linter, response normalization, attribution codes, transaction safety checks and the Panta gateway.
- Before demoing on mainnet, run one full pass with a live key: create a market (the creator wallet needs the Panta creation fee in USDC plus a little SOL), make a $1 buy from a phone inside Instagram's browser, then claim after resolution. Open questions to confirm with Panta are listed in [docs/TECH.md](docs/TECH.md#open-questions-for-panta).

## Third-party assets

The bundled Inter font (used in share images) is under the SIL Open Font License; see `assets/fonts/Inter-LICENSE.txt`.
