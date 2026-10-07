# UX & Social-Style UI Patterns for a Creator-Led Prediction Market App (Creator + Fan Journeys)

*Method note for the report writer: research done 2026-10-07. WebFetch failed with DNS errors on every domain tried (help.twitch.tv, dev.twitch.tv, help.kalshi.com, docs.polymarket.com, docs.manifold.markets, corbado.com, tubefilter.com, actionnetwork.com, sbcamericas.com, predictionhunt.com). The shared web-search budget also ran out partway through. Most findings below therefore come from search-engine result summaries of the cited pages, not from full-page reads. Where the link between a claim and its URL is uncertain, I say so. Everything under "Inferences" is my own design synthesis (screen specs, microcopy), not sourced fact.*

---

## 1. Creator journey: onboarding, handle verification, market creation, share cards, dashboard, resolution, notifications, storefront

### Takeaway
The best analogue for the creator journey is Twitch Predictions: a creator-run market with 2–10 outcomes, a timed window, lock, resolve, and cancel-with-refund, plus an automatic refund if the creator never resolves. For honest resolution, Manifold's creator-resolves-but-mods-override policy is the best-documented model. Verify handles with OAuth where the platform allows it, and fall back to a short-lived bio code (the pattern used by Pearpop, Snag, Ainfluencer and Referly). Creation should be template-first with AI drafting, and every market should carry explicit resolution criteria with a named source.

### Cited Findings
**Creator-run prediction mechanics (Twitch Predictions as the closest analogue)**
- Streamers launch a prediction from Stream Manager by adding a "Start Prediction" Quick Action, or by typing `/prediction` in chat, which opens the setup window. — [Eklipse guide](https://blog.eklipse.gg/beginner-guide-2/how-to-set-up-twitch-predictions.html)
- A prediction has 2 to 10 outcomes and a viewing (entry) window of 1 to 30 minutes. Some guides describe only two options. — [Metricool](https://metricool.com/twitch-predictions/); outcome count also in [Twitch Developers – Predictions](https://dev.twitch.tv/docs/api/predictions/); two-option framing in [StreamScheme](https://www.streamscheme.com/guide-to-twitch-predictions/)
- Status lifecycle: setting status to CANCELED returns everyone's Channel Points. LOCKED ends entry early, after which the streamer must pick a winner or cancel. If no winning outcome is selected within 24 hours, all points are automatically returned. The channel can't start a new prediction until the current one is resolved or cancelled. — [Twitch Developers – Predictions](https://dev.twitch.tv/docs/api/predictions/) (via search summary)
- Third-party tooling exposes "lock" as a chat command so that "no one can wager more points." — [Streamer.bot docs – Lock Active Prediction](https://docs.streamer.bot/api/sub-actions/twitch/predictions/lock-active-prediction)
- Running predictions is described as limited to Partners and Affiliates. One 2026 guide claims all streamers have access, so sources conflict. — [Stream-Rise blog](https://stream-rise.com/blog/channel-points-predictions); conflict noted in search summary of [StreamScheme](https://www.streamscheme.com/?p=27921)
- In some countries, legal restrictions mean viewers can vote with points and receive a badge for their chosen side, but cannot change their pick or win points. — [Metricool](https://metricool.com/twitch-predictions/)

**Resolution and conflict of interest (Manifold as the best-documented creator-resolved market)**
- Manifold's Community Guidelines make creators responsible for resolving correctly and promptly. Creators get a 10-minute window to un-resolve and re-resolve a mistake, and abusing that window can bring a fine or ban. After the window, they must comment tagging @mods to request re-resolution. — [Manifold – Resolving markets](https://manifold.markets/community-guidelines/resolving-markets)
- For disputed or ambiguous outcomes, a creator who holds a position "cedes decision making to Mods," and the review is done by mods who hold no position. Mods may resolve if the creator is unresponsive and the criteria are unambiguous. Manifold "reserves the right to re-resolve any market resolved fraudulently." — [Manifold – Resolving markets](https://manifold.markets/community-guidelines/resolving-markets)
- Manifold's older FAQ said resolutions were not enforced ("if you don't trust a certain user to judge their markets fairly, you probably shouldn't participate"). It pointed users to the creator's resolution history on their profile page as the trust signal. — [Manifold FAQ (archived mirror)](https://git.nunosempere.com/open.source/manifold/src/branch/main/docs/docs/faq.md)
- A Chainlink hackathon project cites a March 2025 case in which one UMA holder with about 25% of voting power forced a $7M Polymarket market to resolve incorrectly. It uses this as the argument against token-vote resolution. — [CREsolver (Chainlink Hackathon)](https://chain.link/hack-26/projects/cresolver) (hackathon claim; not independently verified)
- A May 2026 Yale thesis tested multi-agent LLM oracles on 1,189 resolved Kalshi questions. Independent aggregation with confidence-weighted voting reached 83.43% accuracy, while "deliberative consensus" fell to about 76%. Auto-resolving only unanimous, high-confidence questions reached 97.87% accuracy on 47% of questions, and disagreement flagged the rest for human review. — [Kota, arXiv 2605.30802](https://arxiv.org/abs/2605.30802)

**AI-assisted question and criteria generation**
- Caliber scores market definitions before creation. Its rubric covers source count, source relevancy, source agreement, prompt subjectivity, temporal soundness, reachability and blocklisted domains. It recommends a draft–score–revise loop, for example requiring at least 5 sources and a resolution date after the event ends. — [Caliber – Generating with AI](https://www.caliberratings.xyz/docs/guides/generating-with-ai); [Caliber – Market definitions](https://www.caliberratings.xyz/docs/market-definitions)
- Vinfotech's "Market Copilot" generates the question, outcomes, category and resolution criteria. The vendor says markets built on structured feeds (sports fixtures, prices, election calendars) are "highly reliable," while trending-news and entertainment markets "may require admin review." Operators can require human sign-off before an AI-created market goes live. — [Vinfotech docs](https://www.vinfotech.com/docs/prediction-market/ai-market-creation/ai-accuracy) (vendor claim)

**Handle verification patterns**
- Bio-code loop: the system issues a one-off code, the user pastes it into their TikTok bio, the system scans the bio when asked, and the user can delete the code once linked. — [Snag Solutions – Connect TikTok](https://docs.snagsolutions.io/loyalty/rules/connect-tiktok)
- Pearpop has users copy a code into their TikTok bio, then press verify. Verification typically completes within about an hour. — [Pearpop Help](https://help.pearpop.com/en/articles/6449694-how-do-i-get-my-tiktok-verified)
- Ainfluencer generates a 6-digit code per handle. The account must be public, meet a 100-follower minimum, and be relinked if the handle is renamed. — [Ainfluencer KB](https://ainfluencer.com/knowledge/social-account-connections/)
- Referly uses a hybrid. Instagram Business/Creator accounts (linked to a Facebook Page) verify by signing in, Instagram personal accounts verify with a temporary 6-digit bio code, and TikTok verifies by sign-in. — [Referly docs](https://www.referly.so/docs/help-center/affiliates/social-accounts)
- Liinks uses a backlink check: the social profile must link back to the Liinks page, and only Twitter, Instagram and TikTok are supported. — [Liinks Help](https://help.liinks.co/article/verifying-your-profile)
- Base Verify lets users prove ownership of X, Coinbase, Instagram and TikTok accounts without sharing credentials. — [Base docs – Verify social accounts](https://docs.base.org/base-account/guides/verify-social-accounts.md)
- Privy lists Instagram among its social OAuth login providers. — [Privy docs – Authentication](https://docs.privy.io/guide/authentication)

**Creator economics and landscape (signals for the dashboard and fees UX)**
- OpinionKings (iOS, 2026) is pitched as "a social media layer on top of prediction markets." It has creator profiles and communities, Reels, private topic channels for creators' "trading signals," and a leaderboard. Planned features include "creator credibility scores," premium content and subscriptions. Trading is currently simulated, with $10,000 in virtual funds per user. — [Intergame](https://www.intergameonline.com/igaming/products/opinionkings-launches-prediction-markets-mobile-app); [World Casino Directory](https://news.worldcasinodirectory.com/opinionkings-launches-social-prediction-market-app-124280); [SCCG, Sept 2026](https://sccgmanagement.com/sccg-articles/2026/09/08/opinionkings-deploys-ios-app-placing-creators-at-core-of-social-prediction-market-activity/)
- Xmarket's beta on BNB Chain (Feb 2026) adds creator revenue sharing. Its pitch is that question creators earn nothing on the major platforms, where the platform collects 100% of trading fees. — [Crypto Reporter](https://www.crypto-reporter.com/newsfeed/xmarket-launches-beta-on-bnb-chain-mainnet-122995/)
- PredicXion launched in June 2025 as a "creator-led, AI-powered" market where influencers, DAOs and brands launch their own markets. It reported 5,000+ users and 600+ market events by October 2025 and is expanding into Africa. — [AAP/Cision release](https://www.aap.com.au/aapreleases/cision20250626ae19236); [The Point (Gambia)](https://thepoint.gm/africa/gambia/headlines/predicxion-io-asias-first-creator-led-ai-prediction-market-targets-africa-expansion)
- Pump.fun gives creators an upfront choice: in February 2026, "Cashback Coins" let creators route fees to traders, and that choice is locked once the token launches. Its mobile app also lets creators split creator fees with any GitHub account. — [MEXC News](https://www.mexc.com/news/770475) (secondary crypto news; URL-to-claim mapping from search summary)
- Search results surfaced a report, attributed to the Wall Street Journal, that Polymarket paid dozens of social-media creators to film themselves placing fake bets, sometimes faking wins. I could not open the original. — surfaced via [pm.wiki news wire](https://pm.wiki/news/wire/agg_8765288e59dfd4ff) (attribution unverified)

### Inferences
**Screen-by-screen creator flow (hackathon build marked [H], production vision marked [P])**

1. **C1 – Welcome / Sign up [H]:** One screen with "Continue with Google / Apple / Email." The wallet is created silently (see Section 6). Copy: *"Turn your audience's hot takes into live predictions. Fans play with $1–$10. You earn a cut of every trade."*
2. **C2 – Connect your socials [H: X OAuth + bio code; P: X/TikTok/IG OAuth]:** Platform chips in this order: X, TikTok, Instagram, YouTube. For each one, first offer "Sign in to verify." If OAuth isn't available (for example a personal IG account), show "Paste code in bio": a 6-character code with a 15-minute timer, a "Copy code" button, a deep link to edit profile, and a "Check now" button. Once verified, show *"✓ Verified @handle · 1.0M followers"*. Store the follower count as a snapshot, and tell the creator they can delete the code (the Snag/Pearpop pattern). Badge tiers on the profile could be "Verified creator" versus "Unverified." Never let an unverified account use a famous handle's display name.
3. **C3 – "What do you want to predict?" (template picker) [H]:** Use vertical tabs (My channel, Sports, Reality TV, Music/Charts, Community, Events). Each template comes pre-filled:
   - *Milestone*: "Will I hit {2M} subscribers by {Dec 31}?", resolving from a public channel count with a screenshot plus the platform's API.
   - *Match*: "Will {Arsenal} beat {Chelsea} on {date}?", resolving on the official result. A draw resolves NO (state this explicitly).
   - *Reality/vote*: "Who wins {Big Brother} this week?", multi-outcome (2–10, as in Twitch), resolving on the broadcast result.
   - *Community*: "Will this video pass {100k} views in 24h?", which matches Spike's view-threshold contracts ([Spike](https://triviumventurenetwork.beehiiv.com/p/spike)).
4. **C4 – AI assist ("Help me write it") [H]:** The creator types a casual line ("arsenal chelsea sunday"). The AI returns a well-formed question, outcomes, close time, resolution source and edge-case rules ("If the match is postponed beyond 7 days → refund"). A lint checklist runs live, adapted from Caliber's rubric: ✅ Yes/no is objectively checkable · ✅ Named source · ✅ Closes before the result is known · ⚠️ "You can influence this outcome. Fans will see a 'Creator-controlled' label." Copy guidance: questions should be ≤ ~70 characters so they fit a story card, and should avoid subjective words ("best," "viral").
5. **C5 – Timing [H]:** "Trading closes" (default: just before the event starts, never after) and "Result expected." Use presets like Twitch's short windows for live moments (5 min, 30 min, 1 h) as well as dates.
6. **C6 – Seed and fees preview [H mock; P real]:** A slider for "Seed the pot: $10 / $25 / $50" (if the Panta API requires liquidity), followed by a plain-language fee preview: *"You earn {x}% of every trade. If fans trade $1,000, you earn ${y}."* Show a worked example rather than a bare percentage.
7. **C7 – Preview the share card [H]:** A 9:16 story card with a 1:1 / 1.91:1 link preview below it. The card shows the creator's face, the question in large type, a YES % / NO % bar, the countdown, a short URL and a QR code. Toggle "Show my face / Show logo."
8. **C8 – Publish and one-tap share [H]:** A row of share buttons: WhatsApp Status, IG Story, TikTok, X, Copy link. See Section 3 for platform mechanics: WhatsApp and IG Stories from the web mostly mean "save image + open app," while native apps can push stickers.
9. **C9 – Creator dashboard [H: 4 tiles; P: full]:** Tiles for Volume today, Unique fans, Earnings (claimable vs pending), and Live markets. Each market row shows a status pill (Live / Locked / Awaiting result / Disputed / Paid out). A primary button says "Claim $12.40." The fan list shows top predictors and a "new fans this week" count.
10. **C10 – Resolve flow [H: creator taps + evidence; P: AI-proposed + dispute window]:** When "Result time!" arrives, the screen shows the AI-proposed outcome with its evidence links/screenshot. The creator taps "Confirm YES," and a 24-hour (or 2-hour for live markets) dispute window opens. Fans can tap "Dispute (stake/flag)." Disputed or creator-controlled markets go to a neutral reviewer: a platform mod or AI-oracle ensemble, with humans handling any case where the AI isn't unanimous (per Kota). If the creator does nothing within 24 hours, either auto-resolve from the oracle or **void and refund** (the Twitch pattern). Add a 10-minute "Undo" after confirming (the Manifold pattern).
11. **C11 – Conflict-of-interest rules shown in-product [H copy; P enforcement]:** Creators (and linked wallets) cannot trade their own markets, or at minimum their position is publicly badged. Self-influenced markets ("Will I hit 2M subs") carry an "Outcome partly in creator's control" label. The creator's profile shows a resolution track record ("42 markets · 0 disputes · avg. resolve 1.2h"), which follows Manifold's "check their resolution history" heuristic.
12. **C12 – Creator storefront ("link in bio") [H]:** `app.com/@handle` shows avatar, verified badges, "Live now" markets as big tappable cards, "Settled" history with accuracy, a top-fans leaderboard and a Follow button. It should be one URL creators can put in every bio.
13. **C13 – Creator notifications [P]:** "🔥 Your market just passed $500 traded," "⏰ Trading closes in 1h — post a reminder story?" (with a pre-made "closing soon" card), "Result needed," "Dispute opened," "You earned $8.20 — claim."

### Gaps
- I could not read Twitch's official help article or API reference directly (DNS failure), so field limits such as title length and per-viewer point caps are unverified. The often-quoted 10–250,000 points per prediction comes from an unsourced blog and 2020 launch coverage.
- I found no public metrics on Twitch Predictions participation rates.
- No source compared OAuth and bio-code verification on completion rate or fraud.
- I don't know the Panta API's market mechanism (order book vs AMM vs parimutuel), whether creators can seed liquidity, or its fee split. These determine the C6 and payout screens.
- Current API access rules for reading Instagram/TikTok follower counts (Meta app review, TikTok Login Kit scopes) were not verified this session.

---

## 2. Fan journey: landing from a story link in an in-app browser, the first 10 seconds, login/wallet/onramp, picking YES/NO, payout language, confirmation, share-back, follow, notifications, claim, withdraw

### Takeaway
The fan arrives in Instagram's, TikTok's or WhatsApp's in-app browser, where Google OAuth is blocked (`403 disallowed_useragent`) and passkeys are unreliable. The landing page must therefore show the question, odds and creator **before** any login. Auth should default to email/phone OTP inside the webview, with an "Open in browser" escape hatch for Google/Apple. Onramp limits and discontinuations (Coinbase's $500/week US guest checkout, and its hosted guest flow being retired) mean small-amount funding and African/Indian off-ramps (mobile money) need separate providers.

### Cited Findings
**In-app browser constraints**
- Google blocks OAuth requests from embedded webviews. Blocking began September 30, 2021, on the grounds that webviews let the host app man-in-the-middle the login. — [Google Developers Blog](https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html); [Google OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- Google login inside Instagram's in-app browser returns "Access blocked … 403 disallowed_useragent" for Web3Auth-based wallets. Another thread reports email login freezing in the same browser. — [Web3Auth community thread](https://web3auth.io/community/t/web3auth-login-is-blocked-by-google-when-trying-to-access-via-instagram-browser/10355); [Web3Auth in-app browser issues](https://web3auth.io/community/t/in-app-browser-issues/3695)
- Google login also fails in TikTok's in-app browser. — [link.boo (vendor)](https://link.boo/fix/google-login-fails-in-tiktok-browser)
- WebAuthn/passkeys behave unevenly in embedded webviews: Conditional UI is unavailable and prompts may never appear. On iOS, webview cookies are separated from Safari. Meta apps' user agents contain `FBAN`/`FBAV` tokens, which can be used for detection. — [Corbado – Passkeys in in-app browsers](https://www.corbado.com/blog/passkeys-in-app-browsers) (via search summary)
- On Android, an embedded WebView can't drive WebAuthn directly unless the host app bridges it to Credential Manager. — [passkeys.dev – Android reference](https://passkeys.dev/docs/reference/android/)
- Privy's embedded-wallet key lives in an isolated iframe on a separate domain. I found no Privy guidance on how that behaves in in-app browsers. — [Privy docs – Security](https://docs.privy.io/guide/security/)

**Forced sign-up and checkout friction**
- Baymard: mandatory account creation causes 19% of users to abandon checkout. Unexpected extra costs cause 39%. The average documented cart abandonment rate is 70.22% (mean of 50 studies, 2006–2025). — [Baymard – Reduce cart abandonment](https://baymard.com/blog/reduce-cart-abandonment). Secondary sites cite 24–26% for forced account creation in 2024/2025 Baymard data, which I could not confirm on baymard.com ([Zipchat](https://www.zipchat.ai/blog/cart-abandonment-benchmarks-and-causes); [LaunchMyStore](https://launchmystore.io/blog/how-to-reduce-shopping-cart-abandonment-rate)).

**Funding (onramp) and withdrawing (offramp)**
- Coinbase Onramp guest checkout lets any US resident with a debit card buy up to $500/week (minimum $5) without a Coinbase account. Coinbase's docs say guest checkout (debit card, Apple Pay) via the hosted widget is being discontinued (dated June 30, 2026) and point developers to the Headless Onramp API. — [Coinbase CDP – Onramp overview](https://docs.cdp.coinbase.com/onramp/coinbase-hosted-onramp/overview)
- Dynamic's integration supports Coinbase Apple Pay guest checkout "for purchases under $500 without KYC." Orders fail if a verified phone number is missing, so apps should pre-check what verification is needed. — [Dynamic – Coinbase Onramp](https://www.dynamic.xyz/docs/money-and-funding/coinbase-onramp)
- Eversend advertises one API that converts USDC (Solana among 7 networks) into local currency and pays out to mobile money and bank rails in 18 African countries. — [Eversend USDC off-ramp](https://eversend.co/platform/apis/usdc-off-ramp) (vendor claims)
- Kotani Pay connects apps to M-PESA, MTN Money, Airtel Money, Orange Money and bank transfers. Solana support was not confirmed in its docs. — [Kotani Pay docs](https://documentation.kotanipay.com/v3/overview)
- Yellow Card operates in 20 African countries, lists NGN/KES and SOL/USDC, and joined Circle's Payments Network for real-time NGN payouts. — [Fireblocks – Yellow Card](https://www.fireblocks.com/network/yellowcard); [TechAfrica News](https://techafricanews.com/2025/08/01/yellow-card-joins-circle-payments-network-to-boost-usdc-access-in-africa/)
- Figo (Nigeria) lets consumers receive USDC on Solana and off-ramp to naira over NIBSS. — [Figo](https://www.spendfigo.com/nigeria/receive-usdc)

**How incumbents show the trade and payout**
- Robinhood event contracts flow: pick a contract → Yes or No → enter quantity → **swipe to submit**. Users see their estimated total and fees before confirming. — [Next.io – Robinhood event contracts](https://next.io/prediction-markets/robinhood/event-contracts/); [Bonus.com – Robinhood](https://www.bonus.com/prediction-markets/robinhood/)
- Robinhood's contract view includes a **timeline**: trading hours, event day, when the contract resolves (last trading day), and a payout entry showing when proceeds should arrive. Payout date and withdrawable date differ. — [Robinhood Support – Event contracts](https://www.robinhood.com/us/en/support/articles/robinhood-event-contracts/)
- Polymarket: a share's price equals the implied probability (a $0.65 YES ≈ 65% chance). A winning share pays $1 and a losing share pays $0. Traders can sell before resolution. — [Polymarket 101](https://docs.polymarket.com/polymarket-101)
- Kalshi: YES and NO prices sum to $1 (for example 70¢ YES + 30¢ NO). — [Kalshi Help – How are prices determined](https://help.kalshi.com/markets/markets-101/how-are-prices-determined). Kalshi also has a "Quick Order" purchase flow ([Kalshi Help – Quick orders](https://help.kalshi.com/trading/order-types/quick-orders), title only; contents not retrieved).
- Twitch viewers see a banner at the top of chat, tap **Predict**, and choose how many points to stake. Payouts are pari-mutuel: winners split the pool in proportion to their stake. — [ITGeared](https://www.itgeared.com/how-to-do-predictions-on-twitch/); [StreamScheme](https://www.streamscheme.com/guide-to-twitch-predictions/)

**Celebration and gamification guardrails**
- Robinhood removed its confetti animation in March 2021 amid regulator criticism of gamification. — [CNBC](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)
- In its January 2024 Massachusetts settlement ($7.5M), Robinhood agreed to "permanently cease the future use of confetti." For Massachusetts customers it also agreed to stop "celebratory imagery tied to the frequency of trading … and features that mimic games of chance." — [Boston Globe](https://www.bostonglobe.com/2024/01/18/business/robinhood-agrees-pay-75-million-settle-complaints-over-its-sales-practices)

**Notifications**
- Users who received pushes in their first 90 days showed 3x higher app retention (Airship: 63M users, 1,500 apps). — [Airship 2026 benchmarks](https://www.airship.com/mobile-app-push-notification-benchmarks-for-2026/)
- Batch data: Android push opt-in fell from 85% to 67% within a year of Android 13's runtime permission prompt. iOS was roughly 58% → 56%. — [Shno.co summary](https://www.shno.co/marketing-statistics/push-notification-statistics) (secondary). Pushwoosh treats iOS opt-in below 50% as common and Android below 75% as underperforming. — [Business of Apps](https://www.businessofapps.com/?p=101648)

### Inferences
**Screen-by-screen fan flow**

1. **F0 – Link preview (before the tap):** The OG image is the question card (creator face + question + "62% YES"). It should be <300KB and ≥300px wide (see Section 7). OG title: "Will Arsenal beat Chelsea? · @creator". Description: "62% say YES · 1,240 fans playing · closes Sun 4pm."
2. **F1 – Landing, the first 10 seconds (no login wall) [H]:** Everything above the fold on a 360×640 Android:
   - Creator avatar + name + ✓ verified + "Follow" (top-left), which signals trust.
   - The question in 24–28px bold.
   - A big two-tone probability bar: **"62% YES · 38% NO"**.
   - Social proof: "1,240 fans · $3,410 played," avatar stack "Ada, Tunde +1,238 picked."
   - A live ticker line: "@ada picked YES $5 · 12s ago."
   - Countdown chip: "Closes in 2d 4h."
   - Two thumb-zone buttons fixed at the bottom: **"YES 62¢"** (green with ✓ icon) and **"NO 38¢"** (red/purple with ✕ icon). The icon plus label means it doesn't rely on color alone.
3. **F2 – Amount sheet (bottom sheet, still no login) [H]:** Preset chips **$1 · $5 · $10 · Custom**, defaulting to $1 (low default; see Section 4 on high-default dark patterns). The plain payout line updates live: **"If YES wins, you get $8.06 (you put in $5)."** Secondary line: "Odds can move until you confirm." For pool-based pricing: "Estimated — final payout depends on the pot."
4. **F3 – Login, only now [H]:** Detect the in-app browser by user agent (Instagram/`FBAN`/`FBAV`, TikTok, WhatsApp, X). **Inside a webview:** show *"Continue with phone or email"* (OTP), plus a text link "Prefer Google/Apple? Open in browser ↗" that triggers an intent/universal-link escape. **In a normal browser or native app:** show Google / Apple / email. Never show a Google button that will 403. Keep the selected pick and amount through login, with a "Your $5 YES is waiting" banner.
5. **F4 – Fund [H: faucet/test USDC; P: Apple Pay/card/mobile money]:** "Add $5 to play," with Apple Pay / Google Pay / Card / M-Pesa / Bank transfer (by region). Round funding up by default to cover fees ("Add $5.30 — includes fees"), because hidden extra costs are the #1 abandonment reason (Baymard 39%). Gas is never shown; it's sponsored (Section 6).
6. **F5 – Confirm [H]:** A single "Confirm YES · $5" button, or a swipe-to-confirm as Robinhood uses. A receipt-style summary: "You pay $5.00 · You get $8.06 if YES · Fee $0.05 · Result by Sun 6pm."
7. **F6 – Success (calm celebration) [H]:** A satisfying haptic and checkmark animation with the copy "You're in! 🎯 YES on Arsenal". Avoid confetti or loot-box effects, and never celebrate trade frequency (Robinhood/Massachusetts precedent). Primary CTA: **"Share your pick"**. Secondary: "Follow @creator for results."
8. **F7 – Share-back card [H]:** A 9:16 "I picked YES" card with the creator face, the question, "Me: YES @ 62%" and a "Think I'm wrong? Play ↗" CTA. By default it shows the **side**, not the dollar amount; showing the amount is a toggle. Use a per-user referral link to attribute fan-to-fan virality.
9. **F8 – Follow and notification opt-in, in context [H copy; P push]:** Ask after the first pick: "Get pinged when the result is in?" with options [Push] [WhatsApp] [Email]. Asking in context protects the iOS/Android opt-in rate. In emerging markets, WhatsApp or SMS may be the more reliable channel (inference).
10. **F9 – Resolution and claim [H]:** Win: "✅ YES won! You got $8.06" → [Claim to balance] (or auto-credit) → [Share win]. Loss: "❌ NO won this time. Your pick: YES." Show calm copy plus "Next market from @creator →" and no loss-chasing prompts. Void: "Market cancelled — your $5 is back."
11. **F10 – Withdraw [P]:** "Cash out to: M-Pesa / bank / card," with the local-currency amount and fee shown before confirming ("You'll get ₦12,430 · arrives in ~5 min"). Show it as a timeline like Robinhood's: payout date vs withdrawable date.
12. **F11 – Profile/portfolio (fan) [H light]:** "My picks" tabs (Open / Won / Lost), an accuracy % and a streak.

### Gaps
- No public conversion funnels (landing → first trade) from Polymarket, Kalshi, Robinhood or creator-market apps were found.
- The status of Coinbase hosted guest checkout after June 30, 2026 is unconfirmed. Onramp options for Nigeria/Kenya/India with Apple/Google Pay at $1–$10 amounts are unverified, and minimums (such as Coinbase's $5) may exceed a "$1 bet."
- I could not verify whether WhatsApp's in-app browser blocks Google OAuth the way Instagram and TikTok do (WhatsApp often opens links in the system browser; untested).
- I found no source on WhatsApp/SMS notification opt-in or engagement versus push in Africa or India.

---

## 3. Social UI patterns: feed, stories bar, comments with position badges, reactions, leaderboards, streaks, badges, accuracy profiles, fan tiers, receipt/PnL cards, live tickers, countdowns

### Takeaway
Incumbents are converging on "social layer on top of markets." Kalshi Social posts are tied to a position (market + side). Polymarket's comments API supports `holders_only` and `get_positions`. PrizePicks has a feed with profiles, lifetime stats and copy-a-lineup. OpinionKings has Reels with attached market cards. Sleeper shows that chat embedded on every screen drives very high engagement. Duolingo's data supports streaks with a freeze mechanic. Spotify Wrapped shows how far designed share cards spread.

### Cited Findings
**Position-linked social**
- Kalshi Social has three views: Feed, Following and a Leaderboard of top traders. A post can be tied to a holding, showing the market and the direction of the position. Posts are capped at 800 characters, support GIFs, threaded replies, likes and bookmarks. — [Kalshi Help – Kalshi Social](https://help.kalshi.com/en/articles/15891130-how-do-i-post-comment-and-react-on-kalshi-social) (via search summary; page undated)
- Polymarket's List Comments API accepts `get_positions` and `holders_only` boolean flags, which suggests comment threads can be filtered to holders and annotated with positions. The docs don't spell out the UI. — [Polymarket API – List comments](https://docs.polymarket.com/api-reference/comments/list-comments). A top-holders endpoint returns holders grouped by outcome. — [Polymarket API – Top holders](https://docs.polymarket.com/api-reference/core/get-top-holders-for-markets)
- A guide places a "filter comments by holders" control in the market page's Discussion area (guide about 14 months old). — [Polymarket guide (archive)](https://polymarketguide.gitbook.io/polymarketguide-archive/basics/introduction-to-polymarket) (mapping from search summary)
- Third-party extensions add "Comment Filtering by Position (Yes/No holders)" and Top Holders tabs. One describes Polymarket's native tab row as including "Comments" and "Top Holders." — [Polyhelper](https://www.extscope.org/extension/mebiclnfcnknilfaoanimpaeimjlafmg); [PolyAlertHub Insights](https://addons.mozilla.org/en-US/firefox/addon/polyalerthub-insights/)
- I found no official Polymarket announcement of a native "position badge next to commenter name." — (negative finding from search)

**Feeds, profiles, copy/tail**
- The PrizePicks social feed (Oct 2025) has searchable profiles showing lifetime stats and lets users follow others. Users can copy or react to lineups from friends, celebrities and public profiles, share lineups across social media, and get an ML-personalized feed. — [SBC Americas](https://sbcamericas.com/2025/10/09/prizepicks-debuts-social-feed-product/)
- Underdog Pick'em uses a swipe right (add) / swipe left (skip) interaction, plus a "Streaks" mode. — [Gambling.com – Underdog](https://www.gambling.com/us/daily-fantasy/underdog)
- Fliff lets users follow friends, see their wagers, "support or dispute" their picks, and join multiple leaderboards and duels. — [Legal Sports Report – Fliff](https://www.legalsportsreport.com/fliff/); [Bonus.com – What is Fliff](https://www.bonus.com/news/what-is-fliff); [App Store listing](https://apps.apple.com/app/id1489145500)
- The core pick'em mechanic is broadly similar across Underdog, PrizePicks, Betr, FanDuel and DraftKings. Competition therefore shifts to brand, creator distribution and social product loops. — [Sacra – Underdog Fantasy](https://sacra.com/c/underdog-fantasy/)
- OpinionKings' Reels are designed like TikTok/Instagram feeds. A creator's video sits over a live market card (example: a Yamal Reel over "Will Yamal leave Barcelona?"). Users can post text, polls and video with a linked live market. — [Intergame](https://www.intergameonline.com/igaming/products/opinionkings-launches-prediction-markets-mobile-app); [G3 Newswire](https://g3newswire.com/opinionkings-launches-ios-app-to-empower-creators-and-redefine-social-prediction-markets/)
- Pump.fun 2.0 (June 2025) added a "mover feed" and "tap-to-ape" one-click buying. — [MEXC News](https://www.mexc.com/tr-CT/news/pump-fun-launches-version-2-0-adding-new-features-such-as-one-click-follow-up-investment/23345)
- Polymarket's March 2026 website redesign replaced the top-of-page market list with a horizontal carousel of high-profile event cards, a layout compared to Reuters rather than a trading terminal. — [MEXC News (secondary)](https://www.mexc.com/tr-CT/news/877833) (mapping from search summary)

**Chat-first and social engagement**
- Sleeper embeds league chat on almost every screen. Its CEO said in-season users average about 50 minutes/day ("Instagram-like"). — [TechCrunch](https://techcrunch.com/?p=1868752)
- An a16z post (investor) said Sleeper's fantasy leagues grew 700% YoY to 1M+ active players. — [a16z](https://a16z.com/?p=17335). Sleeper built the social layer first and launched fantasy only in 2018, because "the reasons people play fantasy … were happening in text threads." — [Expa founder spotlight](https://expa.com/news/founder-spotlight-sleeper)

**Streaks**
- Duolingo reports that learners who reach a 7-day streak are 2.4x more likely to return the next day, and links 7-day streaks to 3.6x higher course completion. Making streaks easier to keep grew 7+ day streakers by over 40%. Allowing up to two streak freezes increased daily active learners by 0.38% "without encouraging more days off." — [Duolingo – How the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit); [Duolingo – Improving the streak](https://blog.duolingo.com/improving-the-streak); [Duolingo Engineering – Streaks](https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals) (company-reported, correlational; exact claim-to-post mapping from search summary); [Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)

**Share cards and virality**
- Spotify Wrapped 2025 reached 200M+ engaged users in 24 hours, versus 62 hours the year before, and about 500M shares on day one (+41% YoY). "Shares" include in-app shares, downloads and screenshots. — [Music Business Worldwide](https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase); [RouteNote](https://routenote.com/blog/spotify-wrapped-2025-record-breaking-launch/)
- Instagram's Sharing to Stories (native iOS/Android only) passes a **background layer** and an adjustable **sticker layer** into the story composer. A Facebook App ID has been required since January 2023, and Android stickers must be content URIs to local files. — [Meta – Sharing to Stories](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories)
- Instagram opened the Link sticker to all users in 2021. — [Instagram announcement](https://about.instagram.com/blog/announcements/expanding-sharing-links-in-stories-to-everyone)
- The Threads API can cross-share a Threads post as an IG Story via `crossreshare_to_ig` (page updated July 2026). — [Meta – Threads share to IG Stories](https://developers.facebook.com/documentation/threads/create-posts/share-to-ig-stories)

**Poll and quiz stickers as the native "proto-prediction"**
- Instagram's quiz sticker needs one correct answer (polls are for preferences). One walkthrough lists up to 4 answers, a 52-character question and 45-character answers (may be outdated). — [Ignite Social Media](https://ignitesocialmedia.com/?p=52170); [Later](https://later.com/blog/instagram-stories-quiz-sticker)
- Stickers report data differently: polls give vote totals, quizzes give distribution plus correct/wrong tally, countdowns give reminder sign-ups. — [View IG Story blog](https://www.view-ig-story.com/blog/instagram-story-poll-quiz-question-stickers)

### Inferences
**Pattern catalogue with a recommended spec**
- **Home = vertical swipe feed [H]:** One market per screen, with full-bleed creator photo or video, the question, the probability bar, YES/NO buttons and a right-rail of actions (❤️ react, 💬 comments count, ↗ share, 👤 creator). Swiping up moves to the next market, and tapping the creator opens the storefront. Swipe gestures should never place a bet (avoid Underdog-style swipe-to-add for money). Swipes navigate; taps commit.
- **Stories bar of creators [H]:** A horizontal ring row at the top. A ring is lit when the creator has a live market closing within 24 hours, with a red "LIVE" ring for in-play markets (Twitch-style short windows).
- **Comments with position badges [H]:** Each comment shows a pill, "YES · $5" or "NO," next to the username, plus a filter row [All] [YES holders] [NO holders] [Creator]. Kalshi ties posts to positions, and Polymarket's API has `holders_only` and `get_positions`. Privacy default: show side only, with amount opt-in.
- **Reactions [H]:** 🔥 😂 😬 🧢 ("cap"), quick-tap on the market card. These are a cheap engagement signal before money is involved.
- **Live activity ticker [H]:** "@ada picked YES · $5 · 12s" (rate-limited; aggregate when busy: "38 people picked YES in the last minute"). Make amounts optional, or use buckets ("$1–5").
- **Leaderboards per creator [H]:** "Top predictors of @creator this month" ranked by **accuracy and points**, not raw PnL, which reduces whale-dominance and gambling framing. Use league tiers for fans: Rookie → Regular → Oracle (like Manifold's leagues).
- **Streaks [P]:** A "Correct-call streak" or "Days played streak" with one free freeze per week (Duolingo's evidence). Never tie a streak to money spent.
- **Badges/fan tiers [P]:** "Day-one fan" (joined in the first 100), "Called it" (correct on a <25% outcome), "10-market veteran." Display them on comments and the leaderboard.
- **Accuracy profile [H light]:** "71% correct · 34 picks · Best call: Arsenal 2–1 at 18%." Show it on the fan profile and in comments.
- **Receipt/PnL card [H]:** After a win: "Called it ✅ YES @ 18% · +$22" (amount toggle), styled like Spotify Wrapped with brand gradient, creator face and a QR code back to the creator's next market.
- **Countdowns [H]:** Use a countdown chip on every card. Use urgency copy only in the final hour, and keep it factual ("Closes 4:00pm"); see Section 4 on urgency dark patterns.
- **Copy/tail [P]:** "Pick with Ada" (copies side, not amount; amount re-chosen). This is the PrizePicks copy-lineup / Fliff follow-wager pattern.
- **Creator Q&A/chat thread per market [P]:** Sleeper's embedded-chat lesson applies: put the conversation on the market screen, not in a separate tab.

**Share mechanics by destination (hackathon reality)**
- *WhatsApp Status:* There is no public API for posting to Status from the web (inference; not documented in results). Use "Save image" plus "Open WhatsApp" with the link copied, and make sure the OG preview is ≤300KB so chats show the card.
- *IG Stories:* From a PWA, it's save image and paste link sticker. A native app can use the Sharing to Stories intent with a sticker (requires a FB App ID).
- *X:* A web intent with pre-filled text plus a URL whose OG card renders.
- *TikTok:* Save a 9:16 image or short video and open TikTok (the TikTok Share Kit was not verified this session).

### Gaps
- No public data on comment-section engagement or position-badge effects at Polymarket or Kalshi.
- No retention data for TikTok-style vertical feeds in betting or prediction apps.
- I could not verify a WhatsApp Status posting API or the TikTok Share Kit's web capabilities.
- No evidence was found on how fan tiers or badges affect behavior in prediction products specifically.

---

## 4. Language and framing: explaining odds/prices to non-traders, avoiding gambling-style dark patterns, responsible play (limits, age gates)

### Takeaway
Show probability as "62% chance" (the Polymarket/Kalshi price-as-probability convention) and express payouts as absolute money ("$5 → $8.06 if YES"), not decimal odds. Avoid the dark patterns researchers have catalogued: high defaults, hidden limit tools, urgency prompts, celebratory imagery tied to trading frequency, and withdrawal friction. Ship deposit/loss limits, time-outs, self-exclusion and an 18+ (or local-law) age gate from day one. Kalshi, Polymarket and the proposed 2026 US legislation are all moving that way.

### Cited Findings
**Price = probability convention**
- Polymarket: price ≈ probability ($0.65 → about 65%). YES and NO prices sum to about $1, and winning shares pay $1. — [Polymarket 101](https://docs.polymarket.com/polymarket-101)
- Kalshi: opposing sides total $1 (70¢ + 30¢). — [Kalshi Help](https://help.kalshi.com/markets/markets-101/how-are-prices-determined)
- Robinhood: contracts are priced in cents and settle at $1 or $0. "The closer to $1, the more likely the market thinks the outcome is going to happen." Worked example: buy at $0.47 and you net $0.53 if right, before fees. — [Next.io](https://next.io/prediction-markets/robinhood/event-contracts/); [Bonus.com](https://www.bonus.com/prediction-markets/robinhood/)

**Comprehension research on probability formats**
- Natural frequencies ("30 out of 10,000") reduce statistical reasoning errors compared with probabilities (Hoffrage et al., *Science* 2000). In a classic example, 1 of 24 physicians answered correctly with probabilities versus 16 of 24 with natural frequencies. A systematic review of 35 studies found an SMD of 0.69 in favor of natural frequencies, mostly for diagnostic-test problems. — [PMC review](https://pmc.ncbi.nlm.nih.gov/articles/PMC6464912); [McGill course notes](https://jhanley.biostat.mcgill.ca/c607/ch04/Communicating_stat_info.html) (claim-to-URL mapping from search summary)
- Evidence on percentage versus "1 in N" formats is mixed. A small online study (n=141, by high-school authors) found better performance with percentages. A study of adults aged 75+ found percentages understood better than fractions, with pictorial percentage displays well received. — [Journal of Emerging Investigators](https://emerginginvestigators.org/articles/23-160); [Huddersfield eprint](https://eprints.hud.ac.uk/id/eprint/2495/) (mapping uncertain)
- Communicating baseline risk in a frequency format helped people understand benefits and harms, whereas percentage formats often impeded understanding, and people confused relative with absolute risk. — [Medical Decision Making 2014 (RePEc)](https://ideas.repec.org/a/sae/medema/v34y2014i5p615-626.html)
- I found no study directly testing betting-style odds ("4 to 1") against percentages for lay audiences. — (negative finding)

**Dark patterns and safer-gambling design**
- A scoping review of 16 studies catalogues gambling dark patterns: hidden gambling-management tools, inducements with complex conditions, minimum balances to withdraw, account-closure friction, **high defaults** for stake, deposit, reality-check and deposit-limit settings, and **urgency-based prompts**. The authors note limited behavioral evidence and call for shifting the burden of proof to operators. — [Deceptive Design – scoping review](https://www.deceptive.design/articles/dark-patterns-in-online-gambling-a-scoping-review-and-classification-of-deceptive-design-practices); [Swansea Cronfa record](https://cronfa.swansea.ac.uk/Record/cronfa71152)
- A Behavioural Insights Team audit identified 25 design features on gambling sites that put consumers at risk of poor choices. — [CMS Law](https://cms.law/en/gbr/legal-updates/dark-patterns-in-gambling)
- A Swansea study (Sept 2026) with 615 UK gamblers found the industry's most common consent-banner design made users 3–4x more likely to accept tracking than a neutral one-click alternative. — [Swansea University press release](https://www.swansea.ac.uk/press-office/news-events/news/2026/09/nine-in-10-uk-gambling-websites-breaching-data-privacy-law-study-finds.php)
- UK Gambling Commission online game-design rules (from 31 Oct 2021) banned features that speed up play, **celebrate losses as wins**, or let customers reverse withdrawals. Slots require at least 2.5s between game cycles and no auto-play. — [RPC Legal](https://www.rpclegal.com/snapshots/consumer/spring-2021/making-online-games-safer-by-design/) (2021; current status unverified)
- A GambleAware/BIT trial with bet365 customers found that commitment devices for deposit limits made no significant difference to deposits and appeared to *reduce* how many customers set a limit, a "backfire effect." — [SBC News](https://sbcnews.co.uk/social-responsibility/2021/07/23/gambleaware-research-blasts-design-of-safer-gambling-tools-of-lagging-behind-expectations/)
- The UKGC working group's most popular harm-reduction tools were enforced breaks, a maximum stake per spin, and ease of withdrawal. — [iGaming Business](https://igamingbusiness.com/gambling-commission-proposes-mandatory-loss-and-stake-limits)

**Responsible-play moves by prediction-market incumbents (2026)**
- Kalshi says self-exclusion and self-limits are already live. In May 2026 it announced it will *suggest* deposit limits to individual users who show signals such as "repeated excessive losses," sometimes request proof of funds, and use selfies as an extra verification layer. — [Axios, May 2026](https://www.axios.com/2026/05/12/kalshi-prediction-market-trading-rules); [The Hill](https://thehill.com/policy/technology/5862176-kalshi-cracks-down-on-minors/amp/)
- Prediction markets operate at 18+ under federal rules, whereas sportsbooks are typically 21+. Leagues (NCAA, NFL, NBA, PGA Tour) have urged the CFTC to raise the minimum to 21. A Kalshi spokesperson said 18–21-year-olds account for 3.14% of trading volume. — [The Hill](https://thehill.com/policy/technology/5862176-kalshi-cracks-down-on-minors/amp/); [Sigma](https://sigma.world/news/young-adults-trade-5b-kalshi/) (claim-to-URL mapping from search summary)
- The proposed "Prediction Market Act of 2026" (Sens. Gillibrand and McCormick) would require self-exclusion programs and mandatory age verification. — [The Hill](https://thehill.com/policy/technology/5862176-kalshi-cracks-down-on-minors/amp/) (bill status unverified)
- Polymarket (US) added common responsible-gaming tools, including deposit limits and self-exclusion. — [Legal Sports Report](https://www.legalsportsreport.com/?p=279884); [Bonus.com](https://www.bonus.com/news/polymarket-deposit-limits-self-exclusion/) (headline-level evidence)
- Fliff (a virtual-currency social sportsbook) has been criticized for marketing that reaches under-18s. — [YPulse](https://www.ypulse.com/newsfeed/2024/02/08/fliff-is-a-social-sportsbook-app-that-makes-bets-with-virtual-currency-marketing-to-under-18-users/)
- Meta's reported "Arena" prediction app would use points rather than money, per a June 2026 NYT report. — [The Block](https://www.theblock.co/post/405838/meta-zuckerberg-to-build-prediction-market-app-polymarket-kalshi-nyt)

### Inferences
**Microcopy kit (the "say this, not that" list)**
| Concept | Say | Avoid |
|---|---|---|
| Price | "62% chance YES" | "0.62," "1.61 decimal odds," "+161" |
| Payout | "Put in $5 → get $8.06 if YES" / "$1 pays $1.61" | "ROI 61%," "shares" |
| Loss | "If NO wins, you lose your $5" (always shown next to the payout) | hiding the downside |
| Price movement | "Price may change before you confirm" | silent slippage |
| Selling early | "Cash out now for $6.20" | "Sell 8.06 shares at 0.77" |
| Fees | "Includes $0.05 fee" (pre-confirm) | fees revealed after the fact (Baymard's #1 abandonment cause) |
| Outcome | "YES won · you got $8.06" | "Congrats!! 🎉🎉" with confetti, "Almost won!" (losses-as-wins framing) |
| Natural frequency tooltip | "62% ≈ 62 out of 100 times" | — |

- **Defaults:** Default the stake to $1, keep presets small ($1/$5/$10), and require deliberate entry for anything above $10. Never pre-select the largest chip.
- **Responsible-play surfaces [H: settings stub + age gate; P: full]:**
  - An age gate at first trade ("I'm 18+" or the local legal age, with ID/KYC at withdrawal or above thresholds).
  - "Play limits" in the profile with daily/weekly deposit and loss caps, shown by default with sensible low values the user can raise after a cooling delay (to avoid the high-defaults dark pattern).
  - Time-out (24h/7d/30d) and self-exclusion reachable in two taps.
  - A reality check after N minutes or N picks in a session ("You've made 6 picks today, net −$4").
  - Behavior-triggered suggestions, Kalshi-style ("You've lost $20 this week — set a limit?").
- **Framing:** Position the product as "predict with your community," with money as a small stake. Consider a free-to-play "points" mode for unverified, underage or restricted regions (the Twitch, OpinionKings and Meta Arena pattern) as a fallback for jurisdictions where real money isn't allowed.
- **Creator promotion integrity:** Require clear "creator is paid/earns fees" disclosure on share cards and storefronts ("@creator earns from trades on this market"), given the reported paid-fake-bets controversy.

### Gaps
- No primary UKGC document or current licence-condition text was retrieved; the 2021 rules' current status is unverified.
- No research found on prediction-market-specific comprehension (for example "62% chance" versus "$1 pays $1.61") with lay or emerging-market users.
- Nigeria, Kenya and India's legal treatment of real-money prediction markets (age, licensing) was not researched. It is outside UX scope but determines which age-gate copy to use.

---

## 5. Evidence from real products: what's public (metrics, learnings)

### Takeaway
Public metrics are sparse and mostly vendor-reported. The usable numbers are: Spotify Wrapped share volume, Duolingo streak lifts, Sleeper engagement, Hamster Kombat acquisition (and its 86% MAU collapse), Zora/Pump.fun creator-coin scale, Baymard checkout friction, and Airship push retention. No prediction-market app has published funnel conversion data.

### Cited Findings
- **Twitch Predictions:** points-based, pari-mutuel, creator-resolved, one active prediction per channel, 24-hour auto-refund. See Section 1 for sources. No public participation metrics were found.
- **Polymarket:** the US iOS app launched via waitlist (1M+ sign-ups) as "sports-first," with Android to follow. — [Yahoo Finance](https://finance.yahoo.com/news/polymarket-launches-app-cftc-green-192317133.html); [Complex](https://www.complex.com/life/a/complexstaff3/polymarket-waitlist-1-million-beta-early)
- **Kalshi:** Social tab (Feed, Following, Leaderboard); position-linked posts. — [Kalshi Help](https://help.kalshi.com/en/articles/15891130-how-do-i-post-comment-and-react-on-kalshi-social)
- **Robinhood:** prediction markets hub under Investing → Prediction markets. Eligibility requires US citizenship plus margin or Level 2+ options approval. Swipe-to-submit; a timeline UI shows resolution and payout timing. — [Next.io](https://next.io/prediction-markets/robinhood/event-contracts/); [Robinhood Support](https://www.robinhood.com/us/en/support/articles/robinhood-event-contracts/)
- **Manifold:** creator-resolved markets with a mod override and a 10-minute undo. — [Manifold guidelines](https://manifold.markets/community-guidelines/resolving-markets)
- **PrizePicks/Underdog/Fliff:** social feed with copyable lineups; swipe pick'em; follow and dispute friends' picks. See Section 3 for sources.
- **Sleeper:** chat on nearly every screen, about 50 min/day in season, 700% YoY league growth, 1M+ active players (a16z), reportedly near-zero ad spend. — [TechCrunch](https://techcrunch.com/?p=1868752); [a16z](https://a16z.com/?p=17335); [Yespress profile](https://yespress.io/sleeper) (low-reliability directory for the ad-spend claim)
- **Pump.fun mobile:** launched Feb 14, 2025 on iOS/Android. Sign-up uses email or Google and auto-creates a Solana wallet via Privy. Users can create, buy, sell, keep watchlists and manage a portfolio. Not available in the UK. — [Decrypt](https://decrypt.co/306072/pumpfun-mobile-app-solana-meme-coins); [ForkLog](https://forklog.com/en/pump-fun-developers-launch-mobile-application/). Early reception was reported at about 50k downloads and under 2.5★ (SensorTower, via secondary news; source mapping uncertain).
- **Zora:** about 1.6M coins, 200K+ creators and $445M+ trading volume as of July 2025 (Privy, vendor-reported). — [Privy blog – Zora](https://privy.io/blog/powering-the-new-creator-economy-with-zora). Daily token creation rose from about 6k to nearly 50k during July 2025, credited to the Base App integration. — [0x case study](https://0x.org/case-studies/zora). Every post is a coin paired with the creator coin, which is paired with $ZORA. — [Delphi Digital](https://members.delphidigital.io/reports/zora-cant-stop-coining). A reviewer rates it 3.1/5 and reports Trustpilot complaints about withdrawals and confusing interfaces. — [Creator Economy Tools](https://creatoreconomytools.com/tool/zora) (affiliate site)
- **Base:** passkey Smart Wallet demo apps onboard without an extension or app install. — [Base docs – Coin a joke app](https://docs.base.org/smart-wallet/examples/coin-a-joke-app)
- **Hamster Kombat (Telegram mini app):** "300M+ joined since March 26, 2024" is cumulative sign-ups. — [Decrypt](https://decrypt.co/242370/telegram-game-hamster-kombat-300-million-players). Monthly players fell to about 41M by Nov 5, 2024 (−86%), and the rival Paws hit 20.5M users in 8 days. — [Cointelegraph](https://cointelegraph.com/news/hamster-kombat-decline-telegram-game-competition-rise-of-paws). 2.3M users were disqualified for cheating and only about 131M received the airdrop, prompting backlash. — [The Defiant](https://thedefiant.io/news/tokens/hamster-kombat-faces-backlash-for-excluding-57-of-users-from-airdrop). Onboarding lessons: seconds to start inside Telegram, no install or new account, spread through the chat social graph. Notcoin deferred Web3 mechanics until users were engaged. — [GeekChamp](https://geekchamp.com/how-telegram-game-hamster-kombat-got-300-million-users-and-the-ire-of-irans-military/); [Reown](https://reown.com/blog/top-telegram-mini-apps)
- **Spotify Wrapped 2025:** 200M users in 24h and about 500M day-one shares. — [MBW](https://www.musicbusinessworldwide.com/spotify-wrapped-campaign-hit-200m-engaged-users-in-24-hours-a-19-yoy-increase)
- **Duolingo streaks:** 2.4x next-day return at 7 days; freezes add +0.38% DAU. — [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)
- **Baymard:** forced account creation causes 19% of abandonment; extra costs 39%. — [Baymard](https://baymard.com/blog/reduce-cart-abandonment)
- **Airship:** early push → 3x retention. — [Airship](https://www.airship.com/mobile-app-push-notification-benchmarks-for-2026/)

### Inferences
- **Lessons to apply:**
  1. Twitch shows creators will run predictions live, provided creation is fast (chat command or quick action) and refund/cancel is safe.
  2. Kalshi, Polymarket and PrizePicks show "position-linked social" is now table stakes.
  3. Sleeper shows conversation should live on the market screen.
  4. Hamster Kombat shows the Telegram/WhatsApp-style "no install, seconds to first action" pattern for acquisition, and that speculative incentives (airdrops) inflate registrations without retention. Count weekly active predictors, not sign-ups.
  5. Zora's reviews show that cash-out friction is where crypto-social apps lose trust, so the withdraw screen deserves design time.
  6. Spotify Wrapped shows share cards should be designed as content (identity, "who I am"), not receipts.
- **Telegram mini-app as a channel [P]:** Given the Hamster Kombat onboarding evidence, a Telegram mini-app (and a WhatsApp-first link flow) is a plausible low-install entry point for African/Indian fans. The risk is farming and bot accounts: rate-limit, and require phone verification before any real-money payout.

### Gaps
- No primary Twitch, Kalshi, Polymarket or Robinhood metrics on participation, conversion or retention were found.
- No public Fliff/Underdog/PrizePicks share-card or tail-rate metrics.
- No independent YouTube/Instagram poll or quiz sticker engagement benchmarks (only vendor blogs).
- Base App social feature details were not retrieved (search budget exhausted).

---

## 6. Crypto UX abstraction: seed phrases vs embedded wallets; Solana specifics (Phantom embedded wallets, Privy, passkeys, sponsored fees / fee payer)

### Takeaway
Use an embedded wallet created at social or OTP login (Privy, Phantom Connect or Dynamic) and sponsor every transaction fee with Solana's native fee-payer field (optionally through Kora). Fans should never see SOL, a seed phrase or a signing pop-up for $1–$10 trades. The often-cited "70–90% drop-off at wallet creation" figures are vendor claims with no traceable methodology. Present them to stakeholders as directional, not as measured data.

### Cited Findings
**Drop-off evidence (weak, vendor-sourced)**
- Cobo (MPC wallet vendor): "70–90% of potential players drop off at the wallet creation step," with no data source named. — [Cobo](https://www.cobo.com/post/mpc-wallet-as-a-service-web3-gaming)
- ZeroDev (smart-account vendor): 60–90% drop-off at onboarding. — [ZeroDev](https://www.zerodev.app/blogs/stop-losing-90-of-users-deploy-seed-phrase-free-wallets-in-under-10-lines-of-code)
- Spark: embedded wallets claim 5–10x higher onboarding completion than external-wallet connection. — [Spark research](https://www.spark.money/research/embedded-wallet-ux-research). 925 Studios relays a 70% onboarding-loss figure, attributed inconsistently to PatentPC and WEPIN. — [925 Studios](https://www.925studios.co/blog/web3-onboarding-examples-non-crypto-users)
- A 2025 CMU CHI study (as reported by Spark) found only 43% of participants could identify a seed phrase from an image. — [Spark – Seedless wallet design](https://www.spark.money/research/bitcoin-seedless-wallet-recovery-design) (secondary report of the paper)
- Passkeys have their own drop-off: about 29% of users who reach a cross-device passkey QR prompt on Android scan it (Google Authenticate 2025 data, per Corbado/MojoAuth). — [MojoAuth](https://mojoauth.com/blog/cross-device-passkey-qr-flow-where-users-drop-off); [Corbado](https://www.corbado.com/blog/passkeys-growth-hack-tips) (vendor summaries)

**Embedded wallets on Solana**
- Phantom Connect: Google/Apple social login creates a Phantom-managed embedded wallet in a secure environment on the user's device. The app never handles keys. The flow is sign-in → 4-digit PIN → approve limits. There is a default spending limit of $1,000 per app per day, sessions last 7 days, and seedless Phantom wallets upgrade into the embedded wallet. React Native lacks Phantom Login and deep links. It was reportedly live in 50+ apps by Dec 2025. — [Phantom Connect docs](https://docs.phantom.com/phantom-connect); [Phantom FAQ](https://docs.phantom.com/resources/faq)
- Privy powers Pump.fun's email/Google sign-up, which auto-creates a Solana wallet. — [Decrypt](https://decrypt.co/306072/pumpfun-mobile-app-solana-meme-coins). Moonwalk-style apps provision a wallet automatically at sign-up, with no seed phrases or extensions. — Privy case studies via search summary of [Privy onboarding](https://privy.io/onboarding)
- Privy's July 2025 migration guide names Proof of Play, Bags and Paragraph as teams that migrated "in a few hours" (self-reported). — [Privy – Migrating your users](https://privy.io/blog/migrating-your-users-to-privy)

**Gasless / sponsored fees on Solana**
- Solana transactions can name a fee payer other than the user. The sponsor co-signs, so users need no SOL. Production fee sponsorship requires managing sponsor wallets, token conversion (letting users "pay" in USDC), rate limiting and security checks. — [Solana docs – Fee abstraction](https://solana.com/docs/payments/send-payments/payment-processing/fee-abstraction)
- Kora is a JSON-RPC signing service. It validates instructions, co-signs as fee payer, and can accept SPL-token fee payments. It ships a CLI and a TypeScript client (`@solana/kora`). — [Solana – Kora getting started](https://solana.com/docs/tools/kora/getting-started.md); [Dynamic – Sponsored transactions with Kora](https://www.dynamic.xyz/docs/react/wallets/using-wallets/solana/sponsored-transactions-kora)
- One commentator argues Kora closes most of the gasless gap with EVM but lacks smart-account features (multi-key auth, batched calls, session policies). — [BlockEden blog (opinion)](https://blockeden.xyz/blog/2026/04/22/solana-kora-signing-node-fee-relayer-gasless-ux-primitive/)

### Inferences
- **Recommended stack (hackathon):** Privy or Phantom Connect for login plus an embedded Solana wallet; email/phone OTP as the in-webview default; the app backend as fee payer (simplest) or a Kora node; USDC as the only visible asset, labeled "$". For the demo, pre-fund test wallets so judges can bet in 2 taps.
- **Signing UX:** Use no pop-ups for trades under a per-session limit. Phantom's default $1,000/day/app cap and PIN model fits $1–$10 bets. Show "Secured by [provider] · Export wallet" in settings only, giving self-custody for power users without confusing newcomers.
- **Words to hide or translate:** "wallet" → "balance," "USDC" → "$" (with "Dollars (USDC)" in a details drawer), "transaction" → "pick," "sign" → "confirm," "gas" → never shown.
- **Passkeys:** Offer passkeys as an *upgrade* after first trade, in a real browser or native app ("Secure your account with Face ID"). Don't make them the first-login path, given webview unreliability and cross-device QR drop-off.

### Gaps
- I found no rigorous, independently measured study comparing seed-phrase and embedded-wallet onboarding completion. All percentages are vendor marketing.
- Privy/Dynamic/Phantom published case studies with hard conversion numbers were not found (excerpts were truncated).
- Behavior of Privy's or Phantom's embedded wallet iframe inside Instagram/TikTok webviews is untested and undocumented in the sources found.
- Whether the Panta API supports a third-party fee payer, or requires specific signing flows, is unknown.

---

## 7. Accessibility, mobile-first, low-bandwidth (African/Indian Android), localization, dark mode

### Takeaway
Design for a 360px-wide mid-range Android on Android 10–13 with metered data. Handset affordability, not data, is the main barrier in Sub-Saharan Africa, and many users run older devices that can't deliver a well-tuned browsing experience. Keep the landing page tiny and OG images under 300KB. Never encode YES/NO by color alone. Localize currency display (₦, KSh, ₹) even though settlement is in USDC.

### Cited Findings
- GSMA (2025): affordability, mainly of internet-enabled handsets, is the leading barrier to mobile internet adoption in low- and middle-income countries, sharpest in Sub-Saharan Africa. Many users have older devices that can't deliver a well-tuned browsing experience. — [GSMA State of Mobile Internet Connectivity 2025](https://www.gsma.com/somic/wp-content/uploads/2025/11/The-State-of-Mobile-Internet-Connectivity-2025-Affordability-of-Internet-Enabled-Handsets-and-Data.pdf)
- Android version mix: in Nigeria (July 2026), Android 13 ≈ 17.9%, Android 12 ≈ 16.4%, Android 11 ≈ 13.1%, so Android 10–12 is about 39%. Kenya (May 2026) is spread across Android 13–15. — [StatCounter Nigeria](https://gs.statcounter.com/android-version-market-share/mobile-tablet/nigeria); [StatCounter Kenya](https://gs.statcounter.com/os-version-market-share/android/mobile-tablet/kenya/addlibe.com)
- Data cost (2022, Cable.co.uk via Statista): Nigeria $0.71/GB, Kenya $0.84/GB, versus an African average of $3.51/GB. India is among the cheapest. — [Statista](https://statista.com/chart/29144/cost-of-mobile-data-in-africa). In Kenya, 2GB costs about 1.97% of average monthly income. — [Business Daily Africa](https://www.businessdailyafrica.com/bd/economy/kenya-mobile-data-pricing-lowest-among-regional-peers-4731316)
- WhatsApp link previews: Meta says og:image should be <600KB, ≥300px wide, with an aspect ratio of 4:1 or less, and the `<head>` OG tags must be within the first 300KB of HTML. — [Meta – WhatsApp link previews](https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/). Third parties report WhatsApp only shows thumbnails ≤300KB. — [Branch](https://help.branch.io/faq/docs/why-are-some-quick-link-thumbnails-not-shown-in-whatsapp); [Wix](https://support.wix.com/en/article/wix-blog-request-displaying-images-bigger-than-300kb-for-a-blog-post-on-whatsapp)
- Offline/lite patterns exist in these markets, for example YouTube offline saving in India, the Philippines and Indonesia. — [Quartz](https://qz.com/686530/mobile-data-needs-to-get-this-much-cheaper-before-most-of-the-world-can-afford-it)
- Fliff has no browser version (mobile app only). That is the opposite of what link-driven, in-app-browser fans need. — [Gambling.com – Fliff](https://www.gambling.com/us/daily-fantasy/fliff)

### Inferences
- **Performance budget [H]:** Market landing page ≤100KB of JS critical path, server-rendered HTML with OG tags in the first bytes, a ≤300KB OG card (1200×630 JPEG/WebP) and a ≤150KB story card. Lazy-load avatars and keep Lottie/confetti out. Make it a PWA with offline "My picks" cache and retry-safe trade submission (idempotency key), so a flaky connection never double-bets.
- **Tap targets and layout:** YES/NO buttons should be at least 48dp tall and full-width halves in the bottom thumb zone. Support 200% font scaling without truncating the question. (WCAG 2.2's 24×24px target minimum and Android's 48dp guidance are from prior knowledge, not re-verified this session.)
- **Color independence:** YES = ✓ + "YES" + green, NO = ✕ + "NO" + a distinct hue (red or purple), with a colorblind-safe palette. The probability bar shows numeric labels, not just fill.
- **Dark mode:** Default to following the system setting. Use the dark theme for the vertical video feed, and make sure share cards render well on both dark and light story backgrounds.
- **Localization:** Show local-currency equivalents ("$5 ≈ ₦7,800"). Use plain English first, with Pidgin, Swahili, Hindi and Hinglish microcopy as fast-follows. Format numbers and times by locale ("Sun 4:00pm WAT"). Keep question templates translatable with placeholders.
- **Screen readers:** The probability bar's accessible label reads "62 percent chance yes, 38 percent no." The live ticker uses `aria-live="polite"` and is throttled. Countdowns are not announced every second.

### Gaps
- No 2026 data on low-end handset share by tier, or on web performance (page loads) for Nigeria/Kenya/India. Data prices are 2019–2022 vintage.
- India's Android version mix was not retrieved.
- WCAG 2.2 and Material target-size specs were not re-verified this session (search budget exhausted).
- No research found on localization effects (Pidgin/Swahili/Hindi microcopy) on conversion in fintech or betting apps.

---

## 8. Hackathon scope vs credible production vision (what a small team should build)

### Takeaway
For a hackathon, build one creator flow (template + AI wording + share card) and one fan flow (story link → no-login landing → $1/$5/$10 pick → OTP embedded wallet → sponsored transaction → "I picked YES" card), plus a creator dashboard tile and a creator-confirm resolution with an auto-refund timer. Present OAuth verification at scale, the swipe feed, streaks, onramps/offramps and dispute arbitration as the production roadmap.

### Cited Findings
- No-install, seconds-to-first-action onboarding drove Hamster Kombat's acquisition, and deferring Web3 mechanics until users are engaged was Notcoin's onboarding lesson. — [GeekChamp](https://geekchamp.com/how-telegram-game-hamster-kombat-got-300-million-users-and-the-ire-of-irans-military/); [Reown](https://reown.com/blog/top-telegram-mini-apps)
- Embedded-wallet migrations are reportedly achievable "in a few hours" (vendor claim). — [Privy](https://privy.io/blog/migrating-your-users-to-privy)
- Twitch's minimal lifecycle (create, lock, resolve or cancel, 24h auto-refund) is a proven creator-run pattern. — [Twitch Developers](https://dev.twitch.tv/docs/api/predictions/)
- Unanimous-AI auto-resolution with human escalation achieved 97.87% accuracy on 47% of questions in research. — [arXiv 2605.30802](https://arxiv.org/abs/2605.30802)

### Inferences
**Hackathon must-haves (demoable in about 3 minutes):**
1. Creator: Google login → X handle verification (OAuth, or bio-code mock) → template "Will Arsenal beat Chelsea?" → "✨ Improve with AI" fills criteria and source → fee preview → share-card preview → "Share to WhatsApp / IG Story / X."
2. Fan (on a phone, opened from the shared link): card-first landing → tap YES → $5 chip → payout line "Get $8.06 if YES" → email OTP → embedded Solana wallet (pre-funded devnet USDC) → sponsored-fee transaction via the Panta API → calm success → "Share my pick" card.
3. Live elements: ticker ("@ada picked YES $5") and comment list with YES/NO pills.
4. Creator dashboard: volume, fans, claimable fees, and a "Resolve" button with evidence link plus a dispute-window countdown. Show what happens if unresolved: auto-refund after 24h.
5. Responsible-play stub: 18+ checkbox at first trade and a "Play limits" settings screen.

**Production roadmap slide:**
- OAuth for X, TikTok and IG Business, plus bio-code for IG personal accounts.
- Vertical swipe feed and stories bar.
- Onramps (Apple Pay/card) and offramps (M-Pesa/NGN bank via Kotani, Yellow Card or Eversend).
- AI-oracle resolution with dispute arbitration.
- Leaderboards, streaks with freeze, badges and fan tiers.
- Native app for IG Story sticker sharing; Telegram mini-app channel.
- Behavior-triggered limits (Kalshi-style); localization; play-money mode for restricted regions.

**Demo-killer risks to pre-empt:**
- Google login inside the IG/TikTok in-app browser (403): demo in a normal browser, or use email OTP.
- Fee pop-ups: sponsor fees.
- WhatsApp preview not rendering: keep the OG image ≤300KB.
- Creator self-dealing questions from judges: show the "creator can't trade own market" rule and the resolution track record.

### Gaps
- Panta API capabilities (market creation endpoint, liquidity model, fee routing to creators, resolution authority, devnet availability) were not researched here and determine what is real versus mocked in the demo.
- No source found for typical hackathon judging criteria for consumer crypto UX (not researched).
