"use client";

import { Check, Loader2 } from "lucide-react";
import type { TxPhase } from "@/lib/client/use-tx";
import { cn } from "./ui";

const STEPS: { key: TxPhase; label: string }[] = [
  { key: "preparing", label: "Preparing" },
  { key: "signing", label: "Waiting for your confirmation" },
  { key: "sending", label: "Sending to Solana" },
  { key: "confirming", label: "Confirming" },
  { key: "done", label: "Done" },
];

// Flighty-style status timeline: nodes joined by a rail that fills as steps complete.
export function TxTimeline({ phase }: { phase: TxPhase }) {
  const idx = STEPS.findIndex((s) => s.key === phase);
  return (
    <ol className="flex flex-col" aria-live="polite">
      {STEPS.map((s, i) => {
        const done = idx > i || phase === "done";
        const active = idx === i && phase !== "done";
        const last = i === STEPS.length - 1;
        return (
          <li key={s.key} className={cn("relative flex items-start gap-3.5", !last && "pb-5")} aria-current={active ? "step" : undefined}>
            {!last ? (
              <span aria-hidden className={cn("absolute bottom-0.5 left-[11px] top-[26px] w-0.5 rounded-full transition-colors duration-200", done ? "bg-fg" : "bg-hairline")} />
            ) : null}
            <span
              className={cn(
                "relative inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                done ? "bg-fg text-canvas" : active ? "border-2 border-fg text-fg" : "border-2 border-hairline",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3.5} aria-hidden /> : active ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            </span>
            <span className={cn("pt-0.5 text-[15px] leading-5", done ? "text-fg" : active ? "font-semibold text-fg" : "text-fg-3")}>
              {s.label}
              {done && !last ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
