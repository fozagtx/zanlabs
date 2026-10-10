import { PANTA_SITE_URL, POWERED_BY_PANTA } from "@/lib/config";
import { cn } from "@/lib/cn";

// Exact attribution wording required by Panta's Terms (§6.3), linked to panta.market.
export function PoweredByPanta({ className }: { className?: string }) {
  return (
    <a
      href={PANTA_SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-xs font-medium text-fg-2 underline-offset-2 transition-colors hover:text-fg hover:underline", className)}
    >
      {POWERED_BY_PANTA}
    </a>
  );
}

/** Two-tone mark: a YES bar stepping up next to a NO bar stepping down. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex h-5 shrink-0 items-center gap-[3px]", className)}>
      <span className="h-3.5 w-1.5 -translate-y-[3px] rounded-full bg-yes" />
      <span className="h-3.5 w-1.5 translate-y-[3px] rounded-full bg-no" />
    </span>
  );
}

/** Wordmark "zan" in white with the two-tone mark. `markOnly` keeps the name for screen readers. */
export function Logo({ className, markOnly }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[22px] font-extrabold leading-none tracking-[-0.04em] text-fg", className)}>
      <LogoMark />
      <span className={cn(markOnly && "sr-only")}>zan</span>
    </span>
  );
}

export function SandboxBanner() {
  return (
    <div className="bg-warn px-4 py-1.5 text-center text-xs font-bold text-black" role="status">
      Sandbox: Panta test data, not real money
    </div>
  );
}
