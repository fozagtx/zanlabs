# Panta prediction-market API and the Panta API Sidetrack (Colosseum Crypto World's Fair): implementation reference

Research date: 2026-10-07. Researcher notes for the report writer.

**How the sources were accessed (read this first).** This sandbox's egress proxy blocked every request to `panta.market`, `docs.panta.market`, `live-api.panta.market`, `superteam.fun`, `colosseum.com`, `arena.colosseum.org` and `panta-api-playground.vercel.app` (CONNECT 403). WebFetch also failed (DNS) on every host I tried. **No live API calls were made.** The official docs could still be read in full: their Mintlify source is published on GitHub as `Kaito-HQ/panta-api-pub` (commit `9cd3f27`, 2026-09-17), and `docs.json` there sets the published site and the server `https://live-api.panta.market/api/v1`. I read every page in that repo, along with the official playground `Kaito-HQ/panta-api-playground` (commit `a92b0db`, 2026-09-09). Where the notes below say **[DOC]**, the claim comes verbatim from those official files. **[3P]** means a third-party hackathon repo that reports its own live measurements, which may be wrong. **[INF]** means my own inference.

URLs attempted and what happened:
- `panta.xyz`, `www.panta.xyz`, `panta.fun`, `docs.panta.xyz`, `docs.panta.fun`, `panta.market`, `docs.panta.market`, `app.panta.xyz`, `api.panta.xyz`, `panta.so`, `docs.panta.so`, `panta.io`, `pantamarket.com`, `panta.trade`, `app.panta.market`: all blocked by the proxy (403). This says nothing about whether the hosts exist. The real domain is **panta.market**.
- `https://docs.panta.market/llms.txt` and `/llms-full.txt`: blocked. WebFetch on docs.panta.market and www.panta.market/how-it-works: DNS failure.
- `superteam.fun/earn/listing/panta-api-side-track` (page and API), `colosseum.com/worldsfair`, `arena.colosseum.org`: blocked.
- npm search for `panta`, `panta-sdk`, `@panta`, `pantamarket`: **no official Panta SDK package** (only unrelated packages).
- GitHub: found the official org repos `Kaito-HQ/panta-api-pub` (docs) and `Kaito-HQ/panta-api-playground` (demo), plus about 15 Sidetrack competitor repos.

---

## 1. Where are the official Panta docs and resources, and who operates Panta?

### Takeaway
The official docs live at **docs.panta.market** (Mintlify). Their source is the public GitHub repo `Kaito-HQ/panta-api-pub`, and the official reference integration is `Kaito-HQ/panta-api-playground` (Next.js). The product is **panta.market**, run by Balr Holdings Corporation (BVI). There is no official npm SDK. You integrate over plain REST.

### Cited Findings
- [DOC] The docs site is named "Panta API", described as "Public API for Panta USDC prediction markets on Solana. Quote, build unsigned transactions, and attribute trades — without holding user keys." Its API playground server is `https://live-api.panta.market/api/v1`. — [docs.json](https://github.com/Kaito-HQ/panta-api-pub/blob/main/docs.json)
- [DOC] Docs navigation has two tabs. Guides covers index, quickstart, how-it-works, authentication, errors and terms-of-use. API reference covers Auth (3 pages), Account (9), Markets catalog (6), Create market (5), Primary buy (5), Positions and claims (3) and Trades (2). — [docs.json](https://github.com/Kaito-HQ/panta-api-pub/blob/main/docs.json)
- [DOC] The docs repo README says "Endpoint contracts are adapted from `panta-dev` (`docs/external/` and the live Django routes). Prefer the running API when docs and code diverge." The backend is therefore Django. — [panta-api-pub README](https://github.com/Kaito-HQ/panta-api-pub/blob/main/README.md)
- [DOC] Operator: "Provider: Balr Holdings Corporation, operator of Panta Market ('Panta')". The Terms took effect September 7, 2026 and are governed by British Virgin Islands law. — [Terms of Use](https://docs.panta.market/guides/terms-of-use) ([source](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/terms-of-use.mdx))
- [DOC] The official playground README: "Next.js demo for the Panta Markets API — sign up / log in, mint an API key, run create / buy / claim / trades flows." Its `.env.example` lists Live `https://live-api.panta.market/api/v1`, Staging `https://staging-api.panta.market/api/v1`, Local `http://localhost:8000/api/v1`, and `NEXT_PUBLIC_DOCS_URL=https://github.com/Kaito-HQ/panta-api-pub`. — [playground README](https://github.com/Kaito-HQ/panta-api-playground/blob/main/README.md), [.env.example](https://github.com/Kaito-HQ/panta-api-playground/blob/main/.env.example)
- [3P] The Sidetrack listing's resources were: docs `https://docs.panta.market/`, the playground repo, site `https://www.panta.market/`, Solana docs, Discord `#dev-chat` (`https://discord.gg/M76nH6fUwc`) and X `@pantahq`. — [Henoch4/Tars panta-integration-report.md](https://github.com/Henoch4/Tars/blob/main/docs/panta-integration-report.md); [MitchH69 SCOPE.md](https://github.com/MitchH69/panta-api-sidetrack/blob/main/SCOPE.md) (which also names the sponsor POC on Telegram as `https://t.me/toria_dickson`). There is also a live playground at `https://panta-api-playground.vercel.app`.
- [3P] Older (July 2026) community material calls the product "PantaMarkets" — [ilichb/panta-market-simulator](https://github.com/ilichb/panta-market-simulator/blob/main/README.md). Panta's image CDN path is `balr-market/events/...` — [image-upload doc](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/image-upload.mdx).

### Inferences
- [INF] Panta comes from the "Kaito-HQ" GitHub org and the Balr Holdings entity, with "balr-market" as the internal codename. The docs repo is the canonical, versioned source of truth. Re-pull it before the build, because it can change.
- [INF] Some Panta-created market images are stored under paths that include `did_privy_...`, e.g. [panta-pulse evidence/market-detail.json](https://github.com/agenticaotearoa/panta-pulse/blob/main/evidence/market-detail.json). That suggests Panta's own front end uses **Privy embedded wallets**.

### Gaps
- I could not render docs.panta.market itself to confirm that the published site matches the repo's 2026-09-17 commit.
- I could not read panta.market/how-it-works, the official mechanism page. Mechanism details below therefore come from docs plus third-party sources.

---

## 2. Base URL, authentication, environments, headers, errors and rate limits

### Takeaway
There is one base URL: `https://live-api.panta.market/api/v1`, and every path needs a trailing slash. Auth is self-serve. You register with email and password to get a JWT, mint an API key (`pk_test_…` or `pk_live_…`), and send it as `X-Api-Key`, server-side only. There are no "builder codes" as such. Attribution is tied to your API account (`usr_…`, `key_…`), with an optional `X-User-Id` / `userId` attribution id. Errors are `{code, message, field|fields}`. Rate limits are per account, per route family.

### Cited Findings
- [DOC] "Trailing slashes are required. Authenticate with `X-Api-Key` **or** `Authorization: Bearer <access>`." Base URL `https://live-api.panta.market/api/v1`. — [index.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/index.mdx)
- [DOC] Signup and login: `POST /auth/register/` takes `{email, password (min 8, max 128), name?}` and returns 201 `{userId:"usr_…", email, name, access, refresh}`. A duplicate email returns 409 `EMAIL_TAKEN`. `POST /auth/token/` takes `{email,password}` and returns the same envelope. `POST /auth/token/refresh/` takes `{refresh}` and returns `{access, refresh}`. Refresh tokens are rotated. — [register](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/auth/register.mdx), [token](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/auth/token.mdx), [refresh](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/auth/refresh.mdx)
- [DOC] Mint a key with `POST /account/keys/` and body `{env:"test"|"live", name?, revokeOthers?}`. The 201 response is `{id:"key_…", name, prefix, env, status, secret:"pk_test_…", createdAt, revokedAt}`. "The plaintext `secret` is shown **once**." — [create-key](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/account/create-key.mdx), [quickstart](https://github.com/Kaito-HQ/panta-api-pub/blob/main/quickstart.mdx)
- [DOC] Headers: `X-Api-Key` (preferred for product routes), `Authorization: Bearer <access>`, `Content-Type: application/json`, `X-Request-Id` (optional correlation id), and `X-User-Id` ("Optional attribution id; defaults to the authenticated account"). "Keys in query parameters are rejected with `401`." — [authentication.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/authentication.mdx)
- [DOC] Response headers: `X-Request-Id`, `X-Powered-By: Panta` on 2xx, `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` (ISO-8601), and `Retry-After` on 429. CORS exposes only the request id, rate-limit headers and Retry-After. To show "Powered by Panta" in a browser SPA, "either call via your backend or hardcode the badge." — [authentication.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/authentication.mdx)
- [DOC] Both `pk_test_` and `pk_live_` "are accepted on the public API". The docs do not describe a separate sandbox. — [authentication.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/authentication.mdx)
- [3P] **The two key types behave differently.** "A `pk_test_…` key returns **sandbox fixtures only**; `pk_live_…` returns real Solana mainnet data" — [panta-pulse SPEC.md](https://github.com/agenticaotearoa/panta-pulse/blob/main/SPEC.md). In sandbox mode "every write (buy quote, build, submit, verify, claim, market creation, attribution) goes to Panta's `pk_test_` fixtures: the whole flow runs, Panta returns order ids and signatures, and nothing is sent to Solana" — [sonar-panta README](https://github.com/G-ojies/sonar-panta). Another builder says a pk_test key returns "one test market, canned quote/build/verify… the sandbox returns no instructions" — [Pot README](https://github.com/Baheet18/pot). pk_test also "return[s] one sandbox market with ISO dates and no `avgPrice`" ([3P] fairline README, github.com/Pantomath251/fairline).
- [DOC] `canCreateMarkets` defaults to `true` on signup. "Operators may disable it; then create routes return `CREATE_NOT_PERMITTED`." — [authentication.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/authentication.mdx)
- [DOC] Error envelope: `{ "code": "INVALID_MARKET_PARAMS", "message": "...", "field": "startTime" }` or `{ code, message, fields: { imageUrl: ["This field is required."] } }`. "Switch on `code`." HTTP statuses used: 400, 401, 403, 404, 409, 413, 429 and 500. — [errors.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/errors.mdx)
- [DOC] Full error code list: `UNAUTHORIZED`, `EMAIL_TAKEN`, `CREATE_NOT_PERMITTED`, `FORBIDDEN`, `INVALID_MARKET_PARAMS`, `DUPLICATE_MARKET`, `CREATE_EXPIRED`, `QUOTE_EXPIRED`, `QUOTE_STALE`, `AMOUNT_TOO_SMALL`, `MARKET_NOT_FOUND`, `MARKET_NOT_IN_PRIMARY`, `NOT_CLAIMABLE`, `NOT_MARKET_CREATOR`, `MARKET_NOT_GRADUATED`, `NO_CREATOR_FEES`, `UPLOAD_NOT_CONFIGURED` (503), `TX_NOT_FOUND`, `TX_FAILED`, `TX_MISMATCH`, `TX_FEE_MISMATCH`, `RATE_LIMITED`, `INTERNAL_ERROR`. — [errors.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/errors.mdx)
- [DOC] Default rate limits, "per account (and optionally per IP)": `read` 120/60s (account and catalog reads); `positions` 60/60s; `quote` 30/60s; `build` 20/60s (create, primary and claim builds); `register` 40/60s (register, trade report, submit, auth); `upload` 10/60s. "Deployments may override." — [errors.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/errors.mdx)
- [DOC] Session TTLs: create session `createId` about 5 min, build blockhash hint about 60 s, primary quote `quoteId` about 90 s, primary order `orderId` about 120 s. — [errors.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/errors.mdx)
- [DOC] "Do not send: wallet private keys / seed phrases; API keys in URLs; oracle feed identifiers (derived server-side from resolution metadata)." — [authentication.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/authentication.mdx)
- [DOC] The playground routes every call through a server-side Next.js proxy (`/api/panta/[...path]`) that forwards `Authorization`, `X-Api-Key` and `X-User-Id` and **appends a trailing slash** to each path. — [route.ts](https://github.com/Kaito-HQ/panta-api-playground/blob/main/src/app/api/panta/%5B...path%5D/route.ts)

### Inferences
- [INF] Panta has no "builder code" system. Your app's identity is its Panta account and API key, and all quotes, builds and reports made with that key credit that account. Use `X-User-Id` to tag individual end users or creators, but treat it as a sub-label inside your account, not as a separate payout identity.
- [INF] For the hackathon build, run two keys with an explicit environment toggle in the UI:
  - a `pk_live_` key for the real mainnet catalog and real transactions;
  - a `pk_test_` key for zero-cost demo recording. Label sandbox data clearly, because the Terms forbid presenting simulated data as live.
- [INF] The `quote` (30/60s) and `build` (20/60s) limits are per account. A viral creator market with many fans buying at once could hit 429 on the shared app key. Queue on the server with backoff, and cache `GET /markets/{id}/` responses.

### Gaps
- Whether the per-account rate limits can be raised for production is not documented. Someone asked on the listing and got no public answer ([Tars report](https://github.com/Henoch4/Tars/blob/main/docs/panta-integration-report.md)). Ask in Discord `#dev-chat`.
- The staging host `staging-api.panta.market` appears only in the playground `.env.example`. Whether it is publicly usable, and on devnet, is unconfirmed.
- The body size limit behind HTTP 413 is not stated.

---

## 3. Complete endpoint reference (method, path, params and response fields, as documented)

### Takeaway
There are 31 documented routes under `/api/v1`: auth (3), account (10, counting the `/whoami/` alias), catalog (5), create (4), primary buy (4), positions and claims (3), and trades (2), plus the admin routes the playground uses. All amounts are strings. Create-market fees are integer USDC base units (6 decimals); primary-buy amounts are decimal strings.

### Cited Findings
**Auth (public):** — [auth pages](https://github.com/Kaito-HQ/panta-api-pub/tree/main/api-reference/auth)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register/` | `email`, `password`, `name?` | 201 `{userId, email, name, access, refresh}` |
| POST | `/auth/token/` | `email`, `password` | 200 same envelope |
| POST | `/auth/token/refresh/` | `refresh` | `{access, refresh}` |

**Account (API key or Bearer):** — [account pages](https://github.com/Kaito-HQ/panta-api-pub/tree/main/api-reference/account)
| Method | Path | Params / Body | Response |
|---|---|---|---|
| GET | `/account/` (alias `GET /whoami/`) | — | `{userId, email, name, status:"active"\|"suspended", canCreateMarkets, createdAt, apiKeyId}` |
| PATCH | `/account/` | `name` (required, max 255) | same as GET |
| GET | `/account/dashboard/` | — | `{account, keys:{active,revoked,total}, metrics:{creates:{total,byStatus}, trades:{total,volumeUsdcBase,byKind}}, permissions:{canCreateMarkets}}` |
| GET | `/account/metrics/` | `limit` (default 50, cap 200) | `{summary:{creates,trades,keys}, creates:[…], trades:[…]}` |
| GET | `/account/creates/` | `limit`, `status` (`pending`\|`built`\|`registered`…) | `{summary, items:[{createId, eventPda, status, wallet, signature, paymentUsdc:"50.00", paymentUsdcBase:"50000000", createdAt, updatedAt}]}` |
| GET | `/account/trades/` | `limit`, `kind` (`buy`\|`claim`) | `{summary:{total, volumeUsdcBase, byKind}, items:[{signature, wallet, marketId, side, kind, amountUsdc, amountUsdcBase, status, createdAt}]}` |
| GET | `/account/keys/` | — | `{keys:[{id, name, prefix, env, status, createdAt, revokedAt}]}` |
| POST | `/account/keys/` | `env` (`test`\|`live`), `name?`, `revokeOthers?` | 201 key object plus one-time `secret` |
| POST | `/account/keys/{id}/revoke/` | empty | key object with `status:"revoked"` |

**Markets catalog:** — [catalog](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/catalog.mdx), [list](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/list.mdx), [get](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/get.mdx), [trades](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/trades.mdx), [categories](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/categories.mdx), [wallet-trades](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/wallet-trades.mdx)
| Method | Path | Params | Response |
|---|---|---|---|
| GET | `/markets/` | `category`, `status` (`primary`\|`secondary`\|`resolved`\|`cancelled`), `createdBy=me`, `cursor`, `limit` (default 20, max 50) | `{items:[MarketItem], nextCursor}` |
| GET | `/markets/{marketId}/` | — | single MarketItem, with prices filled "from on-chain state when RPC is available" |
| GET | `/markets/{marketId}/trades/` | `limit` (default 50, cap 200) | `{marketId, items:[{id, marketId, wallet, isPrimary, yesAmount, noAmount, feePaid, blockTime, signature, quoteAsset}]}` |
| GET | `/categories/` | — | `{categories:["sports","crypto","politics","entertainment","finance","science","world","other"]}` |
| GET | `/wallets/{wallet}/trades/` | `limit` | `{wallet, items:[…same trade row…]}` |

- [DOC] The documented MarketItem fields are: `marketId` (event PDA), `category`, `title`, `description`, `images[]`, `phase`, `marketType` (`standard`\|`breaking`), `startTime`/`endTime`/`resolutionTime` (unix seconds), `region`, `resolved`, `status`, `volumeUsdc`, `campaignId`, `createdByPartner`, and `yesPrice`/`noPrice`/`primaryYesPrice`/`primaryNoPrice`/`secondaryYesPrice`/`secondaryNoPrice`. The price fields are "`null` on list; filled on detail". — [list.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/list.mdx)
- [DOC] The playground's TypeScript `MarketCatalogItem` adds `volumeUsdcBase`, `totalVolumeUsdc`, `totalVolumeUsdcBase`, `creationFee`, `creatorAddress` and `oracle`. — [types.ts](https://github.com/Kaito-HQ/panta-api-playground/blob/main/src/lib/types.ts)
- [3P] A captured live `GET /markets/{id}/` response contains these **undocumented** fields: `creatorAddress`, `oracle` (e.g. `"af-news-bbc-africa"`), `transactionHash`, `votes`, `creationFee`, `primaryVolume`, `secondaryVolume`, `tradingFeeAccrued`, `creatorTwitterHandle`, `creatorInstagramHandle`, `sentToUma`, `hermesResponse`, `isGraduated`, `graduationFailureReason`, `quoteAsset:"usdc"`, `programId`, `volumeUsdcBase`, `totalVolumeUsdc` and `totalVolumeUsdcBase`. — [panta-pulse evidence/market-detail.json](https://github.com/agenticaotearoa/panta-pulse/blob/main/evidence/market-detail.json)
- [3P] "A complete card carries `question`, `resolutionRule`, `sources`, `totalTrades`, `totalVolume`, `isResolved`, `oracleResultSubmitted` and `onChain`. A stripped card carries none of them." — [settlement-check README](https://github.com/bisale24-ops/settlement-check)

**Create market:** `POST /markets/create/image-upload/`, `POST /markets/create/quote/`, `POST /markets/create/build/`, `POST /markets/register/`. See section 4.
**Primary buy:** `POST /primaryorderquote/`, `POST /primaryorderbuild/`, `POST /primaryordersubmit/`, `POST /primaryorderverify/`. See section 5.
**Positions and claims:** `GET /positions/?wallet=`, `POST /claim/build/`, `POST /claim/creator-fees/build/`. See sections 6 and 7.
**Trades (attribution):** `POST /trades/`, `GET /trades/{signature}/`. See section 8.
- [DOC] The playground also has an "Admin" tab ("Metrics, creates, trades, user detail (admin API key)"). Those routes are not in the public docs. — [playground README](https://github.com/Kaito-HQ/panta-api-playground/blob/main/README.md)

### Inferences
- [INF] **Path discrepancies in third-party code. Use the docs paths.**
  - The panta-pulse SPEC lists `POST /markets/create/register/`, `POST /trades/report/` and `GET /trades/status/?signature=`, and calls them "verified". The official docs and playground use `POST /markets/register/`, `POST /trades/` and `GET /trades/{signature}/`.
  - settlement-check reports that `GET /markets/categories/` returns `MARKET_NOT_FOUND`. The documented route is `GET /categories/`, so that "defect" is most likely a wrong path.
- [INF] For a creator-led app, `creatorAddress`, `creatorTwitterHandle` and `creatorInstagramHandle` on the market card are directly useful for creator profile pages. No documented create field sets the social handles, though.

### Gaps
- There is no documented way to set `creatorTwitterHandle` or `creatorInstagramHandle` through the API.
- Undocumented fields (`isGraduated`, `onChain`, `question`, `resolutionRule`, `sentToUma`, …) may change without notice.

---

## 4. Flow (a): creating a market (image → fee quote → build tx → user signs → broadcast → register)

### Takeaway
Any API account with `canCreateMarkets` (on by default) can create a market. The **creator wallet** pays a fee read from on-chain config: **50 USDC in the documented example and in third-party live measurements, split 40 to the platform and 10 as liquidity injection**. That wallet signs a base64 unsigned `VersionedTransaction`, and you broadcast it on your own RPC. You then call `/markets/register/` with the signature within about 5 minutes of the quote. The creator writes the resolution rule and sources of truth but does not resolve the market.

### Cited Findings
- [DOC] Steps: (optional) image upload, then quote, then build, then sign and broadcast ("Panta does not broadcast"), then register. "Sessions last about 5 minutes. Rebuild if the blockhash expires (~60s). Do not change instruction accounts or fee amounts." — [markets/overview.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/overview.mdx)
- [DOC] **`POST /markets/create/image-upload/`** takes an empty JSON body. It returns `{uploadUrl, publicId, expiresAt (~5 min), fields:{api_key, timestamp, signature, upload_preset, folder, public_id, overwrite, …}}`. You POST multipart form-data (all `fields` plus `file`) to `uploadUrl` (Cloudinary) and use Cloudinary's `secure_url` as `imageUrl`. "Image bytes never pass through Panta." It needs `canCreateMarkets`. Errors: `UPLOAD_NOT_CONFIGURED` (503). — [image-upload.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/image-upload.mdx)
- [DOC] **`POST /markets/create/quote/`** request body:
  - `wallet` (required; "Fee payer and transaction signer")
  - `question` (required, max 512; "Combined with `wallet` to derive the event address")
  - `resolutionRule` (required, max 2048)
  - `sourcesOfTruth` (required string[], non-empty, max 20)
  - `category` (required; one of `sports, crypto, politics, entertainment, finance, science, world, other`)
  - `startTime`, `endTime`, `resolutionTime` (required, unix seconds; `startTime < endTime ≤ resolutionTime`)
  - `imageUrl` (required)
  - `marketType` (`standard` default, or `breaking`)
  - `eventInProgress` (breaking only)
  - `title` (defaults to `question`), `description`, `region` (default `Global`)
  - `oracle` (defaults to `sourcesOfTruth` joined by `,`)
  - "`paymentUsdc` in the request is ignored; the fee comes from on-chain config."
  — [quote.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/quote.mdx)
- [DOC] Quote response: `{createId:"cr_…", expectedEventPda, paymentUsdc:"50000000", liquidityInjectionUsdc:"10000000", platformRevenueUsdc:"40000000", marketType, expiresAt, blockhashExpiryHintSec:60}`. Errors: `INVALID_MARKET_PARAMS`, `DUPLICATE_MARKET`, `CREATE_NOT_PERMITTED`, `UNAUTHORIZED`, `RATE_LIMITED`. — [quote.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/quote.mdx)
- [DOC] `imageUrl` rules: exactly one string URL, publicly reachable over http(s), not localhost or a private network (SSRF guard), max 2048 chars, 1024×1024 recommended. "Do not pass data URLs, short-lived signed URLs, or private buckets." — [quote.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/quote.mdx)
- [DOC] "`startTime` must respect on-chain `minimumStartDelay` (typically **3600s** ahead of now) unless `eventInProgress` is set on a breaking market." — [how-it-works.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/how-it-works.mdx). The playground UI enforces start ≥ now+3600 and defaults to a 7-day market (end = start+7d, resolution = end+1h). — [CreateMarketFlow.tsx](https://github.com/Kaito-HQ/panta-api-playground/blob/main/src/components/CreateMarketFlow.tsx)
- [DOC] **`POST /markets/create/build/`** takes `{createId (required), wallet? (must equal the quote wallet)}`. It returns:
  - `createId`, `expectedEventPda`
  - `transaction` ("Base64-encoded unsigned `VersionedTransaction`"), `recentBlockhash`, `lastValidBlockHeight`, `blockhashExpiryHintSec`
  - `buildFingerprint` ("Integrity fingerprint checked at register")
  - `paymentUsdc`, `liquidityInjectionUsdc`, `platformRevenueUsdc`, `marketType`
  - `derived:{event, vaultAuthority, marketConfig, …}`, `expiresAt`

  Errors: `CREATE_EXPIRED`, `UNAUTHORIZED`, `INVALID_MARKET_PARAMS`, `RATE_LIMITED`. — [build.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/build.mdx)
- [DOC] **`POST /markets/register/`** takes `{createId, signature}` (base58) and returns `{createId, marketId:"<eventPda>", status:"registered", signature, category, title, images:[…]}`. "Verification is fail-closed (transaction presence and success, program, accounts, fee match). Repeating the same `createId` and `signature` is idempotent." Errors: `CREATE_EXPIRED`, `TX_NOT_FOUND`, `TX_FAILED`, `TX_MISMATCH`, `TX_FEE_MISMATCH`, `INVALID_MARKET_PARAMS`, `RATE_LIMITED`. — [register.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/register.mdx)
- [DOC] The playground signs with `@solana/wallet-adapter-react` `signTransaction` and then calls `connection.sendRawTransaction(signed.serialize(), {skipPreflight:false, preflightCommitment:"confirmed"})`. It deserializes with `VersionedTransaction.deserialize(Buffer.from(base64,"base64"))`. — [CreateMarketFlow.tsx](https://github.com/Kaito-HQ/panta-api-playground/blob/main/src/components/CreateMarketFlow.tsx), [solana.ts](https://github.com/Kaito-HQ/panta-api-playground/blob/main/src/lib/solana.ts)
- [3P] Measured live: "`paymentUsdc` = **50000000** base units = **50 USDC** per market (40 platform revenue + 10 liquidity injection)". The live build's `derived` also included `creatorWhitelist`, `creatorFeeVault`, `creatorPosition`, `creatorTokenAccount`, `vaultTokenAccount` and `treasuryTokenAccount`. — [panta-pulse SPEC.md](https://github.com/agenticaotearoa/panta-pulse/blob/main/SPEC.md), [evidence JSON](https://github.com/agenticaotearoa/panta-pulse/blob/main/evidence/live-pipeline-run-2026-09-20.json). Another team agrees: "creating a market costs about $50 USDC on Panta ($40 platform fee + $10 starting liquidity)" — [called-it README](https://github.com/ferzerz5-lab/called-it).
- [3P] Decoding the captured unsigned create transaction (my own decode of the panta-pulse evidence file) shows:
  - a v0 transaction with one signer, the creator wallet;
  - ComputeBudget SetComputeUnitLimit of 400,000;
  - an ATA `CreateIdempotent` for the creator's USDC account;
  - one instruction to program `6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp` with 538 bytes of data containing the question, the resolution rule and the source URLs;
  - the USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (mainnet USDC).

  — [evidence JSON](https://github.com/agenticaotearoa/panta-pulse/blob/main/evidence/live-pipeline-run-2026-09-20.json). The question in that tx's data does not match the draft stored in the same file. The file mixes two runs, so treat it only as a shape example.
- [3P] Reliability: "`POST /markets/create/quote/` refuses valid drafts intermittently... 19 of 20 identical quotes for an accepted draft came back `INVALID_MARKET_PARAMS` with 'unexpected create quote failure — check server logs'". A repeat quote for the same wallet and question failed instead of returning `DUPLICATE_MARKET`. This was reported to Panta on 27 and 29 September 2026. — [settlement-check README / submission/panta.md](https://github.com/bisale24-ops/settlement-check/blob/main/submission/panta.md)
- [3P] On the live catalog's `oracle` field: "on every market checked it names the wallet whose instruction is `CreateEventUsdc`". It names the creator wallet, not the resolver. — [settlement-check README](https://github.com/bisale24-ops/settlement-check). The docs, by contrast, say `oracle` "Defaults to `sourcesOfTruth` joined by `,`". **Conflict**; the live data may differ from the docs.

#### Pseudocode (TypeScript; endpoints and fields as documented; error handling is [INF])
```ts
// SERVER (Next.js route / edge fn): never ship the pk_ key to the browser.
const PANTA = "https://live-api.panta.market/api/v1";
async function panta<T>(path: string, init: { method?: string; body?: unknown; userId?: string } = {}): Promise<T> {
  const res = await fetch(`${PANTA}${path}`, {                    // path MUST end with "/"
    method: init.method ?? "GET",
    headers: {
      "X-Api-Key": process.env.PANTA_API_KEY!,                    // pk_live_… (mainnet) or pk_test_… (sandbox fixtures)
      "Content-Type": "application/json",
      ...(init.userId ? { "X-User-Id": init.userId } : {}),       // optional attribution id
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(json?.code ?? `HTTP ${res.status}`), { status: res.status, ...json });
  return json as T;
}

// 0) optional image helper (server gets signed fields; browser uploads straight to Cloudinary)
const up = await panta<{ uploadUrl: string; fields: Record<string, string | number | boolean> }>(
  "/markets/create/image-upload/", { method: "POST", body: {} });
const fd = new FormData(); Object.entries(up.fields).forEach(([k, v]) => fd.append(k, String(v))); fd.append("file", file1024);
const { secure_url: imageUrl } = await (await fetch(up.uploadUrl, { method: "POST", body: fd })).json();

// 1) quote — creatorWallet is the CREATOR's own wallet (fee payer + signer + future creator-fee owner)
const now = Math.floor(Date.now() / 1000);
const quote = await panta<{ createId: string; expectedEventPda: string; paymentUsdc: string;
  liquidityInjectionUsdc?: string; platformRevenueUsdc?: string; expiresAt: string }>(
  "/markets/create/quote/", { method: "POST", body: {
    wallet: creatorWallet, question, resolutionRule, sourcesOfTruth, category, // category ∈ GET /categories/
    startTime: now + 3600 + 120, endTime, resolutionTime, imageUrl,             // start ≥ now+minimumStartDelay
    marketType: "standard", title, description, region: "Global",
  }});
// show quote.paymentUsdc / 1e6 USDC to the creator and get explicit consent (Terms §5)

// 2) build (re-call if blockhash expired, re-quote if CREATE_EXPIRED)
const build = await panta<{ transaction: string; recentBlockhash: string; lastValidBlockHeight?: number }>(
  "/markets/create/build/", { method: "POST", body: { createId: quote.createId, wallet: creatorWallet } });

// 3) CLIENT: sign with wallet adapter / embedded wallet, broadcast on OUR RPC
const tx = VersionedTransaction.deserialize(Buffer.from(build.transaction, "base64")); // do NOT mutate
const signed = await wallet.signTransaction(tx);
const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
await connection.confirmTransaction({ signature, blockhash: build.recentBlockhash, lastValidBlockHeight: build.lastValidBlockHeight! }, "confirmed");

// 4) SERVER: register (idempotent on same createId+signature; retry TX_NOT_FOUND with backoff)
const reg = await panta<{ marketId: string; status: "registered" }>(
  "/markets/register/", { method: "POST", body: { createId: quote.createId, signature } });
// reg.marketId (= event PDA) is the id for every later call and for the share link
```

### Inferences
- [INF] **For the creator-led product:** the creator's own wallet must be `wallet` on quote and build. That wallet becomes the on-chain creator, the fee payer, the owner of the creator-fee vault, and the address that later passes the `NOT_MARKET_CREATOR` check. If the app's treasury wallet creates markets on a creator's behalf, the creator fees go to the treasury.
- [INF] The event PDA is derived from `wallet` plus `question`, which is why `DUPLICATE_MARKET` is keyed on that pair. A creator cannot reuse exact question text. Add a date or other qualifier.
- [INF] The creator must hold about 50 USDC plus a little SOL for fees and rent at create time. That is a real onboarding barrier for creators. Show the fee before quoting, and consider an "I'd trade this" pre-commit gate the way called-it does.
- [INF] Do not modify the returned create transaction. That means no priority-fee instruction and no fee-payer swap, because register checks accounts against `buildFingerprint`. Gasless sponsorship of the create tx is therefore probably impossible unless Panta supports it.

### Gaps
- The exact `minimumStartDelay`, the creation fee and any maximum duration come from on-chain `MarketConfig`. No max duration, minimum liquidity or banned-topic policy is documented.
- Whether `creatorWhitelist` (seen in `derived`) can block some wallets from creating is unknown.
- There is no update or cancel endpoint for markets. Behavior for cancelled markets (phase `cancelled`) and refunds is undocumented.

---

## 5. Flow (b): buying YES or NO (price → quote → build instructions → compile, sign and send → submit/verify)

### Takeaway
Buys are **primary-phase only** and run against a **bonding curve**. You quote with a decimal USDC amount and get a `quoteId` (about 90 s), then build with `quoteId`, `wallet` and `maxSlippageBps` to get an **instruction list** (not a ready transaction). You compile a v0 transaction yourself, sign, broadcast, then `POST /primaryordersubmit/` and poll `/primaryorderverify/`. The documented fee is about 2% (`primaryFeeBps` usually 200). The API has **no sell or secondary-market endpoint**.

### Cited Findings
- [DOC] "Purchases YES or NO shares during a market's **primary** phase. Amounts are human-readable **decimal USDC strings** (for example `"20.00"`), not base units." "Optional `X-User-Id` (or `userId` in the body) is used for attribution. When present, build may include an SPL Memo instruction." — [orders/overview.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/orders/overview.mdx)
- [DOC] **`POST /primaryorderquote/`** takes `{wallet, marketId, side:"yes"|"no" (case-insensitive), amountUsdc:"20.00", userId?}`. It returns `{quoteId:"qt_…", marketId, side, amountUsdc, shares:"38.42", avgPrice:"0.520800", feeUsdc:"0.40", expiresAt, blockhashExpiryHintSec}`. Errors: `INVALID_MARKET_PARAMS`, `MARKET_NOT_FOUND`, `MARKET_NOT_IN_PRIMARY`, `AMOUNT_TOO_SMALL`, `RATE_LIMITED`. — [orders/quote.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/orders/quote.mdx)
- [DOC] **`POST /primaryorderbuild/`** takes `{quoteId, wallet (must match), userId? (must not contradict quote), maxSlippageBps? (default 100, max 5000)}`. It returns:
  - `orderId:"ord_…"`, `quoteId`, `wallet`, `marketId`, `side`, `amountUsdc`, `expectedShares`, `feeUsdc`, `status:"built"`
  - `instructions:[{programId, data:<base64>, accounts:[{pubkey,isSigner,isWritable}]}]`
  - `derived:{event, vaultAuthority}`, `recentBlockhash`, `lastValidBlockHeight`, `expiresAt`, `blockhashExpiryHintSec`

  It returns `QUOTE_STALE` if "the curve has moved beyond `maxSlippageBps`". It "Construct[s] unsigned primary_order_usdc instructions". — [orders/build.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/orders/build.mdx)
- [DOC] **`POST /primaryordersubmit/`** takes `{orderId, signature, wallet?}` and returns `{orderId, status:"submitted", signature}`. It "Register[s] the broadcast signature for asynchronous confirmation. Does not wait for finalization." It is idempotent. — [orders/submit.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/orders/submit.mdx)
- [DOC] **`POST /primaryorderverify/`** takes `{orderId, signature?, wallet?}`. Status is one of `built`, `submitted`, `confirmed`, `failed`, `expired`. Example response: `{orderId, status:"confirmed", signature, marketId, side, amountUsdc: 20000000}`. Note that `amountUsdc` is an integer in base units here. — [orders/verify.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/orders/verify.mdx)
- [DOC] Compile helper used by the official playground:
  ```ts
  new TransactionMessage({ payerKey: feePayer, recentBlockhash, instructions: ixs }).compileToV0Message()
  ```
  where each `ix` is `new TransactionInstruction({ programId, keys: accounts.map(...), data: Buffer.from(ix.data, "base64") })`. The playground uses the buyer's wallet as `payerKey`. — [solana.ts](https://github.com/Kaito-HQ/panta-api-playground/blob/main/src/lib/solana.ts), [PrimaryBuyFlow.tsx](https://github.com/Kaito-HQ/panta-api-playground/blob/main/src/components/PrimaryBuyFlow.tsx)
- [DOC] Fee: "Primary buys charge on-chain: fee ≈ amountUsdc × primaryFeeBps / 10_000. `primaryFeeBps` comes from on-chain `MarketConfig` (commonly **200** = 2%)." — [account/metrics.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/account/metrics.mdx)
- [3P] "Markets in the buyable (primary) phase get a Trade button; secondary-phase markets are labelled and linked to panta.market, because the Panta API only supports buying in the primary phase." — [called-it README](https://github.com/ferzerz5-lab/called-it)
- [3P] Price formats are inconsistent: "Price fields arrive in two formats (`"0.43"` vs 1e9-scaled strings)". `yesPrice`/`noPrice` are often null, so fall back to `primaryYesPrice`/`secondaryYesPrice`. — [panta-terminal docs/SUBMISSION.md](https://github.com/liji3597/panta-terminal/blob/main/docs/SUBMISSION.md), [panta-pulse SPEC.md](https://github.com/agenticaotearoa/panta-pulse/blob/main/SPEC.md)

#### Pseudocode
```ts
// price display: GET /markets/{id}/ (detail) — list rows have null prices
const m = await panta<MarketItem>(`/markets/${marketId}/`);
const yes = Number(m.yesPrice ?? m.primaryYesPrice ?? m.secondaryYesPrice ?? NaN); // normalize 1e9-scaled if > 1 [3P quirk]
if (m.phase !== "primary") disableBuy("Trading on panta.market only");               // API = primary buys only

// 1) quote (server)
const q = await panta<{ quoteId: string; shares: string; avgPrice: string; feeUsdc: string; expiresAt: string }>(
  "/primaryorderquote/", { method: "POST", userId: fanAttributionId,
  body: { wallet: fanWallet, marketId, side: "yes", amountUsdc: "5.00", userId: fanAttributionId } });

// 2) build (server) — within ~90s
const b = await panta<{ orderId: string; instructions: BuiltInstruction[]; recentBlockhash: string; lastValidBlockHeight?: number }>(
  "/primaryorderbuild/", { method: "POST", userId: fanAttributionId,
  body: { quoteId: q.quoteId, wallet: fanWallet, userId: fanAttributionId, maxSlippageBps: 100 } });
// on QUOTE_STALE → requote; on QUOTE_EXPIRED → requote

// 3) client: compile v0, sign, send
const ixs = b.instructions.map(ix => new TransactionInstruction({
  programId: new PublicKey(ix.programId),
  keys: ix.accounts.map(a => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
  data: Buffer.from(ix.data, "base64"),
}));
const msg = new TransactionMessage({ payerKey: fanPubkey, recentBlockhash: b.recentBlockhash, instructions: ixs }).compileToV0Message();
const signed = await wallet.signTransaction(new VersionedTransaction(msg));
const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });

// 4) server: submit (idempotent) then poll verify until confirmed|failed|expired
await panta("/primaryordersubmit/", { method: "POST", body: { orderId: b.orderId, signature: sig, wallet: fanWallet } });
let st; do { st = await panta<{ status: string }>("/primaryorderverify/", { method: "POST", body: { orderId: b.orderId, signature: sig } });
             await sleep(1500); } while (st.status === "submitted" || st.status === "built");
// 5) optional explicit attribution: POST /trades/ {signature, wallet, marketId, quoteId, clientOrderId}
```

### Inferences
- [INF] There is no documented "get price for amount X" endpoint other than the quote itself, so the quote is the price-impact preview. Quotes count against the 30/60s family. Debounce the amount input and quote only on confirm.
- [INF] Because buys come back as raw instructions, the app controls `payerKey`. A sponsored fee payer for gasless fan buys might be possible. Panta's verification checks "expected wallet, market, and program" and may also require the buyer to be the fee payer. This needs testing; it is unconfirmed.
- [INF] Fans need mainnet USDC in the signing wallet. Embedded wallets such as Privy, which Panta's own front end appears to use, plus a fiat or USDC on-ramp would suit a creator audience.

### Gaps
- The minimum fill behind `AMOUNT_TOO_SMALL` is not documented.
- The bonding curve formula, its parameters and the graduation threshold in USDC are not documented.
- There are no endpoints for selling or for secondary-market orders. Whether Panta plans them is unknown.

---

## 6. Flow (c) and (d): reading positions, claim eligibility, and building the win-claim transaction

### Takeaway
`GET /positions/?wallet=` returns one row per (market, side) with `shares`, `phase`, `claimable`, `claimed` and `outcome`. When `claimable` is true, `POST /claim/build/ {wallet, marketId}` returns `claim_win_usdc` instructions, which you compile, sign and broadcast like a buy. You can then report the claim via `POST /trades/` (`kind: claim`). Positions are share counts, not dollars: value = shares × side price while the market is open, about $1 per share on a win, and 0 on a loss.

### Cited Findings
- [DOC] Each position row has: `marketId`; `category`; `side` (`yes`/`no`); `shares` (human-readable); `phase` (`primary`, `secondary`, `resolved` or `cancelled`); `claimable`; `claimed` ("A claim account already exists"); `outcome` (`yes`/`no` after resolution, otherwise null). Rows are "capped (typically 200 rows)". "Indexer balances may lag the chain briefly after a purchase." A holding with both sides becomes two rows. Rate family: `positions`, 60/60s. — [positions.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/positions.mdx)
- [DOC] Valuation guidance: for an open market, `value ≈ shares × yesPrice` (or `noPrice`). For a resolved winner, "≈ **1 USDC per share** (or `winningShares` from Build win claim)". For a loser, ≈ 0. "Once a market is **resolved**, stop using live spot prices." — [positions.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/positions.mdx)
- [DOC] **`POST /claim/build/`** takes `{wallet, marketId}`. It returns `{wallet, marketId, outcome:"YES", winningShares:"38", instructions:[…], derived:{winClaim, positionPda, vaultAuthority}, recentBlockhash, lastValidBlockHeight}`. It "re-validates eligibility on-chain and fails closed". Errors: `MARKET_NOT_FOUND`, `NOT_CLAIMABLE`, `INVALID_MARKET_PARAMS`. — [claims/build.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/claims/build.mdx)
- [DOC] "Win claim: `POST /claim/build/`, then optional `POST /trades/` (`kind: claim`)." — [how-it-works.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/how-it-works.mdx)
- [3P] panta-pulse reports that the live positions response also includes a `summary` object (undocumented). — [panta-pulse SPEC.md](https://github.com/agenticaotearoa/panta-pulse/blob/main/SPEC.md)

#### Pseudocode
```ts
const { positions } = await panta<{ wallet: string; positions: PositionRow[] }>(`/positions/?wallet=${fanWallet}`);
const ids = [...new Set(positions.map(p => p.marketId))];
const details = Object.fromEntries(await Promise.all(ids.map(async id => [id, await panta<MarketItem>(`/markets/${id}/`)]))); // cache!
const rows = positions.map(p => {
  const m = details[p.marketId];
  const px = p.outcome ? (p.side === p.outcome ? 1 : 0) : Number(p.side === "yes" ? m.yesPrice : m.noPrice);
  return { ...p, estValueUsdc: Number(p.shares) * px };
});

for (const p of rows.filter(r => r.claimable && !r.claimed)) {
  const c = await panta<{ instructions: BuiltInstruction[]; recentBlockhash: string; winningShares: string }>(
    "/claim/build/", { method: "POST", body: { wallet: fanWallet, marketId: p.marketId } });
  const sig = await compileSignSend(c.instructions, c.recentBlockhash, fanPubkey);   // same helper as buys
  await panta("/trades/", { method: "POST", body: { signature: sig, wallet: fanWallet, marketId: p.marketId } }); // kind→"claim"
}
```

### Inferences
- [INF] Positions update on a lag. After a buy, apply an optimistic position update in the UI, then reconcile against `/positions/`.
- [INF] Panta has no push channel, so claim eligibility has to be polled. A cron that checks markets the app created (via `GET /markets/?createdBy=me&status=resolved`) and notifies fans would be a differentiator.

### Gaps
- Exact claim preconditions (dispute window elapsed? resolution finalized?) are not listed. `NOT_CLAIMABLE` only says "one or more claim preconditions failed".
- Whether a payout is exactly 1 USDC per share or pari-mutuel is not explicit. See the conflict in section 9.

---

## 7. Flow (e): claiming creator fees

### Takeaway
Creators earn a share of trading fees that builds up in a per-market `creatorFeeVault`. Fees can be withdrawn **only after the market "graduates"**, using `POST /claim/creator-fees/build/ {wallet: creator, marketId}`, which returns `claim_creator_fees_usdc` instructions. Do **not** report these claims to `/trades/`; doing so returns `TX_MISMATCH`. The creator share percentage and the graduation threshold are not in the API docs. Third-party sources say 20% of trading fees, possibly lower when a market is lopsided.

### Cited Findings
- [DOC] **`POST /claim/creator-fees/build/`** takes `{wallet, marketId}`. Rules: "`wallet` must match the creator on the on-chain event. The creator-fee vault must belong to the same event and creator and have a nonzero `accumulated_fees` balance. The market must have **graduated**." It returns:
  - `wallet`, `marketId`
  - `claimableFeesUsdc` (base units, e.g. `"2500000"` = 2.50 USDC)
  - `instructions` ("may include create-ATA then `claim_creator_fees_usdc`")
  - `derived:{creatorFeeVault, creatorFeeVaultTokenAccount, creatorTokenAccount, marketConfig}`
  - `recentBlockhash`, `lastValidBlockHeight`

  Errors: `MARKET_NOT_FOUND`, `NOT_MARKET_CREATOR`, `MARKET_NOT_GRADUATED`, `NO_CREATOR_FEES`, `INVALID_MARKET_PARAMS`. — [claims/creator-fees.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/claims/creator-fees.mdx)
- [DOC] "Creator-fee claim signatures are **not** accepted by `POST /trades/` — attribution only covers primary buys and win claims." — [claims/creator-fees.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/claims/creator-fees.mdx)
- [3P] Older (July 2026, SOL-denominated) description: "Market creators earn **20% of all trading fees** forever after graduation (20 SOL min. liquidity + both sides)", and "Anyone can launch a market on any verifiable event for 1 SOL". — [ilichb/panta-market-simulator README](https://github.com/ilichb/panta-market-simulator/blob/main/README.md). These SOL figures predate the USDC API, which now charges a 50 USDC creation fee.
- [3P] "winners split the pot minus the creator royalty (20%, cut to 10/5/0% when 90%+ of traders pick one side), pro rata by shares; live buys also pay Panta's 2% trading fee." — [Pot README](https://github.com/Baheet18/pot). This is unverified, and it conflicts with the simulator's "20% of all trading fees" framing on whether the royalty comes out of fees or out of the pot.
- [3P] Live cards expose `isGraduated`, `graduationFailureReason` and `tradingFeeAccrued`. — [market-detail.json](https://github.com/agenticaotearoa/panta-pulse/blob/main/evidence/market-detail.json). The on-chain lifecycle seen in practice is `GraduateMarket → SubmitOracleResult → ResolveEvent → ClaimWin`. — [settlement-check README](https://github.com/bisale24-ops/settlement-check)

#### Pseudocode
```ts
const m = await panta<any>(`/markets/${marketId}/`);
if (m.isGraduated === false) showBadge("Creator fees unlock when the market graduates");     // undocumented field [3P]
try {
  const f = await panta<{ claimableFeesUsdc: string; instructions: BuiltInstruction[]; recentBlockhash: string }>(
    "/claim/creator-fees/build/", { method: "POST", body: { wallet: creatorWallet, marketId } });
  showConfirm(`Claim ${(Number(f.claimableFeesUsdc) / 1e6).toFixed(2)} USDC`);
  const sig = await compileSignSend(f.instructions, f.recentBlockhash, creatorPubkey);
  // DONE — do NOT POST /trades/ (TX_MISMATCH)
} catch (e: any) {
  if (["MARKET_NOT_GRADUATED", "NO_CREATOR_FEES", "NOT_MARKET_CREATOR"].includes(e.code)) showInfo(e.code);
}
```

### Inferences
- [INF] Creator earnings only appear after graduation, which needs enough volume on both sides. Product design should therefore push creators to promote both sides of their markets, and show progress toward graduation once Panta publishes the threshold.
- [INF] An estimate of earned-but-locked creator fees could combine `tradingFeeAccrued` (an undocumented card field) with a creator-share assumption. Label it clearly as an estimate.

### Gaps
- **The creator fee percentage, the graduation criteria (minimum USDC liquidity, two-sided volume, time) and whether fees keep accruing in the secondary phase are not in the API docs.** Confirm with Panta in Discord `#dev-chat`.
- I found no documented builder or partner fee. Terms §12 only says Panta "may offer… revenue-share arrangements" under separate terms. — [Terms](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/terms-of-use.mdx)

---

## 8. Flow (f): trade attribution and verification (how a builder gets credited)

### Takeaway
Credit goes to the **API account** that made the calls (`userId` `usr_…`, `apiKeyId` `key_…`). You can sub-tag with `X-User-Id` / `userId` on quote and build; Panta then may add an SPL Memo to the buy, which supports automatic ingestion. To be sure a trade counts, call `POST /trades/ {signature, wallet, marketId, quoteId?, clientOrderId?, userId?}`. Panta verifies it on-chain, fail-closed, for `primary_order_usdc` and `claim_win_usdc` only. Credited volume shows up in `/account/metrics/`, `/account/trades/` and `/account/dashboard/` as `volumeUsdcBase`. The docs describe no payout tied to this volume.

### Cited Findings
- [DOC] **`POST /trades/`** takes `{signature, wallet, marketId, quoteId?, clientOrderId?, userId?}` and returns `{signature, status:"processed", marketId, wallet, side, kind:"buy"|"claim"}`. "Primary-buy transactions that include an attribution memo may be ingested automatically; this endpoint is the explicit reporting path. Repeated calls with the same signature are idempotent." Only `primary_order_usdc` and `claim_win_usdc` are accepted; reporting `claim_creator_fees_usdc` gives `TX_MISMATCH`. Errors: `TX_NOT_FOUND`, `TX_FAILED`, `TX_MISMATCH`, `TX_FEE_MISMATCH`, `UNAUTHORIZED`, `INVALID_MARKET_PARAMS`, `RATE_LIMITED`. — [trades/report.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/trades/report.mdx)
- [DOC] **`GET /trades/{signature}/`** takes `?userId=` (optional). Status is one of `processed`, `pending_attribution` ("Seen on-chain, not yet attributed"), `unknown` or `failed`. "Responses do not expose another account's private attribution fields." — [trades/status.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/trades/status.mdx)
- [DOC] What Panta verifies: "the transaction must exist, succeed, include the expected wallet, market, and program, and match quoted fees where applicable." Codes: `TX_NOT_FOUND`, `TX_FAILED`, `TX_MISMATCH`, `TX_FEE_MISMATCH`. — [how-it-works.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/how-it-works.mdx)
- [DOC] Partner metrics: "`GET /account/metrics/` (and dashboard) expose attributed **volume** (`volumeUsdcBase`)… Protocol trading fees are not returned as a separate field." The estimate is `estFeesUsdcBase ≈ volumeUsdcBase × primaryFeeBps / 10_000`. "Unreported buys are not in `volumeUsdcBase`." — [account/metrics.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/account/metrics.mdx)
- [DOC] Safe retries: `POST /markets/register/` (same `createId` + `signature`), `POST /trades/` (same `signature`), `POST /primaryordersubmit/` (same `orderId` + `signature`). — [how-it-works.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/how-it-works.mdx)
- [DOC] `GET /markets/?createdBy=me` lists markets the account created; `createdByPartner` is `true` on those rows. — [list.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/list.mdx)

### Inferences
- [INF] **Make attribution part of the app's traction story.** Always call `/primaryordersubmit/` **and** `/trades/` after each buy and win claim. Then use `/account/metrics/` and `/account/trades/` as your traction dashboard; it is also good evidence for the "traction" judging criterion.
- [INF] Use `X-User-Id` to tag the referring creator, e.g. `creator_<handle>`. That supports per-creator leaderboards, since `GET /trades/{sig}/?userId=` scopes visibility. Whether arbitrary non-`usr_` strings are accepted is unconfirmed; the docs examples use `"usr_acme"`.

### Gaps
- Is attributed volume ever paid out to builders (a builder fee or rev-share)? Nothing public says so.
- What `userId` formats are allowed is not documented.

---

## 9. Protocol facts: chain, collateral, market mechanism, resolution, fees and limits

### Takeaway
- **Chain and collateral:** Solana **mainnet**, collateral **USDC** (mint `EPjFWdd5…Dt1v`), program `6gM5afTQ…ZMp`. The Sidetrack pays prizes in USDG, but trading is in USDC.
- **Markets:** binary YES/NO only. Lifecycle is primary phase (bonding curve), then graduation, then secondary phase, then resolved or cancelled.
- **Resolution:** run by Panta. The site shows "agent resolution" with a confidence score, a written rationale and a dispute window (third parties say 1 h or 2 h). On-chain, one Panta keypair signs every `SubmitOracleResult` / `ResolveEvent`. **Creators do not resolve their own markets**; they supply `resolutionRule` and `sourcesOfTruth`.
- **Fees:** 50 USDC creation fee (40 platform, 10 liquidity) and about 2% primary trading fee, both from on-chain config. The creator gets a share of fees after graduation (about 20%, per third parties).

### Cited Findings
- [DOC] "**Panta** is a binary YES/NO prediction market infrastructure on Solana." — [index.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/index.mdx)
- [DOC] "Quote a YES/NO fill on the bonding curve." — [index.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/index.mdx), [orders/overview.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/orders/overview.mdx). The phases `primary | secondary | resolved | cancelled` are documented — [positions.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/positions.mdx). Market types are `standard` and `breaking` (breaking may set `eventInProgress`) — [quote.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/quote.mdx)
- [DOC] The documented categories are `sports, crypto, politics, entertainment, finance, science, world, other`. — [categories.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/categories.mdx). [3P] "Undocumented categories appear in the catalog (stocks, commodities)." — [panta-terminal SUBMISSION.md](https://github.com/liji3597/panta-terminal/blob/main/docs/SUBMISSION.md)
- [3P] The mainnet USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` and the market program `6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp` both appear in a live create transaction (my decode of the [panta-pulse evidence](https://github.com/agenticaotearoa/panta-pulse/blob/main/evidence/live-pipeline-run-2026-09-20.json)), and settlement-check names the same program. One live market card instead reports `programId: "4CQ4LWv7194V3Qe3iEYZq33cFPQbmKU3e1xVQkpTegLU"` ([market-detail.json](https://github.com/agenticaotearoa/panta-pulse/blob/main/evidence/market-detail.json)). That may be an older program version, since settlement-check notes "`MigrateEventV2`" and two instruction naming families. **Unresolved.**
- [3P] Market mechanism (July 2026, pre-USDC wording): "Users buy YES or NO positions in a primary market, then trade P2P in a secondary order book", and "Pari-mutuel model: losers pay winners. **Uncapped returns**". — [simulator README](https://github.com/ilichb/panta-market-simulator/blob/main/README.md). **Conflict** with [DOC] guidance that a resolved winner is worth "≈ 1 USDC per share". The "≈" may hide pari-mutuel effects. Needs confirmation.
- [3P] Resolution in practice: "On every settled market inspected, both settlement instructions were signed by the same account — `664h8sZvGwUx4hfqWYrewwvC7wenbKPTCFQTKZx5ghbR`". "Its page says *agent resolution*, shows the result with a confidence score and a written rationale, and names a dispute window." "`sentToUma` is true on 85 of 100 markets and no UMA program appears in" the settlement transactions. — [settlement-check README](https://github.com/bisale24-ops/settlement-check), [submission/solami.md](https://github.com/bisale24-ops/settlement-check/blob/main/submission/solami.md)
- [3P] Dispute window: "AI agents resolve outcomes transparently. 2-hour dispute window available" ([simulator README, July 2026](https://github.com/ilichb/panta-market-simulator/blob/main/README.md)), **versus** "Panta sets final payouts after its 1-hour dispute window" ([Pot README](https://github.com/Baheet18/pot)). **Conflict.**
- [DOC] Resolution inputs: `resolutionRule` (max 2048) and `sourcesOfTruth` (1 to 20 strings) are required. "Oracle feed identifiers [are] derived server-side from resolution metadata." — [quote.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/quote.mdx), [authentication.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/authentication.mdx)
- [DOC] Fees: creation `paymentUsdc` comes "from on-chain config" (example `50000000`, i.e. 50 USDC, split `liquidityInjectionUsdc` 10 + `platformRevenueUsdc` 40) — [quote.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/quote.mdx). Primary fee `primaryFeeBps` is "commonly 200 = 2%" — [metrics.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/account/metrics.mdx). Default slippage is 100 bps, max 5000 — [orders/build.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/orders/build.mdx)
- [3P] Some markets in the catalog have no on-chain account: "13 of 100 markets are served by `GET /markets/` as `primary` or `secondary`… and have no account on Solana at all". On 1 Oct 2026 they were gone from the listing but still served by `GET /markets/{id}/`. — [settlement-check submission/panta.md](https://github.com/bisale24-ops/settlement-check/blob/main/submission/panta.md)

### Inferences
- [INF] For a creator app, the trust story is: Panta's agent resolves with a dispute window. The creator writes a precise `resolutionRule` and `sourcesOfTruth` but cannot settle the market. Write rules that a third party can check; vague sources become the market's visible `oracle` text.
- [INF] Before showing a market as tradeable, check `getAccountInfo(marketId)` on your RPC, or the undocumented `onChain` flag. This filters out catalog ghosts.

### Gaps
- Formal documentation is missing for: the bonding-curve formula; graduation thresholds; the secondary-market mechanism (order book or AMM); the payout formula (fixed $1 per share vs pari-mutuel); the dispute window length and dispute process; whether creators can dispute; and the role of UMA (`sentToUma`).
- There is no documented maximum market duration and no topic or content policy beyond the category allowlist. There is also no documented minimum liquidity beyond the 10 USDC injection.

---

## 10. Live data, SDKs, websockets and webhooks, and signing options (wallet adapter vs embedded wallets)

### Takeaway
Panta offers REST only: **no official SDK, no websocket and no webhooks**. Live prices mean polling `GET /markets/{id}/`, and a full catalog read needs fan-out because list rows have null prices. Several builders built their own snapshot, WebSocket or SSE layers. For signing, any Solana signer that can sign a `VersionedTransaction` works: wallet-adapter (Phantom, Solflare) as in the playground, or embedded wallets such as Privy.

### Cited Findings
- [3P] "The Panta API exposes **no price history, no push channel, and rotates its trade tape**." "No WebSocket — every consumer polls." — [panta-terminal README](https://github.com/liji3597/panta-terminal), [docs/SUBMISSION.md](https://github.com/liji3597/panta-terminal/blob/main/docs/SUBMISSION.md)
- [DOC] "List rows do **not** live-RPC for prices (cost). Use Get market for spot prices." — [catalog.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/api-reference/markets/catalog.mdx)
- [DOC] The official playground's dependencies are `@solana/web3.js ^1.98.4`, `@solana/wallet-adapter-react`, `-react-ui`, `-phantom`, `-solflare`, `bs58`, `buffer`, `next 16.3.4` and `react 19.2.8`. Its default RPC is `https://api.devnet.solana.com` and is overridable in the UI. — [package.json](https://github.com/Kaito-HQ/panta-api-playground/blob/main/package.json), [.env.example](https://github.com/Kaito-HQ/panta-api-playground/blob/main/.env.example)
- [DOC] Custody: "You never custody wallets. Panta returns unsigned transactions (or instruction lists). The user's wallet signs. You broadcast on **your** RPC, then tell Panta the signature." Create returns a base64 `VersionedTransaction`; buys and claims return instruction lists plus `recentBlockhash`. — [index.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/index.mdx), [how-it-works.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/how-it-works.mdx)
- [3P] Public RPC limits: `api.mainnet-beta.solana.com` "refused everything under concurrency" for settlement lookups, and it drops idle `logsSubscribe` connections. Use a paid RPC. — [settlement-check README](https://github.com/bisale24-ops/settlement-check)
- [3P] Other reliability notes:
  - The detail endpoint "intermittently returns empty `title`/`question` (~1 in 8 calls)".
  - List rows ship an empty `title`; the question can sit in `description` or in an undocumented `question` field.
  - The trade tape "rotates", and `amountUsdc` is "often null on primary buys".
  - Earlier cursor-pagination loops were reported fixed on 1 Oct 2026, but `status=resolved` and `status=cancelled` still returned zero rows.

  — [panta-terminal SUBMISSION.md](https://github.com/liji3597/panta-terminal/blob/main/docs/SUBMISSION.md), [settlement-check submission/panta.md](https://github.com/bisale24-ops/settlement-check/blob/main/submission/panta.md)

### Inferences
- [INF] Recommended architecture:
  - A server-side API-key proxy with rate-limit-aware queues.
  - A 15–30 s snapshotter for markets the app created or follows, using `createdBy=me` plus detail calls. Store your own price history to draw sparkline charts, which nothing else in the Panta ecosystem currently offers.
  - SSE or WebSocket fan-out to clients.
  - Wallets: Privy, Phantom embedded, or wallet-adapter for creators and fans arriving from social links. Solana Actions/Blinks are an option for share-to-X; Pot used Blinks.
- [INF] Use a mainnet RPC for real flows. The playground's devnet default only makes sense with `pk_test_` sandbox flows, which return no instructions.

### Gaps
- There is no official devnet deployment or devnet USDC faucet. Sandbox (`pk_test_`) is the only zero-cost path, and its behavior is only described by third parties.

---

## 11. Implementation requirements: attribution, branding and terms

### Takeaway
"Powered by Panta" is **mandatory**, with exactly that wording. It must be visible next to Panta-powered UI and linked to panta.market where possible. API keys must stay server-side. You must not present stale or simulated data as live. You must tell users exactly what action they are signing and get their consent.

### Cited Findings
- [DOC] Terms §6.1: "Any Developer Product that uses the Panta API to display Panta markets, market data… trading functionality, market-creation functionality… must display the attribution 'Powered by Panta.'" §6.3: "must read exactly: 'Powered by Panta'". §6.4: Panta may require it to "link to panta.market". §6.5: no removing or obscuring it. §6.6: white-label only under a written agreement. — [terms-of-use.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/terms-of-use.mdx)
- [DOC] The playground CONTRIBUTING repeats this. Wording must be exactly "Powered by Panta". Placement must be "Clear, legible, and reasonably associated with Panta-powered UI (market module, trading screen, footer, etc.)". Link to panta.market. The custody model must be preserved: "Panta builds unsigned txs; the client signs and broadcasts; then register / report with the signature." — [CONTRIBUTING.md](https://github.com/Kaito-HQ/panta-api-playground/blob/main/CONTRIBUTING.md)
- [DOC] Terms §3: credentials may not be "embedded in publicly accessible source code". §5: "must not… represent simulated, cached or stale information as live Panta information", and for user transactions "must accurately communicate the action the user is taking and obtain any consent". §7 prohibits wash trading and artificial volume, and impersonating Panta. §10: the developer is responsible for jurisdictional legality, and must not bypass KYC, geo or age restrictions. — [terms-of-use.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/terms-of-use.mdx)

### Inferences
- [INF] **Traction caution:** §7 bans "wash trading, artificial volume". Do not seed volume from team wallets to inflate the traction metric.
- [INF] Put a "Powered by Panta" badge on every market card and trade sheet, linked to panta.market. Add the same badge to the social share images and Open Graph cards the app generates for creators.

### Gaps
- No official badge or logo asset was found in the public repos. The docs repo has `logo/light.svg` and `logo/dark.svg`, but no usage guide.

---

## 12. Colosseum Crypto World's Fair and the Panta API Sidetrack: dates, rules, judging and submission

### Takeaway
- **Hackathon window:** Crypto World's Fair runs **6:00am PT 14 Sep 2026 to 11:59pm PT 12 Oct 2026** (06:59 UTC 13 Oct). As of 2026-10-07, about 5 days remain.
- **Sidetrack deadline:** the Panta Sidetrack on Superteam Earn closes at the same instant, with winners announced **by 27 Oct 2026**.
- **Prizes:** 5,000 USDG (2,000 / 1,000 / 1,000 / 1,000).
- **Entry:** you must submit to both Colosseum and Earn. The Earn listing is HUMAN_ONLY.
- **Earn form needs:** a GitHub link, a pitch deck or video link, and the Colosseum project link.

### Cited Findings
- [3P] Superteam Earn listing "Colosseum Crypto World's Fair | Panta API Sidetrack", URL `https://superteam.fun/earn/listing/panta-api-side-track`, listing ID `4c3b4256-ea0c-4b52-8433-12618e4f66c9`, sponsor Panta (pantahq), type hackathon, region Global. "**Deadline (Earn):** 2026-10-13 00:59 MDT (`2026-10-13T06:59:00.000Z`)"; "Winner announce (Earn UI): by 2026-10-27"; "agentAccess: `HUMAN_ONLY`". — [MitchH69 SCOPE.md](https://github.com/MitchH69/panta-api-sidetrack/blob/main/SCOPE.md) (researched 2026-09-22)
- [3P] Prizes: "$5,000 USDG total: 1st 2,000 · 2nd 1,000 · 3rd 1,000 · 4th 1,000". Judging covers Panta API integration depth, technical execution, product & UX, originality, real-world impact potential and traction. Lanes listed: prediction-market apps, trading/analytics terminals, sports & events, social prediction, AI + prediction markets, **creator/community tools**, adding PM features to an existing Crypto World's Fair project, and anything novel. — [Tars panta-integration-report.md](https://github.com/Henoch4/Tars/blob/main/docs/panta-integration-report.md)
- [3P] Eligibility, all required:
  1. register for the official Colosseum Crypto World's Fair;
  2. submit the project on Colosseum;
  3. meet Colosseum eligibility ("every team member registers individually");
  4. submit the **same** project to the Earn sidetrack;
  5. meaningfully integrate the Panta API;
  6. provide a working demonstration;
  7. write in English.

  "Sidetrack submit does **not** replace Colosseum submit." — [MitchH69 SCOPE.md](https://github.com/MitchH69/panta-api-sidetrack/blob/main/SCOPE.md)
- [3P] Earn form fields: Project Name (req), Project Description (req), **Project Github Link (req)**, Project Website (opt), Project X Link (opt), **Pitch deck or Loom/video (req)**, **Submitted to official Colosseum? Yes/No (req)**, **Link to Colosseum project (req)**, Link to Colosseum profile (opt). — [MitchH69 SCOPE.md](https://github.com/MitchH69/panta-api-sidetrack/blob/main/SCOPE.md)
- [3P] Sponsor framing: "prediction markets as infrastructure, not a destination — e.g. … creators embedding markets for their audience". — [Tars report](https://github.com/Henoch4/Tars/blob/main/docs/panta-integration-report.md). The listing also says prediction markets are "usually experienced as a destination" and asks "what prediction markets can become when they are built into products… beyond a traditional prediction market platform" — [panta-pulse SPEC.md](https://github.com/agenticaotearoa/panta-pulse/blob/main/SPEC.md)
- [3P] Colosseum Official Rules (PDF, as summarized by another team). §5: the Contest Period runs "6:00am PT on 2026-09-14" to "11:59pm PT on 2026-10-12". §6: every member registers, the team leader uploads, and registration closes at the same moment. §7: one team per person and one submission per team. §8 judging: Functionality (incl. code quality), Potential Impact, Novelty, UX, Open-source/composability, Business Plan. The website instead lists Founder-Market Fit, Insight, Product + Execution, Market Size, Founder Communication, Viability and Traction. §9 requires disclosing third-party and open-source code. §3: age 18+ and sanctions exclusions. — [clucknorrisapp COLOSSEUM_OFFICIAL_RULES_NOTES.md](https://github.com/clucknorrisapp/cluck-norris-school/blob/main/docs/COLOSSEUM_OFFICIAL_RULES_NOTES.md)
- [3P] Colosseum project form fields (with character limits): brief description 500, "What are you building, and who is it for?" 1000, "Why… now?" 1000, "How does your product use these chains?" 500, "Anything else judges should know?" 500. — [settlement-check submission/colosseum.md](https://github.com/bisale24-ops/settlement-check/blob/main/submission/colosseum.md). Another team's plan lists "Colosseum submission: description, GitHub, presentation video 2–3 min, demo video ≤3 min, GTM" — [settlement-check PLAN.md](https://github.com/bisale24-ops/settlement-check/blob/main/PLAN.md)
- [3P via search snippet; page not fetchable] Crypto World's Fair is "Colosseum's first contest for builders on any blockchain", with over $800,000 in prizes and $2.5M in venture funding. Solana and Tempo tracks have $100,000 each and Ethereum-related tracks $100,000 combined. Grand prize $30,000; 20 projects share $300,000; accelerator teams are funded at $250,000. — [Crypto Briefing](https://cryptobriefing.com/colosseum-crypto-worlds-fair-hackathon/), [Colosseum blog](https://blog.colosseum.com/crypto-worlds-fair-crash-course-payment-channels/). Official page: `https://colosseum.com/worldsfair` (not reachable from this environment).
- [3P] Competition snapshot (GitHub, 2026-10-07): at least 15 public repos target the Panta Sidetrack. Among them:
  - terminals and analytics: panta-terminal, pantadesk, sonar-panta, oddsmind;
  - Telegram and social bots: Pot, called-it;
  - copy-trading: Copycall;
  - AI market creation: panta-pulse;
  - settlement auditing: settlement-check;
  - fair odds: fairline;
  - plus others, including a Minecraft-themed app.

  "Creators embedding markets for their audience" is a named lane, and I found no repo that clearly owns it. — GitHub search results (e.g. [panta-terminal](https://github.com/liji3597/panta-terminal), [Pot](https://github.com/Baheet18/pot), [called-it](https://github.com/ferzerz5-lab/called-it))

### Inferences
- [INF] **Deadline risk:** Colosseum registration closes at the same moment as submission (11:59pm PT, Oct 12). Every team member must register on colosseum.com now, and the Earn submission must be made by a human.
- [INF] Optimize for the union of the Sidetrack criteria and the Colosseum rules: open-source repo, code quality, Panta integration depth (use create, buy, positions, both claims and attribution), real traction (attributed volume from `/account/metrics/`, without wash trading), and a demo video of 3 minutes or less.

### Gaps
- I could not fetch the Superteam Earn listing or the Colosseum pages, so the deadlines, criteria and form fields above are from third-party snapshots dated 2026-09-21/22. Re-check them on the live pages before submitting.
- The Sidetrack judges are not named in any source I found.

---

## 13. Known limitations, devnet vs mainnet, test paths and support channels

### Takeaway
The public API is **mainnet only** (`live-api`). `pk_test_` keys give a canned **sandbox** that returns fixtures and never touches Solana, and there is no documented devnet program or USDC faucet. The API is young: as of late September and early October 2026, builders reported flaky create-quote, inconsistent card shapes, and catalog entries with no on-chain account. Support runs through the Panta Discord `#dev-chat` and the sponsor's Telegram contact.

### Cited Findings
- [DOC] The public docs and "Try it" use only `https://live-api.panta.market/api/v1`. Both key prefixes are accepted there. — [panta-api-pub README](https://github.com/Kaito-HQ/panta-api-pub/blob/main/README.md), [authentication.mdx](https://github.com/Kaito-HQ/panta-api-pub/blob/main/guides/authentication.mdx)
- [3P] Sandbox: "Panta answers with **sandbox fixtures** (one test market, canned quote/build/verify; nothing touches mainnet). Because the sandbox returns no instructions, Pot swaps in a free Solana devnet memo transaction, so the real wallet sign → broadcast → submit path still runs." — [Pot README](https://github.com/Baheet18/pot). In the sandbox, "timestamps are ISO strings" instead of unix seconds — [panta-pulse SPEC.md](https://github.com/agenticaotearoa/panta-pulse/blob/main/SPEC.md)
- [3P] Seven API defects were reported to Panta on 27 and 29 Sept 2026. Pagination and slice consistency were fixed by 1 Oct. Still open on 1 Oct: zero rows for `status=resolved` and `status=cancelled`, stripped cards ("14 of 30 markets changed shape across four identical requests"), ghost markets still served by the detail endpoint, and intermittent `INVALID_MARKET_PARAMS` on create quote. — [settlement-check submission/panta.md](https://github.com/bisale24-ops/settlement-check/blob/main/submission/panta.md)
- [3P] Support: Discord `#dev-chat` `https://discord.gg/M76nH6fUwc`, X `@pantahq`, Telegram POC `@toria_dickson`. — [MitchH69 SCOPE.md](https://github.com/MitchH69/panta-api-sidetrack/blob/main/SCOPE.md), [Tars report](https://github.com/Henoch4/Tars/blob/main/docs/panta-integration-report.md)

### Inferences
- [INF] Build defensively:
  - normalize timestamps (unix seconds or ISO) and prices (decimal or 1e9-scaled);
  - fall back through question, description, title and image for display text;
  - retry detail calls when the title is empty;
  - check that the market exists on-chain;
  - treat create-quote `INVALID_MARKET_PARAMS` without `fields` as retryable, once or twice.
- [INF] Demo strategy: record the mainnet happy path once with small real amounts (a 50 USDC create plus about $1 buys) for credibility. Keep a clearly labelled sandbox toggle for judges.

### Gaps / to confirm with the Panta team (Discord `#dev-chat`)
1. Creator fee % and graduation criteria (USDC thresholds); whether fees accrue in the secondary phase.
2. Payout model: fixed 1 USDC per winning share or pari-mutuel; dispute window length (1 h vs 2 h); the dispute process; UMA's role.
3. Production rate limits, and whether they can be raised per partner.
4. Whether `userId` / `X-User-Id` accepts arbitrary partner-defined ids, and whether attributed volume earns any rev-share.
5. Whether a sponsor or fee-payer wallet can pay SOL fees for fan buys or claims without failing verification.
6. Whether `creatorTwitterHandle` and `creatorInstagramHandle` can be set via the API at create time.
7. Status of `staging-api.panta.market` and any devnet deployment.
8. Maximum market duration, minimum fill (`AMOUNT_TOO_SMALL`), and any content or topic policy for creator-made markets.
9. Which `programId` is current (`6gM5afTQ…` vs `4CQ4LWv7…`).
