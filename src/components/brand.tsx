import { PANTA_SITE_URL, POWERED_BY_PANTA } from "@/lib/config";
import { cn } from "@/lib/cn";

// Exact attribution wording required by Panta's Terms (§6.3), linked to panta.market.
export function PoweredByPanta({ className }: { className?: string }) {
  return (
    <a href={PANTA_SITE_URL} target="_blank" rel="noopener noreferrer" className={cn("text-xs font-semibold text-muted underline-offset-2 hover:text-ink hover:underline", className)}>
      {POWERED_BY_PANTA}
    </a>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xl font-black tracking-tight", className)}>
      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-coral text-[15px] text-coral-ink">Z</span>
      <span>zan</span>
    </span>
  );
}

export function SandboxBanner() {
  return (
    <div className="bg-warn px-4 py-1.5 text-center text-xs font-bold text-bg">
      Sandbox: Panta test data, not real money
    </div>
  );
}
