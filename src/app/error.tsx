"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Empty } from "@/components/ui";

// Any page that throws lands here, inside the normal dark shell, instead of
// the framework's default white error screen.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Empty
      className="py-24"
      icon={<TriangleAlert aria-hidden />}
      title="Something went wrong"
      body={error.digest ? `Please try again. If it keeps happening, share this code: ${error.digest}` : "Please try again."}
      action={
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-[15px] font-semibold text-black transition-[scale,background-color] duration-[120ms] ease-out hover:bg-white/90 active:scale-[0.97]"
          >
            Try again
          </button>
          <Link href="/" className="inline-flex h-11 items-center justify-center px-4 text-[15px] font-semibold text-fg-2 transition-colors hover:text-fg">
            Go home
          </Link>
        </div>
      }
    />
  );
}
