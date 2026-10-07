# Competitive Landscape & Precedents: Creator-Led / Social Prediction Markets (and Adjacent Crypto Fan-Monetization)

Research date: 2026-10-07. Scope: competitive map + lessons for a creator-led prediction-market app on Solana built on the Panta API (creators create markets, share to WhatsApp/Instagram/TikTok/X, fans trade YES/NO).

Method note for the report writer: WebFetch and direct curl to most news/official sites (panta.market, docs.panta.market, coindesk.com, blockworks.com, medium.com, kucoin.com, blog.variant.fund) were blocked by the sandbox egress proxy in this session, and the shared web-search budget ran out partway through. Findings below therefore come from search-engine result syntheses (which quote the underlying pages) plus GitHub repository search. Each claim carries the URL of the underlying page, but most pages were not read in full, so numbers should be spot-checked before publication. Third-party/aggregator sources are flagged as such.

## 1. Major prediction markets (Polymarket, Kalshi): scale, creator/influencer distribution, social features

### Takeaway
Polymarket and Kalshi are now very large (combined industry notional ~$43.7B/month by June 2026; Kalshi valued at $22B), but they treat creators as paid promoters (up to ~$500/post plus referral/revenue share), not as market owners. Both shipped a social layer in 2026 (Kalshi Social with feeds, follows, Inner Circles, leaderboards and Threads share cards; Polymarket comments, profiles and "Squads" group chats), and both are under pressure from platform ad rules (X), states and disclosure scandals over creator promotion.

### Cited Findings

**Scale / volumes (label: dates matter; sources disagree on metric definitions)**
- Industry: combined prediction-market monthly notional volume crossed $43.7B in June 2026 (CoinShares report, July 2026) — [Solana Compass](https://solanacompass.com/news/prediction-market-monthly-volume-surged-to-437b-by-june-as-solana-earns-14mmonth)
- Bernstein forecast total prediction-market volume of $240B in 2026 — [Bitcoin Foundation (Limitless article)](https://bitcoinfoundation.org/news/prediction-markets/prediction-market-limitless-volume-base/)
- Polymarket International: peak of $10.5B in March 2026 (Dune data), ~$9B April, just under $7.1B in May 2026 — volume fell two months in a row — [CNBC, Jun 10 2026](https://www.cnbc.com/2026/06/10/polymarkets-volume-falls-again-in-may.html)
- DeFi Rate tracker names June 2026 the busiest Polymarket month at $11.3B notional ($4.4B cash actually paid) — illustrates the notional vs. cash-paid gap — [DeFi Rate](https://defirate.com/prediction-markets/volume/polymarket/)
- Polymarket monthly active users hit a record ~688K (Feb/Mar 2026, Token Terminal/CoinDesk) — [Phemex](https://phemex.com/news/article/polymarket-achieves-record-688k-monthly-active-users-61052); [Bitget](https://www.bitget.com/news/detail/12560605204040). CNBC reports monthly participants >780K in March, slumping to <650K in May 2026 — [CNBC](https://www.cnbc.com/2026/06/10/polymarkets-volume-falls-again-in-may.html)
- Polymarket US app launched Dec 2–3, 2025 (iOS, waitlist-only, sports-first) after acquiring CFTC-licensed QCEX and receiving a CFTC no-action letter — [CoinDesk, Dec 3 2025](https://www.coindesk.com/markets/2025/12/03/polymarket-launches-app-with-cftc-green-light-in-u-s-return); [Finance Magnates](https://www.financemagnates.com/forex/polymarket-rolls-out-us-mobile-app-after-cftc-green-light-starting-with-sports-events/)
- Polymarket US removed its waitlist in May 2026 — [Covers, May 12 2026](https://www.covers.com/industry/polymarket-removes-waitlist-launches-for-american-ios-users-may-12-2026)
- Polymarket US April 2026 volume $1.3B vs. $9B on International — [Pew Research, May 27 2026](https://www.pewresearch.org/short-reads/2026/05/27/trading-volume-on-prediction-markets-has-soared-in-recent-months/)
- Polymarket US Sept 2026: $8.8B in contracts ($2.8B in dollars paid), 12% of prediction-market volume, 94.1% sports — [DeFi Rate (Polymarket US tracker)](https://defirate.com/prediction-markets/volume/polymarket-us/)
- Polymarket spokesperson: 30 days to June 3, 2026 saw 86% growth in US new users and 73% in active new traders — [CNBC](https://www.cnbc.com/2026/06/10/polymarkets-volume-falls-again-in-may.html)
- Polymarket's 2022 CFTC settlement ($1.4M) for unregistered event contracts preceded the US relaunch — [Finance Magnates](https://www.financemagnates.com/forex/polymarket-rolls-out-us-mobile-app-after-cftc-green-light-starting-with-sports-events/)
- Kalshi: $1B Series F led by Coatue in May 2026 at a $22B valuation (≈2x the ~$11B mark five months earlier) — [Sacra](https://sacra.com/c/kalshi/); [KuCoin blog](https://www.kucoin.com/blog/kalshi-surpasses-polymarket-in-global-trading-volume-with-22b-valuation-what-does-it-mean)
- Kalshi 2025 full-year volume ~$22.9–23.8B with ~$260M fee revenue (sources differ) — [Arkham research](https://info.arkm.com/research/polymarket-vs-kalshi-how-the-worlds-two-biggest-prediction-markets-compare); [Sacra](https://sacra.com/c/kalshi/)
- Kalshi monthly volume grew from $226M (Dec 2024) to $6.6B (Dec 2025) to ~$29.2B (June 2026); sports ≈80% of fee-generating volume in June 2026 — [Sacra](https://sacra.com/c/kalshi/)
- Kalshi passed $100B lifetime trading volume in June 2026 — [TechTimes](https://www.techtimes.com/articles/319560/20260702/prediction-market-world-launches-phantom-chainlink-oracles-auto-settle-solana-trades.htm)
- Kalshi does not publicly disclose active trader/user counts — [Finance Magnates](https://www.financemagnates.com/forex/why-robinhood-cant-ditch-kalshi-yet-despite-owning-its-own-exchange/)

**Distribution partnerships**
- Robinhood began offering Kalshi markets March 2025; the two split a 2¢/contract fee (≈$10M Robinhood revenue in Q2 2025); Piper Sandler estimated Robinhood at 25–35% of Kalshi daily volume (Oct); Robinhood bought MIAXdx (closed Jan 20, 2026; rebranded Rothera Exchange) to run its own exchange — [Finance Magnates](https://www.financemagnates.com/forex/why-robinhood-cant-ditch-kalshi-yet-despite-owning-its-own-exchange/); [DeFi Rate](https://defirate.com/news/how-robinhoods-miax-plans-could-impact-kalshi/)
- Coinbase began offering Kalshi markets in January 2026; Kalshi Pro (beta) launched as a direct trading terminal — [Yahoo Finance](https://finance.yahoo.com/markets/options/articles/kalshi-pro-launches-robinhood-plans-190253270.html)
- Kalshi went onchain on Solana with tokenized predictions starting Dec 2, 2025 (DFlow execution) — [Kalshi News](https://news.kalshi.com/p/kalshi-solana-tokenized-predictions)
- X named Polymarket its "Official Prediction Market Partner" (June 2025); the first joint product shows Grok annotations and relevant X posts explaining market moves next to Polymarket odds; xAI hinted at more integrations — [Bloomberg](https://www.bloomberg.com/news/articles/2025-06-06/musk-s-x-selects-polymarket-as-prediction-market-partner); [Social Media Today](https://www.socialmediatoday.com/news/x-formerly-twitter-launches-partnership-polymarket-predictions/750380/); [Bitcoin.com](https://news.bitcoin.com/polymarket-elon-musks-x-announce-prediction-market-partnership/)

**How they use creators/influencers**
- Former partnership staff told NPR both Kalshi and Polymarket offered creators up to $500 per post; in June 2026 Kalshi barred affiliates from questioning election integrity after NPR flagged paid posts; the "paid partnership" label appears in small font — [NPR, Jun 7 2026](https://www.npr.org/2026/06/07/nx-s1-5846806/kalshi-polymarket-influencers-california-election)
- Third-party trackers: CreatorDB counts 364 Kalshi-sponsored partners, 4.4K sponsored posts, 223.2M views — [CreatorDB](https://creatordb.app/brands/kalshi.com); SponsorRadar counts 132 YouTube creators / 1,235+ deals — [SponsorRadar](https://sponsorradar.com/brands/kalshi); Modash lists 25 sponsored creators (Jun 2026) — [Modash](https://www.modash.io/content-library/brands/kalshi-examples/influencers)
- Secondary marketing analysis: Kalshi's program dates to 2022, pays up to $500/post plus revenue share and $25 user referral credits (unverified against Kalshi) — [Luv Kaizen](https://www.luvkaizen.com/blogs/kalshi-marketing-playbook)
- Analysis argues Kalshi and Polymarket "have turned influencer marketing (meme pages + influencers) into their primary growth engine" — [Fintech Growth Insider](https://www.fintechgrowthinsider.com/p/prediction-markets-bet-on-influencers)
- X tightened ad policy on paid gambling partnerships; Kalshi's affiliate badges disappeared from X; X's product chief warned accounts to disclose paid Kalshi promotion or face suspension (early 2026) — [The Block](https://www.theblock.co/post/390983/kalshi-removes-x-affiliate-badges-after-policy-shift-tightens-promotion-rules); [Affiverse](https://www.affiversemedia.com/kalshi-pulls-affiliate-badges-from-x-as-platform-tightens-gambling-promotion-rules/)
- Kalshi's 2025 "student ambassadors" campus program was pulled after backlash — [Wikipedia: Kalshi](https://en.wikipedia.org/wiki/Kalshi)
- Brand-safety incidents: Kalshi paid an affiliate social account that posted anti-Muslim/anti-Black content — [Sportico](https://www.sportico.com/business/sports-betting/2026/kalshi-anti-muslim-anti-black-posts-social-media-affiliate-1234940266/); Kalshi allegedly reused a YouTuber's video as an AI-altered ad without credit/compensation — [Protos](https://protos.com/kalshis-ai-ad-turned-an-asian-youtuber-into-a-white-dude/); [Yahoo Finance](https://finance.yahoo.com/media-advertising/articles/kalshi-appears-mimicked-content-creator-123025681.html)
- Polymarket Builders Program (Nov 2025): $1M+ for grants/rewards; builder codes attribute routed volume; developer-set builder fees on maker/taker orders; tiers (Unverified 100 tx/day, Verified 10K/day, Partner unlimited — third-party); builder-attributed volume grew from ~$100M (Nov 2025) to $600M+ (Mar 2026) — [Polymarket Devs on X](https://x.com/PolymarketBuild/status/1984636606330880192); [Polymart guide](https://polymart.app/blog/polymarket-builders-program); [botforkalshi guide](https://www.botforkalshi.com/blog/polymarket-builder-program-guide)
- Polymarket Referral Program (terms effective May 28, 2026): 10% of net trading fees on direct referrals, 5% indirect, paid daily in pUSD; requires $10,000 lifetime trading volume to earn — [Polymarket Docs](https://docs.polymarket.com/programs/referral-program). Third-party sites claim 30%/10% (likely outdated) — [pm.wiki](https://pm.wiki/learn/polymarket-referral-program)
- Polymarket US separately runs a $25-for-both refer-a-friend credit (affiliate-site claim) — [iGaming Future](https://igamingfuture.com/prediction-markets/news/polymarket-referral-code/)

**Social features shipped**
- Kalshi: Threads share button auto-embeds the market's price chart into a Threads post (Mar 10, 2026) — [TechCrunch](https://techcrunch.com/2026/03/10/in-a-vote-of-confidence-for-metas-threads-kalshi-adds-sharing-feature/)
- Kalshi Social on mobile (Apr 24, 2026): personalized For You feed, follow traders + get notified when they move, "Inner Circle" to share trades with close friends, every user gets a Social profile by default (private is one tap) — [Kalshi Crypto on X](https://x.com/Kalshi_Crypto/status/2047721899430482398?lang=en); [Prediction News on X](https://x.com/PredictionNews_/status/2047754663647408224)
- Kalshi help center (Jul 2026): Social tab with Feed / Following / Leaderboard; 800-char posts; threaded comments with GIFs; like/bookmark/share via device share sheet — [Kalshi Help](https://help.kalshi.com/en/articles/15891130-how-do-i-post-comment-and-react-on-kalshi-social). Kalshi's public trade feed stays anonymous (not linked to profiles) — [botforkalshi](https://www.botforkalshi.com/blog/kalshi-copy-trading)
- Polymarket: market comments carry an attached profile object (bio, positions) per API docs — [Polymarket Docs: comments](https://docs.polymarket.com/api-reference/comments/list-comments); profile search API — [Polymarket Docs: search](https://docs.polymarket.com/api-reference/search/search-markets-events-and-profiles)
- Polymarket "Squads" (Sept 2026, US app): space for friends to discuss markets, share picks, trade together — [Prediction News](https://predictionnews.com/story/polymarket-launches-squads-a-social-group-chat-feature-for-prediction-markets); [KuCoin flash](https://www.kucoin.com/news/flash/polymarket-launches-in-app-social-feature-squads)
- Polymarket Trust & Safety Center (Sept 30, 2026) covers moderation of market comments, chat, Squads, profiles and Discord — [PR Newswire](https://www.prnewswire.com/news-releases/polymarket-launches-new-user-protections-and-trust--safety-program-302894374.html)
- Third-party apps fill Polymarket's social gaps, e.g. "Share" (share transactions, follow wallets) and Polycule (Telegram group trading) — [Polymark.et: Share](https://polymark.et/product/share); [Polymark.et: Polycule](https://polymark.et/product/polycule)
- Polymarket's own X account is a de-facto media property (e.g., "NEW POLYMARKET: Grok 4.6 released by…?" posts with % odds) — [Polymarket on X](https://x.com/Polymarket/status/2085294306600911039)

### Inferences
- The incumbents' creator model is "rent the creator's audience" (pay-per-post + referral %), which leaves the creator with no ownership of the market, no recurring fee stream tied to their own content, and reputational/disclosure risk. A creator-owned-market product (creator earns a % of every trade on markets they made) is structurally different from what Kalshi/Polymarket offer.
- The incumbents' 2026 social features converge on: profiles, follow + alerts, small private groups (Inner Circle / Squads), leaderboards, comments, and one-tap share cards with live odds charts. These are now table stakes; an MVP should ship at least a share card with live odds and a per-market comment/holders view.
- Incumbent volume is ~80–94% sports (Kalshi, Polymarket US) — creators' non-sports, audience-specific questions (e.g., "Will X hit 1M subs by…") are a long tail incumbents do not list.
- Platform policy (X gambling-ad rules, disclosure enforcement, election-content rules) is a real distribution constraint for any creator who promotes real-money markets.

### Gaps
- No official Polymarket/Kalshi user counts after mid-2026; no official Polymarket embed/widget program found (search found none; unverified whether market-page embeds still exist).
- Could not verify details of Polymarket's share/PnL cards, "Top Holders" tab or leaderboards from primary sources this session (search budget exhausted). Background knowledge (unverified this session): Polymarket market pages show top holders and a leaderboard, and users share position/PnL images on X.
- Could not confirm Polymarket's ICE investment/valuation or POLY token/airdrop plans this session (background knowledge only: ICE strategic investment reported Oct 2025; token publicly hinted late 2025).
- No disclosed data on what share of incumbents' new users come from influencer posts.

## 2. Permissionless / user-created / social prediction markets (incl. Solana apps, Telegram bots, Farcaster/Base mini-apps, creator-focused launches 2025–2026)

### Takeaway
A wave of "user-generated" and "creator" prediction markets launched 2025–2026 (XO Market, Melee, Myriad, Kash, Fliq, Panta, TBD), all promising creators a cut of fees (typically up to 20% of protocol fees or 0–1% of volume). Verified traction is modest outside a few (XO: ~$420M cumulative self-reported; Myriad: $600M+ claimed vs. $234M on DefiLlama), and most of the very large "volume" numbers in the long tail were points/airdrop-farmed (Opinion). Manifold proves user-created markets drive engagement, but its real-money experiment failed and play-money liquidity outside top markets is thin.

### Cited Findings

**Competitive map (creator/user-created focus)**

| Product | Chain / status | Creator model | Traction (date, source quality) |
|---|---|---|---|
| XO Market | Own chain/L1 not confirmed; mainnet beta mid-Nov 2025 | Anyone (individuals/companies) creates markets, sets params & fees; creators earn 0–1% of trading fees (guide); creation once gated by "Catalyst badge" (500 conviction pts, 1 market per 7 days) | Apr 2026: >$150M volume, >30K users, >600 user-created markets; Jul 2026 (self-reported): ~49K users, 1,400+ markets, ~$420M cumulative — [CoinDesk](https://www.coindesk.com/business/2026/04/30/xo-market-bets-on-user-generated-prediction-markets-to-rival-polymarket-and-kalshi); [PredictionTalk](https://predictiontalk.org/platforms/xo-market/); [Blocmates](https://www.blocmates.com/articles/xo-market-transforming-predictions-into-conviction-backed-markets) |
| Melee | Solana; "Beta is live"; phased (Phase 2 = creator templates, Phase 3 = fully permissionless) | "Viral Markets": creators keep up to 20% of fees; planned Creator Score; weekly ranking by volume & unique traders with limited badges | No verified platform volume; homepage shows one market at 15.87M "volume"/7,842 traders (illustrative) — [CoinDesk](https://www.coindesk.com/business/2025/09/24/melee-raises-usd3-5m-to-launch-viral-prediction-markets-without-gatekeepers); [melee.markets](https://www.melee.markets/); [iq.wiki](https://iq.wiki/wiki/melee); [KuCoin](https://www.kucoin.com/news/insight/BTC/6abefddb38a26400079225b7) |
| Myriad (Decrypt/Rug Radio/DASTAN) | Multi-chain (USD1 markets on BNB; in Trust Wallet); announced a Solana "Information Exchange" + MYR token rollout ahead of Breakpoint 2026 | Markets embedded inside Decrypt articles (media-embedded distribution) | Sep 2025: $10M USDC vol, 511K users; Nov 2025: $100M, 400K+ active traders; Sep 30 2026 claim: $600M+; DefiLlama: $234M cumulative, $2.42M last 30d — [Decrypt](https://decrypt.co/337489/myriad-hits-10m-usdc-trading-volume-as-prediction-markets-become-new-segment-of-defi); [Chainwire](https://chainwire.org/2025/11/24/myriad-achieves-100m-in-trading-volume-accelerating-prediction-markets-10x-in-just-3-months/); [Solana Compass](https://solanacompass.com/news/decrypt-and-myriad-announce-the-information-exchange-on-solana-ahead-of-breakpoint); [DefiLlama](https://defillama.com/protocol/myriad-markets) |
| Kash | Base; @kash_bot on X | Turns X posts into live markets via bot replies; AI-powered | $2M pre-seed; pre-testnet simulation on X — [Betting Startups](https://news.bettingstartups.com/p/kash-2m-raise-prediction-markets-social-media-feeds); [app.kash.bot](https://app.kash.bot/) |
| Fliq by EthosX | Aptos; web app retired, trading moved to Telegram bot | Integration with Stan creator platform: "370k+ creators and 30M+ users" can create and trade markets | No volume found — [fliq.one](https://www.fliq.one/); [Aptos Foundation](https://aptosfoundation.org/ecosystem/project/fliq-by-ethosx); [Fliq on X](https://x.com/predictonfliq?lang=en); [Medium](https://medium.com/@Fliq_Predictions/why-we-built-fliq-and-why-were-finally-ready-for-the-world-f1e90651b663) |
| Fliq (fliq.live) | Solana, $FLIQ token | Swipe YES/NO, results in minutes; community-submitted markets, head-to-head lobbies, "creator seasons" are roadmap only | None found — [fliq.live](https://fliq.live/) |
| Panta | Solana, live Jun 13 2026 | Permissionless creation; creator gets 20% of protocol fees (see §5) | No public stats found — [Toria on X](https://x.com/toria_dickson/status/2065826739410927625) |
| TBD | Solana | "Verified human opinion" protocol, ex-dYdX founders | $3M seed (CMT Digital, ParaFi) — [The Block](https://www.theblock.co/post/391253/solana-based-tbd-a-prediction-market-protocol-for-verified-human-opinion-raises-3-million) |
| Truemarkets | Base; launched Mar 11 2025 with $TRUE | News/headline markets; Uniswap v3 onchain settlement | No traction data — [CoinGape](https://coingape.com/block-of-fame/pulse/truemarkets-officially-launches-as-a-decentralized-prediction-market/); [Guardian on X](https://x.com/GuardianAudits/status/1900230489262481755) |
| Manifold | Play money (Mana) | Fully user-created markets; creators resolve | Real-money Sweepcash shut Mar 28 2025 — see below |

- XO Market raised a $6M seed (Coinbase Ventures, 20VC, Picus Capital, Venture Together, angel Pat Cummins), announced Apr 30, 2026; co-founder Ali Habbabeh argues Polymarket/Kalshi won't copy user-generated markets because they'd need market makers to provide liquidity for thousands of events — [CoinDesk](https://www.coindesk.com/business/2026/04/30/xo-market-bets-on-user-generated-prediction-markets-to-rival-polymarket-and-kalshi); [Yogonet](https://www.yogonet.com/international/news/2026/05/01/119036-xo-market-raises-6-million-bets-on-usergenerated-prediction-markets)
- XO investor newsletter: fiat onramps live Mar 2026, parlays launched, XO Vaults (open market making) "coming soon"; ~6 months post-launch 33K users, 930+ markets, 2.4M txs, $280M volume — [Alexandre Dewez Substack](https://alexandre.substack.com/p/backing-xo-market). Investor claim: "creators can get a cut to promote organic virality… Millions in daily volume pre-launch" — [Mik Attisani on X](https://x.com/Mattisani/status/2049802649814364513)
- Melee: $3.5M led by Variant (with DBA + angels), Sept 24, 2025; pitch is "Viral Markets" where market popularity grows organically rather than top-down listing; streamers/podcasters can attach markets to content (e.g., a game's release date) — [CoinDesk](https://www.coindesk.com/business/2025/09/24/melee-raises-usd3-5m-to-launch-viral-prediction-markets-without-gatekeepers); [Variant blog](https://blog.variant.fund/investing-in-melee-markets-permissionless-prediction-markets-with-uncapped-upside); [ChainCatcher](https://www.chaincatcher.com/en/article/2208752). Pre-launch "Melee Score" task/points system — [Solana Compass](https://solanacompass.com/projects/melee-markets); called "alpha" in Jan/Feb 2026 review — [CoinCodeCap](https://coincodecap.com/melee-review)
- Myriad timeline: public beta at Art Basel Miami (Dec 2024) — [Decrypt](https://decrypt.co/295118/decrypt-rug-radio-launch-myriad-public-beta); USDC markets (2025) — [Decrypt](https://decrypt.co/308896/prediction-market-myriad-launches-usdc-markets); embedded markets inside Decrypt stories — [Decrypt](https://decrypt.co/312419/decrypt-officially-integrates-myriad-markets-on-site); USD1 markets on BNB (Jan 14, 2026) — [Chainwire](https://chainwire.org/2026/01/14/myriad-launches-first-prediction-market-using-world-liberty-financial-stablecoin-usd1/); Trust Wallet integration — [Cryptopolitan](https://www.cryptopolitan.com/myriad-trust-wallet-prediction-market/); seed round Mar 2026 (MoonPay, Walrus, Tom Lee) — [Yahoo Finance](https://finance.yahoo.com/markets/crypto/articles/prediction-market-myriad-closes-milestone-162400075.html); combined Decrypt/Rug Radio reach ~1.6M monthly uniques — [Solana Compass](https://solanacompass.com/news/decrypt-and-myriad-announce-the-information-exchange-on-solana-ahead-of-breakpoint)
- Manifold: Sweepcash (real-money sweepstakes) launched Sept 2024, shut Mar 28, 2025 because it "haven't met our usage goals" and was "drawing focus away from building out the core platform"; Manifold said it wants "to double-down on the user-created markets that make Manifold unique"; it resolved remaining markets early because resolving at a future date's probability "could enable market manipulation" — [Manifold News](https://news.manifold.markets/p/focusing-on-mana-bringing-sweepstakes); [Wikipedia](https://en.wikipedia.org/wiki/Manifold_(prediction_market))
- Manifold reviews: real-money markets had to be resolved by the platform, not creators (dispute/fraud exposure); resolution quality varies across user-created markets; liquidity outside top political/AI markets is thin — [CryptoSlate review](https://cryptoslate.com/prediction-markets/manifold-predictions-review/); [Interexy](https://interexy.com/how-to-develop-platform-like-manifold-markets)

**Other on-chain/long-tail venues (non-creator but relevant)**
- Limitless (Base): crossed $1B monthly notional in early 2026 (from ~$360M in Q1); ~$2B/month by June 2026 (secondhand, citing The Block); LMTS token Oct 2025; ~85.37M LMTS unlock Apr 22, 2026 (~65% of circulating); closed to US, applied for CFTC DCM May 2026 — [Bitget](https://www.bitget.com/news/detail/12560605465005); [Bitcoin Foundation](https://bitcoinfoundation.org/news/prediction-markets/prediction-market-limitless-volume-base/); [pm.wiki](https://pm.wiki/projects/limitless-exchange); [CoinMarketCap](https://coinmarketcap.com/cmc-ai/limitless-lmts/latest-updates/)
- Opinion (Opinion Labs, BNB Chain): mainnet Oct 23, 2025; $8.08B notional in Jan 2026 (~31% of tracked industry); DeFi Rate flagged 13–25x larger average trade sizes and one week with 53% more volume than Polymarket on 19x fewer transactions, consistent with airdrop/points farming — [DeFi Rate](https://defirate.com/news/opinion-hits-8b-in-monthly-prediction-market-volume-but-the-data-raises-questions/)
- Novig: CFTC DCM for Ludlow Exchange (Jun 16) and nationwide sports prediction market launch Aug 4 (year per source; verify); ~$125M notional in week one; 21+ age gate; suing five states — [Finance Magnates](https://www.financemagnates.com/fintech/novigs-prediction-market-launch-beat-kalshis-its-legal-fight-is-just-starting/); [Casino.org](https://www.casino.org/news/prediction-markets-novig-launches-nationwide/)
- Football.fun (Base; now Sport.fun): record $14.85M daily volume Aug 24, 2025; player-share market value peaked ~$150M then ~$100M; >$58M total volume and $6.2M revenue (Jun 2026); FUN token −85% from Jan 16, 2026 ATH — [Phemex](https://phemex.com/news/article/football-fun-game-on-base-network-reaches-1485m-trading-volume_16074); [PANews](https://panews.io/articles/ec85a7c7-0f77-4498-b394-7efbdf6bedb5); [games.gg](https://games.gg/news/football-fun-packs-sell-out-in-seconds/); [Cryptorank](https://cryptorank.io/price/football-fun); [Bankless](https://www.bankless.com/read/sportfun-ico)

**Solana prediction-market ecosystem**
- Phantom launched prediction markets Dec 2025 with Kalshi (DFlow execution); >98% of DFlow volume came via Phantom; from Jun 1, 2026 Phantom's markets moved to World Prediction Markets protocol (Chainlink auto-settlement); public debut Jul 1, 2026 to Phantom's ~20M users; no funding/token disclosed; US regulatory status unclear — [Solana Floor](https://solanafloor.com/news/prediction-markets-on-solana-28-6-m-in-early-onchain-volume-across-jupiter-and-d-flow); [Solana Compass](https://solanacompass.com/news/phantoms-disclosure-page-reveals-world-prediction-markets-as-its-solana-infrastructure-provider); [TechTimes](https://www.techtimes.com/articles/319560/20260702/prediction-market-world-launches-phantom-chainlink-oracles-auto-settle-solana-trades.htm); [The Block](https://www.theblock.co/post/406900/solana-based-prediction-market-app-on-phantom-wallet-launches)
- Early Solana onchain prediction volume across Jupiter and DFlow: $28.6M (DFlow $22.4M) from mid-Dec 2025 — [Solana Floor](https://solanafloor.com/news/prediction-markets-on-solana-28-6-m-in-early-onchain-volume-across-jupiter-and-d-flow)
- Jupiter: prediction beta with Kalshi Oct 2025; Polymarket integration Feb 2026; ~$5.3M volume in April 2026 and ~$17M total; "Forecast" native 15-min BTC markets via proprietary AMM (Jun 2026) — [CoinMarketCap Academy](https://coinmarketcap.com/academy/article/jupiter-prediction-market-beta-launches-on-solana); [Crypto Times](https://www.cryptotimes.io/2026/06/05/jupiter-unveils-forecast-to-power-solana-prediction-markets/)
- Solana's official X account (2026) promoted new Solana prediction markets: pascal (invite beta), Predictefy (public beta), YeNoMarkets (Yes/No sports/crypto/culture), Yosoku (5x leverage), and others — [Solana on X](https://x.com/solana/status/2072746350467600572)
- Drift launched BET (prediction markets) on Solana (2024) — [The Block](https://www.theblock.co/post/311888/solana-based-drift-protocol-launches-prediction-market)

**Telegram-bot prediction markets**
- Jupiter launched a prediction-market Telegram bot (Apr 23, 2026) with "Clans" (team up, discuss, social competition); waitlist; fees waived for early users' first month — [Crypto Times](https://www.cryptotimes.io/2026/04/23/jupiter-launches-prediction-markets-bot-on-telegram-with-clans-feature/); [PANews](https://www.panewslab.com/en/articles/019db82f-48f3-7209-82b2-da36f86d22fb)
- Polycule (Telegram bot for Polymarket incl. group trading) went offline after a January 2026 security incident; a May 2026 guide lists six Polymarket Telegram bots (PolyGun, PolyCop, PolyBot etc.), mostly execution/tracking — [Dropstab](https://news.dropstab.com/research/polymarket-telegram-bot); [Polymark.et](https://polymark.et/product/polycule)
- Fliq (EthosX) retired its web app and moved trading to a Telegram bot — [fliq.one](https://www.fliq.one/)

**Farcaster / Base mini-apps**
- Bracket: live sports markets as a Farcaster Mini App, self-described "social application" — [FinanceFeeds](https://financefeeds.com/5-most-innovative-farcaster-frames-v2-driving-consumer-web3-engagement/)
- Vendor audit (Q1 2026): typical Farcaster mini app week-4 WAU cohort 287 vs top quartile 4,200 (14.6x gap); wallet-side distribution (Warpcast + Coinbase Wallet + Base App) is one of six loops — [FORKOFF](https://forkoff.xyz/blog/ecosystem/farcaster-mini-apps-distribution-2026) (vendor blog; weigh accordingly)
- Base stepped back from onchain social in 2026 (removed social feed and Creator Rewards in Feb 2026) — [BeInCrypto](https://beincrypto.com/jesse-pollak-base-zora-social-bet/)

**Colosseum hackathon precedents**
- Cypherpunk (Fall 2025): 1,576 final projects, 9,000+ participants; Consumer Track 1st prize ($25K) went to Capitola (prediction-market meta-aggregator); Fora (group-chat based trading platform + prediction market protocol) also placed — [Colosseum blog](https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/)
- Colosseum's Cypherpunk RFPs explicitly listed permissionless prediction markets — [Colosseum Codex](https://blog.colosseum.com/cypherpunk-hackathon-project-rfps-prediction-markets/)
- Frontier (Apr 6–May 11, 2026; ~2,857 submissions, 10,000+ participants; Grand Champion CrowdBrain): prediction-market projects in the Top 25 included Bench (opportunity markets revealed only to the market creator), Mentioned (mention markets on word choices in media), Senthos (structured products on prediction flow) — [Colosseum blog](https://blog.colosseum.com/announcing-the-winners-of-the-solana-frontier-hackathon/); [Solana Compass](https://solanacompass.com/news/colosseum-announces-26-winners-of-the-solana-frontier-hackathon-the-largest-crypto-hackathon-ever)

### Inferences
- The creator-fee primitive (creator earns 20% of protocol fees / 0–1% of volume) is already common (XO, Melee, Panta); it is not by itself a differentiator. Differentiation must come from distribution to non-crypto audiences and from trust/resolution UX.
- Media-embedded markets (Myriad in Decrypt) and bot-in-feed markets (Kash on X, Jupiter/Fliq on Telegram) are the closest precedents to "creator shares a market link to their audience"; none targets WhatsApp/Instagram/TikTok link-in-bio flows.
- Fliq's Stan integration (370K+ creators) is the most direct precedent for creator-platform-led market creation; lack of reported traction suggests creator access alone does not create volume.
- Headline "volume" in permissionless/long-tail venues is unreliable (Opinion, Polymarket wash trading) — judges and users increasingly discount it; unique traders and repeat traders per market are more credible traction metrics.
- Colosseum judges have rewarded prediction-market infra/aggregators and social/group-chat trading (Capitola, Fora) — a consumer creator app with real users fits the Consumer Track pattern.

### Gaps
- Could not research (search budget exhausted): Hedgehog Markets current status, Triad, Zeitgeist, Augur legacy, PredictIt, Thales/Overtime, Polymarket-style Solana apps beyond those listed, and Base mini-app prediction markets other than Bracket. Background knowledge (unverified this session): Hedgehog pivoted/wound down its prediction product; Augur v1/v2 suffered from low liquidity, slow (week-long) resolutions and ambiguous/unsavory user-created markets; PredictIt operates with an $850-per-contract cap under CFTC scrutiny; Zeitgeist (Polkadot) saw minimal adoption; Thales/Overtime focused on sports AMMs.
- XO Market's chain and resolution mechanism not confirmed in sources read.
- No verified Melee, Kash, Fliq or Panta platform-level volume/user data.
- Novig's launch year not explicit in snippet (likely 2025 or 2026; verify).

## 3. Solana Blinks/Actions for betting/prediction markets on X

### Takeaway
Blinks were used for prediction-market betting on X (Hedgehog, mid-2024), but adoption stalled on discoverability: they render only for users with a supporting wallet extension on desktop and only for registry-approved Actions, so they do not work in WhatsApp/Instagram/TikTok or most mobile X sessions. No usage numbers for betting Blinks were found.

### Cited Findings
- Hedgehog added Blinks so users could place prediction-market bets directly on X ("bet right on the timeline") — [Bitget](https://www.bitget.com/news/detail/12560604070338); [XY Finance guide](https://blog.xy.finance/what-is-solana-blink/)
- Blockworks: Blinks "struggling with discoverability on X," not yet part of users' scrolling habits; prediction-market bets were among the small actions that existed; Multicoin's JR Reed argued Blinks suit quick actions more than trades where slippage/order type matters — [Blockworks](https://blockworks.com/news/lightspeed-newsletter-solana-blinks-twitter)
- On X, the Phantom extension renders an Action into an in-timeline transaction UI only for Actions registered in Dialect's Actions Registry; without the extension the link falls back to a normal webpage link — [Phantom docs](https://docs.phantom.com/developer-powertools/solana-actions-and-blinks); [Solana Compass](https://solanacompass.com/learn/Validated/blinks-and-actions-w-jon-wong-solana-foundation-and-chris-osborn-dialect)
- Curated Blink examples/ideas list — [awesome-blinks (GitHub)](https://github.com/solana-developers/awesome-blinks)
- Panta sidetrack entry "Pot" already combines Telegram-group prediction markets with Solana Blinks — [GitHub: Baheet18/pot](https://github.com/Baheet18/pot)

### Inferences
- For a creator sharing to WhatsApp/IG/TikTok, a Blink is at best a secondary path; the primary share artifact should be a fast mobile web link with a rich Open Graph preview image (live odds, question, creator avatar) that opens into an embedded-wallet checkout. A Blink-compatible endpoint can be offered additionally for crypto-native X users at little extra cost.
- Simple binary YES/NO with fixed small stake sizes (the Panta parimutuel model has no slippage/order types) is the kind of "quick action" Blinks suit best.

### Gaps
- No quantitative results (bets placed, conversion) for any prediction-market Blink; no 2025–2026 confirmation that Hedgehog Blinks still render or that X still unfurls Blinks for mainstream users.

## 4. Adjacent creator-monetization crypto products: what drove spikes, what killed retention

### Takeaway
Every creator-token/SocialFi wave (friend.tech 2023–24, Zora/Base creator coins 2025–26, Pump.fun streamers 2025, Believe 2025, Football.fun 2025) spiked on speculation plus new fee-share mechanics and then lost 90–99%+ of activity within weeks to months. Retention died when (a) the only reason to participate was price speculation, (b) token prices fell and creators stopped showing up, (c) incentive/fee changes or supply changes broke trust, and (d) the product stopped shipping. Fan-token incumbents (Socios) kept partner revenue but token prices collapsed ~96–98%.

### Cited Findings

**friend.tech (Base, Aug 2023 → Sept 2024)**
- Generated ~$90M in fees in about a year (half to the team); daily fees fell from ~$2M peak to <$100; daily new users fell to single digits; FRIEND token −98% since May 2024 launch — [DL News](https://www.dlnews.com/articles/defi/friend-tech-shuts-down-after-revenue-and-users-plummet/)
- Creators walked away with ~$44M; on Sept 8, 2024 the team moved contract admin/ownership to a null address (protocol immutable, no further fee changes) — [Yahoo Finance](https://finance.yahoo.com/news/social-platform-friend-tech-shuts-065105515.html); [CoinMarketCap Academy](https://coinmarketcap.com/academy/article/social-platform-friendtech-shuts-down-creators-walk-away-with-dollar44m); team denied a full shutdown — [Crypto.news](https://crypto.news/friend-surges-60-as-friendtech-dismisses-shutdown-rumors/)
- Decline began within days of the first peak (Aug 22, 2023: −67% daily volume, −56% fees, −40% transactions); users active mainly for speculation/token incentives — [Tiger Research](https://reports.tiger-research.com/p/socialfi-turbulent-journey-eng); [0xScope (LinkedIn)](https://www.linkedin.com/pulse/what-went-wrong-friendtech-whats-next-socialfi-0xscope)
- V2 generated only ~$60K protocol fees from June 2024 (The Block data); falling FRIEND price discouraged content-producing users — [ChainCatcher](https://www.chaincatcher.com/en/article/2142519); [Bitget](https://www.bitget.com/news/detail/12560604152890)
- Peak DAU estimates conflict (37K vs 100K) — [Disruptdigi](https://disruptdigi.com/friend-tech-the-story-of-rapid-growth-and-decline/); [DailyCoin](https://dailycoin.com/friend-tech-hype-fizzles-to-crawl-daily-transactions-vanish/)

**Zora creator coins / Base App (2025–2026)**
- Aug 2025 peak after Base App relaunch: 1.6M+ creator coins minted, ~3M unique traders, >$470M volume — [BeInCrypto](https://beincrypto.com/jesse-pollak-base-zora-social-bet/)
- Daily creator rewards rose from <$1K (early Jul 2025) to >$10K/day, peaking near $375K — [0x case study](https://0x.org/case-studies/zora)
- Creator fee cut from 1% to 0.5% for coins created after Sept 15, 2025; creator-coin allocation 50% to creator vesting linearly over 5 years — [Zora Help](https://support.zora.co/en/articles/2509953)
- By Jul 15, 2026: daily volume $112,170 (−99.8% from $63M peak); daily mints 852 vs 118,069 in Jan 2026 (content coins 117,537 → 638); ZORA token −95% (~$550M → ~$30M) — [Odaily](https://www.odaily.news/en/post/5211890); [Crypto Headlines](https://cryptoheadlines.io/news/jesse-pollak-base-strategy-reset-zora-decline/)
- Base discontinued "Creator Rewards" and removed the social feed (Feb 2026); Jesse Pollak called early 2026 a "punch in the face" and admitted the onchain-social bet failed; Base refocused on trading, stablecoin payments, AI agents — [BeInCrypto](https://beincrypto.com/jesse-pollak-base-zora-social-bet/)
- Example: a coin by viral journalist Nick Shirley fell 80% in under two days — [The Defiant](https://thedefiant.io/news/markets/zora-drops-as-creator-coins-disappoint)
- "Content coin" model critique — [Blockworks](https://blockworks.com/news/zora-latest-content-coin-fad)

**Pump.fun livestreams & creator fees (Solana)**
- Project Ascend (Sept 2025) dynamic creator fees: 0.95% per trade for $88K–$300K market caps tapering to 0.05% at $20M; ~$2M paid to 5,640 creators in the first 24h vs $198K the prior day — [Decrypt](https://decrypt.co/337872/pump-funs-new-fee-model-hands-out-2m-to-creators-in-first-24-hours); [CoinMarketCap Academy](https://coinmarketcap.com/academy/article/pumpfun-creators-earn-dollar2m-in-first-day-under-new-fee-structure)
- Streamer outliers: BunnyFuFuu earned $217K in creator fees in two days; a duo earned $83,410 in two days by streaming allegedly leaked Drake/Future songs — [Yahoo Finance](https://finance.yahoo.com/news/pump-fun-fee-structure-pays-175413424.html); [Yahoo Finance](https://finance.yahoo.com/news/pump-fun-streamers-earned-83-135742547.html)
- Livestreaming was temporarily removed after extreme-content controversies to improve moderation — [PANews](https://www.panewslab.com/en/articles/1ccedaf9-ffd4-4125-ae3f-b03fb3a579f8)
- Jan 2026 rework: co-founder Alon Cohen said the dynamic system doubled bonding-curve volumes but created an imbalance encouraging low-risk token creation over trading; new model lets creators split fees with up to 10 wallets — [KuCoin flash](https://www.kucoin.com/news/flash/pump-fun-to-overhaul-creator-fee-mechanism-amid-concerns-over-incentive-distortion)
- Pump.fun docs (updated May 20, 2026): 0 SOL to create a coin; USDC pairing from May 21, 2026 — [pump.fun docs](https://pump.fun/docs/fees)

**Believe (Solana, launch-a-coin-by-X-reply)**
- Tokens launched by replying on X; trading fees split 50/50 between platform and creator, paid daily once X account connected — [CoinGecko Learn](https://www.coingecko.com/learn/what-is-believe-token-launchpad)
- LAUNCHCOIN fell >30% on Oct 16, 2025 when the team scrapped its model for BELIEVE; supply "25%" increase was actually 33% (1B → 1.33B), becoming a meme; Believe revenue reportedly fell 94% from May 2025 peak — [The Defiant](https://thedefiant.io/news/tokens/launchcoin-price-drops-as-developers-switch-to-believe-token); [Blocmates](https://www.blocmates.com/news-posts/believe-app-believe-token-launch-backfires-over-math-error-and-supply-confusion)
- Editable token metadata enabled rebrands but also impersonation/phishing risk — [CoinGecko Learn](https://www.coingecko.com/learn/what-is-believe-token-launchpad)

**Socios / Chiliz fan tokens**
- CHZ ~96–98% below its $0.8786 ATH — [KuCoin blog](https://www.kucoin.com/blog/chiliz-explained-the-backbone-of-sports-fan-tokens-in-2026); [CoinMarketCap](https://coinmarketcap.com/cmc-ai/chiliz/latest-updates/)
- Chiliz claims >$700M revenue delivered to sports partners and fan-token market cap >$1B in 2025; ~2.5M Socios users (2024, company data); first sports platform authorized under MiCA (Sept 2025) — [Chiliz](https://www.chiliz.com/the-chiliz-chain-in-2025-from-fan-tokens-to-a-sovereign-stadium/); [Chiliz](https://www.chiliz.com/fan-tokens-turn-five/)
- Fan-token staking for reward points launched Feb 2025 — [Chiliz](https://www.chiliz.com/chiliz-launches-socios-com-fan-token-staking/)

**Football.fun** — see §2 (spike Aug 2025, token −85%).

### Inferences
- Common spike drivers: a novel "creator gets paid per trade" mechanic, celebrity/streamer outliers with screenshot-able earnings, and token/points speculation. Common killers: payout dependency on falling token prices, fee cuts/changes (Zora 1% → 0.5%; Pump.fun reworks), supply/tokenomics confusion (Believe), stopping product iteration (friend.tech), and moderation crises (Pump.fun streams).
- A prediction-market product has a structural advantage over creator coins: each market has a natural end (resolution) and a payout, which creates a recurring "next market" cadence instead of a one-way price chart. The creator's income comes from trading fees on events, not from fans' bags going up — avoiding the friend.tech/Zora reflexive collapse, provided the app does not add a speculative token.
- Avoid launching a token or points program for a hackathon MVP; it imports the airdrop-farmer churn pattern seen across this category.

### Gaps
- Could not research (search budget exhausted): BONKfun, Rally (RLY), Stars Arena, Fanbase, Farcaster Frames-era apps in detail. Background knowledge (unverified this session): BONKfun briefly overtook Pump.fun in daily launches in mid-2025 on incentive-driven activity; Rally shut down its sidechain in early 2023 leaving creator coins stranded; Stars Arena (Avalanche friend.tech clone) was exploited for ~$3M in Oct 2023; Fanbase raised via Reg CF equity crowdfunding from its own users rather than tokens.
- No retention cohort data (D7/D30) found for any of these products; only aggregate volume/fee decay.

## 5. Panta ecosystem: who Panta is, positioning, apps already built

### Takeaway
Panta (@PantaHQ) is a permissionless Solana prediction market that went live June 13, 2026, using a parimutuel ("losers pay winners") model with an AI resolver and a 2-hour dispute window, and paying market creators 20% of protocol fees; a later "New Panta" relaunch moved markets to USDC and removed the "graduation" step so creators earn across a market's whole life. No funding/backers were found. The Colosseum Crypto World's Fair "Panta API Sidetrack" (5,000 USDG pool) already has ~15+ public repos — mostly trader terminals/AI desks, plus several Telegram group-chat market apps that overlap with the creator-share concept.

### Cited Findings
- Launch: Panta announced "Panta is Live, on @solana" on Jun 13, 2026; positioned as "a permissionless prediction market on Solana that allows anyone to create and trade markets freely. Market creators get to earn a share from the activity their markets generate" — [Toria on X](https://x.com/toria_dickson/status/2065826739410927625)
- Mechanism (pre-relaunch guides): parimutuel pools; creators earn 20% of protocol trading fees once the market "graduated" to secondary trading; fees 2% primary / 1.5% secondary (buyer-paid); 1 SOL non-refundable creation fee + 0.5–0.9 SOL seed liquidity; AI resolver decision is final if no dispute within 2 hours — [Medium beginner's guide](https://medium.com/@finegirldami/what-is-panta-market-a-complete-beginners-guide-84ce833126df); [Medium technical read](https://medium.com/@alice.ai.01.01.2000/what-an-ai-agent-sees-in-pantamarkets-a-technical-read-of-parimutuel-prediction-markets-on-solana-60b0632b0e01); [0xFrimp "How it works" thread](https://x.com/0xFrimp/status/2084995409177456675)
- "The New Panta": markets moved to USDC, 20% creator royalties, graduation step eliminated ("markets now run their full lifecycle, and creators keep the upside") — [KuCoin insight](https://www.kucoin.com/news/insight/USDC/6a764c7c6842190007a3c0fb). Post-relaunch fee schedule not found.
- Public API v1 base `https://live-api.panta.market/api/v1/`; coverage includes discovery, quotes, transaction building, portfolio, market creation; primary order flow quote → build → submit → verify; unsigned transactions signed client-side; API keys "free at docs.panta.market"; a creator-fee claim endpoint (`POST /claim/creator-fees/`) exists — [PantaDesk](https://github.com/chi1ayomide-jpg/pantadesk); [sonar-panta](https://github.com/G-ojies/sonar-panta); [panta-mcp](https://github.com/zaoagent/panta-mcp)
- Builder-reported API limits: no historical price data, no push feed, rotating trade tape (builders added their own snapshot layer) — [panta-terminal](https://github.com/liji3597/panta-terminal)
- Sidetrack: Panta API Sidetrack within Colosseum's Crypto World's Fair, reportedly a 5,000 USDG prize pool (figure surfaced in a search synthesis of sidetrack entries; exact source page not confirmed — verify on Colosseum/Panta) — e.g. entry [PantaScope](https://github.com/cjaime708/pantascope); [panta-terminal](https://github.com/liji3597/panta-terminal)
- Funding/backers: none surfaced in searches; the Solana prediction-market raises found were for other teams (TBD $3M; World disclosed no funding) — [The Block (TBD)](https://www.theblock.co/post/391253/solana-based-tbd-a-prediction-market-protocol-for-verified-human-opinion-raises-3-million); [TechTimes (World)](https://www.techtimes.com/articles/319560/20260702/prediction-market-world-launches-phantom-chainlink-oracles-auto-settle-solana-trades.htm)
- Solana prediction-market directory listing (context) — [Solana Compass](https://solanacompass.com/projects/category/rwa/prediction-markets)

**Apps already built on Panta (GitHub, as of Oct 7, 2026 — mostly sidetrack entries)**
- Group-chat / social (closest overlap with the creator concept):
  - PantaPredict — turns a group-chat argument into a tradeable market inside Telegram, screening for deadline, real source, clear yes/no wording — [GitHub](https://github.com/ICMelvin/Panta_Preditct)
  - called-it — Telegram bot + website bringing Panta markets into group chats — [GitHub](https://github.com/ferzerz5-lab/called-it)
  - Pot — prediction markets for Telegram groups with Solana Blinks and "an honest verdict on every market" — [GitHub](https://github.com/Baheet18/pot)
  - Copycall — copy-trading for Panta markets — [GitHub](https://github.com/SammyCodes1/Copycall)
  - fairline — "fair odds, one-click market creation and trading" — [GitHub](https://github.com/Pantomath251/fairline)
- News-to-market creation: panta-pulse (news item → live market, agent-native drafting/validation) — [GitHub](https://github.com/agenticaotearoa/panta-pulse); pantawire (Minecraft-themed, every headline a market) — [GitHub](https://github.com/joyboyy1221/pantawire)
- Trader terminals / intelligence / AI desks: panta-terminal (price history, WebSocket push, smart-money leaderboard) — [GitHub](https://github.com/liji3597/panta-terminal); PantaDesk — [GitHub](https://github.com/chi1ayomide-jpg/pantadesk); sonar-panta — [GitHub](https://github.com/G-ojies/sonar-panta); PantaScope — [GitHub](https://github.com/cjaime708/pantascope); panta-brief-command — [GitHub](https://github.com/rishu4436/panta-brief-command); OddsMind — [GitHub](https://github.com/zxreigns/oddsmind); SolanaLens — [GitHub](https://github.com/sarkisk-cod/solanalens)
- Infra/agents/trust: panta-mcp (MCP server) — [GitHub](https://github.com/zaoagent/panta-mcp); x402 pay-per-call market tools — [GitHub PR](https://github.com/bck-stack/sitecheck-x402/pull/3); settlement-check (preflight + watcher on what decides a market) — [GitHub](https://github.com/bisale24-ops/settlement-check); panta-api-playground (Kaito-HQ) — [GitHub](https://github.com/Kaito-HQ/panta-api-playground); parimutuel simulator — [GitHub](https://github.com/ilichb/panta-market-simulator)

### Inferences
- Within the sidetrack, the crowded lanes are (1) trader terminals/AI research desks and (2) Telegram group-chat markets. A creator-first product aimed at WhatsApp/IG/TikTok audiences (link-in-bio, story share cards, creator dashboard with claimable creator fees) appears uncontested among public repos.
- Panta's parimutuel model suits creator markets: no market maker needed, every trade adds to the pool, no slippage UI — but small pools mean small/odd payouts and late-trader advantage; the UX must show "estimated payout if YES wins" clearly.
- The AI resolver + 2h dispute window is fast (good for viral, short-lived creator markets) but makes unambiguous resolution criteria essential (see §6 Zelensky lesson). The `settlement-check` repo indicates other builders see resolution transparency as a gap.
- The creator-fee claim endpoint makes a "creator earnings" dashboard a cheap, demo-able feature.

### Gaps
- panta.market and docs.panta.market were unreachable from this sandbox; official fee schedule post-relaunch, resolver design, market counts/volume, team identity and backers remain unverified. Another researcher covers the API in depth.
- Sidetrack judging criteria/deadline not found.

## 6. Key failure modes across the category

### Takeaway
The recurring failure modes are: (1) liquidity cold start / thin long-tail markets; (2) ambiguous-resolution disputes and oracle manipulation (Polymarket/UMA Zelensky suit, Ukraine minerals deal); (3) insider trading on outcomes controlled by the creator's circle (MrBeast editor on Kalshi; candidates betting on own races); (4) wash trading and airdrop/points farming that inflate and then collapse metrics (Columbia: ~25% of Polymarket historical volume; Opinion −60% in a day post-airdrop); (5) regulatory and platform-policy shutdowns (state C&Ds, X ad rules); (6) security incidents on bots.

### Cited Findings

**Resolution disputes / oracle manipulation**
- Zelensky suit market (Polymarket/UMA, Jul 2025): asked if he'd be photographed "wearing a suit" Mar 22–Jun 30; UMA initially leaned Yes, then token-holder challenges reversed to No citing lack of "credible reporting consensus"; volume $160M–$237M; critics alleged token-weighted voting enabled manipulation; UMA said "no evidence" of foul play; a power user admitted betting on how UMA would rule rather than facts — [CoinDesk](https://www.coindesk.com/markets/2025/07/07/polymarket-embroiled-in-usd160m-controversy-over-whether-zelensky-wore-a-suit-at-nato); [CoinDesk](https://www.coindesk.com/markets/2025/07/09/this-isnt-decentralized-says-polymarket-power-user-as-zelenskyys-suit-controversy-unfolds); [Decrypt](https://decrypt.co/329210/polymarket-rules-no-237m-bet-zelenskyys); [The Defiant](https://thedefiant.io/news/nfts-and-web3/polymarket-controversy-heats-up-after-the-zelenskyy-suit-market-resolves)
- Ukraine minerals-deal market (Mar 2025): resolved Yes prematurely, allegedly by a whale with up to 5M UMA tokens; Polymarket refused refunds, saying it wasn't "a market failure" — [Next Event Horizon Substack](https://nexteventhorizon.substack.com/p/the-debacle-that-is-polymarket) (allegation); [Forbes](https://www.forbes.com/sites/boazsobrado/2025/07/07/the-president-wears-no-suit-polymarkets-160-million-problem/)
- Kalshi Spotify-streams market: whistleblower alleges Kalshi paid out despite warnings of stream manipulation later removed by Spotify (first-person account) — [InGame](https://www.ingame.com/kalshi-spotify-market-dispute/)

**Insider trading on creator-controlled / creator-adjacent outcomes**
- Kalshi fined and banned MrBeast video editor Artem Kaptur: ~$4,000 traded on MrBeast YouTube markets (Aug–Sept 2025) with "near-perfect trading success" on low-odds bets; $5,397.58 profit disgorged + $15,000 penalty, 2-year ban, referred to CFTC; Beast Industries banned employees from trading MrBeast-related markets — [TechCrunch](https://techcrunch.com/2026/02/25/kalshi-fined-a-mrbeast-editor-for-insider-trading-on-markets-related-to-the-youtube-star/); [NPR](https://www.npr.org/2026/02/25/nx-s1-5726050/kalshi-insider-trading-enforcement-actions); [TheWrap](https://www.thewrap.com/media-platforms/tv/mrbeast-editor-kalshi-insider-trading/)
- Kalshi suspended candidates who traded on their own races (one deemed a "direct decision maker"; 5-year suspension, $6,229.30 fine; another bet ~$200 on own candidacy); Kalshi opened ~200 investigations in a year, a dozen+ active cases — [NPR](https://www.npr.org/2026/02/25/nx-s1-5726050/kalshi-insider-trading-enforcement-actions); [Axios](https://axios.com/2026/02/25/kalshi-insider-trading-suspension); [Washington Examiner](https://www.washingtonexaminer.com/premium/4693714/prediction-markets-grow-but-face-legal-challenges/)
- CFTC Enforcement Division issued a prediction-markets advisory (2026) — [CFTC](https://www.cftc.gov/PressRoom/PressReleases/9185-26)

**Wash trading / airdrop farming**
- Columbia study (Nov 6, 2025, SSRN, not peer-reviewed): ~25% of Polymarket historical volume artificial; peaked near 60% in late 2024, ~20% by Oct 2025; sports ~45% of all-time volume flagged; many wallets made no profit, suggesting farming for airdrops/rankings — [CoinDesk](https://www.coindesk.com/markets/2025/11/07/polymarket-s-trading-volume-may-be-25-fake-columbia-study-finds); [Cryptonomist](https://en.cryptonomist.ch/2025/11/07/polymarket-wash-trading-volume/)
- Opinion (BNB): points required ≥$200 weekly volume; OPN airdrop/Binance Launchpool; on Mar 4, 2026 BNB-chain prediction volume fell ~60% in 24h, $94.6M OI outflow over three days, Probable's turnover −83% — [FinanceFeeds](https://financefeeds.com/bnb-chain-prediction-markets-face-liquidity-crisis-following-opinion-airdrop/); [The Defiant](https://thedefiant.io/news/defi/bnb-based-prediction-market-opinion-launches-token); [Cryptorank](https://cryptorank.io/drophunting/opinion-labs-activity736)
- Myriad's 511K "users" against $10M USDC volume (Sept 2025) implies ~$20 volume/user — [Decrypt](https://decrypt.co/337489/myriad-hits-10m-usdc-trading-volume-as-prediction-markets-become-new-segment-of-defi)

**Liquidity cold start**
- Manifold: liquidity outside top political/AI markets is thin — [CryptoSlate](https://cryptoslate.com/prediction-markets/manifold-predictions-review/)
- XO founder: incumbents would need market makers for thousands of long-tail events; user-generated platforms have struggled to scale liquidity — [CoinDesk](https://www.coindesk.com/business/2026/04/30/xo-market-bets-on-user-generated-prediction-markets-to-rival-polymarket-and-kalshi)

**Regulatory / platform shutdowns**
- Connecticut issued cease-and-desists to Kalshi, Polymarket and Crypto.com on the day of Polymarket's US launch (Dec 2025) — [Unchained](https://unchainedcrypto.com/polymarket-opens-us-app-to-waitlisted-users/); [startpolymarket.com](https://startpolymarket.com/countries/united-states/)
- Novig suing five states over preemption, mixed results — [Finance Magnates](https://www.financemagnates.com/fintech/novigs-prediction-market-launch-beat-kalshis-its-legal-fight-is-just-starting/)
- Limitless closed to US traders; unregistered (applied for DCM May 2026) — [Bitget](https://www.bitget.com/news/detail/12560605465005)
- X restricted paid gambling promotions — [The Block](https://www.theblock.co/post/390983/kalshi-removes-x-affiliate-badges-after-policy-shift-tightens-promotion-rules)
- Manifold shut real-money sweepstakes — [Manifold News](https://news.manifold.markets/p/focusing-on-mana-bringing-sweepstakes)

**Security**
- Polycule (Polymarket Telegram bot) offline after Jan 2026 security incident — [Dropstab](https://news.dropstab.com/research/polymarket-telegram-bot)

### Inferences
- For a creator app, the single highest-risk market type is one whose outcome the creator (or their team) controls ("Will I post a video Friday?", "Will I hit 1M subs?"). The Kalshi "direct decision maker" standard and MrBeast case show regulators/platforms treat this as insider trading. Mitigations: block creators and linked wallets from trading their own markets; label creator-controlled markets explicitly; prefer externally verifiable outcomes (sports, award shows, public metrics with a named data source); cap stake sizes.
- Resolution criteria must name a single source and exact threshold at creation time (the Zelensky "suit" ambiguity cost $200M+ in disputes). An AI-assisted "market linter" at creation (as PantaPredict and panta-pulse do) is cheap and demo-able.
- Traction metrics for judges should be wash-resistant: unique funded wallets, % of traders who placed 2+ trades, markets per creator, share-link → trade conversion — not raw volume.

### Gaps
- No data on Panta-specific disputes or AI-resolver accuracy.
- Country-level bans of Polymarket (2025–2026) not researched this session (budget exhausted). Background knowledge (unverified): several jurisdictions (e.g., France, Belgium, Poland, Singapore, Thailand, Switzerland) have blocked or restricted Polymarket at various times.
- CFTC advisory contents not read.

## 7. Differentiation gaps: what nobody does well for creators with large non-crypto audiences (and MVP lessons)

### Takeaway
No incumbent or challenger combines (a) creator-owned markets with automatic fee share, (b) distribution built for WhatsApp/Instagram/TikTok (link-in-bio, story-ready share cards, mobile web checkout without a wallet extension), (c) non-crypto onboarding (USDC, embedded wallet/fiat), and (d) built-in integrity guardrails for creator-adjacent outcomes. Incumbents pay creators to advertise their markets; crypto challengers give creators fees but distribute via X/Telegram/Farcaster to crypto-natives; Blinks don't render outside crypto-desktop X.

### Cited Findings
- Incumbents pay creators per post (≤$500) rather than giving them market ownership — [NPR](https://www.npr.org/2026/06/07/nx-s1-5846806/kalshi-polymarket-influencers-california-election)
- Incumbent share features target X/Threads (Kalshi Threads chart embed) and in-app groups (Inner Circle, Squads), not WhatsApp/IG/TikTok — [TechCrunch](https://techcrunch.com/2026/03/10/in-a-vote-of-confidence-for-metas-threads-kalshi-adds-sharing-feature/); [Prediction News](https://predictionnews.com/story/polymarket-launches-squads-a-social-group-chat-feature-for-prediction-markets)
- Challengers distribute through X bots (Kash), Telegram (Jupiter, Fliq, PantaPredict, called-it, Pot), Farcaster mini apps (Bracket) or owned media (Myriad/Decrypt) — [Betting Startups](https://news.bettingstartups.com/p/kash-2m-raise-prediction-markets-social-media-feeds); [Crypto Times](https://www.cryptotimes.io/2026/04/23/jupiter-launches-prediction-markets-bot-on-telegram-with-clans-feature/); [GitHub: called-it](https://github.com/ferzerz5-lab/called-it); [Decrypt](https://decrypt.co/312419/decrypt-officially-integrates-myriad-markets-on-site)
- Blinks require wallet extension + registry and fall back to plain links elsewhere — [Phantom docs](https://docs.phantom.com/developer-powertools/solana-actions-and-blinks); [Blockworks](https://blockworks.com/news/lightspeed-newsletter-solana-blinks-twitter)
- Non-crypto onboarding moves by challengers: XO added fiat onramps (Mar 2026) — [Alexandre Dewez Substack](https://alexandre.substack.com/p/backing-xo-market); Panta moved to USDC markets — [KuCoin insight](https://www.kucoin.com/news/insight/USDC/6a764c7c6842190007a3c0fb); Phantom (~20M users) now ships native prediction markets, normalizing in-wallet prediction trading — [TechTimes](https://www.techtimes.com/articles/319560/20260702/prediction-market-world-launches-phantom-chainlink-oracles-auto-settle-solana-trades.htm)
- Fan/creator platforms with large non-crypto bases (Stan: 370K+ creators, 30M+ users) have tried to bolt on prediction markets (Fliq), with no reported traction — [Fliq on X](https://x.com/predictonfliq?lang=en)
- Melee pitches creators can "tie markets to their audience's interests without taking on reputational exposure" and plans weekly creator rankings/badges — [Solana Compass](https://solanacompass.com/projects/melee-markets); [iq.wiki](https://iq.wiki/wiki/melee)
- Pump.fun's outlier creator earnings (screenshot-able) were a major recruitment driver — [Decrypt](https://decrypt.co/337872/pump-funs-new-fee-model-hands-out-2m-to-creators-in-first-24-hours)
- Kalshi Social's default-on profiles + leaderboard and Polymarket's comments indicate social proof matters for retention — [Kalshi Help](https://help.kalshi.com/en/articles/15891130-how-do-i-post-comment-and-react-on-kalshi-social)

### Inferences
Differentiation gaps (none of the products reviewed does these well):
1. **Share artifact built for Stories/Status/DMs**: vertical 9:16 story card + square OG card with live odds, creator face, deadline countdown and a short link; WhatsApp-native "Status" and group forward flow. Incumbents optimize for X/Threads; challengers for Telegram/Farcaster.
2. **Zero-crypto first trade**: email/phone login with embedded Solana wallet, USDC balance, sponsored gas, card/Apple Pay onramp; no seed phrase, no extension, no SOL. (Blinks fail this audience.)
3. **Creator dashboard as the product**: markets created, traders, fees earned (claimable via Panta's creator-fee endpoint), top fans leaderboard, "next market" templates — creators come back because of earnings visibility, unlike creator coins whose earnings depended on price.
4. **Integrity by design for creator-adjacent markets**: creator/team wallets blocked from trading own markets, "creator-controlled outcome" label or ban, named resolution source required at creation, AI pre-check of wording, visible dispute window countdown.
5. **Fan identity & status, not just PnL**: per-creator fan leaderboards, "called it" badges, streaks — status rewards that don't require a token (avoids the friend.tech/Zora/Opinion farming-and-dump cycle).
6. **Small-stakes, entertainment framing**: fixed small stakes (e.g., $1–$5) suit parimutuel pools and mobile impulse; geofencing/age-gating to manage regulatory and platform-policy risk (X restricts paid gambling promotion; Novig uses 21+).

Hackathon MVP lessons (traction-oriented):
- Recruit 3–10 real creators with distinct audiences and run their markets live during judging; show per-creator funnels (link views → wallet created → first trade → second trade).
- Report wash-resistant metrics (unique funded wallets, repeat traders, creator fees claimed) rather than raw volume; avoid points/airdrop promises.
- Ship the creator-fee claim and a share card first; Blink support is a cheap add-on for X power users but not the core funnel.
- Use externally verifiable, short-dated markets (hours–days) to fit Panta's fast AI resolution and generate multiple resolution→payout→reshare loops within the hackathon window.
- Position explicitly against the crowded Panta sidetrack lanes (trader terminals, Telegram group bets) as "creator-to-audience distribution on mainstream social."

### Gaps
- No public data on conversion rates from social share links to first on-chain trade for any prediction market.
- Instagram/TikTok/WhatsApp policies on real-money prediction-market promotion and link sharing were not researched this session (budget exhausted); this is a material risk to verify (background, unverified: Meta and TikTok restrict gambling ads and may require authorization for real-money gaming promotion).
- No evidence found of any creator-led prediction market product with large verified non-crypto audience traction — the gap may reflect genuine absence or limits of this session's search.
