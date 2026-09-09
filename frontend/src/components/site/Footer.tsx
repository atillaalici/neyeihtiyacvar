import Link from "next/link";
const columns = [
  { title: "Keşfet", links: [["Hizmetler","/kesfet"],["Kategoriler","/kategoriler"],["Yakınımdakiler","/kesfet"],["Nasıl Çalışır?","/nasil-calisir"]] },
  { title: "Hizmet Verenler", links: [["İşletmeni Ekle","/isletme-ekle"],["Giriş Yap","/giris"],["İşletme Paneli","/giris"]] },
  { title: "Kurumsal", links: [["Hakkımızda","/hakkimizda"],["İletişim","/iletisim"],["Gizlilik Politikası","/gizlilik"],["Kullanım Koşulları","/kullanim-kosullari"]] },
];
export function Footer() {
  return <footer className="site-footer border-t border-border bg-cream"><div className="section-shell py-14"><div className="grid gap-10 md:grid-cols-4">
    <div><div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">N</span><strong>Neye İhtiyacın Var?</strong></div><p className="mt-4 text-sm text-muted-foreground">İhtiyacını anlat, doğru kişiyi bul.</p></div>
    {columns.map(c => <nav key={c.title}><h2 className="font-semibold">{c.title}</h2><ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">{c.links.map(([label,href]) => <li key={label}><Link href={href}>{label}</Link></li>)}</ul></nav>)}
  </div><p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">© 2026 Neye İhtiyacın Var? Tüm hakları saklıdır.</p></div></footer>;
}
