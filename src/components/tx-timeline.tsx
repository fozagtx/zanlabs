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

export function TxTimeline({ phase }: { phase: TxPhase }) {
  const idx = STEPS.findIndex((s) => s.key === phase);
  return (
    <ol className="flex flex-col gap-2.5" aria-live="polite">
      {STEPS.map((s, i) => {
        const done = idx > i || phase === "done";
        const active = idx === i && phase !== "done";
        return (
          <li key={s.key} className={cn("flex items-center gap-3 text-sm", done ? "text-ink" : active ? "text-ink" : "text-muted")}>
            <span className={cn("inline-flex size-6 items-center justify-center rounded-full", done ? "bg-yes text-yes-ink" : active ? "bg-surface-2" : "bg-surface-2/60")}>
              {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-1.5 rounded-full bg-muted" />}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
