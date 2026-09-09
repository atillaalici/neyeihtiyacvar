$ErrorActionPreference = "Stop"

$root = "C:\Users\Atilla\Desktop\neyeihtiyacvar\frontend"
Set-Location $root

$dirs = @(
  "src\lib",
  "src\data",
  "src\components\site",
  "src\components\ui"
)
foreach ($dir in $dirs) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

@'
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
'@ | Set-Content -Encoding utf8 "src\lib\utils.ts"

@'
import {
  Wrench, Home, Truck, Laptop, Car, GraduationCap, PartyPopper, LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  icon: LucideIcon;
  services: string[];
};

export const categories: Category[] = [
  { slug: "usta-tamir", name: "Usta & Tamir", icon: Wrench, services: ["Elektrikçi", "Su tesisatçısı", "Boyacı", "Mobilya montajı", "Çilingir", "Beyaz eşya servisi", "Klima servisi"] },
  { slug: "ev-yasam", name: "Ev & Yaşam", icon: Home, services: ["Ev temizliği", "Bahçe işleri", "Haşere ilaçlama", "Apartman hizmetleri"] },
  { slug: "nakliye-tasima", name: "Nakliye & Taşıma", icon: Truck, services: ["Evden eve nakliyat", "Şehirlerarası nakliye", "Parça eşya taşıma", "Yük taşıma"] },
  { slug: "teknoloji", name: "Teknoloji", icon: Laptop, services: ["Bilgisayar servisi", "Telefon tamiri", "Kamera sistemleri", "Network / internet", "Yazılım ve web hizmetleri"] },
  { slug: "otomotiv", name: "Otomotiv", icon: Car, services: ["Oto tamir", "Lastikçi", "Oto elektrik", "Çekici", "Oto yıkama"] },
  { slug: "egitim", name: "Eğitim", icon: GraduationCap, services: ["Özel ders", "Yabancı dil", "Sınav hazırlık", "Bilgisayar eğitimi"] },
  { slug: "organizasyon", name: "Organizasyon", icon: PartyPopper, services: ["Düğün", "Fotoğrafçı", "Catering", "Organizasyon firmaları"] },
  { slug: "diger", name: "Diğer", icon: LayoutGrid, services: ["Aradığın hizmet listede yoksa ihtiyacını yazman yeterli"] },
];

export const popularSearches = ["Elektrikçi", "Su Tesisatçısı", "Nakliye", "Klima Servisi", "Bilgisayar Servisi"];
'@ | Set-Content -Encoding utf8 "src\data\categories.ts"

@'
export type City = { id: string; name: string; districts: string[] };

export const cities: City[] = [
  { id: "osmaniye", name: "Osmaniye", districts: ["Merkez", "Kadirli", "Düziçi", "Bahçe", "Toprakkale", "Sumbas", "Hasanbeyli"] },
  { id: "adana", name: "Adana", districts: ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam", "Ceyhan", "Kozan"] },
  { id: "gaziantep", name: "Gaziantep", districts: ["Şahinbey", "Şehitkamil", "Oğuzeli", "Nizip", "İslahiye"] },
  { id: "istanbul", name: "İstanbul", districts: ["Kadıköy", "Beşiktaş", "Üsküdar", "Şişli", "Bakırköy", "Ataşehir", "Maltepe"] },
  { id: "ankara", name: "Ankara", districts: ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Sincan"] },
  { id: "izmir", name: "İzmir", districts: ["Konak", "Bornova", "Karşıyaka", "Buca", "Bayraklı", "Çiğli"] },
  { id: "mersin", name: "Mersin", districts: ["Yenişehir", "Toroslar", "Akdeniz", "Mezitli", "Tarsus"] },
  { id: "hatay", name: "Hatay", districts: ["Antakya", "İskenderun", "Defne", "Dörtyol", "Samandağ"] },
];

export function toLocationSlug(value: string) {
  return value.toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
    .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
'@ | Set-Content -Encoding utf8 "src\data\locations.ts"

@'
import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-background"><Navbar /><main className="flex-1">{children}</main><Footer /></div>;
}
'@ | Set-Content -Encoding utf8 "src\components\site\SiteLayout.tsx"

@'
import Link from "next/link";
import { Menu } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="section-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">N</span>
          <span className="font-display text-lg font-bold">Neye İhtiyaç Var?</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/">Ana Sayfa</Link><Link href="/kesfet">Keşfet</Link><Link href="/kategoriler">Kategoriler</Link><Link href="/nasil-calisir">Nasıl Çalışır</Link>
        </nav>
        <div className="hidden gap-2 md:flex">
          <Link href="/giris" className="rounded-md px-3 py-2 text-sm font-medium">Giriş Yap</Link>
          <Link href="/ihtiyac-olustur" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">İhtiyaç Oluştur</Link>
        </div>
        <button type="button" className="grid size-10 place-items-center rounded-lg border border-border md:hidden" aria-label="Menü"><Menu className="size-5" /></button>
      </div>
    </header>
  );
}
'@ | Set-Content -Encoding utf8 "src\components\site\Navbar.tsx"

@'
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
'@ | Set-Content -Encoding utf8 "src\components\site\Footer.tsx"

@'
"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PopularSearches } from "./PopularSearches";
const examples=["Örneğin: Evime güvenilir bir elektrikçi lazım...","Örneğin: Bilgisayarım açılmıyor...","Örneğin: Yarın ev taşıyacağım...","Örneğin: Klima bakımına ihtiyacım var...","Örneğin: Düğün için fotoğrafçı arıyorum..."];
export function HeroSearch(){
 const router=useRouter(), inputRef=useRef<HTMLInputElement>(null); const [query,setQuery]=useState(""),[focused,setFocused]=useState(false),[index,setIndex]=useState(0),[visible,setVisible]=useState(true);
 const rotating=!focused&&!query.length;
 function submit(v:string){const q=v.trim(); if(!q){inputRef.current?.focus();return;} router.push(`/kesfet?q=${encodeURIComponent(q)}`);}
 useEffect(()=>{if(!rotating)return; const timer=setInterval(()=>{setVisible(false);setTimeout(()=>{setIndex(i=>(i+1)%examples.length);setVisible(true)},300)},3800);return()=>clearInterval(timer)},[rotating]);
 return <section className="relative overflow-hidden border-b border-border bg-cream"><div className="section-shell relative py-10 text-center sm:py-16">
 <p className="rise inline-flex rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium uppercase text-primary">Türkiye'nin yerel ihtiyaç platformu</p>
 <h1 className="rise mx-auto mt-5 max-w-[16ch] font-display text-4xl font-bold sm:text-6xl">Neye ihtiyac <span className="text-primary">var?</span></h1>
 <p className="rise mx-auto mt-4 max-w-[60ch] text-muted-foreground sm:text-lg">İhtiyacını anlat, sana en uygun kişi, işletme veya hizmeti bulalım.</p>
 <form onSubmit={e=>{e.preventDefault();submit(query)}} className="rise mx-auto mt-7 max-w-2xl"><div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2 shadow-soft sm:flex-row">
 <div className="relative flex flex-1 items-center gap-2.5 px-3"><Sparkles className="size-5 text-primary"/><input ref={inputRef} value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={focused?"İhtiyacını kendi cümlenle yaz...":""} className="w-full bg-transparent py-3 outline-none"/>
 {rotating&&<span className={`pointer-events-none absolute left-[2.6rem] truncate text-muted-foreground transition-opacity ${visible?"opacity-100":"opacity-0"}`}>{examples[index]}</span>}</div><Button type="submit" size="lg" className="h-12">İhtiyacımı Bul</Button></div></form>
 <p className="rise mt-3 text-sm text-muted-foreground">Nasıl anlatacağını düşünme, ihtiyacını kendi cümlenle yaz.</p><PopularSearches onSelect={v=>{setQuery(v);submit(v)}}/>
 </div></section>;
}
'@ | Set-Content -Encoding utf8 "src\components\site\HeroSearch.tsx"

@'
"use client";
import { popularSearches } from "@/data/categories";
export function PopularSearches({onSelect}:{onSelect?:(term:string)=>void}){return <div className="rise mt-5 flex flex-wrap items-center justify-center gap-2"><span className="mr-1 text-sm text-muted-foreground">Popüler aramalar:</span>{popularSearches.map(term=><button key={term} type="button" onClick={()=>onSelect?.(term)} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary">{term}</button>)}</div>}
'@ | Set-Content -Encoding utf8 "src\components\site\PopularSearches.tsx"

@'
import Link from "next/link"; import type { Category } from "@/data/categories";
export function CategoryCard({category}:{category:Category}){const Icon=category.icon;return <Link href={`/kategoriler#${category.slug}`} className="home-category-card group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft hover:border-primary/60"><span className="grid size-13 place-items-center rounded-xl bg-accent/70 text-accent-foreground"><Icon className="size-6"/></span><h3 className="mt-4 font-display text-lg font-semibold group-hover:text-primary">{category.name}</h3><ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">{category.services.slice(0,4).map(s=><li key={s}>{s}</li>)}</ul>{category.services.length>4&&<span className="mt-auto pt-3 text-xs font-medium text-primary">+{category.services.length-4} hizmet daha</span>}</Link>}
'@ | Set-Content -Encoding utf8 "src\components\site\CategoryCard.tsx"

@'
import {categories} from "@/data/categories"; import {CategoryCard} from "./CategoryCard";
export function CategoryGrid({withHeading=true}:{withHeading?:boolean}){return <section id="kategoriler" className="section-shell py-12 sm:py-16">{withHeading&&<header className="max-w-2xl"><h2 className="font-display text-3xl font-bold sm:text-4xl">Ne arıyorsan burada</h2><p className="mt-2.5 text-muted-foreground">İhtiyacına uygun kategoriyi seç veya yukarıya neye ihtiyacın olduğunu yaz.</p></header>}<div className="mt-8 grid auto-rows-fr grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">{categories.map(c=><CategoryCard key={c.slug} category={c}/>)}</div></section>}
'@ | Set-Content -Encoding utf8 "src\components\site\CategoryGrid.tsx"

@'
import {MessageSquareText,Search,PhoneCall} from "lucide-react";
const steps=[["01",MessageSquareText,"İhtiyacını anlat","Ne aradığını yaz, ihtiyacına uygun hizmet kategorisini bul."],["02",Search,"Uygun çözümleri keşfet","Bölgendeki işletmelerin hizmetlerini ve profillerini incele."],["03",PhoneCall,"Doğrudan iletişime geç","Telefon veya WhatsApp ile işletmeyle iletişime geç."]] as const;
export function HowItWorks(){return <section className="home-steps border-y border-border bg-cream py-12 sm:py-16"><div className="section-shell"><h2 className="font-display text-3xl font-bold sm:text-4xl">İhtiyacını çözmek bu kadar kolay</h2><ol className="mt-8 grid gap-4 md:grid-cols-3">{steps.map(([n,Icon,t,x])=><li key={n} className="rounded-xl border border-border bg-card p-6 shadow-soft"><div className="flex justify-between"><span className="grid size-11 place-items-center rounded-xl bg-accent/70 text-primary"><Icon className="size-5"/></span><span className="text-3xl font-bold text-primary/45">{n}</span></div><h3 className="mt-4 text-lg font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x}</p></li>)}</ol></div></section>}
'@ | Set-Content -Encoding utf8 "src\components\site\HowItWorks.tsx"

@'
import {LayoutGrid,ClipboardList,MapPinned,PhoneCall} from "lucide-react";
const f=[[LayoutGrid,"İhtiyacına Uygun Hizmetler","Kategori ve hizmet seçenekleriyle aradığın hizmete ulaş."],[MapPinned,"Bölgendeki İşletmeler","İl ve ilçe seçerek bölgendeki işletmeleri keşfet."],[ClipboardList,"Detaylı İşletme Profilleri","Hizmetleri, çalışma bilgilerini ve iletişim seçeneklerini incele."],[PhoneCall,"Doğrudan İletişim","Telefon veya WhatsApp üzerinden işletmeyle iletişime geç."]] as const;
export function TrustSection(){return <section className="home-trust section-shell py-16 sm:py-20"><h2 className="font-display text-3xl font-bold sm:text-4xl">Doğru kişiyi bulmak artık daha kolay</h2><div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{f.map(([Icon,t,x])=><div key={t}><span className="grid size-11 place-items-center rounded-xl border border-border bg-surface text-primary"><Icon className="size-5"/></span><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{x}</p></div>)}</div></section>}
'@ | Set-Content -Encoding utf8 "src\components\site\TrustSection.tsx"

@'
"use client";
import {useMemo,useState} from "react"; import {MapPin} from "lucide-react"; import {Button} from "@/components/ui/button"; import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select"; import {cities,toLocationSlug} from "@/data/locations";
export function LocationSearch({onSearch}:{onSearch?:(v:{city:string;district:string})=>void}){const[city,setCity]=useState(""),[district,setDistrict]=useState("");const districts=useMemo(()=>cities.find(c=>c.id===city)?.districts??[],[city]);return <form onSubmit={e=>{e.preventDefault();onSearch?.({city,district})}} className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[1fr_1fr_auto]"><div><label className="mb-1.5 block text-sm font-medium">İl</label><Select value={city} onValueChange={v=>{setCity(v);setDistrict("")}}><SelectTrigger className="w-full"><SelectValue placeholder="İl Seç"/></SelectTrigger><SelectContent>{cities.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1.5 block text-sm font-medium">İlçe</label><Select value={district} onValueChange={setDistrict} disabled={!city}><SelectTrigger className="w-full"><SelectValue placeholder="İlçe Seç"/></SelectTrigger><SelectContent>{districts.map(d=><SelectItem key={d} value={toLocationSlug(d)}>{d}</SelectItem>)}</SelectContent></Select></div><Button type="submit" className="self-end" disabled={!city||!district}><MapPin className="size-4"/>Hizmetleri Göster</Button></form>}
'@ | Set-Content -Encoding utf8 "src\components\site\LocationSearch.tsx"

@'
import Link from "next/link"; import {Button} from "@/components/ui/button";
export function ProviderCTA(){return <section className="home-cta section-shell py-16 sm:py-20"><div className="rounded-2xl border border-primary/25 bg-accent px-6 py-12 text-center"><h2 className="font-display text-3xl font-bold sm:text-4xl">İşini büyütmek ister misin?</h2><p className="mx-auto mt-4 max-w-xl text-muted-foreground">Hizmetlerini tanıt, işletme profilinle bölgende hizmet arayanlara ulaş.</p><div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"><Button asChild size="lg"><Link href="/isletme-ekle">Ücretsiz İşletme Profili Oluştur</Link></Button><Link href="/nasil-calisir" className="text-sm font-medium hover:underline">Nasıl çalıştığını öğren</Link></div></div></section>}
'@ | Set-Content -Encoding utf8 "src\components\site\ProviderCTA.tsx"

Write-Host ""
Write-Host "Ana sayfa dosyalari olusturuldu." -ForegroundColor Green
Write-Host "Simdi: pnpm exec tsc --noEmit" -ForegroundColor Cyan
