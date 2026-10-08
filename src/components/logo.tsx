import Link from "next/link";

/**
 * Site logo (top-left). Wordmark lives at /public/logo.png (or change LOGO_SRC).
 * Height is fixed so the logo sits on the same centre line as everything else in the header.
 */
const LOGO_SRC = "/logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/user" aria-label="Home" className={`flex h-9 shrink-0 items-center md:h-11 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="VISTA" className="block h-full w-auto object-contain" draggable={false} />
    </Link>
  );
}
