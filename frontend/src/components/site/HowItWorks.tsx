"use client";

import { useState } from "react";
import {
  ArrowLeft, ArrowRight, BellRing, Building2, CheckCircle2,
  Handshake, MapPin, MessageCircle, PenLine,
  Send, Store, UserRound, Scale,
} from "lucide-react";

type Audience = "customer" | "business";

const flows = {
  customer: {
    headline: "İhtiyacını yaz, teklifler gelsin,",
    accent: "seçimini yap, işine bak.",
    subtitle: "İhtiyacın ilgili işletmelere ulaşsın. Teklifleri değerlendir, kararını kendin ver.",
    steps: [
      { icon: PenLine, title: "İhtiyacını Yaz", detail: "İhtiyacını birkaç kelimeyle yaz, karşına çıkan hizmetlerden uygun olanı seç." },
      { icon: MapPin, title: "İhtiyacın İşletmelere Ulaşsın", detail: "Talebin, sana en yakın bölgeden başlayarak hizmet veren ilgili işletmelere ulaştırılır." },
      { icon: MessageCircle, title: "Teklifleri Al", detail: "Hizmet verebilecek işletmeler talebini inceler ve sana teklif gönderir." },
      { icon: Scale, title: "Karşılaştır ve Seç", detail: "Gelen teklifleri, fiyatları, yorumları ve işletme profillerini inceleyerek sana en uygun olanı seç." },
      { icon: CheckCircle2, title: "İşini Tamamla", detail: "Seçtiğin işletmeyle iletişime geç, hizmetini al ve deneyimini değerlendir." },
    ],
  },
  business: {
    headline: "İşletmeni tanıt,",
    accent: "yeni müşterilerle buluş.",
    subtitle: "Dijital vitrininle görünür ol, hizmetlerine uygun talepleri değerlendir ve teklif ver.",
    steps: [
      { icon: Store, title: "İşletmeni Kaydet", detail: "İşletme bilgilerini ekle ve müşterilerin inceleyebileceği dijital vitrini oluştur." },
      { icon: Building2, title: "Hizmetlerini Belirle", detail: "Sunduğun hizmetleri ve çalıştığın bölgeleri seç; doğru müşterilere görün." },
      { icon: BellRing, title: "İş Fırsatlarını Takip Et", detail: "Hizmetlerine uygun müşteri taleplerinden haberdar ol ve ihtiyaçları değerlendir." },
      { icon: Send, title: "Teklifini Gönder", detail: "Sana uygun taleplere teklif ver, müşterilerle mesajlaşarak ayrıntıları görüş." },
      { icon: Handshake, title: "Yeni Müşteriler Kazan", detail: "Müşteri teklifini seçerse anlaş, hizmetini sun ve işini büyüt." },
    ],
  },
} as const;

const positions = [
  { x: 10, y: 79 },
  { x: 29, y: 30 },
  { x: 50, y: 10 },
  { x: 71, y: 30 },
  { x: 90, y: 79 },
];

export function HowItWorks() {
  const [audience, setAudience] = useState<Audience>("customer");
  const [selected, setSelected] = useState(2);
  const [hovered, setHovered] = useState<number | null>(null);
  const flow = flows[audience];
  const active = hovered ?? selected;
  const current = flow.steps[active];
  const ActiveIcon = current.icon;

  function changeAudience(next: Audience) {
    setAudience(next);
    setSelected(2);
    setHovered(null);
  }

  function changeStep(next: number) {
    setSelected((next + 5) % 5);
    setHovered(null);
  }

  return (
    <section id="nasil-calisir" aria-labelledby="how-heading" className="relative isolate overflow-hidden border-y border-[#dce8fa] bg-gradient-to-b from-[#edf5ff] via-white to-[#eef5ff]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-44 h-80 w-80 rounded-full bg-[#d5e9ff]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-12 h-80 w-80 rounded-full bg-[#cce5ff]/60 blur-3xl" />
      <div className="section-shell relative py-10 sm:py-14 lg:py-16">
        <header className="text-center">
          <h2 id="how-heading" className="font-display text-xs font-extrabold uppercase tracking-[0.32em] text-[#12376d] sm:text-sm">Nasıl Çalışır?</h2>
          <div className="mx-auto mt-6 flex w-full max-w-[420px] rounded-full border border-[#c9def8] bg-white/90 p-1 shadow-[0_6px_22px_-15px_#1d4f9a]" role="group" aria-label="Nasıl çalışır seçenekleri">
            <button type="button" aria-pressed={audience === "customer"} onClick={() => changeAudience("customer")} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${audience === "customer" ? "bg-gradient-to-r from-[#0878e9] to-[#103b9a] text-white" : "text-[#1e457e] hover:bg-[#edf5ff]"}`}><UserRound className="size-4" aria-hidden="true" />İhtiyacım Var</button>
            <button type="button" aria-pressed={audience === "business"} onClick={() => changeAudience("business")} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${audience === "business" ? "bg-gradient-to-r from-[#0878e9] to-[#103b9a] text-white" : "text-[#1e457e] hover:bg-[#edf5ff]"}`}><Store className="size-4" aria-hidden="true" />İşletmem Var</button>
          </div>
        </header>

        {/* Masaüstü: SVG yay ve üzerine yerleştirilmiş erişilebilir adımlar. */}
        <div className="relative mx-auto mt-7 hidden h-[570px] max-w-[1120px] md:block lg:h-[620px]">
          <svg aria-hidden="true" className="absolute inset-x-0 top-0 h-full w-full overflow-visible" viewBox="0 0 1000 560" preserveAspectRatio="none">
            <path d="M 100 440 C 150 175, 335 76, 500 76 C 665 76, 850 175, 900 440" fill="none" stroke="#1776dc" strokeWidth="2.5" />
          </svg>
          {flow.steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = active === i;
            const pos = positions[i];
            return (
              <button key={`${audience}-${i}`} type="button" onClick={() => changeStep(i)} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} aria-pressed={selected === i} aria-label={`${i + 1}. ${step.title}: ${step.detail}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} className={`group absolute z-10 flex w-[176px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center transition-transform duration-300 ease-out focus-visible:outline-none lg:w-[210px] ${isActive ? "scale-[1.09] -translate-y-[58%]" : "hover:scale-105"}`}>
                <span className={`flex size-[66px] items-center justify-center rounded-full border-2 shadow-[0_8px_20px_-10px_#1d5fc3] transition-all duration-300 lg:size-[76px] ${isActive ? "border-white bg-gradient-to-br from-[#159bff] to-[#0633b5] text-white shadow-[0_10px_28px_-7px_#1169dd]" : "border-[#c9dffa] bg-white text-[#1466c4]"}`}><Icon className="size-7 lg:size-8" aria-hidden="true" /></span>
                <span className="mt-2 rounded-full bg-[#e6f1ff] px-2.5 py-0.5 text-xs font-extrabold text-[#1855a7]">{String(i + 1).padStart(2, "0")}</span>
                <span className={`mt-1.5 max-w-[200px] font-display text-sm font-extrabold leading-5 lg:text-base ${isActive ? "text-[#0748a9]" : "text-[#142d58]"}`}>{step.title}</span>
                {isActive ? <span className="mt-1 hidden max-w-[200px] text-xs leading-5 text-[#4e6384] lg:block">{step.detail}</span> : null}
              </button>
            );
          })}
          <div aria-live="polite" className="absolute left-1/2 top-[44%] z-0 w-[min(48%,500px)] -translate-x-1/2 text-center">
            <div className="mx-auto inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#2674ca]"><ActiveIcon className="size-4" aria-hidden="true" />{String(active + 1).padStart(2, "0")} / 05</div>
            <h3 className="mt-3 font-display text-xl font-extrabold text-[#12376d] lg:text-2xl">{current.title}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#536b8d]">{current.detail}</p>
          </div>
          <div className="absolute bottom-2 left-1/2 w-[min(74%,680px)] -translate-x-1/2 text-center">
            <h3 className="font-display text-2xl font-extrabold leading-tight text-[#12376d] lg:text-3xl">{flow.headline}<span className="block text-[#0878e9]">{flow.accent}</span></h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#536b8d]">{flow.subtitle}</p>
          </div>
          <button type="button" onClick={() => changeStep(selected - 1)} aria-label="Önceki aşama" className="absolute bottom-16 left-0 z-20 grid size-10 place-items-center rounded-full border border-[#c8dcf5] bg-white text-[#1a62bb] shadow-sm hover:bg-[#e9f4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><ArrowLeft className="size-5" /></button>
          <button type="button" onClick={() => changeStep(selected + 1)} aria-label="Sonraki aşama" className="absolute bottom-16 right-0 z-20 grid size-10 place-items-center rounded-full border border-[#c8dcf5] bg-white text-[#1a62bb] shadow-sm hover:bg-[#e9f4ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><ArrowRight className="size-5" /></button>
        </div>

        {/* Mobil: aynı adımlar yatay kaydırma gerektirmeyen dokunmatik akış. */}
        <div className="mx-auto mt-9 max-w-xl md:hidden">
          <h3 className="text-center font-display text-2xl font-extrabold leading-tight text-[#12376d]">{flow.headline}<span className="block text-[#0878e9]">{flow.accent}</span></h3>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-[#536b8d]">{flow.subtitle}</p>
          <div className="mt-7 grid grid-cols-5 gap-1" role="group" aria-label="Aşamalar">
            {flow.steps.map((step, i) => {
              const Icon = step.icon;
              return <button key={`${audience}-${i}`} type="button" aria-label={`${i + 1}. ${step.title}`} aria-pressed={selected === i} onClick={() => changeStep(i)} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${selected === i ? "border-[#2a79db] bg-[#e5f1ff] text-[#0d53ad]" : "border-[#d9e7f8] bg-white text-[#54759f]"}`}><Icon className="size-5" aria-hidden="true" /><span className="text-xs font-bold">{String(i + 1).padStart(2, "0")}</span></button>;
            })}
          </div>
          <div aria-live="polite" className="mt-5 min-h-[145px] border-t border-[#cbdff6] pt-5 text-center">
            <h4 className="font-display text-xl font-bold text-[#12376d]">{flow.steps[selected].title}</h4>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#536b8d]">{flow.steps[selected].detail}</p>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            <button type="button" onClick={() => changeStep(selected - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cbdff6] bg-white px-4 text-sm font-semibold text-[#1a62bb]"><ArrowLeft className="size-4" />Önceki</button>
            <button type="button" onClick={() => changeStep(selected + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cbdff6] bg-white px-4 text-sm font-semibold text-[#1a62bb]">Sonraki<ArrowRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
