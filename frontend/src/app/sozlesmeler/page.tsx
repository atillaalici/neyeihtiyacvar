import Link from "next/link";

import { legalDocuments } from "@/components/legal/legal-data";
import { SiteLayout } from "@/components/site/SiteLayout";

export default function LegalHubPage() {
  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Neye İhtiyaç Var
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Sözleşmeler ve Yasal Metinler
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            neyeihtiyacvar.com, Teknonet Yazılım
            tarafından işletilen dijital platformdur. Güncel kullanım, gizlilik ve
            kişisel verilerin korunması metinlerine bu sayfadan ulaşabilirsiniz.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {legalDocuments.map((item) => (
              <Link
                key={item.slug}
                href={`/sozlesmeler/${item.slug}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              >
                <h2 className="font-display text-lg font-bold text-slate-950">
                  {item.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.summary}
                </p>

                <span className="mt-4 inline-block text-sm font-semibold text-orange-600">
                  Metni görüntüle →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </SiteLayout>
  );
}