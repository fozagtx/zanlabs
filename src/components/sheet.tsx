"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/cn";

// Bottom sheet for secondary tasks on mobile (trade ticket, share, settings):
// a raised black sheet with a grab handle.
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  dismissible = true,
  hideHeader,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  dismissible?: boolean;
  /** Keep the title and description for screen readers only (when the content has its own hero). */
  hideHeader?: boolean;
  /** Extra classes for the scrolling content area. */
  className?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Drawer.Content className="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px] border-t border-hairline/70 bg-raised shadow-[0_-8px_40px_rgba(0,0,0,.6)] outline-none">
          <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-white/20" aria-hidden />
          <div className={cn("px-5 pt-4", hideHeader && "sr-only")}>
            <Drawer.Title className="text-[20px] font-bold leading-tight tracking-[-0.01em]">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="mt-1 text-[13px] leading-[1.45] text-fg-2">{description}</Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title}</Drawer.Description>
            )}
          </div>
          <div className={cn("overflow-y-auto px-5 pb-5", hideHeader ? "pt-3" : "pt-5", className)}>{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
