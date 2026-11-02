"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

type District = {
  name: string;
  slug: string;
};

type City = {
  name: string;
  slug: string;
  districts: District[];
};

type Question = {
  title: string;
  options: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  workId: string;
  workName: string;
  serviceGroupName?: string;
};

function questionsFor(workName: string): Question[] {
  const name = workName.toLocaleLowerCase("tr-TR");

  if (name.includes("klima") && name.includes("montaj")) {
    return [
      {
        title: "Nasıl bir hizmete ihtiyacınız var?",
        options: [
          "Yalnızca klima montajı",
          "Klima temini ve montajı",
          "Henüz karar vermedim",
        ],
      },
      {
        title: "Kaç adet klima için hizmet istiyorsunuz?",
        options: ["1 adet", "2 adet", "3 adet", "4 veya daha fazla"],
      },
    ];
  }

  if (name.includes("avize") && name.includes("montaj")) {
    return [
      {
        title: "Nasıl bir hizmete ihtiyacınız var?",
        options: [
          "Yalnızca avize montajı",
          "Avize temini ve montajı",
          "Henüz karar vermedim",
        ],
      },
      {
        title: "Kaç adet avize monte edilecek?",
        options: ["1 adet", "2 adet", "3 adet", "4 veya daha fazla"],
      },
    ];
  }

  return [
    {
      title: "Nasıl bir hizmete ihtiyacınız var?",
      options: [
        "Yalnızca hizmet",
        "Ürün temini ve hizmet",
        "Henüz karar vermedim",
      ],
    },
  ];
}

export function QuoteRequestModal({
  open,
  onClose,
  onSubmitted,
  workId,
  workName,
  serviceGroupName,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [detail, setDetail] = useState("");
  const [showFullName, setShowFullName] = useState(true);
  const [contactByPhone, setContactByPhone] = useState(true);
  const [contactByWhatsapp, setContactByWhatsapp] = useState(true);
  const [contactByEmail, setContactByEmail] = useState(true);
  const [contactBySystemMessage, setContactBySystemMessage] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    setMounted(true);

    const raw = sessionStorage.getItem("neyeihtiyacvar.quoteDraft");
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      if (draft.workId !== workId) return;

      setStep(draft.step);
      setAnswers(draft.answers);
      setDetail(draft.detail);
      setShowFullName(draft.showFullName === true);
      setContactByPhone(draft.contactByPhone === true);
      setContactByWhatsapp(draft.contactByWhatsapp === true);
      setContactByEmail(draft.contactByEmail === true);
      setContactBySystemMessage(draft.contactBySystemMessage === true);
      setCitySlug(draft.citySlug);
      setDistrictSlug(draft.districtSlug);
    } catch {
      sessionStorage.removeItem("neyeihtiyacvar.quoteDraft");
    }
  }, [workId]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    async function loadLocations() {
      setLocationLoading(true);
      setLocationError("");

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/locations`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Konum bilgileri alınamadı.");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Konum verisi beklenen biçimde değil.");
        }

        setCities(data as City[]);
      } catch (error) {
        if (controller.signal.aborted) return;

        setLocationError(
          error instanceof Error
            ? error.message
            : "Konum bilgileri yüklenemedi.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLocationLoading(false);
        }
      }
    }

    void loadLocations();

    return () => controller.abort();
  }, [open]);

  if (!mounted || !open) return null;

  const questions = questionsFor(workName);
  const finished = step >= questions.length;
  const summaryStep = step === questions.length + 1;
  const question = questions[step];
  const selectedCity = cities.find(
    (city) => city.slug === citySlug,
  );
  const districts = selectedCity?.districts ?? [];
  const progress = Math.min(
    100,
    Math.round(((step + 1) / (questions.length + 2)) * 100),
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 sm:p-5"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
        className="flex h-dvh w-full flex-col bg-white text-slate-900 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl"
      >
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="quote-modal-title" className="font-bold">
                {workName}
              </h2>
              {serviceGroupName ? (
                <p className="text-xs text-slate-500">{serviceGroupName}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Pencereyi kapat"
              className="rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-orange-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-7">
          {summaryStep ? (
            <div className="space-y-5">
              <h3 className="text-xl font-bold">
                Teklif Talebi Özeti
              </h3>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  Seçilen Hizmet
                </p>
                <p className="font-semibold">{workName}</p>
              </div>

              {questions.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="text-xs text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-1 font-medium">
                    {answers[index] ?? "Belirtilmedi"}
                  </p>
                </div>
              ))}

              {submittedId ? (
                <div
                  role="status"
                  className="rounded-xl border border-green-200 bg-green-50 p-4"
                >
                  <p className="font-semibold text-green-800">
                    Teklif talebiniz başarıyla kaydedildi.
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    Talep Numaranız
                  </p>
                  <p className="break-all font-mono text-sm font-semibold text-slate-900">
                    {submittedId}
                  </p>
                </div>
              ) : null}

              {detail.trim() ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">
                    Detaylı Açıklama
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {detail}
                  </p>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">
                  Hizmet Konumu
                </p>
                <p className="font-semibold">
                  {selectedCity?.name} / {
                    districts.find(
                      (district) => district.slug === districtSlug
                    )?.name
                  }
                </p>
              </div>

              <section className="space-y-4 rounded-xl border border-slate-200 p-4">
                <h4 className="font-semibold">Gizlilik ve İletişim Tercihleri</h4>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={showFullName}
                    onChange={(event) => setShowFullName(event.target.checked)}
                    className="mt-1"
                  />
                  <span>Adım ve soyadım işletmelere tam olarak gösterilsin.</span>
                </label>

                <p className="text-xs text-slate-500">
                  Bu seçeneği işaretlemezseniz yalnızca adınızın ve
                  soyadınızın baş harfleri gösterilir.
                </p>

                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-3 text-sm font-semibold">
                    İşletmeler benimle hangi yollarla iletişime geçebilir?
                  </p>

                  {[
                    {
                      label: "Telefon",
                      checked: contactByPhone,
                      onChange: setContactByPhone,
                    },
                    {
                      label: "WhatsApp",
                      checked: contactByWhatsapp,
                      onChange: setContactByWhatsapp,
                    },
                    {
                      label: "E-posta",
                      checked: contactByEmail,
                      onChange: setContactByEmail,
                    },
                    {
                      label: "Platform içi mesajlaşma",
                      checked: contactBySystemMessage,
                      onChange: setContactBySystemMessage,
                    },
                  ].map((item) => (
                    <label
                      key={item.label}
                      className="mb-3 flex items-center gap-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(event) => item.onChange(event.target.checked)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>

                <p className="text-xs text-slate-500">
                  İletişim bilgileriniz yalnızca izin verdiğiniz kanallarda,
                  geçerli teklif gönderen işletmelerle paylaşılır.
                  Teklif geri çekildiğinde erişim kaldırılır.
                </p>
              </section>

              <p className="text-xs text-slate-500">
                Talebiniz henüz gönderilmedi.
              </p>
              {confirmationMessage ? (
                <p role="status" className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  {confirmationMessage}
                </p>
              ) : null}
            </div>
          ) : finished ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">
                Hizmet nerede yapılacak?
              </h3>
              <p className="text-sm text-slate-600">
                Teklif talebinizin doğru bölgedeki işletmelere
                ulaşabilmesi için il ve ilçenizi seçin.
              </p>

              <div className="space-y-2">
                <label
                  htmlFor="quote-city"
                  className="block text-sm font-semibold"
                >
                  İl
                </label>
                <select
                  id="quote-city"
                  value={citySlug}
                  disabled={locationLoading}
                  onChange={(event) => {
                    setCitySlug(event.target.value);
                    setDistrictSlug("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <option value="">İl seçiniz</option>
                  {cities.map((city) => (
                    <option key={city.slug} value={city.slug}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="quote-district"
                  className="block text-sm font-semibold"
                >
                  İlçe
                </label>
                <select
                  id="quote-district"
                  value={districtSlug}
                  disabled={!citySlug || locationLoading}
                  onChange={(event) =>
                    setDistrictSlug(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm disabled:opacity-50"
                >
                  <option value="">İlçe seçiniz</option>
                  {districts.map((district) => (
                    <option
                      key={district.slug}
                      value={district.slug}
                    >
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              {locationLoading ? (
                <p className="text-sm text-slate-500">
                  Konum bilgileri yükleniyor...
                </p>
              ) : null}

              {locationError ? (
                <p role="alert" className="text-sm text-red-600">
                  {locationError}
                </p>
              ) : null}

              <p className="text-xs text-slate-500">
                Henüz teklif talebi oluşturulmadı.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                Soru {step + 1} / {questions.length}
              </p>
              <h3 className="text-xl font-bold">{question.title}</h3>
              <div className={
                  step === 1
                    ? "grid grid-cols-2 gap-2 sm:grid-cols-4"
                    : "space-y-3"
                }>
                {question.options.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer rounded-xl border text-sm transition ${
                      step === 1
                        ? "min-h-10 items-center justify-center rounded-lg px-2 py-2 text-center text-xs font-medium"
                        : "min-h-12 items-center p-4 text-left"
                    } ${
                      answers[step] === option
                        ? "border-orange-300 bg-orange-50/70 font-medium text-orange-700"
                        : "border-slate-200 hover:border-orange-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`quote-question-${step}`}
                      value={option}
                      checked={answers[step] === option}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [step]: option,
                        }))
                      }
                      className="sr-only"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              {step === questions.length - 1 ? (
                <div className="space-y-2 pt-3">
                  <label
                    htmlFor="quote-detail"
                    className="block text-sm font-semibold"
                  >
                    Detaylı Açıklama
                    <span className="ml-1 font-normal text-slate-500">
                      (İsteğe bağlı)
                    </span>
                  </label>
                  <textarea
                    id="quote-detail"
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    rows={7}
                    maxLength={2000}
                    placeholder="İhtiyacınızla ilgili ek bilgileri buraya yazabilirsiniz..."
                    className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-orange-500"
                  />
                  <p className="text-right text-xs text-slate-500">
                    {detail.length}/2000
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </main>

        <footer className="flex gap-3 border-t border-slate-200 p-5">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
            className="rounded-xl border border-slate-200 px-5 py-3 font-semibold disabled:opacity-40"
          >
            Geri
          </button>
          {summaryStep ? (
            <button
              type="button"
              onClick={async () => {
                if (submitting || submittedId) return;

                setConfirmationMessage("");

                const draft = {
                  workId,
                  workName,
                  serviceGroupName,
                  step,
                  answers,
                  detail,
                  citySlug,
                  districtSlug,
                  showFullName,
                  contactByPhone,
                  contactByWhatsapp,
                  contactByEmail,
                  contactBySystemMessage,
                };

                sessionStorage.setItem(
                  "neyeihtiyacvar.quoteDraft",
                  JSON.stringify(draft),
                );

                const token = getAccessToken();

                if (!token) {
                  router.push(
                    `/giris?returnUrl=${encodeURIComponent("/?quoteResume=1")}`,
                  );
                  return;
                }

                const description = [
                  ...questions.map(
                    (item, index) =>
                      `${item.title}: ${answers[index] ?? "Belirtilmedi"}`,
                  ),
                  detail.trim()
                    ? `Detaylı Açıklama: ${detail.trim()}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\\n");

                if (description.length > 2000) {
                  setConfirmationMessage(
                    "Açıklama 2000 karakter sınırını aşıyor. Lütfen detaylı açıklamayı kısaltın.",
                  );
                  return;
                }

                setSubmitting(true);

                try {
                  const response = await fetch(
                    `${apiBaseUrl}/api/needs`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        title: workName,
                        description,
                        categorySlug: "",
                        serviceSlug: "",
                        categoryLibraryWorkId: workId,
                        citySlug,
                        districtSlug,
                        trackingDuration: "1-month",
                        contactPreferencesSet: true,
                        showFullName,
                        contactByPhone,
                        contactByWhatsapp,
                        contactByEmail,
                        contactBySystemMessage,
                      }),
                    },
                  );

                  const result = await response.json();

                  if (!response.ok) {
                    if (response.status === 403 &&
                        result?.code === "verification_required") {
                      setConfirmationMessage(
                        "Talep oluşturmak için önce e-posta adresinizi doğrulamanız gerekiyor.",
                      );
                    } else {
                      setConfirmationMessage(
                        result?.message ||
                          "Talep kaydedilemedi. Lütfen tekrar deneyin.",
                      );
                    }
                    return;
                  }

                  if (!result?.id) {
                    setConfirmationMessage(
                      "Sunucudan talep numarası alınamadı. İşlemi tekrar denemeden önce taleplerinizi kontrol edin.",
                    );
                    return;
                  }

                  setSubmittedId(result.id);
                  sessionStorage.removeItem(
                    "neyeihtiyacvar.quoteDraft",
                  );
                  onSubmitted?.();
                  onClose();
                  router.push("/taleplerim");
                } catch {
                  setConfirmationMessage(
                    "Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.",
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting || Boolean(submittedId)}
              className="flex-1 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Kaydediliyor..." : submittedId ? "Talep Kaydedildi" : "Talebi Onayla"}
            </button>
          ) : finished ? (
            <button
              type="button"
              onClick={() => {
                if (!citySlug || !districtSlug) return;
                setStep(questions.length + 1);
              }}
              disabled={!citySlug || !districtSlug}
              className="flex-1 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
            >
              Devam
            </button>
          ) : (
            <button
              type="button"
              disabled={!answers[step]}
              onClick={() => setStep((current) => current + 1)}
              className="flex-1 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
            >
              Devam
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
