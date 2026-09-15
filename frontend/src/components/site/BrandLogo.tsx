import Image from "next/image";
import Link from "next/link";

export function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="neyeihtiyacvar.com ana sayfa"
      className="group inline-flex shrink-0 items-center gap-2.5"
    >
      <span className="relative block h-12 w-12 shrink-0 sm:h-[52px] sm:w-[52px]">
        <Image
          src="/brand/neyeihtiyacvar-logo.png"
          alt=""
          fill
          priority
          sizes="52px"
          className="object-contain"
        />
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span className="whitespace-nowrap font-display text-[18px] font-black tracking-[-0.035em] text-slate-950 sm:text-[21px]">
          neye
          <span className="text-orange-600">ihtiyac</span>
          var.com
        </span>

        <span className="mt-1 whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.34em] text-slate-500 sm:text-[8px]">
          Aradığın Her Şey Burada
        </span>
      </span>
    </Link>
  );
}