# Zan design system v2

Zan should feel like opening TikTok, not a trading terminal, while money moments feel as calm and exact as Robinhood or Cash App.

## References and what we take from each

| App | What we borrow |
| --- | --- |
| **TikTok** | Full-bleed vertical feed. Content sits bottom-left, a right-side action rail (creator avatar with a follow "+", reactions, comments, share). "Following / For you" tabs float over the feed at the top. White center "+" create button with two colored edges. |
| **Robinhood** | One giant tabular number as the hero (the YES chance). A clean full-width line chart with range chips. Quiet chrome, black canvas, numbers in the type system. |
| **Kalshi** | Binary market cards: a plain question, two big side buttons that show the chance on the button ("Yes 62%"), and the payout stated in plain money. |
| **Cash App** | Amount entry: a huge centered "$5" with a custom numeric keypad and quick-amount chips. A single bold confirm. Wallet balance as a huge number with two pill actions (Add money, Cash out). |
| **Instagram** | Story rings around creator avatars. A profile header with an avatar, a stats row and Follow/Share buttons, then tabs. |
| **Threads / X** | Comment threads: avatar, name, badge, time, text. Thin separators and generous line height. |
| **Flighty** | Status timelines and dense-but-calm info rows (label left, value right, hairline dividers). |

## Principles

1. **Black canvas, white type, two action colors.** The UI is monochrome; color means YES or NO. Everything else is white, gray or a creator's image.
2. **One hero per screen.** The feed hero is the question, the market hero is the chance %, the pick sheet hero is the amount, and the wallet hero is the balance.
3. **Full-bleed and edge-to-edge** on the feed and the market header; elsewhere use list rows, not boxed cards.
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
| Display number (market hero, balance, amount) | `text-[56px] leading-none font-semibold tracking-[-0.04em] num` |
| Feed question | `text-[28px] leading-[1.1] font-bold tracking-[-0.02em]` |
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
- `Tabs` (underline style, TikTok/Instagram) and `Segmented` (pill style).
- `ListRow({ label, value, href?, onClick?, icon? })`: Flighty-style info row with a hairline divider.
- `SectionLabel`.
- `StatRow({ items: {label, value}[] })`: Instagram-style stats.
- `cn` re-export.

`src/components/market-bits.tsx`
- `ChanceHero({ yes, size })`: giant YES % in `text-yes` plus a "chance" label, with a NO % sub-line.
- `ProbabilityBar` (thin 4px track, YES fill, ✓/✕ labels).
- `Countdown`, `CreatorChip`, `CallBadge`, `StatusPill`, `RestrictedNotice`.
- `PriceChart({ points })`: Robinhood-style full-width line with a 50% baseline and range chips (1D, 1W, All) filtering client-side.

`src/components/nav.tsx`
- `TopBar`: transparent over the feed (`variant="overlay"`) and solid elsewhere.
- `BottomNav`: black bar, icons with labels, and a center create button shaped like TikTok's (white rounded rectangle with a `yes`-colored left edge and a `no`-colored right edge).

`src/components/sheet.tsx`: a black-raised sheet with a grab handle.

`src/components/keypad.tsx`: a Cash App-style numeric keypad (`value`, `onChange`, `max`, `decimals`).

## Screen specs

- **Home feed (`/`)**: full-screen snap pages under a transparent top bar with centered "Following | For you" tabs and a "Closing" chip. Each page has:
  - a background of the market image (darkened with a gradient to black at the bottom) or a category gradient;
  - bottom-left: creator handle with a verified dot, the question in the feed style, the creator's call badge, a countdown, and a ProbabilityBar for real-money markets or call counts for free calls;
  - a right rail: avatar with a lit ring and a "+" follow, a fire reaction with count, comments with count, and share;
  - two `TradeButton`s pinned above the bottom nav.
- **Market page (`/m/[slug]`)**:
  - Header: back arrow, creator chip and share.
  - Question in page-title size, then `ChanceHero`, `PriceChart` with range chips, and a meta row (traders · volume · closes).
  - "@creator says YES" call card.
  - ListRows for rules, sources, closing and result time, and who resolves.
  - Reactions, then a Threads-style comment list.
  - Sticky bottom: two `TradeButton`s.
- **Pick sheet**: side toggle, a huge amount with `Keypad`, chips ($1, $5, $10, $25), then a payout line "You get about **$8.06** if YES wins" (with the loss line and fee in micro text), then a full-width trade-colored confirm. Steps for age, funding and free calls use the same visual language. The timeline is Flighty-style.
- **Share sheet**: a story card preview, a horizontal row of round channel buttons (WhatsApp Status, WhatsApp, Instagram, TikTok, X, Copy link) with labels under them, and a "Download image" ghost button.
- **Creator profile (`/@handle`)**: centered avatar with a ring, name, @handle, bio and verified pills; a `StatRow` (Calls · Followers · Called it %); Follow (white) and Share (secondary); `Tabs` (Live · Settled · Top fans) above a compact market list.
- **Create (`/create`)**: a step header ("1 of 3"), large template tiles as two columns of icon tiles, form fields in `card` rows, a live checklist shown as compact rows with ✓/✕, and a sticky white bottom CTA.
- **Studio (`/studio`)**: a Robinhood-style header with a large number (picked volume) and sub-stats; a channel funnel as ListRows; a list of calls.
- **Wallet (`/wallet`)**: a Cash App balance hero, two pill actions (Add money, Cash out), then ListRows (wallet address, play limits, export key, sign out).
- **Picks (`/portfolio`)**: a big "Called it X of Y" header, `Tabs` (Open · Won · Lost · Free calls) and position rows (question, side pill, value right-aligned).
- **Explore**: category chips and a compact list of rows with thumbnails.
- **Share images (`src/lib/cards.tsx`)**: black canvas, white type, YES/NO colors, a story ring around the avatar, and the same QR, short link, "#ad" disclosure and "Powered by Panta" content as today.

## Non-negotiables carried over

- "Powered by Panta" exact wording, linked to panta.market, next to every Panta surface.
- No fake numbers or seeded social proof; empty states say so honestly.
- Disclosure line on creator shares; 18+ and region gates unchanged.
- No behavior changes: same API calls, same props contracts for page-level components unless noted.
