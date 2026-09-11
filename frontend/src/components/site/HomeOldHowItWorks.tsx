import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
  Search,
  Store,
  Star,
} from "lucide-react";

const steps = [
  {
    number: "1",
    icon: MessageSquareText,
    title: "İhtiyacını anlat",
    description:
      "Ne aradığını kendi cümlenle yaz. Sistem ihtiyacını anlayıp uygun hizmeti belirler.",
  },
  {
    number: "2",
    icon: Search,
    title: "Uygun işletmeleri gör",
    description:
      "Konumuna ve ihtiyacına uygun, yayındaki işletmeleri karşılaştır.",
  },
  {
    number: "3",
    icon: Store,
    title: "İşletmeyle iletişime geç",
    description:
      "İşletme profilini incele, teklif al veya doğrudan ihtiyacını işletmeye ilet.",
  },
  {
    number: "4",
    icon: CheckCircle2,
    title: "İşi tamamla",
    description:
      "Teklifi kabul et, hizmeti al ve süreç tamamlandığında işi sonuçlandır.",
  },
  {
    number: "5",
    icon: Star,
    title: "Değerlendir",
    description:
      "Tamamlanan iş sonrasında gerçek deneyimini yıldız ve yorumla paylaş.",
  },
];

export function HomeOldHowItWorks() {
  return (
    <section className="border-y border-orange-100 bg-orange-50/40">
      <div className="section-shell py-6 sm:py-8 lg:py-10">
        <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 sm:text-xs">
            Nasıl Çalışır?
          </span>

          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            İhtiyacını yaz, doğru işletmeye ulaş
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Neye İhtiyaç Var?, ihtiyacını anlamaktan gerçek müşteri
            değerlendirmesine kadar süreci tek yerde toplar.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.number}
                  className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>

                    <div>
                      <h3 className="font-display text-sm font-bold sm:text-base">
                        {step.number}. {step.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6">
            <Link
              href="/ihtiyac-olustur"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              İhtiyacını Oluştur
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}