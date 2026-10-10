"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Camera, CircleDashed, Download, Link as LinkIcon, MessageCircle, Music2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import type { ShareChannel } from "@/lib/config";
import { Sheet } from "./sheet";
import { Button, cn } from "./ui";

type ShareMarket = {
  slug: string;
  question: string;
  kind: "panta" | "forecast";
  creatorHandle: string;
  creatorCall: "yes" | "no" | null;
};

// One sheet for every share channel. No web API can post straight into
// WhatsApp Status, Instagram Stories or TikTok, so the story image carries a
// QR code and short link; the OS share sheet or a download gets it there.
export function ShareSheet({
  open,
  onOpenChange,
  market,
  pickSide,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  market: ShareMarket;
  pickSide?: "yes" | "no";
}) {
  const s = useSession();
  const isCreator = Boolean(s.me?.handle && s.me.handle === market.creatorHandle);
  const sharer = !isCreator && s.me?.refCode ? s.me.refCode : null;
  const [origin, setOrigin] = useState("");
  const [files, setFiles] = useState<Partial<Record<ShareChannel, File>>>({});
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => setOrigin(location.origin), []);

  const ref = (channel: ShareChannel) => [market.creatorHandle, channel, sharer].filter(Boolean).join(".");
  const link = (channel: ShareChannel) => `${origin}/m/${market.slug}?r=${ref(channel)}`;
  const cardUrl = (channel: ShareChannel, f: "story" | "og" | "square" = "story") =>
    `/api/card/${market.slug}?f=${f}&r=${ref(channel)}${pickSide ? `&side=${pickSide}` : ""}&v=${Math.floor(Date.now() / 120_000)}`;

  const caption = useMemo(() => {
    if (pickSide) return `I'm backing ${pickSide.toUpperCase()} on @${market.creatorHandle}'s call: ${market.question}`;
    if (isCreator) {
      const call = market.creatorCall ? ` I say ${market.creatorCall.toUpperCase()}. Back me or fade me.` : " What's your call?";
      const ad = market.kind === "panta" ? " #ad · I earn fees from trades on this market." : "";
      return `${market.question}${call}${ad}`;
    }
    return `@${market.creatorHandle} made a call: ${market.question} What's yours?`;
  }, [pickSide, isCreator, market]);

  // Pre-build the story images before any tap: iOS drops the share gesture if we await first.
  useEffect(() => {
    if (!open || !origin) return;
    let cancelled = false;
    (async () => {
      const out: Partial<Record<ShareChannel, File>> = {};
      for (const ch of ["wa_status", "ig_story", "tt_bio"] as ShareChannel[]) {
        try {
          const blob = await (await fetch(cardUrl(ch))).blob();
          out[ch] = new File([blob], `zan-${market.slug}.png`, { type: "image/png" });
        } catch {
          /* image optional; download fallback still works */
        }
      }
      if (cancelled) return;
      setFiles(out);
      const probe = out.wa_status;
      setCanShareFiles(Boolean(probe && typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] })));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, origin, market.slug, pickSide, sharer]);

  function log(channel: ShareChannel) {
    void api("/api/share", { body: { slug: market.slug, event: "share", channel }, auth: true }).catch(() => {});
  }

  async function copy(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  function download(channel: ShareChannel) {
    const a = document.createElement("a");
    a.href = cardUrl(channel);
    a.download = `zan-${market.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function shareImage(channel: ShareChannel, after?: () => void) {
    log(channel);
    const file = files[channel];
    if (canShareFiles && file) {
      try {
        await navigator.share({ files: [file] });
        after?.();
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    download(channel);
    toast.success("Image saved. Post it from your gallery.");
    after?.();
  }

  // lucide has no brand marks, so each channel gets a neutral glyph on a tinted circle.
  const actions: { key: ShareChannel; label: string; hint: string; icon: ReactNode; onClick: () => void }[] = [
    {
      key: "wa_status",
      label: "WhatsApp Status",
      hint: "Share the image, pick WhatsApp → My status",
      icon: <CircleDashed className="size-6" strokeWidth={2.25} aria-hidden />,
      onClick: () => shareImage("wa_status"),
    },
    {
      key: "wa_chat",
      label: "WhatsApp",
      hint: "Sends the link with a preview card to a chat or group",
      icon: <MessageCircle className="size-6" strokeWidth={2.25} aria-hidden />,
      onClick: () => {
        log("wa_chat");
        window.open(`https://wa.me/?text=${encodeURIComponent(`${caption} ${link("wa_chat")}`)}`, "_blank", "noopener");
      },
    },
    {
      key: "ig_story",
      label: "Instagram",
      hint: "Post the image to your Story, then add the copied link with the Link sticker",
      icon: <Camera className="size-6" strokeWidth={2.25} aria-hidden />,
      onClick: () =>
        shareImage("ig_story", () => {
          void copy(link("ig_story"), "Link copied. Add it with the Link sticker.");
        }),
    },
    {
      key: "tt_bio",
      label: "TikTok",
      hint: "Saves the image and copies a caption that points to your bio link",
      icon: <Music2 className="size-6" strokeWidth={2.25} aria-hidden />,
      onClick: () => {
        log("tt_bio");
        download("tt_bio");
        const bio = isCreator ? `${origin}/@${market.creatorHandle}` : link("tt_bio");
        void copy(`${caption} Link in bio: ${bio}`, "Image saved and caption copied.");
      },
    },
    {
      key: "x_post",
      label: "X",
      hint: "Opens a post with the link card",
      icon: (
        <span aria-hidden className="text-[22px] font-black leading-none tracking-[-0.04em]">
          X
        </span>
      ),
      onClick: () => {
        log("x_post");
        const u = `https://x.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(link("x_post"))}`;
        window.open(u, "_blank", "noopener");
      },
    },
    {
      key: "copy",
      label: "Copy link",
      hint: "For anywhere else",
      icon: <LinkIcon className="size-6" strokeWidth={2.25} aria-hidden />,
      onClick: () => {
        log("copy");
        void copy(link("copy"), "Link copied.");
      },
    },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={pickSide ? "Share your pick" : isCreator ? "Share your call" : "Share this call"}
      description="Every share is tracked so the creator gets credit."
    >
      <div className="flex flex-col">
        {/* Story card preview */}
        <div className="relative mx-auto aspect-[9/16] w-[45%] max-w-[200px] overflow-hidden rounded-[20px] bg-card ring-1 ring-hairline [@media(max-height:720px)]:w-[34%]">
          {origin ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardUrl("wa_status")}
              alt="Story card preview"
              onLoad={() => setPreviewLoaded(true)}
              onError={() => setPreviewLoaded(true)}
              className={cn("absolute inset-0 size-full object-cover transition-opacity duration-200", previewLoaded ? "opacity-100" : "opacity-0")}
            />
          ) : null}
          {!previewLoaded ? <div aria-hidden className="absolute inset-0 animate-pulse bg-card" /> : null}
        </div>

        {/* Channels */}
        <ul className="no-scrollbar -mx-5 mt-6 flex snap-x gap-1 overflow-x-auto px-3" aria-label="Share to">
          {actions.map((a) => (
            <li key={a.key} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={a.onClick}
                title={a.hint}
                className="group flex w-[76px] flex-col items-center gap-2 rounded-2xl px-1 py-1.5 focus-visible:outline-offset-0"
              >
                <span
                  aria-hidden
                  className="inline-flex size-14 items-center justify-center rounded-full bg-white/[0.08] text-fg transition-[scale,background-color] duration-[120ms] ease-out group-hover:bg-white/[0.14] group-active:scale-[0.94]"
                >
                  {a.icon}
                </span>
                <span className="text-center text-[12px] font-medium leading-[1.25] text-fg-2 group-hover:text-fg">
                  {a.label}
                  <span className="sr-only">. {a.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <Button type="button" variant="ghost" className="mt-5 w-full" onClick={() => download("qr")}>
          <Download className="size-4" aria-hidden /> Download image
        </Button>
        {market.kind === "panta" && isCreator ? (
          <p className="mt-3 text-center text-[11px] leading-[1.45] text-fg-3">
            The card and caption include &quot;#ad · I earn fees&quot;. Keep it on your post: promoting a market you earn from is advertising.
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
