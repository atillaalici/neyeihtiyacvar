import {
  Building2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "İletişim | Neye İhtiyaç Var",
  description:
    "Neye İhtiyaç Var iletişim ve işletmeci bilgileri. Atilla Alıcı – TEKNONET BİLGİSAYAR YAZILIM.",
};

export default function ContactPage() {
  return (
    <SiteLayout>
      <main className="bg-background">
        <section className="section-shell py-10 sm:py-14 lg:py-16">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                İLETİŞİM
              </p>

              <h1 className="mt-3 font-display text-3xl font-black text-slate-950 sm:text-4xl">
                Bize Ulaşın
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Neye İhtiyaç Var platformu ile ilgili üyelik, işletme hesabı,
                faturalandırma ve destek talepleriniz için bizimle iletişime
                geçebilirsiniz.
              </p>
            </div>

            <div className="mt-10">
              <ContactForm />
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-600">
                    <Building2 className="size-6" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Platform İşletmecisi
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      Atilla Alıcı – TEKNONET BİLGİSAYAR YAZILIM
                    </h2>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 sm:grid-cols-2">
                <div className="border-b border-slate-100 p-6 sm:border-r sm:p-8">
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    <div>
                      <div className="font-bold text-slate-950">Adres</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Ahmet Yesevi Mah. Çardak Cad. No: 33/1
                        <br />
                        Merkez / Osmaniye
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-100 p-6 sm:p-8">
                  <div className="flex gap-3">
                    <Phone className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    <div>
                      <div className="font-bold text-slate-950">Telefon</div>
                      <a
                        href="tel:+905325665899"
                        className="mt-2 block text-sm font-semibold text-orange-600 hover:underline"
                      >
                        0532 566 58 99
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-100 p-6 sm:border-b-0 sm:border-r sm:p-8">
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    <div>
                      <div className="font-bold text-slate-950">E-posta</div>
                      <a
                        href="mailto:destek@neyeihtiyacvar.com"
                        className="mt-2 block text-sm font-semibold text-orange-600 hover:underline"
                      >
                        destek@neyeihtiyacvar.com
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    <div>
                      <div className="font-bold text-slate-950">
                        Kayıtlı Elektronik Posta
                      </div>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        atilla.alici@hs01.kep.tr
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 text-sm text-slate-600 sm:px-8">
                <strong className="text-slate-900">Vergi Dairesi:</strong>{" "}
                Osmaniye Vergi Dairesi
                <span className="mx-2 text-slate-300">•</span>
                <strong className="text-slate-900">Vergi No:</strong>{" "}
                0520164723
                <span className="mx-2 text-slate-300">•</span>
                <strong className="text-slate-900">Esnaf Sicil No:</strong>{" "}
                44745
                <span className="mx-2 text-slate-300">•</span>
                <strong className="text-slate-900">Oda Sicil No:</strong>{" "}
                1537
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm leading-6 text-orange-950">
              Üyelik ve ödeme işlemlerine ilişkin destek taleplerinizde,
              hesabınızda kayıtlı e-posta adresinizi ve işletme adınızı
              belirtmeniz işlemlerin daha hızlı sonuçlandırılmasına yardımcı olur.
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
