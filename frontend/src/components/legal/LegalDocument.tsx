import Link from "next/link";
import type { LegalDocumentData } from "@/components/legal/legal-data";

export function LegalDocument({ document }: { document: LegalDocumentData }) {
  return (
    <main className="section-shell py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/sozlesmeler" className="text-sm font-semibold text-orange-600 hover:underline">
          ← Sözleşmeler ve Yasal Metinler
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {document.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{document.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border bg-white px-3 py-1.5">Sürüm 1.0</span>
          <span className="rounded-full border bg-white px-3 py-1.5">Son Güncelleme: 11 Eylül 2026</span>
        </div>

        <article className="mt-8 space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-xl font-bold text-slate-950">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </article>

        <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-slate-700">
          <strong>Platform İşletmecisi:</strong> TEKNONET Yazılım ve Bilgisayar Atilla ALICI
          <br />
          <strong>Platform:</strong> Neye İhtiyaç Var – neyeihtiyacvar.com
          <br />
          <strong>Adres:</strong> Ahmet Yesevi Mahallesi, 16723 Sokak No:10, Merkez / Osmaniye
        </div>
      </div>
    </main>
  );
}