import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <p className="text-lg font-bold">This page doesn&apos;t exist</p>
      <p className="text-sm text-muted">The call may have been removed, or the link is mistyped.</p>
      <Link href="/" className="inline-flex h-11 items-center rounded-2xl bg-coral px-4 font-semibold text-coral-ink">
        Go home
      </Link>
    </div>
  );
}
