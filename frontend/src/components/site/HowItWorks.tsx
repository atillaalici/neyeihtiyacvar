import Image from "next/image";
import { ChevronRight } from "lucide-react";

const steps = [
  {
    number: "1",
    title: "İhtiyacını Yaz",
    image: "/nasil-calisir/ihtiyacini-yaz.png",
    description:
      "Ne aradığını kendi kelimelerinle yaz. Uzun formlar doldurmadan ihtiyacını anlat.",
  },
  {
    number: "2",
    title: "Sistem Anlasın",
    image: "/nasil-calisir/sistem-anlasin.png",
    description:
      "Yapay zekâ destekli sistem ihtiyacını analiz etsin, doğru kategori ve hizmeti belirlesin.",
  },
  {
    number: "3",
    title: "Uygun İşletmeleri Gör",
    image: "/nasil-calisir/uygun-isletmeler.png",
    description:
      "Konumuna, hizmete, puanlara ve gerçek kullanıcı deneyimlerine göre işletmeleri karşılaştır.",
  },
  {
    number: "4",
    title: "Kararını Ver",
    image: "/nasil-calisir/kararini-ver.png",
    description:
      "Güvenilir işletmeleri ve gerçek yorumları incele, sana uygun işletmeyi seç.",
  },
  {
    number: "5",
    title: "Değerlendir",
    image: "/nasil-calisir/05-degerlendir.png",
    description:
      "Hizmet tamamlandıktan sonra gerçek deneyimini yıldız ve yorumla paylaş.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-orange-100 bg-orange-50/40">
      <div className="section-shell py-5 sm:py-6 lg:py-7">
        <div className="rounded-[28px] border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 sm:text-xs">
              Nasıl Çalışır?
            </span>

            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              İhtiyacını yaz, doğru çözüme ulaş
            </h2>

            <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground">
              Aradığını kendi cümlenle anlat. Sistem ihtiyacını anlasın, uygun işletmeleri
              göstersin; sen gerçek deneyimlere bakıp kararını ver.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2grid-cols-5 min-w-0 how-responsive-five">
            {steps.map((step, index) => (
              <article
                key={step.number}
                className="relative flex h-full min-w-0 flex-col rounded-[20px] border border-orange-100 bg-white p-3 shadow-sm"
              >
                <div className="flex min-h-9 items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-extrabold text-white">
                    {step.number}
                  </span>

                  <h3 className="min-w-0 flex-1 font-display text-sm font-extrabold leading-tight text-slate-900">
                    {step.title}
                  </h3>
                </div>

                <div className="relative mt-2 aspect-[1.03/1] w-full overflow-hidden rounded-[16px] bg-orange-50">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 20vw"
                    className="object-cover"
                  />
                </div>

                <p className="mt-2.5 flex-1 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>

                {index < steps.length - 1 ? (
                  <span className="absolute -right-[13px] top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-500 shadow-sm lg:flex">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}