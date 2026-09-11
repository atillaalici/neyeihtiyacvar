"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiBaseUrl } from "@/lib/api";
import { saveAuth, type AuthResponse } from "@/lib/auth";
import type { CategoryDto } from "@/lib/categories";

type DistrictDto = {
  id: string;
  slug: string;
  name: string;
};

type CityDto = {
  id: string;
  slug: string;
  name: string;
  districts: DistrictDto[];
};

type BusinessRegisterResponse = AuthResponse & {
  applicationId: string;
  providerId: string;
  verificationRequired: boolean;
  message: string;
};

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizePhoneDigits(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("90") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatPhone(value: string) {
  const digits = normalizePhoneDigits(value);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 8);
  const p4 = digits.slice(8, 10);

  return [p1, p2, p3, p4].filter(Boolean).join(" ");
}

export function BusinessRegistrationForm() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [additionalServiceSlug, setAdditionalServiceSlug] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [businessTermsAccepted, setBusinessTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [verifyWorking, setVerifyWorking] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] =
    useState<BusinessRegisterResponse | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );

  const selectedCity = useMemo(
    () => cities.find((item) => item.slug === citySlug) ?? null,
    [cities, citySlug],
  );

  const serviceOptions = selectedCategory?.services ?? [];
  const districtOptions = selectedCity?.districts ?? [];

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [categoryResponse, locationResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/categories`, { cache: "no-store" }),
          fetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
        ]);

        if (!categoryResponse.ok || !locationResponse.ok) {
          throw new Error();
        }

        const [categoryData, locationData] = await Promise.all([
          categoryResponse.json(),
          locationResponse.json(),
        ]);

        if (active) {
          setCategories(categoryData);
          setCities(locationData);
        }
      } catch {
        if (active) {
          setError("Kategori ve konum bilgileri yüklenemedi.");
        }
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const phoneDigits = normalizePhoneDigits(phoneNumber);

    if (
      !businessName.trim() ||
      !applicantName.trim() ||
      !email.trim() ||
      phoneDigits.length !== 10 ||
      !phoneDigits.startsWith("5") ||
      !citySlug ||
      !districtSlug ||
      !categorySlug ||
      !serviceSlug ||
      !password ||
      !passwordAgain ||
      !businessTermsAccepted ||
      !termsAccepted
    ) {
      setError("Lütfen zorunlu alanların tamamını doğru şekilde doldur.");
      return;
    }

    if (password !== passwordAgain) {
      setError("Şifreler birbiriyle aynı olmalıdır.");
      return;
    }

    if (
      password.length < 8 ||
      !/[A-ZÇĞİÖŞÜ]/.test(password) ||
      !/[a-zçğıöşü]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError(
        "Şifre en az 8 karakter olmalı; büyük harf, küçük harf ve rakam içermelidir.",
      );
      return;
    }

    if (
      additionalServiceSlug &&
      additionalServiceSlug === serviceSlug
    ) {
      setError("Ek hizmet, ana hizmet ile aynı olamaz.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-applications/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessName: businessName.trim(),
            applicantName: applicantName.trim(),
            email: email.trim(),
            phoneNumber: `+90${phoneDigits}`,
            citySlug,
            districtSlug,
            categorySlug,
            serviceSlug,
            additionalServiceSlug:
              additionalServiceSlug || null,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const firstError =
          data?.errors &&
          Object.values(data.errors).flat().find(Boolean);

        setError(
          (typeof firstError === "string" ? firstError : null) ??
            data?.message ??
            "İşletme hesabı ve başvuru oluşturulamadı.",
        );
        return;
      }

      const registerData = data as BusinessRegisterResponse;
      saveAuth(registerData);
      setRegistered(registerData);
    } catch {
      setError(
        "Sunucuya bağlanılamadı. Backend bağlantısını kontrol et.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyNow() {
    if (!registered) {
      return;
    }

    setVerifyWorking(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/verification/resend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: registered.user.id,
            channel: "email",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ??
            "E-posta doğrulama kodu gönderilemedi.",
        );
        return;
      }

      if (data?.developmentCode) {
        sessionStorage.setItem(
          "neyeihtiyacvar.devVerificationCodes",
          JSON.stringify({
            email: String(data.developmentCode),
          }),
        );
      }

      const params = new URLSearchParams({
        userId: registered.user.id,
        email: registered.user.email,
        phone: registered.user.phoneNumber ?? "",
        channel: "email",
        returnUrl: "/hesabim",
      });

      router.push(`/dogrula?${params.toString()}`);
    } catch {
      setError("Doğrulama kodu istenirken sunucuya bağlanılamadı.");
    } finally {
      setVerifyWorking(false);
    }
  }

  if (registered) {
    return (
      <div className="mt-5 rounded-2xl border border-green-200 bg-card p-6 shadow-soft">
        <p className="text-sm font-semibold text-primary">
          Başvuru alındı
        </p>

        <h2 className="mt-2 font-display text-2xl font-bold">
          İşletme hesabın oluşturuldu
        </h2>

        <p className="mt-3 leading-7 text-muted-foreground">
          Kayıt sırasında doğrulama e-postası göndermedik. İstersen
          şimdi doğrulayabilir veya daha sonra Hesabım bölümünden
          devam edebilirsin.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => void verifyNow()}
            disabled={verifyWorking}
          >
            {verifyWorking ? "Kod gönderiliyor..." : "Şimdi Doğrula"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/hesabim")}
          >
            Doğrulamadan Devam Et
          </Button>
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          İşletme yayına alınmadan önce e-posta ve telefon
          doğrulamasının ikisi de tamamlanmalıdır.
        </p>
      </div>
    );
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/15";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7"
    >
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary">
          İşletme bilgileri
        </p>
        <h2 className="mt-1 font-display text-xl font-bold">
          İşletme hesabını oluştur
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          İşletme hesabı ve işletme başvurusu aynı anda oluşturulur.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            İşletme Adı *
          </label>
          <input
            className={inputClass}
            value={businessName}
            onChange={(event) =>
              setBusinessName(event.target.value)
            }
            maxLength={200}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Yetkili Kişi Adı Soyadı *
          </label>
          <input
            className={inputClass}
            value={applicantName}
            onChange={(event) =>
              setApplicantName(event.target.value)
            }
            maxLength={150}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            E-posta *
          </label>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Telefon *
          </label>
          <div className="flex">
            <span className="flex h-11 items-center rounded-l-xl border border-r-0 border-input bg-muted px-3 text-sm">
              +90
            </span>
            <input
              inputMode="numeric"
              className={`${inputClass} rounded-l-none`}
              value={formatPhone(phoneNumber)}
              onChange={(event) =>
                setPhoneNumber(event.target.value)
              }
              placeholder="5XX XXX XX XX"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            İl *
          </label>
          <Select
            value={citySlug}
            onValueChange={(value) => {
              setCitySlug(value);
              setDistrictSlug("");
            }}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="İl seç" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.slug}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            İlçe *
          </label>
          <Select
            value={districtSlug}
            onValueChange={setDistrictSlug}
            disabled={!selectedCity}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="İlçe seç" />
            </SelectTrigger>
            <SelectContent>
              {districtOptions.map((district) => (
                <SelectItem
                  key={district.id}
                  value={district.slug}
                >
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Ana Kategori *
          </label>
          <Select
            value={categorySlug}
            onValueChange={(value) => {
              setCategorySlug(value);
              setServiceSlug("");
              setAdditionalServiceSlug("");
            }}
            disabled={catalogLoading}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Kategori seç" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.slug}
                >
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Ana Hizmet / Alt Kategori *
          </label>
          <Select
            value={serviceSlug}
            onValueChange={(value) => {
              setServiceSlug(value);

              if (value === additionalServiceSlug) {
                setAdditionalServiceSlug("");
              }
            }}
            disabled={!selectedCategory}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Ana hizmet seç" />
            </SelectTrigger>
            <SelectContent>
              {serviceOptions.map((service) => (
                <SelectItem
                  key={service}
                  value={toSlug(service)}
                >
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Ek Hizmet{" "}
            <span className="font-normal text-muted-foreground">
              (isteğe bağlı, en fazla 1)
            </span>
          </label>

          <Select
            value={additionalServiceSlug || "none"}
            onValueChange={(value) =>
              setAdditionalServiceSlug(
                value === "none" ? "" : value,
              )
            }
            disabled={!selectedCategory}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Ek hizmet seç" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                Ek hizmet yok
              </SelectItem>

              {serviceOptions
                .filter(
                  (service) => toSlug(service) !== serviceSlug,
                )
                .map((service) => (
                  <SelectItem
                    key={service}
                    value={toSlug(service)}
                  >
                    {service}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Şifre *
          </label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="new-password"
            placeholder="En az 8 karakter"
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            En az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Şifre Tekrar *
          </label>
          <input
            type="password"
            className={inputClass}
            value={passwordAgain}
            onChange={(event) =>
              setPasswordAgain(event.target.value)
            }
            autoComplete="new-password"
          />
        </div>

        <div className="sm:col-span-2 space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="text-sm leading-6">
              <Link
                href="/sozlesmeler/kullanim-kosullari"
                target="_blank"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Kullanım ve Üyelik Koşulları
              </Link>{" "}
              metnini okudum ve kabul ediyorum. *
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={businessTermsAccepted}
              onChange={(event) =>
                setBusinessTermsAccepted(event.target.checked)
              }
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="text-sm leading-6">
              <Link
                href="/sozlesmeler/isletme-kosullari"
                target="_blank"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                İşletme ve Hizmet Sağlayıcı Koşulları
              </Link>{" "}
              metnini okudum ve kabul ediyorum. *
            </span>
          </label>

          <p className="pl-7 text-xs leading-5 text-muted-foreground">
            <Link
              href="/sozlesmeler/kvkk-aydinlatma"
              target="_blank"
              className="font-medium text-foreground underline underline-offset-4"
            >
              KVKK Aydınlatma Metni
            </Link>{" "}
            kayıt öncesinde erişiminize sunulmuştur. Bu metin bir sözleşme kabulü veya açık rıza değildir.
          </p>

          <p className="pl-7 text-xs leading-5 text-muted-foreground">
            <Link
              href="/sozlesmeler/gizlilik"
              target="_blank"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Gizlilik Politikası
            </Link>{" "}
            ve{" "}
            <Link
              href="/sozlesmeler/cerez-politikasi"
              target="_blank"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Çerez Politikası
            </Link>{" "}
            metinlerine dilediğiniz zaman ulaşabilirsiniz.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-6 w-full"
        disabled={submitting || catalogLoading}
      >
        {submitting
          ? "Kayıt oluşturuluyor..."
          : "İşletme Hesabını Oluştur ve Başvur"}
      </Button>
    </form>
  );
}
