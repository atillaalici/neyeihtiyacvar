"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { apiBaseUrl } from "@/lib/api";
import { clearAuth, getAccessToken, getStoredUser } from "@/lib/auth";

type Notice = { kind: "success" | "error" | "info"; text: string } | null;

export default function AccountSecurity() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [working, setWorking] = useState(false);
  const user = getStoredUser();

  function logout() {
    clearAuth();
    window.location.assign("/");
  }

  async function changePassword() {
    if (working) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice({ kind: "error", text: "Şifre alanlarının tamamını doldurun." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ kind: "error", text: "Yeni şifreler birbiriyle eşleşmiyor." });
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setPasswordNotice({
        kind: "error",
        text: "Oturum bilgisi bulunamadı. Lütfen yeniden giriş yapın.",
      });
      return;
    }

    setWorking(true);
    setPasswordNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setPasswordNotice({
          kind: "error",
          text: payload?.message ?? "Şifre güncellenemedi.",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordNotice({
        kind: "success",
        text: payload?.message ?? "Şifreniz başarıyla güncellendi.",
      });
    } catch {
      setPasswordNotice({
        kind: "error",
        text: "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.",
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
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
                          onClick={changePassword}
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
                              {user?.email ?? ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                              user?.emailVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {user?.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}
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
    </>
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
