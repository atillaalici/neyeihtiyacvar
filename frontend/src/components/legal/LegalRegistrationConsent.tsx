"use client";

import Link from "next/link";

export function LegalRegistrationConsent({ isBusiness }: { isBusiness: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          required
          name="legalTermsAccepted"
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-orange-600"
        />
        <span>
          <Link href="/sozlesmeler/kullanim-kosullari" target="_blank" className="font-semibold text-orange-600 hover:underline">
            Kullanım ve Üyelik Koşulları
          </Link>
          {isBusiness && (
            <>
              {" "}ile{" "}
              <Link href="/sozlesmeler/isletme-kosullari" target="_blank" className="font-semibold text-orange-600 hover:underline">
                İşletme ve Hizmet Sağlayıcı Koşulları
              </Link>
            </>
          )}{" "}metinlerini okudum ve kabul ediyorum.
        </span>
      </label>

      <p className="mt-3 pl-7 text-xs leading-5 text-slate-500">
        <Link href="/sozlesmeler/kvkk-aydinlatma" target="_blank" className="font-medium text-slate-700 underline underline-offset-2">
          KVKK Aydınlatma Metni
        </Link>{" "}
        kayıt öncesinde erişiminize sunulmuştur. Aydınlatma metni bir açık rıza metni değildir.
      </p>
    </div>
  );
}