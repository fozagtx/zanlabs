# Zan design system v2

A fan opens Zan from a creator's story or post and lands on one market: one question, one number, two buttons. Money moments feel as calm and exact as Robinhood or Cash App. Zan is not a social app, so there is no feed to scroll; creators get a dashboard that gets their link out fast.

## References and what we take from each

| App | What we borrow |
| --- | --- |
| **TikTok** | The "+" create button with two colored edges. |
| **Robinhood** | One giant tabular number as the hero (the YES chance, the creator's picked volume). A clean full-width line chart with range chips. Quiet chrome, black canvas, numbers in the type system. |
| **Kalshi** | Binary market cards: a plain question, two big side buttons that show the chance on the button ("Yes 62%"), and the payout stated in plain money. |
| **Cash App** | Amount entry: a huge centered "$5" with a custom numeric keypad and quick-amount chips. A single bold confirm. Wallet balance as a huge number with two pill actions (Add money, Cash out). |
| **Instagram** | Story rings around creator avatars. A centered link-page header: avatar, name, @handle, bio. |
| **Flighty** | Status timelines and dense-but-calm info rows (label left, value right, hairline dividers). |

## Principles

1. **Black canvas, white type, two action colors.** The UI is monochrome; color means YES or NO. Everything else is white, gray or a creator's image.
2. **One hero per screen.** The landing hero is the headline, the dashboard hero is picked volume, the market hero is the chance %, the pick sheet hero is the amount, and the wallet hero is the balance.
3. **List rows, not boxed cards.** Only the market chart runs full-width; everything else is rows with hairline dividers.
4. **Never color alone.** YES and NO always carry a label and an icon (✓/✕ from lucide).
5. **Thumb zone.** Primary actions sit in the bottom 30% of the screen, with ≥ 48px targets.
6. **Calm money moments.** No confetti. Short, purposeful motion (≤ 250ms, ease-out, transform/opacity only), honoring `prefers-reduced-motion`.

## Tokens (implemented in `src/app/globals.css` via Tailwind v4 `@theme`)

The token names below are the class names, e.g. `bg-canvas`, `text-fg`, `border-hairline`.

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#000000` | App background (true black, OLED) |
| `raised` | `#0F0F11` | Sheets, sticky bars |
| `card` | `#16161A` | Rows, inputs, chips |
| `card-2` | `#1F1F24` | Pressed/hover state, keypad keys |
| `hairline` | `#26262B` | 1px dividers and borders |
| `fg` | `#FFFFFF` | Primary text |
| `fg-2` | `#A1A1AA` | Secondary text |
| `fg-3` | `#6B6B74` | Tertiary text, placeholders |
| `yes` | `#22E39B` | YES (mint green) |
| `yes-ink` | `#00140C` | Text on a YES fill |
| `no` | `#FF4F70` | NO (hot pink-red) |
| `no-ink` | `#1A0007` | Text on a NO fill |
| `brand` | `#FFFFFF` | Primary non-trade buttons are white with black text |
| `accent` | `#8B5CF6` | Rare highlight: verified badge and creator story ring gradient start |
| `accent-2` | `#F472B6` | Story ring gradient end |
| `warn` | `#FFB020` | Warnings, sandbox |
| `danger` | `#FF4F70` | Destructive (same as NO) |

Story ring: `bg-gradient-to-tr from-accent to-accent-2` (lit), `bg-hairline` (unlit).

### Type (system font stack, SF Pro on iOS, Inter fallback)

| Role | Class |
| --- | --- |
| Display number (market hero, balance, amount, picked volume) | `text-[56px] leading-none font-semibold tracking-[-0.04em] num` |
| Landing headline | `text-[40px] leading-[1.05] font-bold tracking-[-0.03em]` |
| Market question | `text-[27px] leading-[1.15] font-bold tracking-[-0.02em]` |
| Page title | `text-[22px] font-bold tracking-[-0.01em]` |
| Section label | `text-[13px] font-semibold uppercase tracking-[0.06em] text-fg-3` |
| Body | `text-[15px] leading-[1.45]` |
| Meta | `text-[13px] text-fg-2` |
| Micro | `text-[11px] text-fg-3` |

`.num` = `font-variant-numeric: tabular-nums`. Every number uses it.

### Shape and spacing

- Radii: chips and buttons are `rounded-full`, rows/inputs `rounded-2xl`, sheets `rounded-t-[28px]`.
- Page gutter `px-4`; vertical rhythm in multiples of 4 (12/16/24/32).
- Hairline dividers: `border-hairline` 1px; list rows `py-3.5`.
- Shadows: none, except sheets (`shadow-[0_-8px_40px_rgba(0,0,0,.6)]`).

### Motion

- Press: `active:scale-[0.97]` at 120ms.
- Sheet: vaul default spring.
- Number changes: CSS transition on the color only; no counting animations.

## Shared components (owned by the foundation pass; screens consume them)

`src/components/ui.tsx`
- `Button` variants `primary` (white bg, black text), `secondary` (`card` bg, white text), `ghost`, `yes`, `no`, `danger`. Sizes `sm` (36px), `md` (44px), `lg` (52px), `xl` (60px). All pills (`rounded-full`). A `loading` prop.
- `TradeButton({ side, pct, onClick, size })`: a Kalshi-style big button "✓ Yes 62%" / "✕ No 38%", in the YES/NO tint (a filled variant and a soft variant via `variant="soft"`).
- `Pill`, `Avatar` (prop `ring?: "lit" | "dim" | "none"` draws the story ring), `Empty`, `Skeleton`, `Spinner`, `Input`, `Textarea`, `Label`, `Checkbox`.
- `Tabs` (underline style; Picks, creator link page) and `Segmented` (pill style).
- `ListRow({ label, value, href?, onClick?, icon? })`: Flighty-style info row with a hairline divider.
- `SectionLabel`.
- `StatRow({ items: {label, value}[] })`: a row of value-over-label stats (dashboard, creator link page, traction).
- `cn` re-export.

`src/components/market-bits.tsx`
- `ChanceHero({ yes, size })`: giant YES % in `text-yes` plus a "chance" label, with a NO % sub-line.
- `Countdown`, `CreatorChip`, `CallBadge`, `StatusPill`, `RestrictedNotice`.
- `PriceChart({ points })`: Robinhood-style full-width line with a 50% baseline and range chips (1D, 1W, All) filtering client-side.

`src/components/nav.tsx`
- `TopBar`: a sticky black bar with the logo on the left and Sign in, or the user's avatar (to their link page if they're a creator, else Wallet), on the right. A page with its own header hides it with `<TopBarMode variant="hidden" />`.
- `BottomNav`: black bar with four labeled tabs (Home, Create, Picks, Wallet). Create is a white rounded rectangle with a `yes`-colored left edge and a `no`-colored right edge.

`src/components/sheet.tsx`: a black-raised sheet with a grab handle.

`src/components/keypad.tsx`: a Cash App-style numeric keypad (`value`, `onChange`, `max`, `decimals`).

## Screen specs

- **Home (`/`)** depends on who's looking. A neutral skeleton shows until the session is known, so a creator never sees the landing flash (or a fan the dashboard).
  - **Landing** (signed out, or signed in without a creator page): the headline in landing type, one paragraph of what Zan does, a white "Create a market" button and a secondary "How it works" (to `/about`), both full-width `lg`. Signed-in fans also get a "Your picks" ListRow. Then a "How it works" section with three numbered rows: Create; Share (channel pills: WhatsApp, Instagram, TikTok, X, Copy link); Fans pick (a ✓ YES and a ✕ NO pill). An 18+ / region note in micro text, then "Powered by Panta". No market list: fans reach a market from a creator's link.
  - **Creator dashboard** (signed in with a creator page; `/studio` redirects here): page title, the `zan/@handle` link with a copy icon, and a white "New market" button; a Robinhood-style hero (picked volume) with a `StatRow` (Markets · Fan picks · Unique fans · Visits · Record). "Your markets": one row per market (question, `StatusPill`, per-market stats, the restricted-wallet warning when flagged) with **Copy link** and **Share** as a two-column pair of secondary buttons, and a ghost "Claim creator fees" under them on Panta markets. Then the channel funnel as ListRows ("Where your fans come from"), the restricted-wallets list and form, and "Powered by Panta".
- **Market page (`/m/[slug]`)**:
  - Header: back arrow, creator chip (lit ring) and share. The global top bar is hidden here.
  - Status chips (status, the creator's call, countdown, "You called YES" for a fan's free call).
  - Question in market-question type, then `ChanceHero`, `PriceChart` with range chips, and a meta row (traders · volume · closes) with "Odds as of …" and "Powered by Panta" in micro text. Free calls show call counts instead of the chance and chart.
  - After settlement, a card saying how the creator's call went. A `RestrictedNotice` when a declared team wallet traded.
  - "How this resolves": ListRows for rules, sources, trading close, result time, and who resolves.
  - For the creator of a free call: the settle block (outcome plus a public evidence link) once calls close.
  - "Share this market": Copy link and Share as two secondary buttons.
  - Fee disclosure in micro text, linking to "How Zan works".
  - Sticky bottom: two `TradeButton`s ("Call YES" / "Call NO" on free calls). Otherwise one full-width state: "Trade on panta.market" after graduation, "This is your call. Share it!" for the creator, or the closed/settled state.
- **Pick sheet**: side toggle, a huge amount with `Keypad`, chips ($1, $5, $10, $25), then a payout line "You get about **$8.06** if YES wins" (with the loss line and fee in micro text), then a full-width trade-colored confirm. Steps for age, funding and free calls use the same visual language. The timeline is Flighty-style. The done step offers to share the pick.
- **Share sheet**: a story card preview, a horizontal row of round channel buttons (WhatsApp Status, WhatsApp, Instagram, TikTok, X, Copy link) with labels under them, a "Download image" ghost button, and the "#ad · I earn fees" reminder when a creator shares a Panta market.
- **Creator link page (`/@handle`, served by `/c/[handle]`)**: the link a creator puts in their bio. Centered avatar with a ring (lit when a market closes within 24h), name, @handle with the verified dot, bio and verified-account pills; a `StatRow` (Calls · Called it %) with "Right on X of Y settled calls" in micro text; Copy link (white on your own page, secondary otherwise) and Share profile (only where the OS share sheet exists); `Tabs` (Live · Settled) above compact market rows (question, status, call badge, countdown, YES % on the right).
- **Create (`/create`)**: a step header ("Step 1 of 3"), large template tiles as two columns of icon tiles, form fields in `card` rows, a live checklist shown as compact rows with ✓/✕, and a sticky white bottom CTA.
- **Wallet (`/wallet`)**: a Cash App balance hero, two pill actions (Add money, Cash out), then ListRows (wallet address, play limits, export key, sign out).
- **Picks (`/portfolio`)**: a big "Called it X of Y" header, `Tabs` (Open · Won · Lost · Free calls) and position rows (question, side pill, value right-aligned). Positions in Panta markets Zan didn't create open the catalog market page.
- **Catalog market page (`/x/[id]`)**: the market page's header, `ChanceHero`, rules ListRows and sticky `TradeButton`s for a Panta market, with "Panta market" as the title and a link out to panta.market.
- **Share images (`src/lib/cards.tsx`)**: black canvas, white type, YES/NO colors, a story ring around the avatar, and the same QR, short link, "#ad" disclosure and "Powered by Panta" content as today.

## Non-negotiables carried over

- "Powered by Panta" exact wording, linked to panta.market, next to every Panta surface.
- No fake numbers or seeded social proof; empty states say so honestly.
- Disclosure line on creator shares; 18+ and region gates unchanged.
- No feed, follows, comments, reactions, leaderboards or notification inbox. Discovery happens where creators already post.
- Restyling doesn't change behavior: same API calls, same props contracts for page-level components unless noted.
