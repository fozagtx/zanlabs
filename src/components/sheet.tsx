"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

// Bottom sheet for secondary tasks on mobile (trade ticket, share, settings).
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Drawer.Content className="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px] border-t border-line bg-surface outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line" aria-hidden />
          <div className="px-5 pt-3">
            <Drawer.Title className="text-lg font-bold">{title}</Drawer.Title>
            {description ? <Drawer.Description className="mt-0.5 text-sm text-muted">{description}</Drawer.Description> : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
          </div>
          <div className="overflow-y-auto px-5 pb-5 pt-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
