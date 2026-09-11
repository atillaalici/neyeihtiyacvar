import Link from "next/link";
import { MessageCircle, Star, Wrench } from "lucide-react";

import { HowItWorks } from "@/components/site/HowItWorks";
import { SiteLayout } from "@/components/site/SiteLayout";

const afterSteps = [
  {
    icon: MessageCircle,
    title: "İletişime geç",
    description: "Seçtiğin işletmeyle iletişim kur.",
  },
  {
    icon: Wrench,
    title: "Hizmeti al",
    description: "Anlaştığın işletmeden hizmetini güvenle al.",
  },
  {
    icon: Star,
    title: "Deneyimini paylaş",
    description: "Yıldız ve yorumunla başkalarına yol göster.",
  },
];

export default function HowItWorksPage() {
  return (
    <SiteLayout>
      <main>
        <HowItWorks />

        <section className="section-shell pb-10 sm:pb-12 lg:pb-14">
          <div className="mx-auto max-w-7xl rounded-3xl border border-orange-200 bg-orange-50/40 p-5 sm:p-6 lg:p-7">
            <h2 className="font-display text-2xl font-bold text-slate-950">
              Sonrası çok kolay
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Doğru işletmeyi bulduktan sonra süreç birkaç basit adımda tamamlanır.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {afterSteps.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex min-w-0 items-center gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-orange-200 bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-slate-950">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/ihtiyac-olustur"
                className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                İhtiyacını Oluştur
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}