# Social Distribution Mechanics for a Creator-Led Prediction Market (WhatsApp, Instagram, TikTok, X, Blinks, Farcaster, Telegram) and the Fan Return Path

Research date: 2026-10-07. Method note: in this environment, direct page fetching was blocked by egress policy for most doc sites. Primary docs were read from their GitHub sources where possible: MDN content plus browser-compat-data, Solana docs (`solana-foundation/solana-com`), the Solana Actions spec repo, Dialect `blinks`, Phantom `docs`, Next.js docs, Satori, Remotion, Farcaster `miniapps`, `react-native-share`, and the Panta-based `Baheet18/pot` repo. Everything else comes from web-search result summaries, and those findings are flagged as "search summary" or "third-party" where it matters. The web-search budget ran out before Meta's "Sharing to Stories" page could be checked directly, so the Instagram pasteboard and intent keys below were verified against open-source code, not Meta's page text.

---

## 1. Web Share API (navigator.share with files): can a PWA push a generated image + link into WhatsApp Status / Instagram Stories / TikTok?

### Takeaway
`navigator.share({files})` is supported in iOS Safari (since 14) and Android Chrome (since 76). It opens the OS share sheet, so the user picks the target app. A web page cannot pick "Story" or "Status" for them. It also does not work in Android WebViews, which is what Instagram and TikTok in-app browsers are on Android. Treat Web Share as "best effort, user picks the app", and always offer a fallback: save the image, copy the link with a caption, and send the user to post it.

### Cited Findings
- Support per MDN browser-compat-data: `navigator.share` in Chrome Android 61+, Safari 12.1+ (iOS mirrors Safari), Firefox Android 79+, and Chrome desktop 128+ (before 128, only ChromeOS and Windows). Desktop Firefox has it only behind the `dom.webshare.enabled` flag. **Android WebView: `version_added: false`** (crbug 40540400). The `files` parameter works in Chrome Android 76+ and Safari 14+, and not in Android WebView. iOS WKWebView (`webview_ios`) mirrors Safari. — [MDN browser-compat-data, api/Navigator.json](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json)
- `share(data)` takes `url`, `text`, `title`, `files`. It needs a secure context, the `web-share` Permissions-Policy and **transient activation** ("It must be triggered off a UI event like a button click"). Errors it can throw: `NotAllowedError` (no activation, policy block, or a file share blocked for security), `TypeError` (bad data, or files unsupported), `AbortError` (user cancelled or no targets), `InvalidStateError` (another share already in progress), `DataError`. — [MDN navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) (read from [mdn/content source](https://github.com/mdn/content/blob/main/files/en-us/web/api/navigator/share/index.md))
- MDN lists file types that are usually shareable, including `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`, and PDF. It recommends always checking with `navigator.canShare({files})` first. — [MDN navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- iOS gotcha: awaiting `fetch()` (or a long canvas render) before calling `share()` can use up the user-activation window and throw `NotAllowedError`. The fix is to build the `File` before the tap, then call `share()` synchronously in the click handler. — [renkei PR #302](https://github.com/campfhir/renkei/pull/302); [DEV: Sharing a canvas-generated image on iOS](https://dev.to/shibowen336/sharing-a-canvas-generated-image-on-ios-with-the-web-share-api-2j0m)
- iOS gotcha: adding `url`/`text` next to `files` made some iOS targets take the link instead of the image, and removed "Save Image" from the sheet. Sharing only the file fixed it. — [DEV article](https://dev.to/shibowen336/sharing-a-canvas-generated-image-on-ios-with-the-web-share-api-2j0m) (single anecdotal source)
- One developer reported that sending a blank `title` fixed sharing an image to WhatsApp from iOS Safari (anecdote). — [Apple Developer Forums thread 665812](https://developer.apple.com/forums/thread/665812)
- WhatsApp on Android has been adding a **"My status" target in the system share sheet**: shared media opens straight in the Status editor. It was first seen in WhatsApp beta for Android 2.25.20.3. Reports differ on how far it has rolled out, and it is Android-first. — [HuaweiCentral](https://www.huaweicentral.com/whatsapp-will-allow-you-to-share-status-right-from-share-menu/); [Beebom](https://gadgets.beebom.com/news/whatsapp-might-add-share-sheet-shortcut-status-updates); [AndroidAyuda](https://en.androidayuda.com/this-is-how-the-new-android-whatsapp-states-work/)
- Without that shortcut, users save the media and post it from WhatsApp's Updates/Status tab. — [AndroidAyuda](https://en.androidayuda.com/this-is-how-the-new-android-whatsapp-states-work/)
- Instagram's iOS share extension (since 2016; it once had to be enabled under the share sheet's "More") asks whether to share as post, story or message. That description is from roughly 2022, and no current official Instagram page confirms it. — [Digital Trends](https://www.digitaltrends.com/photography/instagram-update-share-sheet-ios/); [MakeUseOf](https://www.makeuseof.com/tag/iphone-share-menu/)
- No source confirms a direct path from `navigator.share` in a PWA into the Instagram Stories composer or WhatsApp Status. Meta's documented Stories sharing uses native app intents and URL schemes. — search summary of [Meta Sharing to Stories](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories)

### Inferences
- A workable PWA pattern on button tap:
  1. Pre-render the 1080x1920 PNG/JPEG into a `File`.
  2. `if (navigator.canShare?.({files:[f]})) await navigator.share({files:[f]})`, sharing the file alone.
  3. Separately, copy `caption + short link` to the clipboard so the user can paste it into a link sticker or caption.
  4. Fallback: `<a download>` or long-press save, with instructions.
- Inside Instagram or TikTok on Android (WebView), `navigator.share` will be undefined. Detect that and send the user to the external browser (see Q7) or to download/copy.
- WhatsApp Status links are not tappable when typed as Status text (see Q2). So the image itself should carry a QR code and a short vanity URL.

### Gaps
- No first-party Apple, Meta or ByteDance documentation on which share-sheet targets appear for image files from Safari or Chrome in 2026, or whether those targets land in Story/Status/TikTok composers. Needs device testing.
- No data on the maximum file size Web Share accepts on iOS or Android (MDN gives none).

---

## 2. WhatsApp: wa.me links, Status, Channels, link previews, Business API re-engagement

### Takeaway
Use `https://wa.me/?text=<urlencoded caption + link>`. It opens WhatsApp with a contact or group picker and a pre-filled draft. There is no URL scheme or API to post to a user's Status or to a Channel. Status needs the image itself, posted via the share sheet or a manual post. Link previews depend on server-rendered OG tags in the first 300KB of HTML and an og:image under 600KB per Meta. Aim much smaller in practice, roughly 300KB or less. The WhatsApp Business Platform can re-engage fans with utility templates such as "your market resolved". Marketing templates are blocked to US numbers (since Apr 1, 2025) and capped per user, and pricing changed again on Oct 1, 2026.

### Cited Findings
- **wa.me format:** `https://wa.me/<number>?text=<urlencoded>`. The number is digits only, with country code and no `+`. Omitting the number lets the user choose the recipient. `?text=` only pre-fills the input box, and the user still taps send. Encode spaces as `%20`, newlines `%0A`, `?` `%3F`, `&` `%26`. — [wha.tools link format](https://wha.tools/whatsapp-link-format); [BusinessChat help](https://help.businesschat.io/en/articles/6517838-how-to-build-a-whatsapp-click-to-chat-url-wa-me)
- App-scheme equivalent: `whatsapp://send?text=...` (with `phone=` optional). It works only if the app is installed, so vendors recommend `https://wa.me/` from the web. — [AppsFlyer](https://www.appsflyer.com/blog/deep-linking/whatsapp-deep-link/)
- **Status:** no documented wa.me or deep-link format posts to Status. Links pasted into Status text are reported as not tappable, so viewers must copy them. — search summary citing [wha.tools](https://wha.tools/blog/how-to-create-click-to-whatsapp-link-wa-me) and related vendor guides (third-party; not verified against an official WhatsApp FAQ)
- **Channels:** public channel URLs look like `https://whatsapp.com/channel/<id>`, and each channel gets a link and a QR code. — [getkanal Channels guide](https://getkanal.com/blog/whatsapp-channels-feature-guide); [WhatsApp Channels](https://www.whatsapp.com/channels)
- **No official Channel API:** vendors state that Meta's official Cloud API has no endpoints to create channels or publish to them. Third-party "web-session" gateways (Whapi, WAHA) post to `<id>@newsletter` IDs, which carries terms-of-service risk. — [Whapi guide](https://whapi.cloud/how-to-automate-whatsapp-channels-api); [WAHA](https://waha.devlike.pro/whatsapp-channels/) (vendor claims; no Meta doc found)
- **Link preview rules (Meta doc):** the thumbnail image "should be under 600KB in size", "300px or more in width with 4:1 width/height or less aspect ratio", and "the og markup must appear within the first 300KB of the HTML". — [Meta: WhatsApp Link Previews](https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/)
- **Why previews fail (third-party troubleshooting, partly conflicting):**
  - Image paths must be absolute HTTPS URLs; HTTP is refused.
  - The crawler doesn't run JavaScript, so tags must be server-rendered.
  - The image URL must return 200 with no redirect, no auth and no expiring signed URL.
  - Images under 100x100 are dropped; widths of 100–300px give a small thumbnail.
  - SVG is ignored (sources conflict on GIF).
  - One guide says WhatsApp uses the *last* `og:image` tag.
  - Cached previews are hard to refresh, so change the URL (e.g. `?v=2`).
  - There is no public debugger.
  - A practical ceiling of about 300KB was found by testing, but it is not documented.
  - Users can turn link previews off in settings.
  — [ogimagechecker](https://ogimagechecker.com/blog/whatsapp-link-preview/); [opengraph.to](https://www.opengraph.to/articles/og-image-too-large); [previewog](https://previewog.com/fix-whatsapp-link-preview-not-working/); [ogrilla](https://www.ogrilla.com/blog/whatsapp-link-preview-guide)
- **Business Platform pricing:** per-message pricing since July 1, 2025, by category (marketing, utility, authentication, service) and recipient country code. You are charged only on delivery. User-initiated messages are free. Utility templates sent inside the 24-hour customer-service window were free from July 1, 2025. — [Meta pricing page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing); [Zoho community notice](https://help.zoho.com/portal/en/community/topic/whatsapp-pricing-changes-pay-per-message-starting-july-1-2025)
- Example US rates (third-party table, verify against Meta's rate card): marketing about $0.025, utility about $0.004. Meta usually updates rate cards at the start of each quarter. — [Blueticks 2026 pricing](https://blueticks.co/blog/whatsapp-business-pricing-marketing-messages-2026)
- **Oct 1, 2026 change (third-party, single-source level):**
  - Utility messages sent inside an open service window are now charged.
  - Service messages become chargeable after the first 1,000 free per phone number per month.
  — [Chat2Desk](https://chat2desk.com/en/blog/articles/whatsapp-business-api-billing-to-change); [EngageLab](https://www.engagelab.com/blog/whatsapp-business-api-pricing)
- **US marketing pause:** since April 1, 2025, Meta blocks marketing templates to US numbers. These fail with error 131049. Utility, authentication and service messages still go through. As of Aug 2026 Braze reports no date for lifting the pause. Marketing templates can still be delivered inside a user-opened 24h window, or the 72h window opened by a Click-to-WhatsApp ad. — [Braze Meta resources](https://www.braze.com/docs/user_guide/channels/whatsapp/meta_resources); [Manychat help](https://help.manychat.com/hc/en-us/articles/19328856186780-Temporary-pause-on-WhatsApp-Marketing-Templates-in-the-US)
- **Per-user marketing cap:** Meta limits how many marketing templates one user receives across all businesses, and has published no number. Hitting the cap also returns 131049. — [Turn.io](https://learn.turn.io/l/en/article/kl493nec0m-understanding-whats-app-s-per-user-marketing-template-message-limit); [Klaviyo](https://help.klaviyo.com/hc/en-us/articles/46890922548507)
- **Opt-in:** businesses must get opt-in before messaging. The opt-in must say the user will get WhatsApp messages and name the business. An inbound message or ad click is not marketing consent. — [Infobip](https://www.infobip.com/blog/how-to-collect-whatsapp-business-opt-ins); [Blueticks opt-in](https://blueticks.co/blog/whatsapp-opt-in-compliance-requirements)

### Inferences
- **Share button for WhatsApp (chats and groups):**
  ```js
  const msg = `Will @creator's next video hit 1M by Fri? YES 62% / NO 38% — trade: https://app.example/m/abc?r=cr_xyz`;
  location.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  ```
  Put the link at the end so WhatsApp builds a preview from it.
- **Share button for WhatsApp Status:** share the 1080x1920 image file via Web Share. On Android, "My status" may appear as a target. Bake a QR code and a short URL into the image, because links in Status can't be tapped.
- **Re-engagement:** collect explicit WhatsApp opt-in on the market page. Send "market resolved / you won" as utility templates, which are transactional and not marketing. Avoid marketing templates to US numbers. Budget for the Oct 2026 change, where service and utility messages are no longer free.
- **Previews:** make every market URL server-render `og:title` (question plus live odds), `og:description` and `og:image`, a 1200x630 JPEG at roughly 200KB or less. Version the image URL whenever odds change materially, so WhatsApp's cache doesn't pin stale odds.

### Gaps
- No official WhatsApp FAQ text was retrieved for wa.me or Status linking. The "Status links aren't tappable" claim comes from vendor guides.
- No official Meta documentation on WhatsApp Channels link previews or a Channels API.
- Exact Oct 2026 rate-card numbers were not verified against Meta.

---

## 3. Instagram Stories: Meta "Sharing to Stories", link stickers, dimensions and safe zones

### Takeaway
Programmatic "Share to Instagram Stories", which pre-loads a background and sticker image, is **native-only**. It uses the iOS pasteboard plus the `instagram-stories://share?source_application=<FB_APP_ID>` URL scheme, or the Android `com.instagram.share.ADD_TO_STORY` intent. A Facebook App ID has been required since January 2023. A mobile web or PWA can't write the custom pasteboard keys or fire the intent. So from the web, the creator saves or shares the image, opens Instagram, and adds a **link sticker**, which every account has been able to use since Oct 2021. A fan tapping the link sticker opens Instagram's **in-app browser**, not the app or Safari (see Q7).

### Cited Findings
- Meta's Sharing to Stories docs (updated June 30, 2026 per search) cover Android and iOS apps only, using Android implicit intents and iOS custom URL schemes. A Facebook App ID has been required since January 2023. Without it, users see "The app you shared from doesn't currently support sharing to Stories." — search summary of [Meta: Sharing to Stories](https://developers.facebook.com/docs/instagram-platform/sharing-to-stories)
- **iOS (from open-source implementation):**
  - URL: `instagram-stories://share?source_application=<appId>`
  - Pasteboard keys:
    - `com.instagram.sharedSticker.backgroundImage` (PNG data)
    - `com.instagram.sharedSticker.stickerImage`
    - `com.instagram.sharedSticker.backgroundTopColor`
    - `com.instagram.sharedSticker.backgroundBottomColor`
    - `com.instagram.sharedSticker.contentURL`
    - `com.instagram.sharedSticker.linkURL` and `com.instagram.sharedSticker.linkText`
    - `backgroundVideo`
  - Pasteboard items are set with a 5-minute expiration.
  - The host app must list `instagram-stories` in `LSApplicationQueriesSchemes`.
  — [react-native-share ios/InstagramStories.m](https://github.com/react-native-share/react-native-share/blob/main/ios/InstagramStories.m); [Medium: Share content to an Instagram story from an iOS app](https://medium.com/@danielcrompton5/share-content-to-an-instagram-story-from-an-ios-app-d55b1e10e68a)
- **Android (from open-source implementation):**
  - `new Intent("com.instagram.share.ADD_TO_STORY")` with package `com.instagram.android`
  - Extras: `source_application` (FB App ID), `top_background_color`, `bottom_background_color`, `content_url`, `link_url`, `link_text`
  - Background via `setDataAndType(uri, mime)`; sticker via `interactive_asset_uri`
  - `grantUriPermission` to the Instagram package
  — [react-native-share InstagramStoriesShare.java](https://github.com/react-native-share/react-native-share/blob/main/android/src/main/java/cl/json/social/InstagramStoriesShare.java)
- react-native-share labels `attributionURL` (`contentURL`/`content_url`) as "facebook beta-test". Its docs list `linkUrl`/`linkText` as optional with uncertain platform support. — [react-native-share docs/share-single.mdx](https://github.com/react-native-share/react-native-share/blob/main/website/docs/share-single.mdx)
- Reported problems: the Stories target missing in some A/B tests, `ActivityNotFoundException` for `ADD_TO_STORY`, and video Story share doing nothing on Android in one report. — [Spotify community](https://community.spotify.com/t5/Android/Sharing-to-Instagram-Stories-not-available/td-p/4680752); [flutter#43194](https://github.com/flutter/flutter/issues/43194); [react-native-share#1243](https://github.com/react-native-share/react-native-share/issues/1243)
- Threads offers a separate server-side cross-share of a Threads post as an IG Story. It requires a linked Instagram account. — search summary of [Meta Threads: share to IG stories](https://developers.facebook.com/documentation/threads/create-posts/share-to-ig-stories)
- **Link stickers:** Instagram opened them to all accounts on Oct 27, 2021, replacing swipe-up. Before that they were limited to verified or 10k+ follower accounts. Accounts that repeatedly share misinformation or hate speech can lose access. One outlet says brand-new accounts are excluded (unconfirmed). — [Search Engine Land](https://searchengineland.com/instagram-opens-stories-link-sticker-to-all-users-375591); [9to5Mac](https://9to5mac.com/2021/10/27/instagram-link-stickers-now-rolling-out/)
- **Dimensions and safe zones:** the canvas is 1080x1920 (9:16). Instagram publishes no official safe zone. Guides suggest:
  - about 250px clear top and bottom (Argil);
  - 250px top and 336px bottom (Pixotter);
  - about 340px bottom (Sprout/Hootsuite, cited by Argil);
  - about 220px each end (Wavegen).
  The link sticker is added in Instagram's editor, so leave free space for it. — [Pixotter](https://pixotter.com/blog/instagram-story-size/); [Argil](https://www.argil.ai/blog/instagram-story-dimensions); [Wavegen](https://wavegen.ai/instagram-story-size)

### Inferences
- **Mobile web flow:**
  1. Generate a 1080x1920 card with the question, odds bar, creator face, and a QR code plus short URL inside the 250–340px safe zones.
  2. Web Share the file (or save it).
  3. Copy the market link to the clipboard.
  4. Show "Open Instagram → add Link sticker → paste".
- **Native flow (if a native shell is built later, e.g. Expo):** use the documented pasteboard or intent with the FB App ID. Pass the odds card as `stickerImage` over brand-gradient background colors. Note that link pre-fill (`linkURL`/`link_url`) is not documented as reliable.
- A fan tapping the link sticker lands in Instagram's IAB. Design the landing page to work there, or to escape it (Q7).

### Gaps
- Meta's current page text was not retrieved, including sticker image size recommendations, video length and size limits, and whether link pre-fill keys are officially supported. Treat the keys above as implementation-verified, not doc-verified.
- No authoritative 2026 data on whether link-sticker eligibility has changed.

---

## 4. TikTok: Share Kit, Content Posting API, Stories, link-in-bio, practical workarounds

### Takeaway
TikTok **Share Kit is mobile-native only** (iOS/Android OpenSDK). For web apps, TikTok points to the **Content Posting API**: server-side, OAuth with `video.publish`, and audited. Unaudited clients can post only privately, to a small number of creators per day. Photo posts are supported via `/v2/post/publish/content/init/` and need verified URL domains. There is no web route to TikTok Stories. A clickable bio link generally needs 1,000 followers or a business account. The MVP should ship a downloadable 9:16 MP4 or image, a caption with "link in bio / comment", and a QR or short URL baked into the media. API posting is a later phase.

### Cited Findings
- Share Kit is delivered via the TikTok OpenSDK for iOS and Android, and requires the TikTok app installed (URL scheme checks). TikTok's Share Kit page sends web apps to the Content Posting API. — [TikTok Share Kit product page](https://developers.tiktok.com/products/share-kit/); [tiktok-opensdk-ios](https://github.com/tiktok/tiktok-opensdk-ios)
- The older web "Share Video API" docs tell developers to "migrate to our Content Posting API immediately" (deprecated). — [TikTok Share Video API (web)](https://developers.tiktok.com/docs/en/web-video-kit-with-web)
- **Content Posting API:**
  - Direct Post (publish to profile) or Upload (draft to the creator's inbox).
  - Works for desktop, cloud and web apps.
  - Needs the `video.publish` scope, authorized by each creator.
  — [TikTok Content Posting API product](https://developers.tiktok.com/products/content-posting-api/); [Direct Post get-started](https://developers.tiktok.com/docs/en/content-posting-api-get-started)
- **Unaudited clients:**
  - "All content uploaded via this endpoint will be restricted to private viewing mode."
  - Posting accounts must be private at the time of posting.
  - A 24-hour active-creator cap is set from your audit estimates.
  - Vendors cite about 5 creators per 24h before audit (not found on TikTok's page).
  — [TikTok Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines); [Vorp Labs](https://vorplabs.com/agent-tools/tiktok-content-posting-api); [Outstand](https://www.outstand.so/blog/tiktok-content-posting-api)
- **Audit expectations (vendor-reported):**
  - A real website, privacy policy and terms of service.
  - A demo video of the end-to-end flow.
  - A posting UI built from the creator-info call, with privacy and disclosure toggles, preview and explicit consent.
  - Verified ToS, Privacy and Web URLs for apps created after Sept 9, 2024.
  - Turnaround of about 5–10 business days to 2 weeks.
  — [Outstand audit guide](https://www.outstand.so/docs/tiktok-audit); [PostZen](https://www.postzen.dev/blog/tiktok-api); [bundle.social](https://bundle.social/blog/tiktok-api-approval)
- TikTok intended-use rules: clients must help "authentic creators to post original content". Apps that copy arbitrary content from other platforms are not acceptable. Violations can lead to revocation or a permanent ban. — [TikTok Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines)
- **Photo posts:**
  - Endpoint `/v2/post/publish/content/init/` with `post_mode` and `media_type`.
  - Images are pulled from public URLs on verified domains; otherwise the call fails with `url_ownership_unverified`.
  - Vendor table: JPEG/WebP, 20MB per image, up to 35 images. PNG is not listed.
  — [PostZen](https://www.postzen.dev/blog/tiktok-api); [TikTok Direct Post reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- **Link in bio:** generally 1,000 followers for personal accounts, or a Business account at any follower count. Sources conflict on whether a "verified/registered" business account is needed in some regions. Business accounts are limited to the Commercial Music Library. One link per bio. — [RocketLink](https://rocketlink.io/blog/tiktok-link-in-bio-requirements); [SocialRails](https://socialrails.com/blog/how-to-add-link-tiktok-bio-complete-guide); [Shelfy](https://www.shelfy.today/blog/tiktok-bio-link-under-1000-followers)

### Inferences
- **MVP:** a "Download for TikTok" button that produces an MP4, or a JPEG carousel for Photo Mode. Pre-copy a caption like "Bet on it → link in bio (code CRXYZ)". Make the creator's bio link a per-creator landing page (`app.example/@creator`) listing their live markets.
- **Phase 2:** Content Posting API with "Upload to inbox" mode, which lets the creator finish in TikTok. Plan audit work: domain verification for the media CDN and a consent UI.
- Fans from TikTok land in TikTok's in-app browser, so the same IAB handling from Q7 applies.

### Gaps
- No official TikTok documentation found on TikTok Stories sharing for third parties. It appears unavailable.
- The exact unaudited cap (5 creators/24h) was not confirmed on TikTok's own page.
- Whether TikTok shows up as a Web Share target for images or video from mobile Safari/Chrome is undocumented and needs device testing.

---

## 5. X/Twitter: tweet intent, Cards, and Solana Actions/Blinks

### Takeaway
Use the Web Intent `https://x.com/intent/tweet?text=&url=` (the `/intent/post` alias is common but not in the docs I retrieved). Use `summary_large_image` card tags, with a 1200x630 image under 5MB. The Card Validator no longer previews, so test in the composer. Cards cache for up to about 7 days. **Blinks** are technically feasible for "Buy YES / Buy NO" with Panta-built transactions, and an open-source Panta app (Pot) already does it. But blinks unfurl on X only for **desktop** users who have a wallet extension (Phantom/Backpack/OKX/Dialect) with blinks enabled, and only for registry-approved actions. On mobile they fall back to a normal link, the dial.to interstitial, or the wallet's in-app browser. So blinks are a desktop power-user bonus, not the main mobile growth loop.

### Cited Findings
- **Web Intent:** endpoint `https://x.com/intent/tweet` with `text`, `url`, `hashtags`, `via`, `related`. The combined length should stay within 280 characters, and `url` is shortened by t.co. — [X docs: Web intent](https://docs.x.com/x-for-websites/post-button/guides/web-intent)
- A developer-forum bug report says intent URLs (`x.com/intent/post`) sometimes open the login page inside the X app instead of the composer. Its current status is unknown. — [X devcommunity bug](https://devcommunity.x.com/t/bug-intent-urls-x-com-intent-post-open-login-page-inside-x-app-instead-of-post-composer/250749)
- **Card Validator:** previews were removed in August 2022. Use the Tweet composer to preview. Card data is cached for up to 7 days. — [X devcommunity: Card Validator preview removal](https://devcommunity.x.com/t/card-validator-preview-removal/175006); [Adriana Lacy on X](https://x.com/Adriana_Lacy/status/1638167061259067393)
- Cards need `<meta name="twitter:card" content="summary_large_image">`. Twitter tags use `name=`, not `property=`. X falls back to OG title, description and image, and without `twitter:card` it defaults to `summary`. Recommended image is 1200x630 (min 300x157). — [seotest.app](https://seotest.app/blog/twitter-card-meta-tags-implementation); [ogimage.io](https://ogimage.io/resources/twitter-card-size)
- Next.js enforces `twitter-image` ≤ 5MB and `opengraph-image` ≤ 8MB, citing X and Facebook docs. — [Next.js opengraph-image docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- **Actions spec (Solana docs, now at `/docs/tools/actions`):**
  - `GET` returns `{type, icon, title, description, label, disabled?, links.actions[] (each with href, label, parameters), error?}`.
  - `POST` takes `{account}` and returns `{type:"transaction", transaction: <base64>, message?, links.next?}` for chaining.
  - `OPTIONS` and all responses need CORS: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET,POST,PUT,OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization, Content-Encoding, Accept-Encoding`.
  - `actions.json` sits at the domain root with `rules` (`pathPattern` → `apiPath`) and must also be served with ACAO `*`.
  - Blink URL format: `https://example.domain/?action=<urlencoded solana-action:...>`.
  — [Solana docs: Actions and Blinks](https://solana.com/docs/tools/actions) (read from [solana-com source](https://github.com/solana-foundation/solana-com/blob/main/apps/docs/content/docs/en/tools/actions.mdx))
- POST transaction rules: if the transaction is unsigned, the client replaces `feePayer` with the user's `account` and refreshes `recentBlockhash`. If it is partially signed, the client must not alter them. The client signs only for `account`. If any other signature is expected, it must reject the transaction as malicious. — [Solana docs: Actions](https://solana.com/docs/tools/actions)
- **Unfurling and registry:** "As of launch, only Actions that have been registered in the Dialect registry will unfurl in the Twitter feed." Unverified links render as normal URLs. Apply at `dial.to/register`. All blinks still render on the `dial.to` interstitial with their registry status shown. — [Solana docs: Actions](https://solana.com/docs/tools/actions)
- Phantom renders blinks on X only through its **browser extension**. The feature is disabled by default: Settings → Experimental Features → Blinks. Phantom renders only Dialect-registered actions. — search summary of [Phantom docs: Solana Actions and Blinks](https://docs.phantom.com/developer-powertools/solana-actions-and-blinks); [Phantom on X](https://x.com/phantom/status/1805588663390105655)
- Backpack launched Dialect-powered blinks for X in June 2024. Dialect said in July 2025 that blinks work on X via the Phantom, Backpack and OKX extensions and on dial.to. On July 10, 2025 it launched a public registry with over 100 approved actions, with registry states trusted / none / blocked. — [Backpack on X](https://x.com/Backpack/status/1805588086736240678); [Dialect: Blinks Public Registry](https://www.dialect.to/blog/presenting-the-blinks-public-registry); [Dialect docs: Register your Blink](https://docs.dialect.to/blinks/blinks-provider/blink-registry)
- **Adoption caveats:**
  - Blockworks reported discoverability problems and limited mobile usage.
  - A Dialect co-founder later called the Chrome-extension injection approach flawed, "A lack of mobile support is just one of many."
  - No 2026 announcement changes how X unfurls blinks.
  — [Blockworks](https://blockworks.com/news/lightspeed-newsletter-solana-blinks-twitter); [X post by Dialect co-founder (search summary)](https://x.com/aliquotchris/status/1948802003720630670)
- No evidence the Phantom *mobile* app renders blinks natively. On mobile, connecting works only inside Phantom's in-app browser. — search summary of [Phantom help: Connect to apps](https://help.phantom.com/hc/en-us/articles/29995498642195-Connect-Phantom-to-an-app); [Solana forum sRFC](https://forum.solana.com/t/directly-supporting-blinks-in-wallets-aside-from-external-sites-x/2539)
- Dialect's `@dialectlabs/blinks` SDK (repo updated Aug 18, 2026) gives a React `BlinkComponent` with `x-dark`/`x-light` presets and a Chrome-extension `setupTwitterObserver`. You can embed blinks in your own site. — [dialectlabs/blinks](https://github.com/dialectlabs/blinks)
- The `solana-actions` spec package has had no commits since Nov 2024. Its latest spec is 2.4.x, which added "sign message" (2.4.0) and "optional transaction and external links" (2.3.0). — [solana-developers/solana-actions CHANGELOG](https://github.com/solana-developers/solana-actions/blob/main/packages/actions-spec/CHANGELOG.md)
- **Proof of feasibility with Panta:** the open-source Pot app does this end to end:
  - `/actions.json` rules `{"/m/*" → "/api/actions/m/*"}`.
  - `GET /api/actions/m/[id]` returns YES/NO $2/$5/$10 buttons plus a custom-amount parameter.
  - `POST` returns a Panta-built transaction (`/primaryorderquote/` → `/primaryorderbuild/`) as `{type:"transaction", transaction, message, links.next}`.
  - A chained `/next` endpoint confirms with Panta (`/primaryordersubmit/`, `/primaryorderverify/`) and reports `POST /trades/` for attribution.
  - Headers: ACAO `*`, `Access-Control-Expose-Headers: X-Action-Version, X-Blockchain-Ids`, `X-Blockchain-Ids: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (mainnet).
  - When a market is resolved or closed, it returns `disabled: true`.
  — [Baheet18/pot README and source](https://github.com/Baheet18/pot)

### Inferences
- **X share button:**
  ```js
  `https://x.com/intent/tweet?text=${encodeURIComponent('Will my next video hit 1M by Fri? I say YES. Bet me 👇')}&url=${encodeURIComponent('https://app.example/m/abc?r=cr_xyz')}`
  ```
  Keep text and URL within 280 characters. Fall back to `twitter.com/intent/tweet` if needed.
- **Blinks are cheap to add** once a Panta quote/build backend exists (about 3 endpoints plus `actions.json`).
  - Register with Dialect, since only registered actions unfurl.
  - Make the market page URL itself map via `actions.json`. The same `https://app.example/m/abc` link then shows as a card for everyone, and as a blink for desktop extension users.
  - Panta transactions expire through their blockhash. The spec says the client refreshes `recentBlockhash` only if the transaction is unsigned, so confirm Panta's build output is unsigned. Pot works this way: the user signs and the app broadcasts.
- Don't promise mobile blink trading. On phones, the market page plus an embedded wallet (or a Phantom browse deeplink) is the real path.

### Gaps
- `docs.x.com` and Dialect's docs pages were not fetched directly. Whether `x.com/intent/post` is officially documented is not confirmed.
- No current (2026) numbers on how many X users have blink-rendering extensions enabled.
- Current Dialect registry review criteria and timelines were not retrieved.

---

## 6. Dynamic share images (OG 1200x630, story 1080x1920) and short video for TikTok/Reels

### Takeaway
`next/og` `ImageResponse` (Satori + Resvg) is the standard way to render live-odds PNGs at the edge or in Node. It supports flexbox only, a 500KB bundle limit, and TTF/OTF/WOFF fonts (no WOFF2). Set explicit `width`/`height` (1200x630 for OG and X, 1080x1920 for stories) and a cache header of 1–5 minutes. Use a near-zero max-age for fallback images. For MVP video, an ffmpeg "still card + slow zoom/odds animation → H.264 MP4 9:16" is the simplest option. Remotion is better for templated motion, but companies with 4+ people need a paid license. Remotion Lambda costs about $0.01 per minute of output plus S3.

### Cited Findings
- `new ImageResponse(element, { width=1200, height=630, emoji, fonts:[{name,data,weight,style}], debug, status, statusText, headers })` from `next/og`. It uses @vercel/og, Satori and Resvg to make PNG. "Only flexbox and a subset of CSS… `display: grid` will not work." "Maximum bundle size of 500KB" including fonts and images. "Only ttf, otf, and woff font formats are supported." — [Next.js ImageResponse docs](https://nextjs.org/docs/app/api-reference/functions/image-response) (read from [next.js source](https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/04-functions/image-response.mdx))
- `opengraph-image.tsx` and `twitter-image.tsx` file conventions are cached by default unless they use request-time APIs or uncached data. `generateImageMetadata` produces multiple images. — [Next.js opengraph-image docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- Satori is not a full CSS engine. It uses the Yoga flexbox engine, has no `<style>` or `<link>`, and no `<input>`. WOFF2 is not supported. It has no RTL bidi. Emoji can be loaded via `graphemeImages` or `loadAdditionalAsset`. React hooks are not supported. — [vercel/satori README](https://github.com/vercel/satori)
- Farcaster's guidance for dynamic embed images (applies generally): serve dynamic images from a stable URL with `Cache-Control: public, immutable, no-transform, max-age=300`. Always use a non-zero max-age, or users see gray images and costs rise. Use a very short or 0 max-age for error and fallback images. — [Farcaster Mini Apps: Sharing](https://miniapps.farcaster.xyz/docs/guides/sharing) (read from [farcasterxyz/miniapps source](https://github.com/farcasterxyz/miniapps/blob/main/site/pages/docs/guides/sharing.mdx))
- Real Panta-app example: Pot's `/api/og/[id]` renders 1200x630 (and 800x800 square for blink icons) with live pot size and a YES/NO split bar, using `cache-control: public, max-age=120, s-maxage=120, stale-while-revalidate=600`. — [Baheet18/pot og route](https://github.com/Baheet18/pot)
- **Remotion license:** free for individuals, for-profits with up to 3 employees, and non-profits. Other companies need a Company License (remotion.pro). — [Remotion LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- **Remotion Lambda cost examples** (2048MB, us-east-1): Hello World about $0.001 per render; 10-minute HD about $0.10–0.11; "cost per minute from $0.01". S3 and data transfer are extra. `estimatePrice()` is available. — [Remotion Lambda cost example](https://www.remotion.dev/docs/lambda/cost-example); [Remotion Lambda](https://www.remotion.dev/lambda)
- ffmpeg image → 9:16 video pattern: `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`. Normalize all inputs to one resolution. `xfade` is finicky. — [Bannerbear](https://www.bannerbear.com/blog/how-to-create-a-slideshow-from-images-with-ffmpeg/); [Plainly](https://www.plainlyvideos.com/blog/ffmpeg-convert-images-to-video)

### Inferences
- **Endpoints:**
  - `/api/card/[marketId]?v=<oddsBucket>&f=og|story|square` returns `ImageResponse`.
  - Size by format: og 1200x630 (target JPEG-like file size; `ImageResponse` outputs PNG, so keep visuals flat for small size), story 1080x1920, square 1080x1080.
  - Put `v=` (rounded odds, or a timestamp bucket) in the `og:image` URL so WhatsApp and X caches refresh when odds move.
- **Watch file size for WhatsApp:** PNGs with gradients or photos can exceed 300–600KB. Consider converting to JPEG via `sharp` in a Node route if previews fail.
- **Story card layout:** keep the top 250px and bottom ~340px free of key text. Put the QR code and short URL in the middle-lower band, above where the link sticker typically goes.
- **MVP video:** render the story PNG, then `ffmpeg -loop 1 -i card.png -t 6 -vf "zoompan=...,format=yuv420p" -c:v libx264 -r 30 -movflags +faststart out.mp4`. This command is my composition and untested. It is enough for TikTok/Reels uploads. Remotion is for later, animated odds-ticker videos, with a license check.

### Gaps
- No primary Vercel docs retrieved on `@vercel/og` runtime limits on Vercel's current platform (edge vs node, memory, timeouts).
- No measured file sizes for typical Satori outputs.

---

## 7. Deep links, in-app browsers (IAB), wallets on mobile, embedded wallets, passkeys

### Takeaway
Most fans arrive inside Instagram, TikTok or X in-app browsers.
- **Constraints:**
  - No wallet extension.
  - Google OAuth is blocked (`disallowed_useragent`).
  - Passkeys are restricted.
  - Android IABs are WebViews (no Web Share, WebAuthn off unless the app enables it).
  - Phantom mobile can only connect inside its own in-app browser.
  - Solana Mobile Wallet Adapter works only in Android Chrome.
- **Strategy:**
  1. Let fans browse odds with zero login inside the IAB.
  2. On "Trade", offer an embedded wallet using email OTP or SMS, which works in IABs, rather than Google OAuth or passkeys.
  3. Also offer "Open in Phantom/Solflare" (browse deeplinks) and "Open in browser" escape links.
  4. Detect the IAB via user-agent tokens.

### Cited Findings
- Instagram, TikTok, Facebook, Messenger, LinkedIn, Snapchat and Telegram open links in embedded web views. Passkeys fail on Android because WebAuthn is off unless the host app opts in. Google sign-in fails due to Google's embedded-UA policy. — [WoCo-Event-App issue #812](https://github.com/yea-80y/WoCo-Event-App/issues/812)
- Google blocks OAuth in embedded webviews with `disallowed_useragent` (enforced Sept 30, 2021 for the remaining cases). — [Google Developers Blog](https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/)
- Privy docs: "Google OAuth login may not work in in-app browsers (IABs), such as those embedded in social apps, due to Google's restrictions." — [Privy: Configure login methods](https://docs.privy.io/basics/get-started/dashboard/configure-login-methods)
- Passkeys in iOS WKWebView reach only the host app's associated domains. So a site's passkey generally isn't usable in Instagram's or TikTok's IAB. — search summary citing [Corbado: Passkeys in In-App Browsers](https://www.corbado.com/blog/passkeys-in-app-browsers)
- **UA tokens** (community-compiled, not vendor-documented):
  - Facebook: `FBAN`, `FBAV`, `FB_IAB`, `FBIOS`, `FB4A`
  - Instagram: `Instagram <ver>`
  - TikTok: `BytedanceWebview`, `musical_ly`, `trill_`, `aweme`
  - Messenger: `MessengerForiOS`, `Orca-Android`
  - Others: `Snapchat`, `LinkedInApp`, `Line/`, Threads `Barcelona`
  - Generic Android WebView: `; wv)`. iOS: `Mobile/` without `Safari/`. Exclude iOS home-screen PWAs (`navigator.standalone`).
  — [useragent.in IAB list](https://useragent.in/in-app-browser-user-agents); [gotoapp.store](https://gotoapp.store/blog/detect-in-app-browser); [Legate.Studio PR #92](https://github.com/crewport-repos/Legate.Studio/pull/92); [flyn.to](https://www.flyn.to/blog/instagram-in-app-browser)
- **Escape hatches (undocumented, fragile):**
  - Android: `intent://<host><path>#Intent;scheme=https;package=com.android.chrome;end`.
  - iOS: `x-safari-https://<url>`, reported to work in TikTok, Reddit, X, Telegram and LinkedIn by one 2026 write-up and not in TikTok by another.
  - Inside Instagram/Threads, Meta's `instagram://extbrowser/?url=` or `barcelona://extbrowser/` via a meta refresh is reported to work.
  - A Feb 2026 report says one trick broke after an Instagram update.
  — [plugwith.me (2026)](https://plugwith.me/blog/what-escapes-instagram-in-app-browser-in-2026/); [WoCo issue #812](https://github.com/yea-80y/WoCo-Event-App/issues/812); [browser-switcher DEV article](https://dev.to/jakkimcfly/how-to-seamlessly-switch-between-browsers-in-your-web-app-with-browser-switcher-54lo)
- **Phantom browse deeplink:** `https://phantom.app/ul/browse/<urlencoded url>?ref=<urlencoded ref>`. It opens the page in Phantom's in-app browser, needs no session, and works from a QR scan or link click. It is "not intended to be pasted into mobile web browsers". — [Phantom docs: Browse](https://docs.phantom.com/phantom-deeplinks/other-methods/browse) (read from [phantom/docs source](https://github.com/phantom/docs/blob/master/phantom-deeplinks/other-methods/browse.md))
- **Solflare browse:** `https://solflare.com/ul/v1/browse/<url>?ref=<ref>`. Its docs also show a version without `v1`, so test both. — [Solflare docs: Browse](https://docs.solflare.com/solflare/technical/deeplinks/other-methods/browse)
- Phantom help: on mobile, connecting only works inside Phantom's in-app browser. Safari or Chrome may redirect users to download Phantom. — [Phantom Help Center](https://help.phantom.com/hc/en-us/articles/29995498642195-Connect-Phantom-to-an-app)
- **Phantom Connect SDKs (React / Browser / React Native):**
  - Google or Apple login creates embedded Solana wallets with no extension.
  - `providers: ["google","apple","injected"]`.
  - A "deeplink" provider opens the Phantom app on mobile when the extension is absent.
  - 7-day sessions.
  — [Phantom Connect SDKs overview](https://docs.phantom.com/wallet-sdks-overview); [Browser SDK](https://docs.phantom.com/sdks/browser-sdk); [phantom-connect-sdk GitHub](https://github.com/phantom/phantom-connect-sdk)
- **Mobile Wallet Adapter:** web support is tested on Android Chrome only. Firefox, Opera and Brave are listed as unsupported. MWA is not available on iOS (Safari or native) because iOS suspends backgrounded apps. On iOS, use the wallet in-app browser or Safari web extension wallets. — [Solana Mobile: MWA for Web Apps](https://docs.solanamobile.com/mobile-wallet-adapter/web-apps); [Solana Mobile: Wallet Signing on iOS](https://docs.solanamobile.com/blog/ios-wallet-signing)
- Phantom deeplink payload limit: Android has about a 500KB intent limit (crash `TransactionTooLarge` over ~31k chars); iOS about 1MB. — [Phantom docs: Limitations](https://github.com/phantom/docs/blob/master/phantom-deeplinks/limitations.md)

### Inferences
- **Landing-page decision tree on `/m/[id]`:**
  1. Always render the market (question, live odds, creator, countdown) server-side with no login.
  2. If an IAB is detected (UA regex), show a sticky banner: "For the smoothest trade, open in Safari/Chrome", with platform-specific escape links and copy-link as a fallback.
  3. The "Trade YES/NO" sheet offers:
     - Continue with email or phone (an embedded wallet such as Privy, Dynamic, Web3Auth or Phantom Connect). Email OTP avoids the Google OAuth block; hide the Google button inside IABs.
     - "Open in Phantom" or "Open in Solflare" (browse deeplinks carrying the same `?r=` ref).
     - Desktop: wallet-adapter (extension) plus blinks.
  4. On Android Chrome, wallet-adapter auto-includes MWA.
- **Passkey-based embedded wallets** (passkey as the only auth factor) are risky for IAB traffic. Use OTP first and add passkeys later in the real browser.
- **Carry attribution through every hop** (escape link, wallet browse link, embedded-wallet signup). Put the ref in the path or query and also persist it server-side on first visit, because IAB cookies and storage are isolated from the real browser.

### Gaps
- No first-party docs from Privy, Dynamic or Web3Auth on email-OTP embedded-wallet behavior specifically inside Instagram or TikTok IABs (the Privy Google OAuth note is the only one found). Device testing is needed.
- No authoritative confirmation that Phantom Connect's Google/Apple login works inside IABs. It likely hits the same Google `disallowed_useragent` block, which is my inference.
- Escape-hatch URL schemes are undocumented and change frequently.

---

## 8. Attribution: referral codes, UTMs, per-creator short links, QR codes, share→visit→trade funnel, on-chain attribution with Panta

### Takeaway
Give every share a compact ref, a creator ID plus channel plus optional sharer ID, and put it in the URL (`?r=`) along with UTMs. Persist the ref server-side at first visit. Carry it through every escape or deeplink. Send it to Panta's attribution step: in the Pot integration, `POST /trades/` with `userId` / `X-User-Id` set to the ref. For the strongest on-chain proof, also consider the Solana Actions "Action Identity" memo. Short-link vendors such as Dub provide click → lead → sale funnels via `dub_id` plus `/track/lead` and `/track/sale`.

### Cited Findings
- **Panta trade flow with attribution (as implemented by Pot):**
  - `POST /primaryorderquote/` → `POST /primaryorderbuild/` → wallet signs and broadcasts → `POST /primaryordersubmit/` → `POST /primaryorderverify/` → `POST /trades/`.
  - The last call does the attribution, with `userId` / `X-User-Id` set to the group or member ref.
  - Base `https://live-api.panta.market/api/v1`; keys `pk_test` (sandbox fixtures) and `pk_live`.
  - Pot's refs: `g<chatId>`, `g<chatId>u<userId>`, `x<handle>`, `web`. Panta userId is `"pot:" + ref`. Refs are HMAC-signed.
  — [Baheet18/pot README and packages/core/src/refs.ts](https://github.com/Baheet18/pot)
- Other Panta integrations report the same `X-User-Id` attribution header (env `PANTA_USER_ID`). A trade counts as "attributed" once Panta returns `processed` or the trade appears in `GET /account/trades/`. Creator-fee claims were rejected on `POST /trades/` with `TX_MISMATCH` in one project. Endpoint names vary across repos (`/trade/quote/` vs `/primaryorder…`). — [Pantomath251/fairline](https://github.com/Pantomath251/fairline); [rishu4436/panta-brief-command](https://github.com/rishu4436/panta-brief-command) (hackathon projects, not Panta's official docs)
- Pot notes that Panta markets are parimutuel with a creator royalty (20%, cut to 10/5/0% when 90%+ of traders pick one side) and a 2% trading fee. A "Powered by Panta" credit is required by Panta's terms (section 6). — [Baheet18/pot README](https://github.com/Baheet18/pot) (third-party reading of Panta terms; verify)
- **Solana Action Identity (on-chain attribution):**
  - The provider includes an SPL Memo `solana-action:<identity>:<reference>:<signature>`, signed by an identity keypair.
  - `identity` and `reference` are added as read-only non-signer keys on a non-memo instruction.
  - A `reference` is single-use.
  - Indexers verify with `getSignaturesForAddress(identity)` and check the memo signature.
  — [Solana docs: Action Identity](https://solana.com/docs/tools/actions)
- **Dub short links:**
  - Lead tracking: `POST /track/lead` with a click ID from the `dub_id` cookie.
  - Sales via `POST /track/sale`.
  - Funnel of clicks → leads → sales, plus webhooks.
  - Partner programs with pay-per-click/lead/sale.
  - Conversion tracking needs the Business plan or higher (per Dub and RudderStack docs).
  - Deep-link attribution is iOS-first.
  — [Dub: Leads](https://dub.co/docs/conversions/leads); [Dub: track lead API](https://dub.co/docs/api-reference/endpoint/track-lead); [Dub: Deep link attribution](https://dub.co/docs/concepts/deep-links/attribution); [Dub Partners](https://dub.co/help/article/dub-partners); [RudderStack Dub FAQ](https://www.rudderstack.com/docs/destinations/streaming-destinations/dub/faq/)
- Farcaster merges the opened URL's query params (e.g. `?ref=`) into the embed's `action.url`, so refs survive into the mini app. — [Farcaster Mini Apps: Sharing](https://miniapps.farcaster.xyz/docs/guides/sharing)
- Telegram `startapp` payloads are capped at 64 characters and arrive as `start_param`. — [telega deep_link docs](https://telega.hexdocs.pm/telega/deep_link.html); [Telegram Mini Apps docs](https://core.telegram.org/bots/webapps)

### Inferences
- **URL scheme:** `https://app.example/m/<marketId>?r=<creatorId>.<channel>[.<sharerId>]&utm_source=<wa|ig|tt|x|fc|tg>&utm_medium=social&utm_campaign=<marketId>`.
  - Channel codes: `wa_chat`, `wa_status`, `ig_story`, `tt_bio`, `x_post`, `x_blink`, `qr`.
  - Use the same ref in QR codes on story images, adding `qr` to the channel.
  - Keep refs short: under 64 characters for Telegram, and URL-length-friendly for X.
- **Server events:**
  1. `share_click` (client, before opening the target)
  2. `landing_view` (server, sets a first-touch ref cookie plus DB row keyed by an anonymous id)
  3. `wallet_connected` (bind anon id → wallet)
  4. `trade_built`
  5. `trade_confirmed` (tx signature)
  6. Panta `POST /trades/` with `X-User-Id = <app>:<ref>` (attributed)
  Join on the tx signature for share→trade conversion per creator and per channel.
- **Per-creator vanity links** (`app.example/@creator`) for bio links. Optionally a Dub custom domain if you want built-in click analytics, but first-party refs are enough for an MVP.
- **On-chain proof:** whether a Panta-built transaction can carry an extra memo or Action Identity depends on whether Panta returns a partially signed transaction. If it is pre-signed, it can't be altered. Prefer Panta's own `POST /trades/` attribution and keep the Action Identity as optional.

### Gaps
- Panta's official attribution and verification docs were not retrieved. Endpoint names, the meaning of `X-User-Id`, whether builder or creator revenue share is tied to attribution, and the "verifying trades" semantics need confirmation from Panta's own docs. The repos above are hackathon builds.
- Whether Panta-built transactions are unsigned or partially signed is unknown. That affects blink compatibility and memo insertion.

---

## 9. Farcaster Mini Apps and Telegram Mini Apps (brief)

### Takeaway
Both are strong secondary channels with native wallet context. **Farcaster**: add an `fc:miniapp` meta tag to each market URL and the cast becomes a 3:2 image card with a launch button. Inside, `@farcaster/mini-app-solana` gives a Solana wallet via Wallet Standard with no connect dialog. Farcaster's docs even use "a prediction market app can let users share an embed for each market" as an example. **Telegram**: `t.me/<bot>/<app>?startapp=<ref ≤64 chars>` opens a Mini App with `start_param`. Wallets are TON-first, so Solana needs an embedded wallet SDK or a deeplink to Phantom. A Panta-based Telegram bot (Pot) already exists as reference.

### Cited Findings
- **Farcaster embed meta:**
  - `<meta name="fc:miniapp" content='{"version":"1","imageUrl":"...","button":{"title":"...","action":{"type":"launch_miniapp","url":"...","name":"...","splashImageUrl":"...","splashBackgroundColor":"#..."}}}'>`, plus `fc:frame` for backward compatibility.
  - Image: 3:2, 600x400 min, 3000x2000 max, under 10MB, URL ≤ 1024 characters. PNG recommended; SVG discouraged.
  - Embeds are scraped once and cached per cast.
  — [Farcaster Mini Apps: Sharing](https://miniapps.farcaster.xyz/docs/guides/sharing)
- **Farcaster Solana:** wrap the app in `FarcasterSolanaProvider` from `@farcaster/mini-app-solana`. It registers the Farcaster wallet via Wallet Standard and auto-selects it in wallet-adapter. — [Farcaster Mini Apps: Solana](https://miniapps.farcaster.xyz/docs/guides/solana) (read from [farcasterxyz/miniapps source](https://github.com/farcasterxyz/miniapps/blob/main/site/pages/docs/guides/solana.mdx))
- **Telegram:**
  - Direct link `t.me/<botusername>/<appname>?startapp=<payload>`. The payload is ≤ 64 characters (base64 data over ~48 bytes won't fit). It is passed as `start_param`. Mini Apps can launch from links in any chat.
  - The ecosystem is TON-first: Tonkeeper or the built-in wallet. Solana options are third-party, e.g. TMAWallet SDK.
  — [Telegram: Mini Apps](https://core.telegram.org/bots/webapps); [telega deep_link](https://telega.hexdocs.pm/telega/deep_link.html); [Reown: Top Telegram mini apps 2026](https://reown.com/blog/top-telegram-mini-apps); [TMAWallet SDK README](https://unpkg.com/@tmawallet/sdk@2.1.9/README.md)
- **Panta-on-Telegram reference:** the Pot bot creates markets with `/new`, has members buy YES/NO via signed links in Phantom or share as Solana Blinks, credits each buy to the group or member ref, and posts settlement receipts. — [Baheet18/pot](https://github.com/Baheet18/pot)

### Inferences
- Add `fc:miniapp` alongside OG and Twitter tags on `/m/[id]` from day one; it costs almost nothing. Reuse the 1200x630 card generator with a 3:2 variant (1200x800).
- Telegram is a natural fit for creator fan groups. The ref goes in `startapp`. Wallets go through an embedded wallet or a Phantom browse deeplink.

### Gaps
- No official Telegram documentation on Solana wallets in Mini Apps. Telegram's blockchain guidelines (TON-only requirements for some features) were not retrieved and should be checked before relying on a Solana-only Mini App.
