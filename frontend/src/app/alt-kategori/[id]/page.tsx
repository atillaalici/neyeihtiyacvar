import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { serverApiBaseUrl } from "@/lib/seo";

type Provider = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription?: string | null;
  serviceSlug?: string | null;
  reviewCount?: number;
  averageRating?: number | null;
  citySlug?: string | null;
  districtSlug?: string | null;
};

type Category = {
  name: string;
  services: { id: string; name: string }[];
};

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let name = "Alt Kategori";
  let providers: Provider[] = [];

  try {
    const [categoryResponse, providerResponse] = await Promise.all([
      fetch(`${serverApiBaseUrl}/api/categories/tree`, { cache: "no-store" }),
      fetch(
        `${serverApiBaseUrl}/api/providers?categoryServiceId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      ),
    ]);

    if (categoryResponse.ok) {
      const categories = (await categoryResponse.json()) as Category[];
      for (const category of categories) {
        const service = category.services.find((item) => item.id === id);
        if (service) {
          name = service.name;
          break;
        }
      }
    }

    if (providerResponse.ok) {
      providers = (await providerResponse.json()) as Provider[];
    }
  } catch {
    // API bağlantısı kurulamadığında boş sonuç gösterilir.
  }

  providers = Array.from(new Map(providers.map((p) => [p.id, p])).values());

  return (
    <SiteLayout>
      <main className="section-shell py-10 sm:py-14">
        <Link href="/kategoriler" className="text-sm font-semibold text-orange-700">
          ← Kategoriler
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold">{name}</h1>
        <p className="mt-2 text-muted-foreground">
          {providers.length} uygun işletme
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {providers.map((provider) => (
            <article
              key={provider.id}
              className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-28 w-full overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-cream to-background">
                <Image
                  src={`/api/provider-image/${provider.id}`}
                  alt={`${provider.businessName} işletme görseli`}
                  fill
                  sizes="(max-width: 767px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>

              <div className="p-3 sm:p-4">
                <h2 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                  {provider.businessName}
                </h2>

                <p className="mt-0.5 truncate text-xs font-medium text-orange-700 sm:text-sm">
                  {(provider.serviceSlug ?? "")
                    .split("-")
                    .filter(Boolean)
                    .map((part) =>
                      part.charAt(0).toLocaleUpperCase("tr-TR") +
                      part.slice(1)
                    )
                    .join(" ")}
                </p>

                <div className="mt-3 border-y border-orange-100 py-2.5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          provider.averageRating != null &&
                          index < Math.round(provider.averageRating)
                            ? "fill-current text-amber-500"
                            : "text-orange-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-orange-700 sm:text-xs">
                    {provider.reviewCount
                      ? `${provider.reviewCount} gerçek değerlendirme`
                      : "Henüz değerlendirme yok"}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {[provider.citySlug, provider.districtSlug]
                      .filter(Boolean)
                      .join(" / ")}
                  </span>
                </div>

                {provider.shortDescription && (
                  <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
                    {provider.shortDescription}
                  </p>
                )}

                <Link
                  href={`/isletme/${provider.slug}`}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 sm:text-sm"
                >
                  İşletmeyi İncele
                </Link>
              </div>
            </article>
          ))}
        </div>
        {providers.length === 0 && (
          <p className="mt-8 rounded-2xl border p-6 text-muted-foreground">
            Bu alt kategoride henüz yayında işletme bulunmuyor.
          </p>
        )}
      </main>
    </SiteLayout>
  );
}
