import Link from "next/link";
import { Compass } from "lucide-react";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <Empty
      className="py-24"
      icon={<Compass aria-hidden />}
      title="This page doesn't exist"
      body="The call may have been removed, or the link is mistyped."
      action={
        <div className="flex flex-col items-center gap-1">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-[15px] font-semibold text-black transition-[scale,background-color] duration-[120ms] ease-out hover:bg-white/90 active:scale-[0.97]"
          >
            Go home
          </Link>
          <Link href="/explore" className="inline-flex h-11 items-center justify-center px-4 text-[15px] font-semibold text-fg-2 transition-colors hover:text-fg">
            Explore markets
          </Link>
        </div>
      }
    />
  );
}
