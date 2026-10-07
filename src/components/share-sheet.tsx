"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Camera, Copy, Download, Image as ImageIcon, MessageCircle, Music2, Send } from "lucide-react";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import type { ShareChannel } from "@/lib/config";
import { Sheet } from "./sheet";
import { Button } from "./ui";

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

  const actions: { key: ShareChannel; label: string; hint: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      key: "wa_status",
      label: "WhatsApp Status",
      hint: "Share the image, pick WhatsApp → My status",
      icon: <ImageIcon className="size-5" />,
      onClick: () => shareImage("wa_status"),
    },
    {
      key: "wa_chat",
      label: "WhatsApp chat or group",
      hint: "Sends the link with a preview card",
      icon: <MessageCircle className="size-5" />,
      onClick: () => {
        log("wa_chat");
        window.open(`https://wa.me/?text=${encodeURIComponent(`${caption} ${link("wa_chat")}`)}`, "_blank", "noopener");
      },
    },
    {
      key: "ig_story",
      label: "Instagram Story",
      hint: "Post the image, then add the copied link with the Link sticker",
      icon: <Camera className="size-5" />,
      onClick: () =>
        shareImage("ig_story", () => {
          void copy(link("ig_story"), "Link copied. Add it with the Link sticker.");
        }),
    },
    {
      key: "tt_bio",
      label: "TikTok",
      hint: "Saves the image and copies a caption that points to your bio link",
      icon: <Music2 className="size-5" />,
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
      icon: <Send className="size-5" />,
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
      icon: <Copy className="size-5" />,
      onClick: () => {
        log("copy");
        void copy(link("copy"), "Link copied.");
      },
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={pickSide ? "Share your pick" : isCreator ? "Share your call" : "Share this call"} description="Every share is tracked so the creator gets credit.">
      <div className="flex flex-col gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {origin ? <img src={cardUrl("wa_status")} alt="Story card preview" className="mx-auto aspect-[9/16] w-40 rounded-2xl border border-line object-cover" /> : null}
        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <li key={a.key}>
              <button onClick={a.onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg px-4 py-3 text-left hover:bg-surface-2">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-surface-2 text-coral">{a.icon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold">{a.label}</span>
                  <span className="block text-xs text-muted">{a.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" onClick={() => download("qr")}>
          <Download className="size-4" /> Download story image
        </Button>
        {market.kind === "panta" && isCreator ? (
          <p className="text-xs text-muted">The card and caption include &quot;#ad · I earn fees&quot;. Keep it on your post: promoting a market you earn from is advertising.</p>
        ) : null}
      </div>
    </Sheet>
  );
}
