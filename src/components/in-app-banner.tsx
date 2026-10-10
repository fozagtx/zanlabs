"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSession } from "@/lib/client/session";
import { externalBrowserUrl, isIOS, phantomBrowseUrl } from "@/lib/ua";

const NAMES: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
  snapchat: "Snapchat",
  webview: "an in-app",
};

// Fans arrive inside Instagram/TikTok/X browsers. Explain the two working
// paths: sign in with phone/email right here, or escape to a real browser.
export function InAppBanner() {
  const s = useSession();
  const [hidden, setHidden] = useState(true);
  const [href, setHref] = useState<{ ext: string | null; phantom: string; ios: boolean } | null>(null);

  useEffect(() => {
    if (!s.inApp) return;
    try {
      if (sessionStorage.getItem("zan_iab_hidden") === "1") return;
    } catch {
      /* storage blocked */
    }
    setHidden(false);
    setHref({
      ext: externalBrowserUrl(location.href, navigator.userAgent),
      phantom: phantomBrowseUrl(location.href, location.origin),
      ios: isIOS(navigator.userAgent),
    });
  }, [s.inApp]);

  if (!s.inApp || hidden || !href) return null;
  const name = NAMES[s.browser] ?? "an in-app";
  return (
    <div className="border-b border-hairline bg-raised px-4 py-3 text-[13px] leading-[1.45]" role="region" aria-label="Browser tip">
      <div className="mx-auto flex max-w-md items-start gap-2">
        <div className="flex-1 pt-0.5">
          <p className="font-semibold text-fg">You&apos;re in {name} browser.</p>
          <p className="text-fg-2">
            Sign in with your phone or email right here, or{" "}
            {href.ext ? (
              <a className="font-semibold text-fg underline underline-offset-2" href={href.ext}>
                open in your browser
              </a>
            ) : (
              <span>tap ••• and choose &quot;Open in {href.ios ? "Safari" : "browser"}&quot;</span>
            )}
            . Have Phantom?{" "}
            <a className="font-semibold text-fg underline underline-offset-2" href={href.phantom}>
              Open in Phantom
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="-mr-2 -mt-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg-2 transition-colors hover:bg-card hover:text-fg"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem("zan_iab_hidden", "1");
            } catch {
              /* storage blocked */
            }
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
