import Link from "next/link";
import { BrandLogo } from "@/components/site/BrandLogo";

const groups = [
  { title: "Platform", links: [["Keşfet","/kesfet"],["Kategoriler","/kategoriler"],["Nasıl Çalışır","/nasil-calisir"],["Hakkımızda","/hakkimizda"],["İletişim","/iletisim"]] },
  { title: "Hizmet Verenler", links: [["İşletmeni Ekle","/isletme-ekle"],["Giriş Yap","/giris"],["İşletme Paneli","/giris"]] },
  { title: "Yasal & Gizlilik", links: [["Sözleşmeler","/sozlesmeler"],["Kullanım Koşulları","/sozlesmeler/kullanim-kosullari"],["İptal ve İade Politikası","/sozlesmeler/iptal-iade-politikasi"],["KVKK Aydınlatma","/sozlesmeler/kvkk-aydinlatma"],["Gizlilik","/sozlesmeler/gizlilik"],["Çerez Politikası","/sozlesmeler/cerez-politikasi"]] },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-slate-50/70">
      <div className="section-shell py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_2fr]">
          <div>
            <BrandLogo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              İhtiyacını anlat, doğru işletmeyi bul. neyeihtiyacvar.com, Atilla Alıcı – TEKNONET BİLGİSAYAR YAZILIM tarafından işletilir.
            </p>

            <div className="mt-6">
              <p className="text-sm font-bold text-slate-900">
                Bizi Sosyal Medyada Takip Edin
              </p>

              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://www.instagram.com/neyeihtiyacvar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Neye İhtiyaç Var Instagram"
                  title="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-200 bg-white transition hover:scale-110 hover:shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FEDA75" />
                        <stop offset="35%" stopColor="#FA7E1E" />
                        <stop offset="65%" stopColor="#D62976" />
                        <stop offset="100%" stopColor="#4F5BD5" />
                      </linearGradient>
                    </defs>
                    <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="url(#instagram-gradient)" strokeWidth="2.2" />
                    <circle cx="12" cy="12" r="4" fill="none" stroke="url(#instagram-gradient)" strokeWidth="2.2" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="#D62976" />
                  </svg>
                </a>

                <a
                  href="https://www.facebook.com/neyeihtiyacvar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Neye İhtiyaç Var Facebook"
                  title="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white transition hover:scale-110 hover:shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1877F2]" aria-hidden="true" fill="currentColor">
                    <path d="M13.5 22v-9h3l.5-3.5h-3.5V7.25c0-1 .28-1.75 1.78-1.75H17V2.35c-.3-.04-1.34-.13-2.55-.13-2.52 0-4.25 1.54-4.25 4.37V9.5H7.35V13h2.85v9h3.3Z" />
                  </svg>
                </a>

                <a
                  href="https://www.youtube.com/@neyeihtiyacvar"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Neye İhtiyaç Var YouTube"
                  title="YouTube"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-white transition hover:scale-110 hover:shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#FF0000]" aria-hidden="true" fill="currentColor">
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.58 12 3.58 12 3.58s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.25 3.6-6.25 3.6Z" />
                  </svg>
                </a>
              </div>
            </div>
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
          <p>
            Atilla Alıcı – TEKNONET BİLGİSAYAR YAZILIM · Ahmet Yesevi Mah. Çardak Cad. No: 33/1 Merkez / Osmaniye ·{" "}
            <a
              href="tel:+905325665899"
              className="transition hover:text-orange-600"
            >
              0532 566 58 99
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
