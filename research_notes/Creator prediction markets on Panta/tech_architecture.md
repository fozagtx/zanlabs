# Technical Architecture & Tech Stack for a Creator-Led Social Prediction Market PWA on Solana (Panta API)

Research date: 2026-10-07. Scope: everything around the Panta API (Panta specifics are covered by another researcher). Method note: direct page fetches were blocked in this environment (WebFetch/curl to docs sites failed with DNS/proxy denials), so findings come from (a) web search result extracts of official docs, (b) the npm registry queried live on 2026-10-07 (`npm view <pkg> version/time/dist-tags/peerDependencies/readme`) — package READMEs pulled from npm are primary sources — and (c) the LLM vendor's published model reference (2026-10-06) for AI model IDs. Where only third-party sources exist, this is flagged.

---

## 1. Frontend stack: Next.js (App Router) PWA vs alternatives; React Native/Expo later; UI, animation, state

### Takeaway
Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui + Motion + TanStack Query v5 is the pragmatic 2026 choice for a share-link-driven PWA: server-rendered market pages give fast first paint and per-market Open Graph images for WhatsApp/X/Instagram/TikTok link previews, and `app/manifest.ts` and a Serwist service worker cover installability and push. Keep Expo for a later native app, sharing the `packages/*` logic.

### Cited Findings
- Current versions (npm registry, 2026-10-07): `next` 16.4.0, `react` 19.3.0, `tailwindcss` 4.3.3, `motion` 14.0.0 (and `framer-motion` 14.0.0, same release), `@tanstack/react-query` 5.104.1, `shadcn` CLI 4.21.4, `zod` 4.6.5, `vaul` 1.1.2, `sonner` 2.0.8, `lucide-react` 1.52.0, `next-intl` 4.14.9 — [npm next](https://www.npmjs.com/package/next), [npm react](https://www.npmjs.com/package/react), [npm tailwindcss](https://www.npmjs.com/package/tailwindcss), [npm motion](https://www.npmjs.com/package/motion), [npm @tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query), [npm shadcn](https://www.npmjs.com/package/shadcn), [npm zod](https://www.npmjs.com/package/zod)
- Next.js 16 replaces `middleware.ts` with `proxy.ts`; `middleware.ts` still runs but is deprecated and will be removed; a codemod exists (`npx @next/codemod@canary middleware-to-proxy .`); Proxy defaults to the Node.js runtime (middleware defaulted to Edge); Node.js 20.9+ is required for Next.js 16 — [Vercel Academy: proxy basics](https://vercel.com/academy/nextjs-foundations/proxy-basics); [johnkavanagh.co.uk](https://johnkavanagh.co.uk/articles/next-js-proxy-replaces-middleware/); [HUMAN Security Next.js 16 install doc](https://docs.humansecurity.com/applications/installation-nextjs-16)
- The App Router supports a native manifest via `app/manifest.ts` (typed `MetadataRoute.Manifest`) or static `app/manifest.json`; the official Next.js PWA guide covers manifest, push notifications (VAPID + `web-push`) and service workers; the built-in manifest gives no automatic offline support or SW generation, and Serwist is the commonly recommended SW tool — [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps); [nextjs-pwa skill summary](https://skills.sh/jakerains/agentskills/nextjs-pwa)
- Serwist versions: `@serwist/next` / `serwist` 9.5.13 (published 2026-10-04); legacy `next-pwa` is at 5.6.0 (old, Workbox-based) — [npm @serwist/next](https://www.npmjs.com/package/@serwist/next), [npm next-pwa](https://www.npmjs.com/package/next-pwa)
- React Native path: `expo` 57.0.27, `react-native` 0.87.1; Privy has an Expo SDK (`@privy-io/expo` 0.76.1) and Phantom ships `@phantom/react-native-sdk` (browser-extension connections are not available on React Native) — [npm expo](https://www.npmjs.com/package/expo), [npm @privy-io/expo](https://www.npmjs.com/package/@privy-io/expo), [Phantom Connect docs](https://docs.phantom.com/phantom-connect.md)
- On iOS, web push works only for a PWA added to the Home Screen and launched from its icon (since iOS 16.4); Declarative Web Push arrived with Safari/iOS 18.4 — [WebKit: Safari 18.4](https://webkit.org/blog/16574/digital-credentials-api/); [Pushpad iOS requirements](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications)

### Inferences
- **Recommended stack:** Next.js 16.4 App Router, deployed on Vercel. Market pages (`/m/[slug]`) are React Server Components that fetch cached Panta market data, with `generateMetadata` and `opengraph-image.tsx` for rich previews. Client islands handle trading, using TanStack Query for Panta prices/positions, plus Motion for odds-tick and bet-confirm micro-animations. shadcn/ui on Tailwind v4 supplies primitives, `vaul` handles the bottom-sheet bet slip (mobile-native feel), and `sonner` handles toasts.
- **Why not Vite SPA / Remix / SvelteKit:** share links are the acquisition channel, so server-rendered OG/meta per market is non-negotiable. Every major wallet SDK (Privy, Phantom, Dynamic) also ships React-first SDKs. Next.js is the lowest-risk option for a small team.
- **State:** keep server state in TanStack Query (keys such as `['market', id]`, `['positions', wallet]`). Keep local UI state in React state or Zustand. Avoid a global store for chain data. Push live odds into the Query cache via `queryClient.setQueryData` from a websocket/SSE handler.
- **Expo later:** move the Panta client, tx-verification, zod schemas and DB types into `packages/*` now, so an Expo app can reuse them. Privy and Phantom both have RN SDKs. Mobile Wallet Adapter is native on Android.
- **Watch out:** in `proxy.ts`, set the `matcher` so it does not intercept `/manifest.webmanifest`, `/sw.js`, `/actions.json`, `/api/actions/*`, or OG image routes.

### Gaps
- No primary-source benchmark comparing Next.js 16 vs alternatives for PWAs was found; the recommendation is reasoned, not measured.
- Motion 14 / framer-motion 14 changelog (breaking changes vs v12) not reviewed.

---

## 2. Wallets & auth on Solana in 2026 (Privy, Dynamic, Phantom Connect, Web3Auth, Para, Turnkey, Crossmint, Wallet Adapter/Wallet Standard, MWA); @solana/kit vs web3.js v1; signing a base64 server-built VersionedTransaction

### Takeaway
For non-crypto fans arriving from social links, use **Privy embedded Solana wallets** as the primary option: email/SMS/social login, a mature React hook API for signing raw tx bytes, native gas sponsorship, an Expo SDK, and global fiat onramps, and Stripe-owned since June 2025. Add a **Wallet Standard** path (Privy's external-wallet support or `@solana/wallet-adapter-react`) for crypto-native users, plus **Mobile Wallet Adapter** for Android Chrome. Phantom Connect is a strong alternative with Google/Apple login, but its embedded wallets reject pre-signed transactions, which matters if Panta returns partially-signed txs. Use `@solana/kit` 8.x on the server and in new code. Keep web3.js v1 (1.99.0) only where wallet-adapter or Blinks libraries require it.

### Cited Findings
**Market structure / pricing**
- Consolidation: Stripe acquired Privy (June 2025); Fireblocks acquired Dynamic (~$90M); Consensys acquired Web3Auth; Payward (Kraken) acquired Magic's wallet business. The products continue to operate independently — [Crossmint: Privy alternatives](https://www.crossmint.com/learn/privy-alternatives-for-programmable-wallets); [Spark embedded wallet comparison](https://www.spark.money/tools/crypto-embedded-wallet-comparison)
- Key-management models: Privy uses TEE + Shamir splitting. Dynamic uses TSS-MPC (Fireblocks) with a 1,000-MAU free tier. Turnkey uses AWS Nitro enclaves with per-signature pricing (Turnkey's own page: 25 free signatures/month, ~$0.10 each at low volume, ~$0.01 at scale). Para (formerly Capsule) uses distributed MPC, is passkey-first, and has a 1,200-MAU free tier. Privy pricing figures conflict across third-party sources ($0–$499/mo tiers vs "$99/mo + $0.05/MAW") — [Spark](https://www.spark.money/tools/crypto-embedded-wallet-comparison); [Turnkey vs Privy pricing](https://www.turnkey.com/vs/privy-pricing-and-licensing); [Costbench](https://www.costbench.com/compare/dynamic-vs-privy/) (Turnkey and Crossmint pages are vendor-biased)
- SDK versions (npm, 2026-10-07): `@privy-io/react-auth` 3.48.0; `@privy-io/node` 0.35.0 (the old `@privy-io/server-auth` 1.32.5 is **deprecated** with "use @privy-io/node instead"); `@phantom/react-sdk` 2.0.4; `@dynamic-labs/sdk-react-core` 5.9.6; `@getpara/react-sdk` 3.21.0; `@turnkey/react-wallet-kit` 2.5.2; `@web3auth/modal` 11.4.2; `@crossmint/client-sdk-react-ui` 4.9.1; `@coinbase/cdp-react` 0.0.127 — [npm @privy-io/react-auth](https://www.npmjs.com/package/@privy-io/react-auth), [npm @privy-io/server-auth](https://www.npmjs.com/package/@privy-io/server-auth), [npm @privy-io/node](https://www.npmjs.com/package/@privy-io/node), [npm @phantom/react-sdk](https://www.npmjs.com/package/@phantom/react-sdk), [npm @dynamic-labs/sdk-react-core](https://www.npmjs.com/package/@dynamic-labs/sdk-react-core)
- `@privy-io/node` runs on Node 20+, Deno, Bun, Cloudflare Workers and Vercel Edge. It throws in browsers. Its peer deps include `@solana/kit ^5.1.0` and x402 packages — [npm @privy-io/node README](https://www.npmjs.com/package/@privy-io/node)

**Privy (signing raw bytes)**
- React: `useSignAndSendTransaction` (and `useWallets`) are imported from `@privy-io/react-auth/solana`. The input takes a `Uint8Array` transaction, a connected Solana wallet, optional `chain`, and `options` (`uiOptions`, boolean `sponsor`). It resolves to `{ signature: Uint8Array }`. `solana.rpcs` config is required for embedded-wallet UI methods, `signTransaction` and `signAndSendTransaction`. To let Privy fill `recentBlockhash`, pass an all-ones placeholder — [Privy: send a Solana transaction](https://docs.privy.io/wallets/using-wallets/solana/send-a-transaction.md); [Privy React Solana usage](https://docs.privy.io/guide/react/wallets/embedded/solana/usage)
- Privy identifies chains with CAIP-2 IDs, e.g. `solana:mainnet` — [Privy fiat onramp docs](https://docs.privy.io/wallets/funding/fiat-onramp.md)
- Privy documents an Android Mobile Wallet Adapter recipe — [Privy: adding Solana MWA](https://docs.privy.io/recipes/solana/adding-solana-mwa)

**Phantom Connect**
- `@phantom/react-sdk`: `PhantomProvider config={{ providers: ["google","apple","phantom","injected","deeplink"], appId, addressTypes: [AddressType.solana] }}`. `appId` comes from Phantom Portal and is required for embedded providers. Hooks: `useModal`, `useConnect`, `useAccounts`, `useSolana` (`signMessage`, `signTransaction`, `signAndSendTransaction`, `switchNetwork`). Works with `@solana/web3.js` OR `@solana/kit` — [npm @phantom/react-sdk README](https://www.npmjs.com/package/@phantom/react-sdk)
- **"Phantom embedded wallets do not accept pre-signed transactions."** A second signer (e.g., an app fee payer) must sign via the `presignTransaction` callback passed to `signAndSendTransaction`, *after* Phantom has constructed and validated the tx. This does not apply to the injected extension. Never hold a fee-payer keypair in frontend code — [npm @phantom/react-sdk README](https://www.npmjs.com/package/@phantom/react-sdk)
- Embedded wallets have spending-limit controls, domain binding, real-time risk evaluation and 7-day sessions. Flow: Google/Apple login → 4-digit PIN → approvals. Template: `npx -y create-solana-dapp@latest -t solana-foundation/templates/community/phantom-embedded-react` — [Phantom Connect docs](https://docs.phantom.com/phantom-connect.md); [Phantom social login recipe](https://docs.phantom.com/recipes/auth/social-login.md)

**Dynamic**
- Pattern: `isSolanaWallet(primaryWallet)` (from `@dynamic-labs/solana`) → `getSigner()` → `signAndSendTransaction(versionedTx)`. Older v4 snippets misspell the helper as `isSolanaWalet`. Some doc versions route embedded wallets through a different signer type (`IEmbeddedWalletSolanaSigner`) — [Dynamic: send versioned Solana transaction](https://www.dynamic.xyz/docs/wallets/using-wallets/solana/send-versioned-solana-transaction); [Dynamic v4 docs](https://v4.docs.dynamic.xyz/wallets/using-wallets/solana/send-versioned-solana-transaction)

**Solana JS libraries**
- `@solana/kit` latest is **8.4.0** (2026-09-28). Majors shipped fast: 6.0.0 (2026-02-04), 7.0.0 (2026-06-30), 8.0.0 (2026-08-21). The `canary` tag is 8.5.0-canary — [npm @solana/kit](https://www.npmjs.com/package/@solana/kit)
- `@solana/web3.js`: `latest` = **1.99.0** (2026-09-08), `next` = **3.0.2** (2026-10-07). 3.0.x depends on `@solana/kit ^8.4.0`, `@solana/signers`, and `@solana-program/*`, so it appears to be a v1-compatible API reimplemented on Kit — [npm @solana/web3.js](https://www.npmjs.com/package/@solana/web3.js)
- `@solana/compat` 8.4.0 ("Helpers for converting from legacy web3js classes"); `@solana/react` 8.4.0 (Kit's React bindings); `@solana-program/token` 0.17.0, `@solana-program/token-2022` 0.19.0, `@solana-program/compute-budget` 0.19.0, `@solana-program/system` 0.15.0 (peer `@solana/kit ^8.3.0`) — [npm @solana/compat](https://www.npmjs.com/package/@solana/compat), [npm @solana-program/system](https://www.npmjs.com/package/@solana-program/system)
- Solana Foundation "framework-kit": `@solana/client` 1.7.0 + `@solana/react-hooks` 1.4.1 (`SolanaProvider`, `useWalletConnection`, `useSendTransaction`, `useSimulateTransaction`, `useWaitForSignature`, `autoDiscover()` wallet connectors). Last modified Jan 2026 — [npm @solana/react-hooks README](https://www.npmjs.com/package/@solana/react-hooks); [npm @solana/client](https://www.npmjs.com/package/@solana/client)
- `@solana/connector` 0.3.0 (ConnectorKit): headless Wallet Standard connector with built-in MWA, WalletConnect, and support for both Kit and legacy web3.js — [npm @solana/connector README](https://www.npmjs.com/package/@solana/connector)
- Legacy adapter: `@solana/wallet-adapter-react` 0.15.40 (2026-09-10), peer `@solana/web3.js ^1.99.0` — [npm @solana/wallet-adapter-react](https://www.npmjs.com/package/@solana/wallet-adapter-react)
- `helius-sdk` 2.0+ was rewritten on `@solana/kit` (current 3.2.0) — [npm helius-sdk README](https://www.npmjs.com/package/helius-sdk)

**Mobile Wallet Adapter (web)**
- Add `@solana-mobile/wallet-standard-mobile` (0.7.0) and call `registerMwa` from the root component in a **non-SSR context** (important for Next.js). Works on Chrome for Android, including Chrome PWAs. Firefox/Opera/Brave are not supported. **Not available on any iOS browser.** Supported wallets: Seed Vault, Solflare, Phantom. Use `@solana/wallet-adapter-react` ≥0.15.36. Set a custom app identity or users see "Unknown app" — [Solana Mobile: web installation](https://docs.solanamobile.com/get-started/web/installation); [Solana Mobile: migrating to wallet standard](https://docs.solanamobile.com/recipes/mobile-wallet-adapter/migrating-to-wallet-standard); [npm @solana-mobile/wallet-standard-mobile](https://www.npmjs.com/package/@solana-mobile/wallet-standard-mobile)

### Inferences
- **Recommendation:** Privy (`@privy-io/react-auth` 3.48) as the identity and embedded-wallet layer. Login methods: SMS + email + Google/Apple + X/Instagram/TikTok (verify that Privy offers each OAuth provider in the dashboard). Enable external wallets via Wallet Standard (Phantom/Solflare/Backpack) and MWA. Use Privy's user ID as the primary auth identity in our DB, and verify Privy access tokens server-side with `@privy-io/node`. Alternative if the team prefers Phantom brand trust: Phantom Connect. Its embedded wallet can be exported into the Phantom app, but it only supports Google/Apple (+ Phantom login), not SMS/email, which matters in Nigeria/Kenya/India, where many fans lack Apple and may prefer phone numbers.
- **Critical Panta integration question:** does Panta's "server-built tx for users" come back **unsigned** (user = fee payer, only the user signs) or **partially signed** (Panta or a program authority co-signs)? The answer decides the signing path:
  - Unsigned + user fee payer → works with every option (Privy `signAndSendTransaction`, wallet-adapter `sendTransaction`, Phantom `signAndSendTransaction`, Dynamic signer).
  - Partially signed by Panta → Phantom embedded wallets reject it (only `presignTransaction` co-signing after Phantom builds). Privy `sponsor: true` rewrites fee payer and blockhash, which would invalidate Panta's signature. Use wallet `signTransaction` and broadcast yourself, and do not sponsor.
  - If Panta accepts a `feePayer` parameter, sponsorship via Kora or our own fee-payer co-signer becomes possible (see §3).
- **Library choice:** use Kit 8.x in all new server code (decode, inspect, simulate, broadcast, confirm). Pin exact versions, because Kit shipped three majors in 2026. Keep `@solana/web3.js` 1.99 only as a peer of wallet-adapter or Dialect Blinks. Do not adopt web3.js 3.0 until it leaves the `next` tag.
- **Peer-dependency skew:** `@privy-io/node` peers Kit ^5.1 and `@solana/kora` peers Kit ^6.1, while the app uses Kit 8.4. Isolate these in server-only packages, or call Privy/Kora REST/JSON-RPC directly to avoid duplicate-Kit type conflicts.

### Gaps
- Could not open Privy docs directly to confirm whether `useSignAndSendTransaction`'s `chain` option uses the `solana:mainnet` string or a genesis-hash CAIP-2 ID in v3.48. Verify against the installed type definitions.
- Privy OAuth provider list (X, Instagram, TikTok) and current Privy pricing were not confirmed from Privy primary sources.
- No primary data on Web3Auth or Crossmint Solana signing APIs for raw serialized txs was gathered.

---

## 3. Fee sponsorship, priority fees, confirmation and blockhash expiry

### Takeaway
New users will hold USDC but no SOL, so fees must be sponsored. Three viable paths: (1) **Privy native gas sponsorship** (`sponsor: true`), simplest, but it rewrites fee payer and blockhash; (2) **Kora** (Solana Foundation fee relayer/signing node, shipped April 2026), self-hosted or third-party; (3) a **custom co-sign endpoint** holding a fee-payer key in KMS. All of them require the transaction's fee payer to be the sponsor at build time, so check Panta's build API for a fee-payer parameter. For confirmation, use `lastValidBlockHeight`-bounded rebroadcast loops. When a blockhash expires, request a fresh tx from Panta rather than re-signing.

### Cited Findings
**Privy gas sponsorship**
- Enabled per transaction with `sponsor: true` in the options of `useSignAndSendTransaction`. Configure sponsored chains in the dashboard (Solana mainnet and devnet supported). Client-initiated sponsorship is a separate setting; without it, only server-relayed txs are sponsored. Native sponsorship requires **TEE execution**. The fee-payer wallet **rewrites the fee payer address and latest blockhash** and prefunds rent. Billing is prepaid (rejects when the balance runs out) or postpaid on Enterprise — [Privy gas setup](https://docs.privy.io/wallets/gas-and-asset-management/gas/setup.md); [Privy gas overview](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview.md); [Privy Solana gas](https://docs.privy.io/wallets/gas-and-asset-management/gas/solana.md); [Privy blog: native gas sponsorship](https://blog.privy.io/blog/introducing-privy-native-gas-sponsorship)
- Security caveat: sponsored Solana txs that include **close-account instructions can be exploited to harvest token-account rent refunds** — [Privy gas docs](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview.md)

**Kora**
- Kora is a fee-abstraction layer: users pay fees in SPL tokens or not at all. The Kora node validates, co-signs as fee payer and (via `signAndSend`) broadcasts. Its JSON-RPC server supports fee estimation in any supported token, remote signers, and allowlists for tokens and programs plus disallowed accounts. Only `signAndSend` submits to RPC; other methods return signed txs — [Solana docs: Kora getting started](https://solana.com/docs/tools/kora/getting-started)
- Shipped by the Solana Foundation in April 2026 as a fee relayer and signing node with TEE/KMS-backed signing. The "audited reference implementation" claim comes from a third-party blog and is unverified — [BlockEden, 2026-04-22](https://blockeden.xyz/blog/2026/04/22/solana-kora-signing-node-fee-relayer-gasless-ux-primitive/)
- TS SDK `@solana/kora` 0.2.1 (2026-08-05), peers `@solana/kit ^6.1.0`, `@solana/kit-plugin-rpc`, `@solana/kit-plugin-payer`, `@solana-program/token`, and `@solana-program/compute-budget` — [npm @solana/kora](https://www.npmjs.com/package/@solana/kora)
- Octane (the older Solana Labs relayer) is described as "no longer maintained"; Kora is its successor. No formal archive notice was found — [Cointelegraph devhub SIP](https://devhub.cointelegraph.com/t/sip-standard-for-gasless-transactions-fee-delegation/174); [BlockEden](https://blockeden.xyz/blog/2026/04/22/solana-kora-signing-node-fee-relayer-gasless-ux-primitive/)
- `@solana/connector` peers `@solana/keychain-privy`, `-turnkey`, `-aws-kms`, `-vault`, and `-fireblocks`, i.e. Solana Foundation keychain adapters for remote signers — [npm @solana/connector](https://www.npmjs.com/package/@solana/connector)

**Phantom co-signing**
- `signAndSendTransaction(tx, { presignTransaction: async (tx, ctx) => { /* POST to /api/presign; backend partially signs as fee payer */ } })`. The callback receives and returns base64url-encoded txs — [npm @phantom/react-sdk README](https://www.npmjs.com/package/@phantom/react-sdk)

**Confirmation / expiry**
- `getLatestBlockhash` returns `blockhash` and `lastValidBlockHeight`. A tx not confirmed by that height is dropped. The window is ~150 blocks (~60–90 s) but not a fixed protocol constant. Rebroadcast until confirmed or expired. If current block height > `lastValidBlockHeight`, the tx is dead and it is safe to rebuild with a new blockhash. Re-sending the same signed bytes after expiry will not work. The network executes a given signed tx at most once. `isBlockhashValid` can check validity. Use priority fees and multiple RPC endpoints — [Chainstack: tx expiry](https://docs.chainstack.com/docs/solana-how-to-handle-the-transaction-expiry-error); [Helius: getLatestBlockhash guide](https://www.helius.dev/docs/rpc/guides/getlatestblockhash); [confirm-solana-transaction](https://github.com/fardream/confirm-solana-transaction)
- An undersized compute-unit limit fails execution; an oversized one overpays and can be deprioritized — [Chainstack: landing transactions](https://docs.chainstack.com/docs/solana-how-to-land-transactions.md)

**Priority fees / sending (Helius)**
- `helius-sdk` offers `getPriorityFeeEstimate()`, `sendSmartTransaction()`, and `sendTransactionWithSender()` (Helius Sender). Sender has two tiers: Sender Max with a 0.001 SOL minimum tip, and SWQOS-only with a 0.000005 SOL minimum tip. `sendBundleWithSender()` sends up to 5 txs — [npm helius-sdk README](https://www.npmjs.com/package/helius-sdk)
- **New transaction format "v1"**: Agave 4.2 raises the max tx size from 1,232 to 4,096 bytes, but only for v1 transactions (SIMD-0296/SIMD-0385). v1 moves the CU limit and priority fee into the tx header and pays a **total** priority fee in lamports. An absent loaded-accounts-data-size field means 0 bytes, so it must be set. **v1 does not support address lookup tables.** It caps instructions at 64, unique addresses at 64, and signatures at 12. Legacy and v0 remain the default — [npm helius-sdk README](https://www.npmjs.com/package/helius-sdk)

### Inferences
- **Recommended MVP path:**
  1. Ask Panta whether its build endpoint accepts a `feePayer` parameter (or a "sponsored" mode), and whether its txs carry a Panta signature.
  2. If txs are unsigned and the fee payer is configurable, set the fee payer to our sponsor key and co-sign server-side. The sponsor key lives in Privy server wallets, Turnkey, or a KMS keychain adapter, or behind a Kora node with an allowlist of only Panta's program IDs + SPL Token/ATA + ComputeBudget, plus per-user daily caps.
  3. If the fee payer is the user and not configurable, use Privy `sponsor: true`, but only if Panta txs are unsigned (Privy rewrites blockhash and fee payer).
  4. Fallback: drip a tiny SOL amount to new embedded wallets after phone verification. Simple, but sybil-farmable, so cap it per verified phone number.
- **Panta builds the blockhash.** The user must sign within ~60 s of build. Build the tx only after the user taps "Bet" (not on page load), show a countdown-free confirm sheet, and if the RPC reports blockhash-not-found or height > `lastValidBlockHeight`, silently request a fresh tx from Panta and re-prompt.
- **Priority fees:** if Panta sets ComputeBudget instructions, do not modify them (doing so invalidates signatures). If Panta omits them, ask Panta to add a priority-fee level parameter. Changing instructions client-side is not possible on a server-built tx without rebuilding.
- **v1 transactions:** if Panta adopts v1 transactions, confirm that Privy, Phantom and wallet-adapter wallets can deserialize and sign them. Keep v0 until wallet support is confirmed.
- **Commitment:** show "bet placed" optimistically at `confirmed`, and reconcile positions at `finalized` via a webhook or a Panta position refresh.

### Gaps
- Kora's managed or hosted offerings, pricing, and exact JSON-RPC method names were not confirmed from the solana-foundation/kora repo (GitHub access was blocked).
- Privy per-transaction Solana sponsorship pricing is unpublished in the sources found.
- Wallet support for v1 transactions is unknown.
- Official solana.com confirmation page not retrieved; figures come from Chainstack/Helius.

---

## 4. Payments, onramps & offramps for non-crypto fans; USDC vs USDG on Solana

### Takeaway
Use **USDC on Solana** as the trading currency. It has the deepest wallet, onramp and offramp support. USDG (Paxos/Global Dollar) is live on Solana but has thinner onramp coverage, so treat it as optional. For onramps, route by geography: US/EU via **Stripe (through Privy's fiat onramp, launched July 2026)** or **Coinbase Headless Onramp** (Apple Pay; session tokens are mandatory, and the hosted guest checkout was deprecated 2026-06-30); rest of world via Privy's aggregator, MoonPay or Onramper; Africa via **Yellow Card** (Nigeria; MoonPay lists Nigeria as restricted) and **Kotani Pay** (M-PESA); India via UPI providers (Onramp Money, OnMeta, TransFi). These must be confirmed for Solana USDC. Expect minimums ($5–$20+), which conflict with "small amounts". Design for one top-up followed by many micro-bets.

### Cited Findings
**Stablecoin mints**
- USDC mainnet mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (Circle's page shows `EPjF…Dt1v`). Devnet USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`. Bridged USDC variants are unsupported by Circle. Circle "pre-mint addresses" are **not** mints, and sending to them can lose funds — [Circle: USDC on Solana](https://www.circle.com/en/multi-chain-usdc/solana); [Circle quickstart: transfer USDC on Solana](https://developers.circle.com/stablecoins/quickstart-transfer-10-usdc-on-solana.md); [Circle: pre-mint address](https://circle.com/blog/new-pre-mint-address-for-usdc-on-solana)
- USDG (Global Dollar) Solana mint `2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH`. Phantom lists it as Paxos-issued, 1:1 USD-redeemable, ~632.67M supply / ~$633M market cap as of 2026-07-13. Issued by Paxos Digital Singapore under MAS's stablecoin framework, with reserves at DBS. Mint and freeze authorities are active. An **impostor "USDG" token** (`snpGmjSwg73E99aCyuVk9GSBT23jc6HanguhnZp7ba2`) exists — [Phantom token page](https://phantom.com/tokens/solana/2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH); [Solflare USDG](https://www.solflare.com/prices/global-dollar/2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH/); [ONRE docs](https://docs.onre.finance/for-capital-providers/underlying-assets/usdg-or-global-dollar-network); [MadeOnSol](https://madeonsol.com/token/2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH); [Paxos/Global Dollar](https://globaldollar.com/global-dollar)

**Coinbase Onramp**
- Session tokens are **required (enforced from 2025-07-31)**. They are generated server-side with CDP secret API keys (JWT bearer), expire after 5 minutes, and are single-use; mint one per user session. URL format: `https://pay.coinbase.com/buy/select-asset?sessionToken=<token>&…`. Solana destinations use `addresses`/`blockchains: ["solana"]`. New integrations start in **trial mode** — [CDP: create session token](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/create-session-token); [CDP: session token auth](https://docs.cdp.coinbase.com/onramp-&-offramp/session-token-authentication); [CDP: generating onramp URL](https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/generating-onramp-url)
- **Hosted-widget guest checkout (debit card/Apple Pay) was slated for deprecation on 2026-06-30.** The replacement is the **Headless Onramp API**: app-owned UX, guest funding with no Coinbase account, native Apple Pay in Safari, and a QR handoff to phone in other browsers. Original guest-checkout limits: US residents, $500/week, $5 minimum. Coinbase operates in all its countries except Japan. Zero-fee USDC claims conflict ("free" vs "apply for zero-fee access") — [CDP onramp FAQ](https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md); [Coinbase: headless onramps](https://www.coinbase.com/developer-platform/discover/launches/headless-onramps); [CDP onramp overview](https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/onramp-overview)
- Example headless-order docs (via Dynamic) show Base as the destination. Headless Solana support was not confirmed. A 2026-07-08 incident delayed Solana sends, including onramp guest checkout — [Dynamic: Coinbase onramp](https://www.dynamic.xyz/docs/react/money-and-funding/coinbase-onramp); [isdown incident mirror](https://isdown.app/status/coinbase/incidents/619116-delayed-sends-and-receives-solana)

**Stripe & Privy**
- Stripe's embedded-components crypto onramp covers **US and EU countries (not New York State)**. Assets include **USDC (Solana)**, USDB, and Phantom Cash. Some options are in private preview — [Stripe: embedded components onramp](https://docs.stripe.com/crypto/onramp/embedded-components-overview)
- **Privy global fiat onramps (2026-07-07):** Stripe Crypto Onramp for US/EU users, plus an aggregator automatically routing users in 100+ other countries. US/EU destination chains include Solana; assets include USDC. Assets can go to the embedded wallet or any address. Stripe Link handles minimal KYC in US/EU — [Privy blog](https://privy.io/blog/introducing-global-fiat-onramps); [The Defiant](https://thedefiant.io/news/tradfi-and-fintech/privy-launches-global-fiat-onramps-with-stripe-in-us-eu); [Privy fiat onramp docs](https://docs.privy.io/wallets/funding/fiat-onramp.md)
- A third-party comparison (May 2026) lists Stripe at ~1.5% + $0.30 and "US + 30+ countries", which conflicts with Stripe's docs (US+EU) — [eco.com comparison](https://eco.com/support/en/articles/15210390-best-stablecoin-onramps-2026-moonpay-transak-coinbase-onramp-compared)

**MoonPay**
- USDC minimum ~$20 (A$30 in Australia); use the Limits endpoint for exact limits. Supports "USDC (SOL)". **Apple Pay will not work inside an iframe**; redirect to MoonPay's buy domain or SFSafariViewController instead. Restricted jurisdictions include **Nigeria**, Japan, Russia, and Pakistan. Advertised as 150+ countries — [MoonPay buy USDC](https://www.moonpay.com/buy/usdc); [MoonPay mobile payments](https://dev.moonpay.com/docs/mobile-payments); [MoonPay widget design guide](https://dev.moonpay.com/widget/on-ramp/design-guide.md); [MoonPay supported countries](https://support.moonpay.com/customers/docs/moonpays-supported-countries)
- `@moonpay/moonpay-react` 1.10.8 — [npm](https://www.npmjs.com/package/@moonpay/moonpay-react)

**Africa / India**
- Yellow Card: licensed African on/off-ramp for USDT, USDC, and PYUSD via a Payments API. Uses M-Pesa, MTN MoMo, and Airtel Money funding. Covers Nigeria and Kenya. Coinbase and Block used its API. Solana is listed as a settlement network (third-party aggregator claim). Onramper integrated Yellow Card methods (Nov 2024) — [Fireblocks network: Yellow Card](https://www.fireblocks.com/network/yellowcard); [Solana Compass: Yellow Card](https://solanacompass.com/projects/yellowcard); [Onramper blog](https://onramper.com/blog/yellow-card-partners-with-onramper-to-enhance-crypto-onboarding-in-africa)
- Kotani Pay (Nairobi): API for deposits/withdrawals, on/off-ramp, and webhooks. Supports M-PESA, MTN, Airtel, and Orange Money, plus banks. Stablecoins: USDT, USDC, and cUSD. Tether invested Oct 2025. Supported chains (incl. Solana) are unconfirmed — [Kotani Pay docs](https://documentation.kotanipay.com/v3/overview); [AllAfrica](https://allafrica.com/stories/202511030002.html)
- India: Onramp Money supports UPI/IMPS (redirect, web-SDK overlay, or checkout); its Solana USDC support is **not confirmed**. TransFi claims native USDC-on-Solana via API/widget (vendor claim). OnMeta offers UPI INR deposits/withdrawals. Onramper lists UPI — [Solana Compass: Onramp Money](https://solanacompass.com/projects/onramp-money); [TransFi blog](https://www.transfi.com/jp/blog/how-solana-dapps-are-using-transfi-to-onboard-users-with-usdc-via-local-payment-methods); [Elliptic: UPI crypto onramps](https://www.elliptic.co/corpus/gen-3409/financial-technology-in-india/upi-crypto-onramps.html)

### Inferences
- **Funding UX:** a "Add $10" sheet with geo-routing (IP country → provider). US/EU: Privy fiat onramp (Stripe) or Coinbase Headless with Apple Pay. In the Safari PWA the Apple Pay button is native. In Android Chrome, card or Google Pay through Stripe/MoonPay. NG/KE/GH: Yellow Card or Kotani via a provider widget or redirect. IN: UPI provider, after confirming Solana USDC support. Fallback: "receive from a friend" (QR code / copy address / Solana Pay link).
- **Minimums vs micro-bets:** onramp minimums ($5–$20) and KYC friction mean the first deposit should be framed as "load your wallet once". Bets of $0.50–$1 then come from balance. Consider sponsoring the first $1 bet (promo credit) for phone-verified users to cut the first-session drop-off.
- **Offramps:** the same providers (Yellow Card, Kotani, MoonPay sell, Coinbase offramp) handle cash-out. Creators also need a "withdraw creator fees to bank or mobile money" flow. MVP: show a "send USDC to exchange/mobile-money provider address" with deep links. Later: integrate provider offramp APIs.
- **USDG:** support it as display-only or for later. It requires Token-2022-aware balance queries if the mint is Token-2022 (unconfirmed) and has weaker onramp coverage. Only use it if Panta markets are denominated in USDG.
- Hard-code mint allowlists per cluster in `packages/solana/constants.ts` and never trust token symbols, given the USDG impostor.

### Gaps
- Transak, Ramp Network and Kado were not researched (time budget). Their Solana USDC coverage and Nigeria/Kenya/India availability are unknown.
- Whether Coinbase's Headless Onramp supports Solana USDC as a destination is unconfirmed.
- Which countries and assets Privy's 100+-country aggregator route covers (beyond US/EU), and whether Solana USDC is supported there, is unconfirmed.
- USDG token program (SPL Token vs Token-2022) is unconfirmed; verify the mint owner on an explorer.
- India regulatory requirements (FIU registration, TDS on VDA transfers) for a prediction-market product were not researched. Escalate this to the legal/compliance researcher.

---

## 5. Backend components, database choice, and schema

### Takeaway
A thin, stateful backend is required. It acts as a Panta API proxy (keys server-side, zod validation, rate limits, tx safety checks), owns social and creator state (profiles, follows, comments, reactions, leaderboards, notifications, referrals/attribution, share events), and handles share-card generation and analytics. **Supabase Postgres + Drizzle ORM** is the fastest route: managed Postgres + Realtime + Storage, with Drizzle for typed SQL. Neon + Drizzle is the alternative if Supabase-specific services are not needed. Auth stays with Privy, so Supabase Auth is not used.

### Cited Findings
- Versions: `drizzle-orm` 0.45.3, `drizzle-kit` 0.31.11, `@supabase/supabase-js` 2.117.3, `@supabase/ssr` 0.12.7, `@neondatabase/serverless` 1.2.0, `postgres` (postgres.js) 3.4.9, `@prisma/client` 7.10.0 (`prisma` CLI has an 8.0.0-rc), `@upstash/ratelimit` 2.2.0, `@upstash/redis` 1.39.0, `@upstash/qstash` 2.12.0, `inngest` 4.22.0, `@trigger.dev/sdk` 4.7.3, `pg-boss` 12.37.0, `hono` 4.13.13 — [npm drizzle-orm](https://www.npmjs.com/package/drizzle-orm), [npm @supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js), [npm @neondatabase/serverless](https://www.npmjs.com/package/@neondatabase/serverless), [npm @prisma/client](https://www.npmjs.com/package/@prisma/client), [npm @upstash/ratelimit](https://www.npmjs.com/package/@upstash/ratelimit), [npm inngest](https://www.npmjs.com/package/inngest)
- Supabase (third-party summaries, mid-2026): Free has 2 active projects, a 500 MB DB, and **pauses after 1 week of inactivity**. Pro is $25/month with an 8 GB DB, 100K MAU and 100 GB storage, plus a $10 compute credit (Micro). There is no scale-to-zero on Pro, unlike Neon. Realtime concurrent connections: 200 Free / 500 Pro (single source). Free Realtime messages: 2M/month, 256 KB max — [MakerKit Supabase pricing](https://makerkit.dev/blog/saas/supabase-pricing); [automationatlas](https://automationatlas.io/answers/supabase-free-tier-limits-2026/); [JetAdmin](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/amp/)

### Inferences
**Server components (all in Next.js route handlers / server actions on Vercel, plus a job runner):**
1. **Panta gateway** (`packages/panta-client`, server-only): typed client with zod response schemas, `PANTA_API_KEY` from env, retries/backoff, response caching (Next `unstable_cache`/`fetch` revalidate or Upstash Redis), and request tagging with our referral/attribution code. Endpoints exposed to the client: `GET /api/markets`, `GET /api/markets/:id`, `POST /api/markets` (create, after AI draft + moderation + fee quote confirm), `POST /api/trade/build`, `POST /api/trade/confirm`, `GET /api/positions`, `POST /api/claims/build`, `POST /api/creator-fees/build`.
2. **Tx safety layer** (`packages/solana`): decode the base64 tx, check fee payer / required signers = user (or our sponsor), allowlisted program IDs (Panta program(s), SPL Token, ATA, ComputeBudget, Memo), and no `CloseAccount`/`SetAuthority`/`Approve` on user token accounts unless expected. Simulate before returning (see §9).
3. **Identity**: verify the Privy access token on every API call (`@privy-io/node`). On first login, create `users` + `wallets` rows (Privy webhook or lazy upsert).
4. **Social service**: follows, comments (with LLM moderation), reactions, creator profiles, verified social handles.
5. **Leaderboards**: computed from `trades_cache` (Panta trade attribution + on-chain verification), written to materialized tables by cron (Vercel Cron → Inngest/QStash job).
6. **Referral / attribution**: `?r=<code>` on share links → cookie + `referral_attributions`; pass the creator/referrer code into Panta trade attribution; verify via Panta's attribution/verification endpoint + tx signature.
7. **Notifications**: in-app (Postgres + Supabase Realtime), Web Push (VAPID / OneSignal), email (Resend), and optionally WhatsApp templates (see §6).
8. **Share cards**: `opengraph-image.tsx` per market/position, plus a downloadable 9:16 story image for Instagram/TikTok (same `ImageResponse`, different size).
9. **Jobs**: market-close reminders, resolution → "you won, claim" notifications, leaderboard snapshots, Panta cache warmers, Helius webhook ingestion (Inngest 4.x or Trigger.dev 4.x; QStash for simple fan-out).

**DB choice:** Supabase Postgres (Pro, $25/mo) with Drizzle (`drizzle-orm` + `postgres` driver via Supavisor transaction pooler). Use Supabase Realtime for comments, reactions and notifications. Do not use Supabase Auth. Enforce RLS only on tables read directly from the browser (if any); otherwise do all reads through server routes. Use Neon if the team wants branch-per-PR databases and scale-to-zero.

**Schema draft (Postgres / Drizzle-friendly DDL):**
```sql
-- identities
create table users (
  id uuid primary key default gen_random_uuid(),
  privy_did text unique not null,              -- Privy user id
  handle citext unique,                         -- @handle
  display_name text, avatar_url text, bio text,
  country_code char(2),                         -- from onboarding / IP (for onramp routing)
  phone_verified boolean default false,
  role text not null default 'fan' check (role in ('fan','creator','admin')),
  risk_score smallint default 0,                -- sybil/abuse signal
  created_at timestamptz default now(), banned_at timestamptz
);
create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  address text not null unique,                 -- base58
  kind text not null check (kind in ('privy_embedded','phantom_embedded','external','mwa')),
  is_primary boolean default false,
  created_at timestamptz default now()
);
create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('x','instagram','tiktok','google','apple','telegram')),
  provider_user_id text not null,
  username text, followers_count int, is_verified boolean,
  account_created_at timestamptz,               -- sybil signal when available
  linked_at timestamptz default now(), raw jsonb,
  unique (provider, provider_user_id)
);
create table creator_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  payout_wallet text not null,
  fee_bps int,                                  -- if Panta allows creator-set fees
  tier text default 'standard', approved_at timestamptz, status text default 'active'
);

-- markets (Panta is source of truth for market state; we store social/meta)
create table markets_meta (
  panta_market_id text primary key,
  creator_id uuid references users(id),
  slug text unique not null,                    -- share URL /m/:slug
  title text not null, description text, resolution_criteria text, resolution_source text,
  category text, cover_image_url text, close_at timestamptz,
  ai_draft jsonb, moderation_status text default 'pending' check (moderation_status in ('pending','approved','rejected','flagged')),
  visibility text default 'public', created_tx_sig text,
  stats jsonb default '{}'::jsonb,              -- cached volume/odds for feeds
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table market_price_snapshots (           -- for sparklines; from Panta polling/stream
  panta_market_id text references markets_meta(panta_market_id),
  ts timestamptz not null, yes_price numeric(9,6), no_price numeric(9,6), volume_usd numeric(18,6),
  primary key (panta_market_id, ts)
);

-- social graph
create table follows (
  follower_id uuid references users(id) on delete cascade,
  followee_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(), primary key (follower_id, followee_id)
);
create table comments (
  id uuid primary key default gen_random_uuid(),
  panta_market_id text not null references markets_meta(panta_market_id),
  user_id uuid not null references users(id),
  parent_id uuid references comments(id),
  body text not null check (length(body) <= 1000),
  position_side text,                           -- badge: "holds YES" (from trades_cache)
  moderation_status text default 'pending', moderation jsonb,
  created_at timestamptz default now(), deleted_at timestamptz
);
create table reactions (
  user_id uuid references users(id) on delete cascade,
  target_type text check (target_type in ('market','comment','trade')),
  target_id text not null, emoji text not null,
  created_at timestamptz default now(), primary key (user_id, target_type, target_id, emoji)
);

-- trading
create table tx_intents (                       -- idempotency + audit for every server-built tx
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id), wallet text not null,
  kind text check (kind in ('buy','claim','create_market','creator_fee_claim')),
  panta_market_id text, side text check (side in ('YES','NO')), amount_usd numeric(18,6),
  quote jsonb, tx_base64 text, last_valid_block_height bigint,
  referral_code text, status text default 'built' check (status in ('built','sent','confirmed','failed','expired')),
  signature text unique, error jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table trades_cache (                      -- confirmed trades (Panta attribution + on-chain)
  signature text primary key,
  panta_market_id text not null, wallet text not null, user_id uuid references users(id),
  side text, amount_usd numeric(18,6), shares numeric(28,9), price numeric(9,6),
  referral_code text, attributed_creator_id uuid references users(id),
  verified_onchain boolean default false, slot bigint, block_time timestamptz
);
create index on trades_cache (panta_market_id, block_time desc);
create index on trades_cache (user_id, block_time desc);

-- growth
create table referral_codes (
  code text primary key, owner_id uuid references users(id),
  panta_market_id text,                         -- null = profile-level code
  created_at timestamptz default now()
);
create table referral_attributions (
  id uuid primary key default gen_random_uuid(),
  code text references referral_codes(code), referred_user_id uuid references users(id),
  first_touch_at timestamptz default now(), first_trade_sig text, unique (referred_user_id)
);
create table share_events (
  id bigserial primary key,
  user_id uuid references users(id), panta_market_id text, code text,
  channel text check (channel in ('whatsapp','instagram','tiktok','x','telegram','copy','native','qr')),
  event text check (event in ('share_click','landing','signup','first_trade')),
  utm jsonb, ua_hash text, ip_hash text, created_at timestamptz default now()
);
create table leaderboard_snapshots (
  period text, scope text,                      -- e.g. ('2026-W41','global'|'creator:<id>')
  user_id uuid references users(id), rank int, pnl_usd numeric(18,6), volume_usd numeric(18,6),
  win_rate numeric(5,4), eligible boolean, primary key (period, scope, user_id)
);

-- notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,                           -- market_resolved, claim_ready, new_follower, comment_reply, creator_new_market
  payload jsonb not null, read_at timestamptz, created_at timestamptz default now()
);
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  endpoint text unique not null, p256dh text not null, auth text not null,
  platform text, created_at timestamptz default now(), last_success_at timestamptz
);
create table moderation_events (
  id bigserial primary key, target_type text, target_id text, model text,
  verdict text, categories jsonb, actor text, created_at timestamptz default now()
);
```

### Gaps
- Supabase's own pricing page was not retrieved. Realtime Pro limits come from a single third-party source.
- Whether Panta exposes webhooks/streams for trades or market state, which would reduce the need for our own indexing, belongs to the Panta researcher.

---

## 6. Indexing / real-time, caching, activity feeds, push, email, WhatsApp

### Takeaway
Treat Panta as the source of truth for prices and positions. Poll or stream Panta into a Redis/Postgres cache. Use **Helius** for RPC, priority fees, Sender, and **webhooks** on Panta program and user activity, to drive feeds and notifications and to verify trades. LaserStream/gRPC is overkill for the MVP (Business plan $499/mo). For live odds, fan out from one server-side poller to clients via Supabase Realtime broadcast or SSE; never connect each client to Panta directly. Push: Web Push (VAPID, or OneSignal) works on iOS only for installed PWAs, so the "Add to Home Screen" prompt matters. Email: Resend. WhatsApp: use free `wa.me` share links for organic sharing. Use the paid WhatsApp Business API only for opted-in alerts; it has been per-message since July 2025 and service messages became billable on 2026-10-01.

### Cited Findings
**Helius**
- Plans (2026): Free $0 (1M credits, 10 req/s, 1 sendTransaction/s); Developer $49 (10M credits; Enhanced WebSockets; gRPC devnet only); Business $499 (100M credits, 200 req/s, 50 sendTransaction/s, LaserStream); Professional $999 (200M credits, 500 req/s). The Developer plan's req/s figure conflicts between sources (50 vs 200) — [Helius plans](https://helius.dev/docs/billing/plans); [Helius pricing](https://www.helius.dev/pricing.md)
- From 2026-04-07: Business plans get LaserStream mainnet gRPC (up to 10 connections). Streaming is billed at 20 credits/MB across gRPC and WebSockets, and previously unmetered WSS became metered after a 30-day grace period — [Helius blog: LaserStream websockets](https://www.helius.dev/blog/laserstream-websockets); [Helius credits](https://helius.dev/docs/billing/credits)
- `getTransactionsForAddress` costs 100 credits (Developer+). `getSignatureStatuses` costs 1 credit (10 with history search) — [Helius credits](https://helius.dev/docs/billing/credits)
- SDK features: `helius.webhooks.createWebhook/…`, `helius.enhanced.getTransactions/getTransactionsByAddress` (human-readable decoded txs), `helius.ws` (Kit subscriptions), Enhanced WebSockets (Business+), `getProgramAccountsV2`, `getTokenAccountsByOwnerV2` with `changedSinceSlot`, priority fee API, and Sender — [npm helius-sdk README](https://www.npmjs.com/package/helius-sdk)

**Web Push**
- iOS/iPadOS: Home Screen web apps got push in 16.4. Declarative Web Push in 18.4 lets pages subscribe and show notifications without a service worker, and SW code can optionally modify them. It stays backward-compatible with classic Web Push. Requirements: installed to the Home Screen and **launched from the icon**, a manifest with the proper `display`, HTTPS, and a permission request triggered by a **direct user gesture** — [WebKit: Meet Declarative Web Push](https://webkit.org/?p=16535); [Pushpad](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications); [OneSignal: web push for iOS](https://documentation.onesignal.com/docs/web-push-for-ios); [Progressier](https://progressier.com/pwa-capabilities/declarative-web-push)
- Libraries: `web-push` 3.6.7 (last published Jan 2024, stable), `@onesignal/node-onesignal` 5.19.0, `resend` 6.32.1 — [npm web-push](https://www.npmjs.com/package/web-push), [npm @onesignal/node-onesignal](https://www.npmjs.com/package/@onesignal/node-onesignal), [npm resend](https://www.npmjs.com/package/resend)

**WhatsApp Business Platform**
- Per-message pricing since 2025-07-01, by category (marketing, utility, authentication, service) and recipient market. Free inside an open customer-service window for non-template messages and utility templates, and for 72 h after a free-entry-point click. Utility/auth volume discounts apply. Example rates: India utility $0.0014, Germany $0.05, US utility ~$0.004–0.006 (sources differ) — [Meta: WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing); [Courier guide](https://www.courier.com/guides/whatsapp-pricing)
- From **2026-10-01**, service messages (and utility replies within the 24 h window) are billed at the market's utility/auth rate, with no volume discounts. One vendor reports a payment method must be on file by 2026-09-30 — [YCloud](https://www.ycloud.com/blog/whatsapp-api-message-pricing-update-effective-october-1-2026); [Vonage support](https://api.support.vonage.com/hc/en-us/articles/29982160922268-WhatsApp-Service-Messages-Become-Billable-on-Oct-1-2026-What-You-Need-to-Know)

### Inferences
- **Live odds:** a single server worker (Inngest cron every 5–10 s for hot markets, or a Panta stream if one exists) writes `market:{id}:price` to Upstash Redis plus `market_price_snapshots`, then broadcasts on Supabase Realtime channel `market:{id}`. Clients subscribe while the page is visible and update the TanStack Query cache. Fall back to `refetchInterval: 10_000` when Realtime is unavailable.
- **Activity feed:** a Helius webhook on the Panta program ID(s) (enhanced type, or raw if Panta instructions aren't parsed) → `/api/webhooks/helius` (verify the auth header) → upsert `trades_cache` (mark `verified_onchain`) → fan-out notifications ("@creator's market hit $1k volume", "your friend bet YES"). Cross-check with Panta's trade-attribution endpoint for referral credit.
- **RPC:** Helius Developer ($49) is enough for MVP. Keep a second RPC (Triton or QuickNode) as a broadcast fallback for the confirm loop. Upgrade to Business only if Enhanced WebSockets or LaserStream are needed.
- **Push strategy:** after the first bet, prompt "Get notified when this market resolves". On iOS, first show "Add to Home Screen" instructions, since push is impossible in a Safari tab. Store subscriptions in `push_subscriptions` and send with `web-push` (VAPID). Adopt OneSignal if segmentation or analytics are needed.
- **WhatsApp:** share via `https://wa.me/?text=<encoded message + link>`. This is free, and WhatsApp renders our OG image. Use Business API templates (utility: "Market resolved — claim your winnings") only with explicit opt-in. Budget per-message costs; India is cheap, Europe expensive.

### Gaps
- Triton and QuickNode pricing and features were not researched.
- Helius webhook pricing and tier availability were not confirmed (the pricing table lost its formatting).
- Whether Panta offers a websocket/stream for live prices is not known to this researcher.

---

## 7. Social verification: X OAuth 2.0, Instagram, TikTok — access and cost in 2026

### Takeaway
Verifying creators' handles via OAuth login is feasible and cheap if done once at link time. X API is now **pay-per-use** for new developers (free tier closed Feb 2026), so a single `users/me` lookup per verification costs about a cent. Instagram verification requires a **professional (business/creator) account** via "Instagram API with Instagram Login" (`instagram_business_basic`), with App Review for public use. TikTok Login Kit (`user.info.basic`, `user.info.profile`) requires app review, reportedly fast. Using the wallet provider's built-in OAuth (e.g., Privy linked accounts) can avoid running three OAuth integrations.

### Cited Findings
- **X:** on 2026-02-06 X made pay-per-use the default for new developers and discontinued the free tier for new signups. Credits are prepaid in the Developer Console. Reported rates conflict: $0.005/post read and $0.010/user read, with post creation at $0.01–$0.015 (+$0.20 if the post has a URL, per one source); reads capped at 2M/month. Legacy Basic ($200/mo) and Pro ($5,000/mo) remain for existing subscribers only, and Enterprise starts at ~$42K/mo. Legacy free users got a one-time $10 voucher. Official page: docs.x.com/x-api/getting-started/pricing (not retrievable here) — [Gigazine](https://gigazine.net/gsc_news/en/20260209-x-api-pay-per-use); [Postproxy](https://www.postproxy.dev/blog/x-api-pricing-2026/); [opentweet](https://opentweet.io/how-to/x-api-pay-per-use-explained); [wearefounders](https://www.wearefounders.uk/the-x-api-price-hike-a-blow-to-indie-hackers/)
- **Instagram:** "Instagram API with Instagram Login" serves professional accounts, both businesses and **creators**, with no Facebook Page required. It covers comment moderation, publishing, insights, mentions, and messaging, but not ads or tagging. Scopes are `instagram_business_basic`, `instagram_business_manage_media`, etc. (old `business_basic` values deprecated Dec 2024/Jan 2025; Meta pages differ on the date). Advanced access needs App Review (~2–4 weeks per Phyllo) — [Meta: Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login); [Phyllo scopes guide](https://www.getphyllo.com/post/instagram-api-permissions-scopes)
- **TikTok:** Login Kit's baseline scope is `user.info.basic`. `user.info.profile` adds profile link, bio and the **verified flag**. Users may grant only some scopes, so read the granted `scope` in the token response. New apps start in Draft/sandbox with tester accounts and need app review; reported turnaround is 12–36 h (Stytch) or "several hours" (Auth0) — [Stytch TikTok OAuth](https://stytch.com/docs/consumer-auth/authentication/oauth/adding-providers/tiktok); [Frontegg TikTok](https://developers.frontegg.com/agen-for-work/connectors/marketplace/tiktok); [Auth0 TikTok](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/tiktok); [Phyllo TikTok scopes](https://www.getphyllo.com/post/tiktok-api-scopes)

### Inferences
- **MVP verification flow:**
  1. Creator logs in.
  2. "Verify @handle" runs OAuth with that platform (via Privy's link-account flow if available, otherwise our own OAuth routes with `arctic`/`better-auth`-style helpers).
  3. Store `provider_user_id`, `username`, follower count and verified flag in `social_accounts`.
  4. Show a badge on the creator profile and market cards.
- Re-verify periodically or on handle change. Avoid ongoing API reads, and never poll timelines; cost scales with reads on X.
- For non-business Instagram creators, offer a fallback: a **bio-code challenge**. The creator puts a one-time code in their bio, and an admin or scraper confirms it. Scraping may violate platform ToS, so manual review is safer.
- Sharing does not need these APIs. Use OS share sheets (`navigator.share`), `wa.me`, X intent URLs (`https://x.com/intent/post?text=…&url=…`), and the downloadable story image for Instagram/TikTok (no API to post to Stories from the web).
- `better-auth` 1.7.7 is available if we need our own OAuth handling outside Privy — [npm better-auth](https://www.npmjs.com/package/better-auth)

### Gaps
- Official X pricing page not retrieved; exact per-endpoint rates (especially `users/me` under OAuth 2.0 user context) are unconfirmed.
- Whether Privy's Instagram/TikTok login works for creator (non-business) accounts and what profile fields it returns was not verified.
- The deprecation of the Instagram Basic Display API for personal accounts (believed Dec 2024) was not re-verified in this session.

---

## 8. AI features: market question generation, moderation, sentiment summaries

### Takeaway
Use the Anthropic TypeScript SDK with **structured outputs** (`client.messages.parse` + `zodOutputFormat`) so that every AI output is a validated JSON object. Three jobs: draft market questions and resolution criteria from a creator prompt; moderate markets and comments (high volume, use the cheap model); and summarize comment sentiment per market (batch, cached). Default model `claude-opus-5-5`; evaluate `claude-haiku-5-5` for high-volume moderation.

### Cited Findings
- Current Claude models and list prices per 1M tokens (input/output), from Anthropic's model table cached 2026-10-06: `claude-opus-5-5` $4/$20 (default; 1M context); `claude-sonnet-5-5` $2/$10; `claude-haiku-5-5` $0.10/$0.50 (prompts ≤100K tokens; $0.50/$2.50 beyond). Claude Opus 5.5 and Haiku 5.5 default to effort `medium`. Thinking cannot be disabled on Opus 5.5; use `output_config.effort` (`low` for classification). Assistant prefill returns 400 on current models, so use structured outputs instead. Check `stop_reason === "refusal"` before reading content. Haiku 5.5 refusals have no server-side fallback — [Anthropic models overview](https://platform.claude.com/docs/en/about-claude/models/overview); [Anthropic refusals & fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- Structured outputs in TS: `import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"`, then `client.messages.parse({ model, max_tokens, messages, output_config: { format: zodOutputFormat(Schema) } })`. `response.parsed_output` is null if parsing failed. The old `output_format` parameter is deprecated in favor of `output_config.format` — [Anthropic structured outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- The Message Batches API runs asynchronously at 50% cost, which suits nightly sentiment summaries — [Anthropic batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Package versions: `@anthropic-ai/sdk` 0.132.0; Vercel `ai` 7.0.131 with `@ai-sdk/anthropic` 4.0.75 — [npm @anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk), [npm ai](https://www.npmjs.com/package/ai)

### Inferences
- **Market generator** (`POST /api/ai/market-draft`): input is the creator's free text ("Will Burna Boy drop an album before Dec?"). Output schema: `{ question, yesMeans, noMeans, closeTime (ISO), resolutionSource (URL/authority), resolutionCriteria, edgeCases[], category, ambiguityScore 0–1, policyFlags[] }`. The system prompt enforces objective, verifiable, time-bound binary questions with no harm to private individuals, no death/injury markets, and no markets on minors. Show the draft in an editable form, then send it to Panta's create-market fee quote. Store the draft in `markets_meta.ai_draft`.
- **Moderation:** run a synchronous check on market create and on each comment (`claude-haiku-5-5`, effort `low`, schema `{ verdict: allow|review|block, categories[], reason }`). Auto-hide `block`, queue `review` for admins, and log to `moderation_events`. Add deterministic filters first (URL/phone regex, slur list, rate limits) to cut LLM calls.
- **Sentiment summary:** every N new comments or hourly, summarize the top comments plus the YES/NO flow into `{ bullCase, bearCase, vibe, notableTakes[] }`. Cache it in `markets_meta.stats`. Use the Batches API for the long tail of markets.
- Keep all LLM calls server-side and rate-limited per user. Treat comment text as untrusted input in prompts, and place it in a clearly delimited user-content block.

### Gaps
- Prompt quality, eval sets and refusal rates for prediction-market topics (elections, sports, celebrity) were not tested.
- Vercel AI SDK v7 API shape (e.g., structured-object generation) was not reviewed. The recommendation uses the first-party Anthropic SDK.

---

## 9. Security: key management, rate limiting, sybil resistance, simulation, moderation, Solana pitfalls

### Takeaway
The main risks are (1) leaked Panta or fee-payer keys, (2) signing a malicious or unexpected transaction (a compromised proxy, or a Blink endpoint being spoofed), (3) sponsor-drain attacks (rent harvesting, spam), (4) sybil/wash-trading on leaderboards and referral rewards, and (5) UGC abuse in markets and comments. Mitigate with server-only secrets in KMS-backed signers, static tx inspection + simulation before returning txs, strict program allowlists for sponsorship, per-user and per-IP rate limits, phone verification + cost-weighted leaderboards, and LLM + human moderation.

### Cited Findings
- Never hold a fee-payer keypair in frontend code; co-sign on the backend — [npm @phantom/react-sdk README](https://www.npmjs.com/package/@phantom/react-sdk)
- Sponsored txs with close-account instructions can be exploited to collect rent refunds — [Privy gas docs](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview.md)
- Kora validates instructions against allowlisted programs and tokens and supports disallowed accounts, with TEE/KMS-backed signing — [Solana docs: Kora](https://solana.com/docs/tools/kora/getting-started); [BlockEden](https://blockeden.xyz/blog/2026/04/22/solana-kora-signing-node-fee-relayer-gasless-ux-primitive/)
- Phantom embedded wallets apply spending limits, domain binding and real-time risk evaluation; Phantom's legacy blocklist is being deprecated in favor of "Domain and transaction warnings" — [Phantom Connect docs](https://docs.phantom.com/phantom-connect.md); [Phantom blocklist doc](https://docs.phantom.com/developer-powertools/blocklist)
- `@solana/react-hooks` exposes `useSimulateTransaction(wire)` for client-side simulation — [npm @solana/react-hooks README](https://www.npmjs.com/package/@solana/react-hooks)
- Token-2022 mints live under a different program ID (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb8`), so balance queries must cover both token programs — [therpc.io SPL docs](https://therpc.io/zh/docs/solana/working-with-spl-tokens)
- Impostor tokens reuse stablecoin names and symbols (e.g., fake USDG) — [Solflare unverified USDG](https://www.solflare.com/prices/usdg/snpGmjSwg73E99aCyuVk9GSBT23jc6HanguhnZp7ba2)
- Helius Agent-plan signup requires a 1 USDC payment "to prevent automated account creation abuse", an example of a cost-based sybil gate — [Helius plans](https://helius.dev/docs/billing/plans)

### Inferences
- **Key management:** `PANTA_API_KEY`, `HELIUS_API_KEY`, `PRIVY_APP_SECRET`, `CDP_API_KEY_SECRET`, `ANTHROPIC_API_KEY`, and `VAPID_PRIVATE_KEY` live only in Vercel encrypted env vars (Production, Preview and Development scoped separately; devnet keys in Preview). Validate them with `@t3-oss/env-nextjs` 0.13.11 ([npm](https://www.npmjs.com/package/@t3-oss/env-nextjs)). The sponsor fee-payer key never sits in env as a raw secret; use a Privy server wallet, Turnkey, or a KMS signer, with daily SOL budget alerts.
- **Tx verification before returning to the client** (defense in depth even though Panta is trusted):
  1. Decode the base64 tx.
  2. Assert the message's fee payer and signers.
  3. Assert every instruction's program ID is in an allowlist (Panta program(s) from the Panta researcher, Token/Token-2022, ATA, ComputeBudget, Memo, System only for ATA creation).
  4. Assert the token transfer amount ≤ the user-requested amount + quoted fees.
  5. Run `simulateTransaction` (`sigVerify: false`) and compare pre/post token balances for the user's USDC account.
  6. Persist the tx hash + intent in `tx_intents` for audit and idempotency.
- **Rate limits** (`@upstash/ratelimit` sliding window): tx build 10/min/user; comments 5/min/user; market creation 5/day/creator; AI drafts 20/day/creator; onramp session tokens 5/hour/user; plus per-IP limits on unauthenticated GETs and Blink POSTs.
- **Sybil and leaderboard integrity:**
  - Leaderboards rank realized PnL and volume net of fees, with minimum-stake thresholds, so dust-wallet farms gain nothing.
  - Require phone verification (Privy SMS) and one wallet per phone for rewards eligibility.
  - Exclude wallets funded from the same source within N minutes (cluster detection via Helius `getTransactionsByAddress` funding-source lookup).
  - Detect self-trading between linked accounts, and referral loops (same device/IP hash).
  - Delay referral payouts until the referred user has done K trades over D days.
  - Optionally use proof-of-personhood (e.g., World ID or Human Passport) for prize leaderboards; this was not researched.
- **Content:** AI moderation (see §8), report buttons, creator trust tiers (new creators' markets require approval), and blocklists for prohibited market topics. Jurisdiction gating is a legal question for another researcher.
- **Solana pitfalls checklist:**
  - Blockhash expiry → rebuild via Panta.
  - Never mutate signed txs.
  - Use confirmed vs finalized deliberately.
  - Hard-code mint addresses; do not use symbols.
  - Token-2022 awareness.
  - ATA creation rent is paid by the fee payer and is reclaimable by whoever closes the account (sponsor-drain risk).
  - Priority-fee spikes.
  - RPC rate limits → cache reads.
  - Duplicate submissions are harmless (same signature), but double-building creates two distinct txs, so dedupe by `tx_intents` idempotency key.
  - `registerMwa` must not run during SSR.

### Gaps
- No specific Solana tx-simulation security vendor (e.g., Blowfish successors, Lighthouse assertions) was researched for 2026 status.
- Proof-of-personhood providers on Solana were not researched.

---

## 10. Observability, analytics, feature flags, deployment, environment config, devnet vs mainnet

### Takeaway
Use Vercel for hosting, preview deployments and cron; PostHog for product analytics, funnels (share → landing → signup → fund → first bet), session replay and feature flags; Sentry for errors and performance; and Vercel Analytics for Web Vitals. Run every Preview deployment against devnet (Panta devnet if available, Helius devnet RPC, devnet USDC mint) and Production against mainnet, switched by a single `NEXT_PUBLIC_SOLANA_CLUSTER` env var.

### Cited Findings
- Versions: `posthog-js` 1.438.2, `posthog-node` 5.55.0, `@sentry/nextjs` 11.5.0, `@vercel/analytics` 2.0.1, `flags` (Vercel Flags SDK) 4.3.1, `@vercel/og` 1.0.3, `satori` 0.36.0, `@vercel/functions` 3.9.11 — [npm posthog-js](https://www.npmjs.com/package/posthog-js), [npm posthog-node](https://www.npmjs.com/package/posthog-node), [npm @sentry/nextjs](https://www.npmjs.com/package/@sentry/nextjs), [npm flags](https://www.npmjs.com/package/flags), [npm @vercel/og](https://www.npmjs.com/package/@vercel/og)
- Tooling versions: `turbo` 2.11.7, `pnpm` 12.10.1, `@biomejs/biome` 2.5.15, `vitest` 5.0.3, `@playwright/test` 1.63.0 — [npm turbo](https://www.npmjs.com/package/turbo), [npm pnpm](https://www.npmjs.com/package/pnpm), [npm vitest](https://www.npmjs.com/package/vitest)
- Devnet USDC mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` — [Circle quickstart](https://developers.circle.com/stablecoins/quickstart-transfer-10-usdc-on-solana.md)
- Helius gRPC/LaserStream is available on devnet from the Developer plan; mainnet needs Business+ — [Helius plans](https://helius.dev/docs/billing/plans)
- Privy gas sponsorship supports both Solana mainnet and devnet — [Privy gas setup](https://docs.privy.io/wallets/gas-and-asset-management/gas/setup.md)
- MWA chains are configured as `solana:devnet` / `solana:mainnet` in `registerMwa` options — [Solana Mobile web installation](https://docs.solanamobile.com/get-started/web/installation)

### Inferences
- **PostHog events:** `share_clicked{channel}`, `landing_viewed{ref, market}`, `signup_completed{method}`, `onramp_started{provider}`, `onramp_completed`, `bet_built`, `bet_signed`, `bet_confirmed{latency_ms}`, `bet_expired`, `claim_completed`, `market_created`, `push_opt_in`, `pwa_installed`. Identify users by Privy DID. Server-side events go through `posthog-node` from route handlers and confirmed-trade webhooks; treat on-chain as the source of truth.
- **Feature flags:** PostHog flags for onramp provider routing per country, gas-sponsorship on/off, AI drafting, Blinks, and new-creator approval. Optionally use the Vercel `flags` SDK for static/edge evaluation.
- **Environment matrix:**
  - Local: devnet, Panta sandbox, Helius devnet, Privy dev app.
  - Preview: devnet, separate Supabase branch or project.
  - Production: mainnet.
  - Keep cluster-dependent constants (mints, program IDs, RPC URLs, CAIP-2 chain IDs) in one `packages/solana/clusters.ts`.
- **SLOs to monitor:** tx build latency (Panta), sign-to-confirm latency, expiry rate, simulation failure rate, sponsor SOL balance, onramp completion rate by provider/country, Panta API error rate.
- **Testing:** Playwright mobile-viewport E2E with a devnet test wallet (Privy test accounts / OTP bypass in dev), Vitest for tx-verification and confirm-loop logic, and contract tests against Panta's sandbox.

### Gaps
- PostHog pricing and Sentry quotas were not researched.
- Whether Panta provides a devnet or sandbox environment is unknown (Panta researcher).
- Circle devnet faucet availability was not verified this session.

---

## 11. Reference architecture & scaffolding (diagram, monorepo layout, code patterns)

### Takeaway
One Next.js 16 app on Vercel, backed by a few server-only packages: a Panta gateway, Solana tx utils, DB, AI, and UI. Postgres (Supabase), Redis (Upstash), Helius, Privy, onramp providers and Anthropic sit behind it. Users sign client-side; our server never holds user keys, only API keys and (optionally) a KMS-held sponsor key.

### Cited Findings
- Solana Actions/Blinks: a GET returns metadata and related actions, and a POST with `{ account }` returns a signable transaction. Production needs `actions.json` at the domain root, CORS headers on all Action endpoints, and testing with the Blinks Inspector. At launch, only actions registered in the Dialect registry unfurled on X; unregistered blinks still render on Dialect's interstitial site — [Solana docs: Actions and Blinks](https://solana.com/docs/advanced/actions); [Chainstack: build Actions and Blinks](https://docs.chainstack.com/docs/solana-building-actions-and-blinks); [Solana docs (zh) actions](https://solana.com/zh/docs/advanced/actions)
- `@solana/actions` 1.6.6 and `@solana/actions-spec` 2.4.2 were last published 2025-06-02 (no 2026 releases). `@dialectlabs/blinks` 0.22.5 peers on `@solana/web3.js ^1.95.3` and wallet-adapter — [npm @solana/actions](https://www.npmjs.com/package/@solana/actions), [npm @solana/actions-spec](https://www.npmjs.com/package/@solana/actions-spec), [npm @dialectlabs/blinks](https://www.npmjs.com/package/@dialectlabs/blinks)
- Blink chaining (sRFC 28) is still a forum proposal — [Solana forum sRFC 28](https://forum.solana.com/t/srfc-28-blinks-chaining/1734)
- Next.js `ImageResponse` from `next/og` powers `opengraph-image.tsx` routes (`@vercel/og` 1.0.3 / `satori` 0.36.0 underneath) — [Next.js PWA/metadata docs](https://nextjs.org/docs/app/guides/progressive-web-apps); [npm @vercel/og](https://www.npmjs.com/package/@vercel/og)

### Inferences

#### Architecture diagram (mermaid)
```mermaid
flowchart LR
  subgraph Social["Social platforms"]
    WA[WhatsApp] --- IG[Instagram] --- TT[TikTok] --- X[X / Blinks]
  end
  Social -->|share link /m/:slug?r=code| PWA

  subgraph Client["PWA (Next.js 16, React 19) on phone"]
    PWA[Market page RSC + client islands]
    PWA --> PRIVY[Privy SDK: login + embedded Solana wallet]
    PWA --> WS[Wallet Standard / MWA (Android) / Phantom]
    PWA --> SW[Serwist service worker: push, offline shell]
    PWA --> TQ[TanStack Query cache]
  end

  subgraph Vercel["Vercel (Node runtime)"]
    API[Route handlers / server actions]
    OG[opengraph-image + story image routes]
    ACT[Solana Actions endpoints + /actions.json]
    PROXY[proxy.ts: geo, ref cookie, auth gate]
    CRON[Vercel Cron -> Inngest jobs]
    HOOK[/api/webhooks/helius, /privy/]
  end

  PWA <-->|HTTPS + Privy JWT| API
  X -->|GET/POST| ACT
  API --> PANTA[(Panta API: markets, quotes, build tx, positions, claims, attribution)]
  ACT --> PANTA
  API --> VERIFY[Tx inspector + simulate]
  VERIFY --> RPC[(Helius RPC / Sender; fallback RPC)]
  API --> SPONSOR[Fee sponsor: Privy sponsor / Kora / KMS co-signer]
  API --> DB[(Supabase Postgres + Realtime)]
  API --> REDIS[(Upstash Redis: cache + rate limits)]
  API --> AI[Anthropic API: drafts, moderation, sentiment]
  API --> ONRAMP[Onramps: Privy/Stripe, Coinbase Headless, MoonPay, Yellow Card, Kotani]
  CRON --> PANTA
  CRON --> DB
  RPC -->|webhooks| HOOK --> DB
  DB -->|Realtime broadcast: odds, comments, notifs| PWA
  API --> PUSH[Web Push (VAPID/OneSignal), Resend email, WhatsApp templates]
  PWA -->|sign + send| RPC
  API --> PH[PostHog / Sentry]
```

#### Bet flow (sequence)
1. Fan opens `/m/:slug?r=abc`. `proxy.ts` sets the `ref` cookie and the RSC renders with cached Panta odds.
2. Tap YES $1 → Privy login (SMS/email/social) if needed → embedded wallet exists.
3. If USDC balance < amount → onramp sheet (geo-routed).
4. Client calls `POST /api/trade/build {marketId, side, amount}`. The server verifies the Privy JWT, applies rate limits, calls Panta with the API key + attribution code, inspects and simulates the tx, stores a `tx_intents` row, and returns `{txBase64, intentId, lastValidBlockHeight}`.
5. Client signs and sends: Privy `signAndSendTransaction` (optionally sponsored), or wallet-adapter sign → server broadcast.
6. Client calls `POST /api/trade/confirm {intentId, signature}`. The server runs the confirm loop, calls the Panta attribution/verify endpoint, upserts `trades_cache`, sends notifications, and fires PostHog `bet_confirmed`.
7. On market resolution, a job sends "claim ready" push. The claim uses the same build → sign → confirm path.

#### Monorepo layout (pnpm 12 + Turborepo 2.11)
```
repo/
├─ apps/
│  ├─ web/                         # Next.js 16 App Router PWA (deployed to Vercel)
│  │  ├─ app/
│  │  │  ├─ (feed)/page.tsx         # home feed: trending + following
│  │  │  ├─ m/[slug]/page.tsx       # market page (RSC) + bet sheet (client)
│  │  │  ├─ m/[slug]/opengraph-image.tsx
│  │  │  ├─ m/[slug]/story-image/route.tsx   # 1080x1920 share card
│  │  │  ├─ c/[handle]/page.tsx     # creator profile
│  │  │  ├─ create/page.tsx         # AI-assisted market creation
│  │  │  ├─ portfolio/page.tsx      # positions + claims
│  │  │  ├─ leaderboard/page.tsx
│  │  │  ├─ actions.json/route.ts   # Solana Actions rules
│  │  │  ├─ manifest.ts             # PWA manifest
│  │  │  ├─ sw.ts                   # Serwist service worker source
│  │  │  └─ api/
│  │  │     ├─ markets/…            # Panta proxy (read)
│  │  │     ├─ trade/build|confirm/route.ts
│  │  │     ├─ claims/…  creator-fees/…
│  │  │     ├─ actions/market/[id]/route.ts   # Blink endpoint
│  │  │     ├─ onramp/session/route.ts        # Coinbase session token / provider URLs
│  │  │     ├─ ai/market-draft|moderate/route.ts
│  │  │     ├─ push/subscribe/route.ts
│  │  │     ├─ webhooks/helius|privy/route.ts
│  │  │     └─ inngest/route.ts
│  │  ├─ proxy.ts                   # Next 16 (was middleware.ts)
│  │  ├─ components/ (bet-sheet, odds-bar, market-card, comment-thread, share-sheet…)
│  │  └─ lib/ (query-client, privy-provider, posthog, env.ts)
│  └─ mobile/                      # (later) Expo 57 app reusing packages/*
├─ packages/
│  ├─ panta-client/                # server-only typed client + zod schemas
│  ├─ solana/                      # clusters, mints, tx decode/inspect/simulate, confirm loop
│  ├─ db/                          # drizzle schema, migrations, queries
│  ├─ ai/                          # prompts, zod schemas, Anthropic client
│  ├─ notifications/               # web-push, resend, whatsapp templates
│  ├─ ui/                          # shadcn/ui components (Tailwind v4)
│  └─ config/                      # tsconfig, biome, env schemas
├─ turbo.json  pnpm-workspace.yaml  .env.example
```

#### Code pattern A — Panta gateway route with auth, rate limit, inspection (server)
```ts
// apps/web/app/api/trade/build/route.ts  (illustrative; Panta method names are placeholders)
import 'server-only';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { PrivyClient } from '@privy-io/node';          // verify exact API in @privy-io/node 0.35 docs
import { panta } from '@repo/panta-client';
import { inspectAndSimulate } from '@repo/solana/verify';
import { db, txIntents } from '@repo/db';

const rl = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s') });
const Body = z.object({ marketId: z.string(), side: z.enum(['YES', 'NO']), amountUsd: z.number().positive().max(500) });

export async function POST(req: Request) {
  const user = await requireUser(req);                 // verifies Privy access token -> {id, wallet}
  const { success } = await rl.limit(`build:${user.id}`);
  if (!success) return Response.json({ error: 'rate_limited' }, { status: 429 });

  const body = Body.parse(await req.json());
  const ref = cookiesRef(req);                         // referral code from proxy.ts cookie
  const built = await panta.buildBuyTx({               // server-side Panta key
    marketId: body.marketId, side: body.side, amountUsd: body.amountUsd,
    wallet: user.wallet, attribution: ref,
  });

  await inspectAndSimulate(built.transaction, {        // throws on unexpected programs/signers/amounts
    expectedSigner: user.wallet, maxSpendUsd: body.amountUsd * 1.02,
  });

  const [intent] = await db.insert(txIntents).values({
    userId: user.id, wallet: user.wallet, kind: 'buy', pantaMarketId: body.marketId,
    side: body.side, amountUsd: String(body.amountUsd), txBase64: built.transaction,
    lastValidBlockHeight: built.lastValidBlockHeight, referralCode: ref, quote: built.quote,
  }).returning();

  return Response.json({ intentId: intent.id, txBase64: built.transaction, lastValidBlockHeight: built.lastValidBlockHeight });
}
```

#### Code pattern B — sign & send a server-built base64 tx with Privy (client)
```tsx
'use client';
// Based on Privy docs: useSignAndSendTransaction / useWallets from '@privy-io/react-auth/solana';
// input { transaction: Uint8Array, wallet, chain?, options?: { sponsor?, uiOptions? } } -> { signature: Uint8Array }
import { useSignAndSendTransaction, useWallets } from '@privy-io/react-auth/solana';
import { getBase64Encoder, getBase58Decoder } from '@solana/kit';

export function usePlaceBet() {
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  return async (marketId: string, side: 'YES' | 'NO', amountUsd: number) => {
    const wallet = wallets[0];                                     // embedded or linked Solana wallet
    const build = await fetch('/api/trade/build', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ marketId, side, amountUsd }),
    }).then(r => r.json());

    const txBytes = new Uint8Array(getBase64Encoder().encode(build.txBase64));
    const { signature } = await signAndSendTransaction({
      transaction: txBytes,
      wallet,
      chain: 'solana:mainnet',                                     // verify id format for your SDK version
      // options: { sponsor: true },  // ONLY if Panta tx is unsigned (Privy rewrites fee payer + blockhash)
    });
    const sig = getBase58Decoder().decode(signature);

    const res = await fetch('/api/trade/confirm', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intentId: build.intentId, signature: sig }),
    }).then(r => r.json());
    if (res.status === 'expired') { /* silently rebuild via /api/trade/build and re-prompt */ }
    return sig;
  };
}
```

#### Code pattern C — sign with wallet-adapter (web3.js v1), broadcast ourselves (client)
```tsx
'use client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';   // 0.15.40, peer web3.js ^1.99
import { VersionedTransaction } from '@solana/web3.js';                    // 1.99.0

export function usePlaceBetExternal() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();

  return async (txBase64: string, intentId: string) => {
    if (!publicKey) throw new Error('connect wallet');
    const bytes = Uint8Array.from(atob(txBase64), c => c.charCodeAt(0));   // avoid Buffer polyfill
    const tx = VersionedTransaction.deserialize(bytes);

    // Path 1 (simplest): let the wallet submit
    // const sig = await sendTransaction(tx, connection, { maxRetries: 0 });

    // Path 2 (more control): sign only, our server rebroadcasts until confirmed/expired
    const signed = await signTransaction!(tx);   // preserves any existing Panta partial signatures
    const wire = btoa(String.fromCharCode(...signed.serialize()));
    return fetch('/api/trade/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intentId, signedTxBase64: wire }),
    }).then(r => r.json());
  };
}
```

#### Code pattern D — server confirm/rebroadcast loop with @solana/kit 8.x
```ts
// packages/solana/confirm.ts (illustrative; verify method names against @solana/kit 8.4 typings)
import { createSolanaRpc, type Base64EncodedWireTransaction, type Signature } from '@solana/kit';
const rpc = createSolanaRpc(process.env.HELIUS_RPC_URL!);

export async function confirmOrExpire(sig: Signature, lastValidBlockHeight: bigint, wire?: Base64EncodedWireTransaction) {
  for (;;) {
    const [{ value: [status] }, height] = await Promise.all([
      rpc.getSignatureStatuses([sig]).send(),
      rpc.getBlockHeight({ commitment: 'confirmed' }).send(),
    ]);
    if (status?.err) return { status: 'failed' as const, err: status.err };
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized')
      return { status: 'confirmed' as const };
    if (height > lastValidBlockHeight) return { status: 'expired' as const };   // rebuild via Panta
    if (wire) await rpc.sendTransaction(wire, { encoding: 'base64', skipPreflight: true, maxRetries: 0n }).send().catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  }
}

export async function simulate(txBase64: string) {
  const { value } = await rpc.simulateTransaction(txBase64 as Base64EncodedWireTransaction, {
    encoding: 'base64', sigVerify: false, replaceRecentBlockhash: false, commitment: 'confirmed',
  }).send();
  if (value.err) throw new Error(`simulation failed: ${JSON.stringify(value.err)} ${value.logs?.slice(-5).join('\n')}`);
  return value;
}
// Static inspection: getTransactionDecoder().decode(bytes) -> { messageBytes, signatures };
// getCompiledTransactionMessageDecoder().decode(messageBytes) -> staticAccounts + instructions(programAddressIndex)
// -> assert program allowlist, fee payer (staticAccounts[0]), and required signers.
```

#### Code pattern E — OG image route (Next.js 16)
```tsx
// apps/web/app/m/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { getMarketCard } from '@/lib/markets';      // cached Panta data + markets_meta

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;                        // odds refresh in previews at most every minute

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;                      // params are async in Next 15+/16
  const m = await getMarketCard(slug);
  const yes = Math.round(m.yesPrice * 100);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', padding: 64, background: '#0B0B12', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 32 }}>
          <img src={m.creator.avatarUrl} width={72} height={72} style={{ borderRadius: 36 }} />
          <span>@{m.creator.handle} asks</span>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{m.title}</div>
        <div style={{ display: 'flex', gap: 24, fontSize: 44 }}>
          <div style={{ background: '#16a34a', padding: '12px 28px', borderRadius: 16 }}>YES {yes}%</div>
          <div style={{ background: '#dc2626', padding: '12px 28px', borderRadius: 16 }}>NO {100 - yes}%</div>
          <div style={{ marginLeft: 'auto', opacity: 0.7 }}>${m.volumeUsd.toLocaleString()} vol</div>
        </div>
      </div>
    ),
    size,
  );
}
```

#### Code pattern F — Solana Action / Blink endpoint skeleton (no web3.js dependency)
```ts
// apps/web/app/api/actions/market/[id]/route.ts
// Spec: GET -> ActionGetResponse metadata; POST {account} -> { type:'transaction', transaction: base64 }.
// Headers mirror ACTIONS_CORS_HEADERS from @solana/actions (spec 2.x); verify against @solana/actions-spec 2.4.2.
import { panta } from '@repo/panta-client';
import { inspectAndSimulate } from '@repo/solana/verify';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Action-Version, X-Blockchain-Ids',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '2.4',
  'X-Blockchain-Ids': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // mainnet CAIP-2
  'Content-Type': 'application/json',
};

export const OPTIONS = () => new Response(null, { headers: CORS });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await panta.getMarket(id);
  const base = `/api/actions/market/${id}`;
  return new Response(JSON.stringify({
    type: 'action',
    icon: `${new URL(req.url).origin}/m/${m.slug}/opengraph-image`,
    title: m.title,
    description: `YES ${Math.round(m.yesPrice * 100)}% · ${m.creatorHandle}`,
    label: 'Bet',
    links: {
      actions: [
        { type: 'transaction', label: 'YES $1', href: `${base}?side=YES&amount=1` },
        { type: 'transaction', label: 'NO $1',  href: `${base}?side=NO&amount=1` },
        { type: 'transaction', label: 'Bet', href: `${base}?side={side}&amount={amount}`,
          parameters: [
            { name: 'side', label: 'Side', type: 'radio', required: true,
              options: [{ label: 'YES', value: 'YES' }, { label: 'NO', value: 'NO' }] },
            { name: 'amount', label: 'USDC amount', type: 'number', required: true },
          ] },
      ],
    },
  }), { headers: CORS });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const side = url.searchParams.get('side') === 'NO' ? 'NO' : 'YES';
  const amount = Math.min(Number(url.searchParams.get('amount') ?? 1), 100);
  const { account } = (await req.json()) as { account: string };       // validate base58 pubkey
  // rate-limit by IP + account here
  const built = await panta.buildBuyTx({ marketId: id, side, amountUsd: amount, wallet: account, attribution: 'blink' });
  await inspectAndSimulate(built.transaction, { expectedSigner: account, maxSpendUsd: amount * 1.02 });
  return new Response(JSON.stringify({ type: 'transaction', transaction: built.transaction, message: `Bet ${side} $${amount}` }),
    { headers: CORS });
}

// apps/web/app/actions.json/route.ts
// export const GET = () => Response.json({ rules: [{ pathPattern: '/m/*', apiPath: '/api/actions/market/*' }] }, { headers: CORS });
// NOTE: map /m/:slug -> market id inside the action route, or use /m/:id in share URLs.
```

#### Code pattern G — AI market draft with structured outputs (server)
```ts
// packages/ai/market-draft.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const client = new Anthropic();
export const MarketDraft = z.object({
  question: z.string(), yesMeans: z.string(), noMeans: z.string(),
  closeTimeIso: z.string(), resolutionSource: z.string(), resolutionCriteria: z.string(),
  edgeCases: z.array(z.string()), category: z.string(),
  ambiguityScore: z.number(), policyFlags: z.array(z.string()),
});

export async function draftMarket(creatorPrompt: string, nowIso: string) {
  const res = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    output_config: { format: zodOutputFormat(MarketDraft), effort: 'medium' },
    system: 'You turn creator ideas into objective, binary, time-bound prediction market questions with a single verifiable resolution source. Flag (policyFlags) anything involving private individuals, minors, violence/death, or unverifiable outcomes.',
    messages: [{ role: 'user', content: `Current time: ${nowIso}\nCreator idea:\n<idea>${creatorPrompt}</idea>` }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error('draft_unavailable');
  return res.parsed_output;
}
// Moderation: same pattern with model 'claude-haiku-5-5', output_config.effort 'low',
// schema { verdict: 'allow'|'review'|'block', categories: string[], reason: string }.
```

#### Environment variables (.env.example)
```
NEXT_PUBLIC_SOLANA_CLUSTER=devnet            # devnet | mainnet
NEXT_PUBLIC_PRIVY_APP_ID=  PRIVY_APP_SECRET=
PANTA_API_URL=  PANTA_API_KEY=               # server-only
HELIUS_API_KEY=  HELIUS_RPC_URL=  HELIUS_WEBHOOK_SECRET=  FALLBACK_RPC_URL=
NEXT_PUBLIC_RPC_URL=                         # rate-limited/proxied public RPC for reads
SPONSOR_SIGNER=privy|kora|kms  KORA_RPC_URL=
DATABASE_URL=  NEXT_PUBLIC_SUPABASE_URL=  NEXT_PUBLIC_SUPABASE_ANON_KEY=  SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=  UPSTASH_REDIS_REST_TOKEN=
ANTHROPIC_API_KEY=
CDP_API_KEY_ID=  CDP_API_KEY_SECRET=  MOONPAY_PUBLISHABLE_KEY=  MOONPAY_SECRET_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  VAPID_PRIVATE_KEY=  RESEND_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=  POSTHOG_HOST=  SENTRY_DSN=
INNGEST_EVENT_KEY=  INNGEST_SIGNING_KEY=
```

#### Hackathon MVP cut vs production path
- **MVP (2–4 weeks):**
  - Privy (embedded + Phantom external) and Next.js PWA on Vercel.
  - Panta proxy, buy/claim/create, and Supabase + Drizzle.
  - OG images and `wa.me`/X share.
  - Polling-based odds (10 s) and Helius Developer RPC.
  - One onramp: Privy fiat onramp, or Coinbase Headless for US.
  - Privy gas sponsorship if compatible; otherwise a small SOL drip after SMS verification.
  - Claude drafts and moderation.
  - PostHog funnels.
- **Production:**
  - Kora or a KMS co-signer with allowlists.
  - Helius webhooks → verified `trades_cache`.
  - Supabase Realtime odds.
  - Geo-routed onramps incl. Yellow Card/Kotani/UPI, plus offramps.
  - Web Push + WhatsApp templates.
  - Sybil scoring and leaderboard eligibility.
  - Registered Blinks.
  - Sentry/SLO alerts.
  - Expo app with MWA (Android) and Privy Expo.

### Gaps
- No 2026 source confirms that X still unfurls Blinks, or how Phantom and other wallets currently support Blinks/Dialect registry gating. Treat Blinks as an experimental growth channel and verify before investing.
- Exact Solana Actions response field names (e.g., `parameters[].options`, `type: 'radio'`) and current `X-Action-Version` should be checked against `@solana/actions-spec` 2.4.2 types before shipping.
- All Panta method names in the snippets (`buildBuyTx`, `getMarket`, response fields `transaction`, `lastValidBlockHeight`, `quote`) are placeholders pending the Panta API researcher's findings.
