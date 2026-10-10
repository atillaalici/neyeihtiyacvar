"use client";

import {
  Bell,
  Building2,
  Camera,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Megaphone,
  Pencil,
  Phone,
  Save,
  Settings,
  Snowflake,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import BusinessPhotoManager from "@/components/account/BusinessPhotoManager";
import BusinessAccountManager from "@/components/account/BusinessAccountManager";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
  type AuthUser,
} from "@/lib/auth";

type District = { id: string; slug: string; name: string };
type City = { id: string; slug: string; name: string; districts: District[] };

type Notice = { kind: "success" | "error" | "info"; text: string } | null;

type MembershipSummary = {
  membershipId: string;
  currentPlan: {
    id: string;
    code: string;
    name: string;
    annualPrice: number;
    serviceLimit: number;
    sortOrder: number;
  };
  startsAtUtc: string;
  expiresAtUtc: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"personal" | "address" | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [contactVerificationRequired, setContactVerificationRequired] =
    useState(false);
  const [contactVerificationCode, setContactVerificationCode] = useState("");
  const [contactVerificationWorking, setContactVerificationWorking] =
    useState<"send" | "verify" | null>(null);
  const [contactVerificationNotice, setContactVerificationNotice] =
    useState<Notice>(null);
  const [contactVerificationCodeSent, setContactVerificationCodeSent] =
    useState(false);
  const [contactVerificationRetryAfter, setContactVerificationRetryAfter] =
    useState(0);

  const [membershipData, setMembershipData] =
    useState<MembershipSummary | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [districtSlug, setDistrictSlug] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [whatsAppSameAsPhone, setWhatsAppSameAsPhone] = useState(true);
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [buildingNo, setBuildingNo] = useState("");
  const [apartmentNo, setApartmentNo] = useState("");
  const [openAddress, setOpenAddress] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [campaignNotifications, setCampaignNotifications] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (contactVerificationRetryAfter <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setContactVerificationRetryAfter((current) =>
        current > 0 ? current - 1 : 0,
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [contactVerificationRetryAfter]);

  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      window.location.assign("/giris?returnUrl=/hesabim");
      return;
    }

    void Promise.all([
      fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${apiBaseUrl}/api/locations`, { cache: "no-store" }),
    ])
      .then(async ([meResponse, locationResponse]) => {
        if (meResponse.ok) {
          const fresh = (await meResponse.json()) as AuthUser;

          setUser(fresh);
          updateStoredUser(fresh);
          setDisplayName(fresh.displayName);
          setPhoneNumber(fresh.phoneNumber ?? "");
          setWhatsAppNumber(fresh.whatsAppNumber ?? "");
          setWhatsAppSameAsPhone(
            fresh.whatsAppNumber !== null &&
              fresh.whatsAppNumber === fresh.phoneNumber,
          );
          setCitySlug(fresh.citySlug ?? "");
          setDistrictSlug(fresh.districtSlug ?? "");
          setNeighborhood(fresh.neighborhood ?? "");
          setStreet(fresh.street ?? "");
          setBuildingNo(fresh.buildingNo ?? "");
          setApartmentNo(fresh.apartmentNo ?? "");
          setOpenAddress(fresh.openAddress ?? "");
        }

        if (locationResponse.ok) {
          setCities((await locationResponse.json()) as City[]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedCity = useMemo(
    () => cities.find((city) => city.slug === citySlug) ?? null,
    [cities, citySlug],
  );

  const cityName =
    selectedCity?.name ??
    (user?.citySlug ? humanizeSlug(user.citySlug) : "Eklenmemiş");

  const districtName =
    selectedCity?.districts.find((district) => district.slug === districtSlug)
      ?.name ??
    (user?.districtSlug ? humanizeSlug(user.districtSlug) : "Eklenmemiş");

  function startEditing(section: "personal" | "address") {
    if (!user) return;
    setDisplayName(user.displayName);
    setPhoneNumber(user.phoneNumber ?? "");
    setWhatsAppNumber(user.whatsAppNumber ?? "");
    setWhatsAppSameAsPhone(
      user.whatsAppNumber !== null &&
        user.whatsAppNumber === user.phoneNumber,
    );
    setCitySlug(user.citySlug ?? "");
    setDistrictSlug(user.districtSlug ?? "");
    setNeighborhood(user.neighborhood ?? "");
    setStreet(user.street ?? "");
    setBuildingNo(user.buildingNo ?? "");
    setApartmentNo(user.apartmentNo ?? "");
    setOpenAddress(user.openAddress ?? "");
    setNotice(null);
    setEditing(section);
  }

  function verificationUrl(
    channel: "email" | "phone",
    purpose?: "contact-change",
  ) {
    const params = new URLSearchParams({
      userId: user?.id ?? "",
      email: user?.email ?? "",
      phone: user?.phoneNumber ?? "",
      channel,
      returnUrl: "/hesabim",
    });

    if (purpose) {
      params.set("purpose", purpose);
    }

    return `/dogrula?${params.toString()}`;
  }

  async function startContactVerification() {
    const token = getAccessToken();

    if (!token || !user) {
      setContactVerificationNotice({
        kind: "error",
        text: "Oturum bilgisi bulunamadı. Lütfen yeniden giriş yapın.",
      });
      return;
    }

    setContactVerificationWorking("send");
    setContactVerificationNotice(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/verification/resend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            channel: "email",
            purpose: "contact-change",
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 429 && payload?.retryAfterSeconds) {
          setContactVerificationCodeSent(true);
          setContactVerificationRetryAfter(
            Number(payload.retryAfterSeconds),
          );
          setContactVerificationNotice({
            kind: "info",
            text:
              "Doğrulama kodu daha önce gönderildi. E-postanızı kontrol edin.",
          });
          return;
        }

        setContactVerificationNotice({
          kind: "error",
          text:
            payload?.message ??
            "Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.",
        });
        return;
      }

      setContactVerificationCodeSent(true);
      setContactVerificationRetryAfter(120);
      setContactVerificationNotice({
        kind: "success",
        text: "6 haneli doğrulama kodu e-posta adresinize gönderildi.",
      });
    } catch {
      setContactVerificationNotice({
        kind: "error",
        text: "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.",
      });
    } finally {
      setContactVerificationWorking(null);
    }
  }

  async function verifyContactInformation() {
    if (!user) return;

    if (contactVerificationCode.length !== 6) {
      setContactVerificationNotice({
        kind: "error",
        text: "6 haneli doğrulama kodunu girin.",
      });
      return;
    }

    setContactVerificationWorking("verify");
    setContactVerificationNotice(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/auth/verification/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            channel: "email",
            code: contactVerificationCode,
            purpose: "contact-change",
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setContactVerificationNotice({
          kind: "error",
          text: payload?.message ?? "Doğrulama yapılamadı.",
        });
        return;
      }

      const updatedUser = payload?.auth?.user as AuthUser | undefined;

      if (updatedUser) {
        setUser(updatedUser);
        updateStoredUser(updatedUser);
        setPhoneNumber(updatedUser.phoneNumber ?? "");
        setWhatsAppNumber(
          updatedUser.whatsAppNumber ?? updatedUser.phoneNumber ?? "",
        );
        setWhatsAppSameAsPhone(
          !updatedUser.whatsAppNumber ||
            updatedUser.whatsAppNumber === updatedUser.phoneNumber,
        );
      }

      setContactVerificationRequired(false);
      setContactVerificationCode("");
      setContactVerificationCodeSent(false);
      setContactVerificationRetryAfter(0);
      setContactVerificationNotice(null);

      setNotice({
        kind: "success",
        text: "Telefon ve WhatsApp bilgileriniz başarıyla doğrulandı.",
      });
    } catch {
      setContactVerificationNotice({
        kind: "error",
        text: "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.",
      });
    } finally {
      setContactVerificationWorking(null);
    }
  }


  async function saveProfile() {
    const token = getAccessToken();
    if (!token) return;

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          phoneNumber,
          citySlug,
          districtSlug,
          whatsAppNumber: whatsAppSameAsPhone ? phoneNumber : whatsAppNumber,
          neighborhood,
          street,
          buildingNo,
          apartmentNo,
          openAddress,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setNotice({
          kind: "error",
          text: payload?.message ?? "Bilgiler kaydedilemedi.",
        });
        return;
      }

      const updated = payload?.user as AuthUser | undefined;

      if (!updated) {
        setNotice({
          kind: "error",
          text: "Bilgiler kaydedildi ancak güncel hesap bilgileri alınamadı.",
        });
        return;
      }

      setUser(updated);
      updateStoredUser(updated);
      setDisplayName(updated.displayName);
      setPhoneNumber(updated.phoneNumber ?? "");
      setWhatsAppNumber(updated.whatsAppNumber ?? updated.phoneNumber ?? "");
      setWhatsAppSameAsPhone(
        !updated.whatsAppNumber ||
          updated.whatsAppNumber === updated.phoneNumber,
      );
      setCitySlug(updated.citySlug ?? "");
      setDistrictSlug(updated.districtSlug ?? "");
      setNeighborhood(updated.neighborhood ?? "");
      setStreet(updated.street ?? "");
      setBuildingNo(updated.buildingNo ?? "");
      setApartmentNo(updated.apartmentNo ?? "");
      setOpenAddress(updated.openAddress ?? "");

      setEditing(null);

      const needsContactVerification =
        payload?.contactVerificationRequired === true;

      setContactVerificationRequired(needsContactVerification);

      if (needsContactVerification) {
        setNotice({
          kind: "info",
          text:
            "Telefon ve WhatsApp bilgileriniz değiştirildi. Güvenliğiniz için e-posta doğrulaması gerekiyor.",
        });
      } else {
        setNotice({
          kind: "success",
          text: payload?.message ?? "Bilgileriniz kaydedildi.",
        });
      }

      window.history.replaceState(null, "", "/hesabim");
    } finally {
      setSaving(false);
    }
  }

  async function pickAvatar(file: File | undefined) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice({
        kind: "error",
        text: "Lütfen JPG, PNG veya WebP görsel seçin.",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setNotice({
        kind: "error",
        text: "Profil fotoğrafı en fazla 2 MB olabilir.",
      });
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setNotice({
        kind: "error",
        text: "Oturum bulunamadı.",
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${apiBaseUrl}/api/auth/profile-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setNotice({
          kind: "error",
          text: payload?.message ?? "Profil fotoğrafı kaydedilemedi.",
        });
        return;
      }

      setAvatarPreview(
        `${apiBaseUrl}/api/users/${user?.id}/profile-image?t=${Date.now()}`,
      );

      setNotice({
        kind: "success",
        text: payload?.message ?? "Profil fotoğrafınız kaydedildi.",
      });
    } catch {
      setNotice({
        kind: "error",
        text: "Profil fotoğrafı yüklenirken bağlantı hatası oluştu.",
      });
    } finally {
      setSaving(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  async function deleteAccount() {
    const confirmation = window.prompt(
      "Bu işlem geri alınamaz. Hesabınızı kalıcı olarak kapatmak için SİL yazın.",
    );

    if (confirmation?.trim().toLocaleUpperCase("tr-TR") !== "SİL") {
      if (confirmation !== null) {
        setNotice({
          kind: "info",
          text: "Hesap silme işlemi iptal edildi.",
        });
      }
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setNotice({ kind: "error", text: "Oturum bulunamadı." });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setNotice({
          kind: "error",
          text: payload?.message ?? "Hesap kapatılamadı.",
        });
        return;
      }

      clearAuth();
      window.location.assign("/giris");
    } catch {
      setNotice({
        kind: "error",
        text: "Hesap kapatılırken bağlantı hatası oluştu.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function freezeAccount() {
    const confirmed = window.confirm(
      "Hesabınızı dondurmak istediğinize emin misiniz? Hesabınız pasif hale gelecek ve yeniden giriş yapamayacaksınız.",
    );

    if (!confirmed) return;

    const token = getAccessToken();

    if (!token) {
      setNotice({ kind: "error", text: "Oturum bulunamadı." });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/freeze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setNotice({
          kind: "error",
          text: payload?.message ?? "Hesap dondurulamadı.",
        });
        return;
      }

      clearAuth();
      window.location.assign("/giris");
    } catch {
      setNotice({
        kind: "error",
        text: "Hesap dondurulurken bağlantı hatası oluştu.",
      });
    } finally {
      setSaving(false);
    }
  }

  function saveNotificationPreferences() {
    localStorage.setItem(
      "niv.notificationPreferences",
      JSON.stringify({
        email: emailNotifications,
        sms: smsNotifications,
        campaign: campaignNotifications,
      }),
    );
    setNotice({
      kind: "success",
      text: "Bildirim tercihleri bu cihazda kaydedildi.",
    });
  }

  async function requestPasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setNotice({ kind: "error", text: "Şifre alanlarının tamamını doldurun." });
      setPasswordNotice({ kind: "error", text: "Şifre alanlarının tamamını doldurun." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice({ kind: "error", text: "Yeni şifreler birbiriyle eşleşmiyor." });
      setPasswordNotice({ kind: "error", text: "Yeni şifreler birbiriyle eşleşmiyor." });
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setNotice({ kind: "error", text: "Oturum bilgisi bulunamadı. Lütfen yeniden giriş yapın." });
      return;
    }

    setNotice(null);
    setPasswordNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = payload?.message ?? "Şifre güncellenemedi.";
        setNotice({ kind: "error", text: message });
        setPasswordNotice({ kind: "error", text: message });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      const message =
        payload?.message ?? "Şifreniz başarıyla güncellendi.";
      setNotice({ kind: "success", text: message });
      setPasswordNotice({ kind: "success", text: message });
    } catch {
      const message = "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.";
      setNotice({ kind: "error", text: message });
      setPasswordNotice({ kind: "error", text: message });
    }
  }

  async function saveAll() {
    const token = getAccessToken();
    if (!token) return;

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          phoneNumber,
          citySlug,
          districtSlug,
          whatsAppNumber: whatsAppSameAsPhone ? phoneNumber : whatsAppNumber,
          neighborhood,
          street,
          buildingNo,
          apartmentNo,
          openAddress,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setNotice({
          kind: "error",
          text: payload?.message ?? "Bilgiler kaydedilemedi.",
        });
        return;
      }

      const updated = payload?.user as AuthUser | undefined;

      if (!updated) {
        setNotice({
          kind: "error",
          text: "Kayıt tamamlandı ancak güncel hesap bilgileri alınamadı.",
        });
        return;
      }

      setUser(updated);
      updateStoredUser(updated);

      localStorage.setItem(
        "niv.notificationPreferences",
        JSON.stringify({
          email: emailNotifications,
          sms: smsNotifications,
          campaign: campaignNotifications,
        }),
      );

      setNotice({
        kind: "success",
        text: "Bilgileriniz kaydedildi.",
      });
    } catch {
      setNotice({
        kind: "error",
        text: "Bilgiler kaydedilirken bağlantı hatası oluştu.",
      });
    } finally {
      setSaving(false);
    }
  }


  function logout() {
    clearAuth();
    window.location.assign("/");
  }

  useEffect(() => {
    if (loading || user?.role !== "provider") return;

    const token = getAccessToken();
    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/membership-selection/summary`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );

        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          setMembershipError(
            payload?.message ?? "Paket bilgileri yüklenemedi.",
          );
          return;
        }

        setMembershipData(payload as MembershipSummary);
        setMembershipError("");
      } catch {
        if (!cancelled) {
          setMembershipError("Paket bilgileri yüklenemedi.");
        }
      } finally {
        if (!cancelled) setMembershipLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.id, user?.role]);

  if (loading || !user) {
    return (
      <SiteLayout>
        <main className="min-h-[60vh] bg-[#f8fafc]">
          <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 lg:px-8">
            <div className="h-80 animate-pulse rounded-[24px] bg-white shadow-sm" />
          </div>
        </main>
      </SiteLayout>
    );
  }

  const initials = getInitials(user.displayName);
  const profileImageUrl =
    avatarPreview ??
    `${apiBaseUrl}/api/users/${user.id}/profile-image`;

  if (user.role === "provider") {
    return (
      <SiteLayout>
        <main className="min-h-screen bg-[#f8fafc] text-slate-950">
          <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8 xl:py-9">
            <section className="mb-4 grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="pt-1">
                <p className="text-sm font-bold text-[#ea580c]">
                  İşletme Hesabı
                </p>
                <h1 className="mt-1 text-[34px] font-black tracking-[-0.035em] sm:text-[38px]">
                  Hesabım
                </h1>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Mevcut Paket
                  </p>
                  <p className="mt-0.5 text-lg font-black text-slate-900">
                    {membershipLoading
                      ? "Yükleniyor..."
                      : membershipData?.currentPlan.name ?? "—"}
                  </p>

                  <button
                    type="button"
                    onClick={() => window.location.assign("/iletisim")}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-[#f4510b] px-4 text-xs font-black text-white transition hover:bg-[#dd4709] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Paket Değişikliği İçin İletişime Geç
                  </button>

                  {membershipError ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {membershipError}
                    </p>
                  ) : null}
                </div>

                <p className="mt-3 max-w-[220px] text-sm leading-6 text-slate-500">
                  İşletme bilgilerinizi buradan yönetebilir, profilinizi güncelleyebilirsiniz.
                </p>
              </div>

              <div id="isletme-fotograflari" className="scroll-mt-24">
                <BusinessPhotoManager />
              </div>
            </section>

            <div className="min-w-0 space-y-4">
                <BusinessAccountManager />

                <section
                  id="guvenlik"
                  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Hesap ve Güvenlik
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Şifrenizi ve işletme hesabınızın doğrulama durumlarını yönetin.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={logout}
                      className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold shadow-sm hover:bg-slate-50"
                    >
                      Çıkış Yap
                    </button>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-orange-100 text-orange-600">
                          <LockKeyhole className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-950">
                            Şifre Değişikliği
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Hesabınız için güçlü ve benzersiz bir şifre kullanın.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3">
                        <PasswordInput
                          label="Mevcut Şifre"
                          value={currentPassword}
                          onChange={setCurrentPassword}
                          visible={showCurrent}
                          setVisible={setShowCurrent}
                        />

                        <PasswordInput
                          label="Yeni Şifre"
                          value={newPassword}
                          onChange={setNewPassword}
                          visible={showNew}
                          setVisible={setShowNew}
                        />

                        <PasswordInput
                          label="Yeni Şifreyi Doğrula"
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          visible={showConfirm}
                          setVisible={setShowConfirm}
                        />

                        <button
                          type="button"
                          onClick={requestPasswordChange}
                          className="mt-1 h-11 w-full rounded-xl bg-[#f4510b] px-5 text-sm font-black text-white transition hover:bg-[#dd4709] sm:ml-auto sm:w-auto"
                        >
                          Şifreyi Güncelle
                        </button>

                        {passwordNotice ? (
                          <div
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                              passwordNotice.kind === "success"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : passwordNotice.kind === "error"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-blue-200 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {passwordNotice.text}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                      <div>
                        <h3 className="font-black text-slate-950">
                          Hesap Doğrulamaları
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Hesabınızın güvenlik ve iletişim doğrulama durumları.
                        </p>
                      </div>

                      <div className="mt-5 divide-y divide-slate-200">
                        <div className="flex items-center justify-between gap-4 py-4">
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Hesap Doğrulama
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              İşletme hesabınız aktif kullanıcı hesabınıza bağlıdır.
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                            Doğrulandı
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 py-4">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800">
                              E-posta Doğrulama
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                              user.emailVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {user.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 py-4">
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              SMS Doğrulama
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Telefon doğrulaması SMS servisiyle etkinleştirilecek.
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                            Yakında
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
            </div>
          </div>


        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="account-page min-h-screen bg-[#f8fafc] text-slate-950">
        <div className="mx-auto w-full max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8 xl:py-9">
          <header className="mb-5">
            <p className="text-sm font-bold text-[#ea580c]">Hesap Yönetimi</p>
            <h1 className="mt-1 text-[34px] font-black tracking-[-0.035em] sm:text-[38px]">
              Hesabım
            </h1>
            <p className="mt-1 text-[15px] text-slate-500">
              Hesap bilgilerinizi buradan yönetebilirsiniz.
            </p>
          </header>

          {notice ? (
            <div
              className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
                notice.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : notice.kind === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <span>{notice.text}</span>
              </div>

              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Kapat"
                className="shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          <div className="account-grid grid gap-5 lg:grid-cols-2">
            <Card className="min-h-[245px]">
              <CardTitle icon={<Camera className="size-5" />}>Profil Fotoğrafı</CardTitle>
              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="relative size-32 overflow-hidden rounded-full bg-gradient-to-br from-orange-50 to-orange-100 ring-8 ring-slate-50">
                    <div className="absolute inset-0 grid place-items-center text-3xl font-black text-[#ea580c]">
                      {initials}
                    </div>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profileImageUrl}
                      alt="Profil fotoğrafı"
                      className="absolute inset-0 size-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full border-4 border-white bg-slate-950 text-white shadow-lg"
                    aria-label="Profil fotoğrafını değiştir"
                  >
                    <Camera className="size-4" />
                  </button>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-2xl font-black tracking-tight">
                    {user.displayName}
                  </p>
                  <span className="mt-2 inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                    Bireysel Hesap
                  </span>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm transition hover:bg-slate-50"
                  >
                    <Camera className="size-4" />
                    Fotoğrafı Değiştir
                  </button>
                  <p className="mt-2 text-xs text-slate-400">JPG, PNG (max 2 MB)</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) => pickAvatar(event.target.files?.[0])}
                  />
                </div>
              </div>
            </Card>

            <Card className="min-h-[245px] border-orange-200 bg-gradient-to-br from-orange-50/70 to-white">
              <div className="flex h-full flex-col">
                <CardTitle
                  icon={<Building2 className="size-5 text-white" />}
                  iconClassName="bg-[#f4510b]"
                >
                  İşletme Hesabına Geç
                </CardTitle>
                <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-600">
                  Kendi işletmenizi ekleyin, dijital vitrininizi oluşturun ve
                  bölgenizde hizmet arayan müşterilere ulaşın.
                </p>
                <Link
                  href="/kayit?hesap=isletme"
                  className="mt-auto flex h-12 items-center justify-center rounded-xl bg-[#f4510b] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#dd4709]"
                >
                  İşletme Hesabına Geç →
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-4">
                <CardTitle icon={<UserRound className="size-5" />}>Kişisel Bilgiler</CardTitle>
                <EditButton onClick={() => startEditing("personal")} />
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                <InfoRow label="Ad Soyad" value={user.displayName} />
                <InfoRow label="Telefon" value={user.phoneNumber || "Eklenmemiş"} verified={user.phoneVerified} verificationHref={verificationUrl("phone")} />
                <InfoRow label="WhatsApp" value={whatsAppSameAsPhone ? user.phoneNumber || "Eklenmemiş" : whatsAppNumber || "Eklenmemiş"} />
                <InfoRow label="E-posta" value={user.email} verified={user.emailVerified} verificationHref={verificationUrl("email")} />
              </div>
            </Card>

            <Card>
              <CardTitle icon={<Bell className="size-5" />}>Bildirim Tercihleri</CardTitle>
              <div className="mt-4 divide-y divide-slate-100">
                <ToggleRow
                  icon={<Mail className="size-5 text-violet-600" />}
                  title="E-posta Bildirimleri"
                  description="Hesabınızla ilgili bilgilendirmeler"
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                />
                <ToggleRow
                  icon={<Phone className="size-5 text-emerald-600" />}
                  title="SMS Bildirimleri"
                  description="Önemli bildirimler ve hatırlatmalar"
                  checked={smsNotifications}
                  onChange={setSmsNotifications}
                />
                <ToggleRow
                  icon={<Megaphone className="size-5 text-red-500" />}
                  title="Kampanya ve Duyurular"
                  description="Yeni hizmetler ve özel kampanyalar"
                  checked={campaignNotifications}
                  onChange={setCampaignNotifications}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={saveNotificationPreferences}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Save className="size-4" />
                  Tercihleri Kaydet
                </button>
              </div>
            </Card>

            <Card className="min-h-[250px]">
              <div className="flex items-center justify-between gap-4">
                <CardTitle icon={<MapPin className="size-5 text-red-500" />}>Adres Bilgisi</CardTitle>
                <EditButton onClick={() => startEditing("address")} />
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                <InfoRow label="İl" value={cityName} />
                <InfoRow label="İlçe" value={districtName} />
                <InfoRow label="Mahalle / Köy" value={neighborhood || "Eklenmemiş"} />
                <InfoRow label="Cadde / Sokak" value={street || "Eklenmemiş"} />
                <InfoRow label="Bina / Daire" value={buildingNo || apartmentNo ? `${buildingNo || "-"} / ${apartmentNo || "-"}` : "Eklenmemiş"} />
                <InfoRow label="Açık Adres" value={openAddress || "Eklenmemiş"} />
              </div>
            </Card>

            <Card className="min-h-[250px]">
              <CardTitle icon={<LockKeyhole className="size-5" />}>Şifre Değiştir</CardTitle>
              <div className="mt-5 grid gap-3">
                <PasswordInput
                  label="Mevcut Şifre"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  visible={showCurrent}
                  setVisible={setShowCurrent}
                />
                <PasswordInput
                  label="Yeni Şifre"
                  value={newPassword}
                  onChange={setNewPassword}
                  visible={showNew}
                  setVisible={setShowNew}
                />
                <PasswordInput
                  label="Yeni Şifreyi Doğrula"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  visible={showConfirm}
                  setVisible={setShowConfirm}
                />
                <button
                  type="button"
                  onClick={requestPasswordChange}
                  className="mt-1 ml-auto block h-11 w-full rounded-xl bg-[#f4510b] px-5 text-sm font-black text-white transition hover:bg-[#dd4709] sm:w-1/3"
                >
                  Şifreyi Güncelle
                </button>

                {passwordNotice ? (
                  <div
                    className={`mt-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                      passwordNotice.kind === "success"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : passwordNotice.kind === "error"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {passwordNotice.text}
                  </div>
                ) : null}
              </div>
            </Card>

            <section className="lg:col-span-2 rounded-[22px] border border-red-100 bg-red-50/35 p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
                    <Settings className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">Hesap İşlemleri</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Hesabınızı geçici olarak dondurabilir veya kalıcı olarak silebilirsiniz.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void freezeAccount()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Snowflake className="size-4" />
                    Hesabı Dondur
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteAccount()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-6 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                    Hesabı Sil
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => void saveAll()} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f4510b] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#dd4709] disabled:opacity-60">
              <Save className="size-4" />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </main>

      {contactVerificationRequired ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#ea580c]">
                  Güvenlik Doğrulaması
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  E-posta Adresini Doğrula
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setContactVerificationRequired(false);
                  setContactVerificationCode("");
                  setContactVerificationNotice(null);
                  setContactVerificationCodeSent(false);
                }}
                className="grid size-9 place-items-center rounded-full border border-slate-200"
                aria-label="Kapat"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Telefon veya WhatsApp değişikliğini tamamlamak için e-posta
              adresinize gönderilen 6 haneli doğrulama kodunu girin.
            </p>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Doğrulama kodunun gönderileceği adres
              </p>
              <p className="mt-1 break-all text-sm font-black text-slate-800">
                {user.email}
              </p>
            </div>

            {contactVerificationNotice ? (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  contactVerificationNotice.kind === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : contactVerificationNotice.kind === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-blue-200 bg-blue-50 text-blue-800"
                }`}
              >
                {contactVerificationNotice.text}
              </div>
            ) : null}

            {!contactVerificationCodeSent ? (
              <button
                type="button"
                onClick={() => void startContactVerification()}
                disabled={contactVerificationWorking !== null}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#f4510b] px-5 text-sm font-black text-white transition hover:bg-[#dd4709] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {contactVerificationWorking === "send"
                  ? "Kod Gönderiliyor..."
                  : "E-posta ile Kod Gönder"}
              </button>
            ) : (
              <div className="mt-6">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    6 Haneli Doğrulama Kodu
                  </span>

                  <input
                    value={contactVerificationCode}
                    onChange={(event) =>
                      setContactVerificationCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-xl font-black tracking-[0.35em] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void verifyContactInformation()}
                  disabled={
                    contactVerificationWorking !== null ||
                    contactVerificationCode.length !== 6
                  }
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#f4510b] px-6 text-sm font-black text-white transition hover:bg-[#dd4709] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {contactVerificationWorking === "verify"
                    ? "Doğrulanıyor..."
                    : "Doğrula"}
                </button>

                <button
                  type="button"
                  onClick={() => void startContactVerification()}
                  disabled={
                    contactVerificationWorking !== null ||
                    contactVerificationRetryAfter > 0
                  }
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {contactVerificationWorking === "send"
                    ? "Gönderiliyor..."
                    : contactVerificationRetryAfter > 0
                      ? `Tekrar Kod Gönder (${Math.floor(
                          contactVerificationRetryAfter / 60,
                        )}:${String(
                          contactVerificationRetryAfter % 60,
                        ).padStart(2, "0")})`
                      : "Tekrar Kod Gönder"}
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  Kodun geçerlilik süresi 2 dakikadır.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setContactVerificationRequired(false);
                  setContactVerificationCode("");
                  setContactVerificationNotice(null);
                  setContactVerificationCodeSent(false);
                }}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#ea580c]">
                  {editing === "personal" ? "Kişisel Bilgiler" : "Adres Bilgisi"}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {editing === "personal"
                    ? "Kişisel Bilgileri Düzenle"
                    : "Adres Bilgilerini Düzenle"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid size-9 place-items-center rounded-full border border-slate-200"
                aria-label="Kapat"
              >
                <X className="size-4" />
              </button>
            </div>

            {editing === "personal" ? (
              <div className="mt-6 grid gap-4">
                <Field
                  label="Ad Soyad"
                  value={displayName}
                  onChange={setDisplayName}
                />

                <Field
                  label="Telefon"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  inputMode="tel"
                />

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    E-posta
                  </span>
                  <input
                    value={user.email}
                    disabled
                    className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-700">
                      WhatsApp
                    </span>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={whatsAppSameAsPhone}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setWhatsAppSameAsPhone(checked);

                          if (checked) {
                            setWhatsAppNumber(phoneNumber);
                          }
                        }}
                      />
                      Telefonla aynı
                    </label>
                  </div>

                  <input
                    value={
                      whatsAppSameAsPhone ? phoneNumber : whatsAppNumber
                    }
                    onChange={(event) =>
                      setWhatsAppNumber(event.target.value)
                    }
                    disabled={whatsAppSameAsPhone}
                    inputMode="tel"
                    className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 disabled:bg-slate-100"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      İl
                    </span>
                    <select
                      value={citySlug}
                      onChange={(event) => {
                        setCitySlug(event.target.value);
                        setDistrictSlug("");
                      }}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="">İl seçin</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.slug}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      İlçe
                    </span>
                    <select
                      value={districtSlug}
                      onChange={(event) =>
                        setDistrictSlug(event.target.value)
                      }
                      disabled={!selectedCity}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 disabled:bg-slate-50"
                    >
                      <option value="">İlçe seçin</option>
                      {(selectedCity?.districts ?? []).map((district) => (
                        <option key={district.id} value={district.slug}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Mahalle / Köy"
                    value={neighborhood}
                    onChange={setNeighborhood}
                  />
                  <Field
                    label="Cadde / Sokak"
                    value={street}
                    onChange={setStreet}
                  />
                  <Field
                    label="Bina No"
                    value={buildingNo}
                    onChange={setBuildingNo}
                  />
                  <Field
                    label="Daire No (isteğe bağlı)"
                    value={apartmentNo}
                    onChange={setApartmentNo}
                  />
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Açık Adres / Adres Tarifi
                  </span>
                  <textarea
                    value={openAddress}
                    onChange={(event) =>
                      setOpenAddress(event.target.value)
                    }
                    rows={3}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    placeholder="Adres tarifi veya ek bilgi"
                  />
                </label>
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving}
                className="h-11 rounded-xl bg-[#f4510b] px-6 text-sm font-black text-white disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SiteLayout>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-slate-200/90 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.045)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function CardTitle({
  icon,
  children,
  iconClassName = "bg-blue-50 text-blue-600",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconClassName}`}>
        {icon}
      </div>
      <h2 className="text-lg font-black tracking-[-0.02em] sm:text-xl">{children}</h2>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
    >
      <Pencil className="size-3.5" />
      Düzenle
    </button>
  );
}

function InfoRow({
  label,
  value,
  verified,
  verificationHref,
}: {
  label: string;
  value: string;
  verified?: boolean;
  verificationHref?: string;
}) {
  return (
    <div className="grid min-h-12 grid-cols-[92px_minmax(0,1fr)] items-center gap-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)]">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-bold text-slate-800">{value}</span>
        {typeof verified === "boolean" && verificationHref ? (
          <Link href={verificationHref} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition hover:ring-2 hover:ring-offset-1 ${verified ? "bg-emerald-50 text-emerald-600 hover:ring-emerald-100" : "bg-orange-50 text-orange-600 hover:ring-orange-100"}`}>
            {verified ? "Doğrulandı" : "Doğrula"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-[64px] items-center gap-3 py-2">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`ml-auto flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
          checked ? "bg-[#f4510b]" : "bg-slate-300"
        }`}
      >
        <span
          className={`size-5 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  setVisible,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  setVisible: (value: boolean) => void;
}) {
  return (
    <label className="grid items-center gap-2 sm:grid-cols-[125px_minmax(0,1fr)]">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-11 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          placeholder={`${label.toLowerCase()} girin`}
          autoComplete={label === "Mevcut Şifre" ? "current-password" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "tel";
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
    </label>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}

function humanizeSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}
