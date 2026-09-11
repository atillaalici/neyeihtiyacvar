import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { notFound } from "next/navigation";

import { SiteLayout } from "@/components/site/SiteLayout";

type Service = {
  name: string;
  slug: string;
};

type Category = {
  title: string;
  image: string;
  description: string;
  services: Service[];
};

const categories: Record<string, Category> = {
  "usta-tamir": {
    title: "Usta & Tamir",
    image: "/vitrin/usta-tamir.png",
    description: "Ev ve iş yerindeki tamir, bakım ve usta ihtiyaçların için doğru hizmeti seç.",
    services: [
      { name: "Elektrikçi", slug: "elektrikci" },
      { name: "Su tesisatçısı", slug: "su-tesisatcisi" },
      { name: "Boyacı", slug: "boyaci" },
      { name: "Mobilya montajı", slug: "mobilya-montaji" },
    ],
  },
  "ev-yasam": {
    title: "Ev & Yaşam",
    image: "/vitrin/ev-yasam.png",
    description: "Evini daha konforlu ve düzenli hale getirecek hizmetleri keşfet.",
    services: [
      { name: "Ev temizliği", slug: "ev-temizligi" },
      { name: "Bahçe işleri", slug: "bahce-isleri" },
      { name: "Haşere ilaçlama", slug: "hasere-ilaclama" },
      { name: "Apartman hizmetleri", slug: "apartman-hizmetleri" },
    ],
  },
  "nakliye-tasima": {
    title: "Nakliye & Taşıma",
    image: "/vitrin/nakliye-tasima.png",
    description: "Evden eve ve parça eşya taşıma ihtiyaçların için uygun hizmeti bul.",
    services: [
      { name: "Evden eve nakliyat", slug: "evden-eve-nakliyat" },
      { name: "Şehirlerarası nakliye", slug: "sehirlerarasi-nakliye" },
      { name: "Parça eşya taşıma", slug: "parca-esya-tasima" },
      { name: "Yük taşıma", slug: "yuk-tasima" },
    ],
  },
  teknoloji: {
    title: "Teknoloji",
    image: "/vitrin/teknoloji.png",
    description: "Bilgisayar, telefon, kamera ve ağ çözümleri için teknik destek bul.",
    services: [
      { name: "Bilgisayar servisi", slug: "bilgisayar-servisi" },
      { name: "Telefon tamiri", slug: "telefon-tamiri" },
      { name: "Kamera sistemleri", slug: "kamera-sistemleri" },
      { name: "Network / internet", slug: "network-internet" },
    ],
  },
  otomotiv: {
    title: "Otomotiv",
    image: "/vitrin/otomotiv.png",
    description: "Aracın için bakım, tamir ve teknik servis hizmetlerini keşfet.",
    services: [
      { name: "Oto tamir", slug: "oto-tamir" },
      { name: "Lastikçi", slug: "lastikci" },
      { name: "Oto elektrik", slug: "oto-elektrik" },
      { name: "Oto bakım", slug: "oto-bakim" },
    ],
  },
  egitim: {
    title: "Eğitim",
    image: "/vitrin/egitim.png",
    description: "Özel ders, dil ve sınav hazırlık ihtiyaçların için doğru eğitmeni bul.",
    services: [
      { name: "Özel ders", slug: "ozel-ders" },
      { name: "Yabancı dil", slug: "yabanci-dil" },
      { name: "Sınav hazırlık", slug: "sinav-hazirlik" },
      { name: "Kişisel gelişim", slug: "kisisel-gelisim" },
    ],
  },
  organizasyon: {
    title: "Organizasyon",
    image: "/vitrin/organizasyon.png",
    description: "Özel günlerin ve etkinliklerin için ihtiyaç duyduğun hizmetleri bul.",
    services: [
      { name: "Düğün", slug: "dugun" },
      { name: "Fotoğrafçı", slug: "fotografci" },
      { name: "Ses & ışık sistemi", slug: "ses-isik-sistemi" },
      { name: "Organizasyon firmaları", slug: "organizasyon-firmalari" },
    ],
  },
  diger: {
    title: "Diğer",
    image: "/vitrin/diger.png",
    description: "Aradığın hizmet listede yoksa ihtiyacını kendi cümlenle yaz; sistem sana uygun çözümü bulsun.",
    services: [],
  },
};

export function generateStaticParams() {
  return Object.keys(categories).map((slug) => ({ slug }));
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = categories[slug];

  if (!category) {
    notFound();
  }

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14 lg:py-16">
        <Link
          href="/kategoriler"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm kategoriler
        </Link>

        <section className="mt-5 overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex items-center justify-center bg-orange-50/40 p-4 sm:p-5 lg:p-6">
              <div className="relative w-full max-w-[420px] overflow-hidden rounded-[22px] border border-orange-100 bg-white shadow-sm">
                <div className="relative aspect-[1.14/1] w-full">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    priority
                    sizes="(max-width: 1023px) 90vw, 420px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-gradient-to-br from-orange-50/80 to-white p-6 sm:p-8 lg:p-10">
              <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
                Kategori
              </span>

              <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                {category.title}
              </h1>

              <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
                {category.description}
              </p>
            </div>
          </div>
        </section>

        {category.services.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Bu kategoride ne arıyorsun?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Hizmeti seç; ilgili işletmeleri Keşfet ekranında listeleyelim.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {category.services.map((service) => (
                <Link
                  key={service.slug}
                  href={`/kesfet?hizmet=${service.slug}`}
                  className="group flex min-h-24 items-center justify-between rounded-2xl border border-orange-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                >
                  <div>
                    <p className="font-bold text-slate-900">{service.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uygun işletmeleri gör
                    </p>
                  </div>

                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-100">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-[26px] border border-orange-100 bg-orange-50/50 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              İhtiyacını bize anlat
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Aradığın hizmet hazır listelerde yoksa neye ihtiyacın olduğunu kendi cümlenle yaz.
            </p>

            <Link
              href="/ihtiyac-olustur"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              <Search className="h-4 w-4" />
              İhtiyacını Yaz
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </main>
    </SiteLayout>
  );
}