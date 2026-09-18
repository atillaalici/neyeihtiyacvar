import Link from "next/link";
import { BrandLogo } from "@/components/site/BrandLogo";

const groups = [
  { title: "Platform", links: [["Keşfet","/kesfet"],["Kategoriler","/kategoriler"],["Nasıl Çalışır","/nasil-calisir"],["Hakkımızda","/hakkimizda"]] },
  { title: "Hizmet Verenler", links: [["İşletmeni Ekle","/isletme-ekle"],["Giriş Yap","/giris"],["İşletme Paneli","/giris"]] },
  { title: "Yasal & Gizlilik", links: [["Sözleşmeler","/sozlesmeler"],["Kullanım Koşulları","/sozlesmeler/kullanim-kosullari"],["KVKK Aydınlatma","/sozlesmeler/kvkk-aydinlatma"],["Gizlilik","/sozlesmeler/gizlilik"],["Çerez Politikası","/sozlesmeler/cerez-politikasi"]] },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-slate-50/70">
      <div className="section-shell py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_2fr]">
          <div>
            <BrandLogo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              İhtiyacını anlat, doğru işletmeyi bul. neyeihtiyacvar.com, Teknonet Yazılım tarafından işletilir.
            </p>
          </div>
          <div className="grid gap-7 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-bold text-slate-900">{group.title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {group.links.map(([label,href]) => (
                    <li key={`${label}-${href}`}>
                      <Link href={href} className="text-sm text-muted-foreground transition hover:text-orange-600">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 neyeihtiyacvar.com. Tüm hakları saklıdır.</p>
          <p>Teknonet Yazılım · Merkez / Osmaniye</p>
        </div>
      </div>
    </footer>
  );
}
