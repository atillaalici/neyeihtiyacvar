import Image from "next/image";
import Link from "next/link";

export function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="neyeihtiyacvar.com ana sayfa"
      className="group flex shrink-0 items-center gap-2.5"
    >
      <span className="relative block h-11 w-11 shrink-0 sm:h-12 sm:w-12">
        <Image
          src="/brand/neyeihtiyacvar-logo.png"
          alt="neyeihtiyacvar.com"
          fill
          priority
          sizes="48px"
          className="object-contain"
        />
      </span>

      <span className="hidden min-w-0 flex-col leading-none sm:flex">
        <span className="whitespace-nowrap font-display text-[19px] font-extrabold tracking-[-0.035em] text-slate-900 lg:text-[21px]">
          neye
          <span className="text-orange-600">ihtiyac</span>
          var.com
        </span>

        <span className="mt-1 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.25em] text-slate-500 lg:text-[9px]">
          Aradığın Her Şey Burada
        </span>
      </span>
    </Link>
  );
}