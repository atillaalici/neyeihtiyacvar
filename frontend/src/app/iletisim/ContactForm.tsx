"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Send,
} from "lucide-react";

import { apiBaseUrl } from "@/lib/api";
import {
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from "@/lib/auth";

const subjects = [
  "Genel Bilgi",
  "Üyelik ve Paketler",
  "Ödeme / Fatura",
  "İşletme Hesabı",
  "Teknik Destek",
  "İptal / İade",
  "Diğer",
];

type Notice =
  | {
      kind: "success" | "error";
      text: string;
    }
  | null;

export default function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token) {
      const timer = window.setTimeout(() => {
        setLoadingProfile(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setIsAuthenticated(true);

      if (storedUser) {
        setFullName(storedUser.displayName ?? "");
        setEmail(storedUser.email ?? "");
        setPhoneNumber(storedUser.phoneNumber ?? "");
      }

      void fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const user = await response.json();

        updateStoredUser(user);
        setFullName(user.displayName ?? "");
        setEmail(user.email ?? "");
        setPhoneNumber(user.phoneNumber ?? "");
      })
        .finally(() => {
          setLoadingProfile(false);
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setNotice(null);

    if (!fullName.trim()) {
      setNotice({
        kind: "error",
        text: "Lütfen adınızı ve soyadınızı girin.",
      });
      return;
    }

    if (!email.trim()) {
      setNotice({
        kind: "error",
        text: "Lütfen e-posta adresinizi girin.",
      });
      return;
    }

    if (!subject) {
      setNotice({
        kind: "error",
        text: "Lütfen bir konu seçin.",
      });
      return;
    }

    if (message.trim().length < 10) {
      setNotice({
        kind: "error",
        text: "Mesajınız en az 10 karakter olmalıdır.",
      });
      return;
    }

    setSending(true);

    try {
      const token = getAccessToken();

      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim() || null,
          subject,
          message: message.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const validationErrors = payload?.errors
          ? Object.values(payload.errors)
              .flat()
              .filter((value): value is string => typeof value === "string")
          : [];

        throw new Error(
          validationErrors[0] ??
            payload?.message ??
            "Mesajınız gönderilemedi. Lütfen tekrar deneyin.",
        );
      }

      setSubject("");
      setMessage("");

      setNotice({
        kind: "success",
        text:
          payload?.message ??
          "Mesajınız başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Mesajınız gönderilemedi. Lütfen tekrar deneyin.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-600">
          <MessageSquareText className="size-6" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-950">
            İletişim Formu
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Sorunuzu veya destek talebinizi bize iletebilirsiniz.
          </p>
        </div>
      </div>

      {isAuthenticated && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Giriş yaptığınız için hesap bilgileriniz forma otomatik olarak
          getirildi.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="contact-full-name"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            Ad Soyad
          </label>

          <input
            id="contact-full-name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={loadingProfile}
            maxLength={150}
            autoComplete="name"
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
            placeholder="Adınız ve soyadınız"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="contact-email"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              E-posta
            </label>

            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loadingProfile}
              maxLength={254}
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="contact-phone"
              className="mb-2 block text-sm font-bold text-slate-800"
            >
              Telefon
              <span className="ml-1 font-normal text-slate-400">
                (isteğe bağlı)
              </span>
            </label>

            <input
              id="contact-phone"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              disabled={loadingProfile}
              maxLength={30}
              autoComplete="tel"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              placeholder="05xx xxx xx xx"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="contact-subject"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            Konu
          </label>

          <select
            id="contact-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">Konu seçin</option>

            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label
              htmlFor="contact-message"
              className="block text-sm font-bold text-slate-800"
            >
              Mesajınız
            </label>

            <span className="text-xs text-slate-400">
              {message.length}/4000
            </span>
          </div>

          <textarea
            id="contact-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={10}
            maxLength={4000}
            rows={7}
            required
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            placeholder="Size nasıl yardımcı olabiliriz?"
          />
        </div>

        {notice && (
          <div
            className={
              notice.kind === "success"
                ? "flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
                : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            }
          >
            {notice.kind === "success" && (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            )}

            <span>{notice.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={sending || loadingProfile}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Gönderiliyor...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Mesajı Gönder
            </>
          )}
        </button>
      </form>
    </div>
  );
}
