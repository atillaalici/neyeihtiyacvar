"use client";

import MessagesClient from "@/app/mesajlarim/UserMessagesClient";
import AccountSecurity from "@/components/account/AccountSecurity";

import { Suspense, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BusinessSidebar } from "@/components/panel/BusinessSidebar";
import { ProviderServicesEditor } from "@/components/panel/ProviderServicesEditor";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Clock3,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
  Wrench,
} from "lucide-react";

import { EmergencyDeclarationControl } from "@/components/site/EmergencyDeclarationControl";
import { OnsiteServiceControl } from "@/components/site/OnsiteServiceControl";
import { SiteLayout } from "@/components/site/SiteLayout";
import { EditableProviderImage } from "@/components/site/EditableProviderImage";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import {
  clearAuth,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";

type ProviderPanelProfile = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription: string;
  description: string | null;
  categorySlug: string;
  serviceSlug: string;
  additionalCategorySlug: string | null;
  additionalServices: string[];
  citySlug: string;
  districtSlug: string;
  publicPhone: string | null;
  publicWhatsapp: string | null;
  publicAddress: string | null;
  workingHours: string | null;
  experienceYears: number | null;
  emergencyService: boolean;
  onsiteService: boolean;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  publicationStatus: "draft" | "published" | "unpublished";
  publishedAtUtc: string | null;
  version: number;
  matchedNeedCount: number;
};

type ProviderNeed = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  district: string;
  categorySlug: string | null;
  serviceSlug: string | null;
  citySlug: string | null;
  districtSlug: string | null;
  targetProviderId?: string | null;
  isDirectRequest?: boolean;
  requesterName?: string | null;
  requesterPhone?: string | null;
  requesterWhatsapp?: string | null;
  requesterEmail?: string | null;
  contactByPhone?: boolean;
  contactByWhatsapp?: boolean;
  contactByEmail?: boolean;
  contactBySystemMessage?: boolean;
  offerCount: number;
  status?: "open" | "offerreceived" | "completed";
  createdAtUtc: string;
};

type ProviderOffer = {
  id: string;
  needRequestId: string;
  needTitle: string;
  needDescription: string;
  needCategory: string;
  needCity: string;
  needDistrict: string;
  needCreatedAtUtc: string;
  needStatus?: "open" | "offerreceived" | "completed";
  requesterName: string | null;
  requesterMemberSinceUtc: string | null;
  requesterCompletedNeedCount: number;
  contactByPhone: boolean;
  contactByWhatsapp: boolean;
  contactByEmail: boolean;
  contactBySystemMessage: boolean;
  requesterPhone: string | null;
  requesterWhatsapp: string | null;
  requesterEmail: string | null;
  message: string;
  price: number | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAtUtc: string;
  updatedAtUtc: string;
};

type ProviderImage = {
  index: number;
  imageUrl: string;
  isCover: boolean;
};

type OfferDraft = {
  message: string;
  price: string;
};

type ProviderReview = {
  id: string;
  needRequestId: string | null;
  needTitle: string;
  interactionChannel?: string | null;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAtUtc: string;
};

type ProviderReviewSummary = {
  providerId: string;
  averageRating: number;
  reviewCount: number;
  reviews: ProviderReview[];
};

type ProviderAnalyticsPeriod = {
  profileViews: number;

  // Genel tıklama istatistikleri
  phoneClicks: number;
  whatsappClicks: number;
  totalContactClicks: number;

  // Giriş yapmış kullanıcıların izlenebilir etkileşimleri
  trackedPhoneContacts: number;
  trackedWhatsappContacts: number;
  emailContacts: number;
  offerContacts: number;
  totalTrackedContacts: number;

  // Etkileşim sonuçları
  serviceReceived: number;
  noService: number;
  considering: number;
  notContacted: number;
  pending: number;

  // Gerçek teklif kayıtları
  offersGiven: number;
  offersAccepted: number;

  startUtc: string | null;
  endUtc: string;
};

type ProviderAnalyticsSummary = {
  provider: {
    id: string;
    businessName: string;
    slug: string;
  };
  generatedAtUtc: string;
  periods: {
    weekly: ProviderAnalyticsPeriod;
    monthly: ProviderAnalyticsPeriod;
    yearly: ProviderAnalyticsPeriod;
    total: ProviderAnalyticsPeriod;
  };
};

function offerStatusLabel(status: ProviderOffer["status"]) {
  if (status === "accepted") return "Kabul Edildi";
  if (status === "rejected") return "Reddedildi";
  if (status === "withdrawn") return "Geri Çekildi";
  return "Bekliyor";
}

function offerStatusClass(status: ProviderOffer["status"]) {
  if (status === "accepted")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "rejected")
    return "border-red-200 bg-red-50 text-red-700";
  if (status === "withdrawn")
    return "border-border bg-muted/40 text-muted-foreground";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function RatingStars({ value }: { value: number }) {
  const rounded = Math.round(value);

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${value.toFixed(1)} yıldız`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-5 ${
            star <= rounded
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export type ProviderPanelSection =
  | "talepler"
  | "teklifler"
  | "genel-bakis"
  | "istatistikler"
  | "hizmetler"
  | "ayarlar"
  | "mesajlar";

function ProviderPanelPageContent({
  section,
}: {
  section: ProviderPanelSection;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notificationNeedId = searchParams.get("talep");

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProviderPanelProfile | null>(null);
  const [needs, setNeeds] = useState<ProviderNeed[]>([]);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [reviewSummary, setReviewSummary] =
    useState<ProviderReviewSummary | null>(null);
  const [analytics, setAnalytics] =
    useState<ProviderAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsPeriod, setAnalyticsPeriod] =
    useState<"weekly" | "monthly" | "yearly" | "total">("monthly");

  const [drafts, setDrafts] = useState<Record<string, OfferDraft>>({});
  const [sendingNeedId, setSendingNeedId] = useState<string | null>(null);
  const [withdrawingOfferId, setWithdrawingOfferId] = useState<string | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editingOfferDraft, setEditingOfferDraft] = useState<OfferDraft>({
    message: "",
    price: "",
  });
  const [savingOfferId, setSavingOfferId] = useState<string | null>(null);
  const [offerEditError, setOfferEditError] = useState("");
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [providerImages, setProviderImages] = useState<ProviderImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imageWorking, setImageWorking] = useState(false);
  const [imageNotice, setImageNotice] = useState("");
  const [imageError, setImageError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);

  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState("");

  async function openNeedConversation(needId: string) {
    if (!profile || openingConversationId) return;

    const token = getAccessToken();
    if (!token) {
      router.push("/giris");
      return;
    }

    setOpeningConversationId(needId);
    setConversationError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/need-messages/needs/${encodeURIComponent(needId)}/providers/${encodeURIComponent(profile.id)}/conversation`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error("Konuşma başlatılamadı.");
      }

      const conversation = (await response.json()) as { id: string };
      if (!conversation.id) {
        throw new Error("Konuşma kimliği alınamadı.");
      }

      router.push(
        `/panel/mesajlarim?conversation=${encodeURIComponent(conversation.id)}`,
      );
    } catch {
      setConversationError(
        "Mesajlaşma açılamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setOpeningConversationId(null);
    }
  }


  const offeredNeedIds = useMemo(
    () => new Set(offers.map((offer) => offer.needRequestId)),
    [offers],
  );

  const visibleNeeds = useMemo(
    () => needs.filter((need) => !offeredNeedIds.has(need.id)),
    [needs, offeredNeedIds],
  );

  useEffect(() => {
    if (!notificationNeedId || loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById(
        `talep-${notificationNeedId}`,
      );

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      target.focus({ preventScroll: true });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [notificationNeedId, loading, needs]);
  useEffect(() => {
    let active = true;

    async function loadPanel() {
      const token = getAccessToken();
      const storedUser = getStoredUser();

      if (!token || !storedUser) {
        router.replace("/giris");
        return;
      }

      if (storedUser.role !== "provider" && storedUser.role !== "admin") {
        router.replace("/hesabim");
        return;
      }

      setUser(storedUser);

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          profileResponse,
          needsResponse,
          offersResponse,
          reviewsResponse,
        ] = await Promise.all([
          fetch(`${apiBaseUrl}/api/provider-panel/me`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/needs`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/offers`, {
            headers,
            cache: "no-store",
          }),
          fetch(`${apiBaseUrl}/api/provider-panel/reviews`, {
            headers,
            cache: "no-store",
          }),
        ]);

        if (
          profileResponse.status === 401 ||
          needsResponse.status === 401 ||
          offersResponse.status === 401 ||
          reviewsResponse.status === 401
        ) {
          clearAuth();
          router.replace("/giris");
          return;
        }

        if (
          !profileResponse.ok ||
          !needsResponse.ok ||
          !offersResponse.ok ||
          !reviewsResponse.ok
        ) {
          throw new Error("Panel verileri alınamadı.");
        }

        const profileData =
          (await profileResponse.json()) as ProviderPanelProfile;
        const needsData = (await needsResponse.json()) as ProviderNeed[];
        const offersData = (await offersResponse.json()) as ProviderOffer[];
        const reviewsData =
          (await reviewsResponse.json()) as ProviderReviewSummary;

        if (!active) return;

        setProfile(profileData);
        setNeeds(needsData);
        setOffers(offersData);
        setReviewSummary(reviewsData);

        void (async () => {
          try {
            const imagesResponse = await fetch(
              `${apiBaseUrl}/api/provider-panel/image`,
              {
                headers,
                cache: "no-store",
              },
            );

            if (!active) return;

            if (!imagesResponse.ok) {
              setImageError("İşletme fotoğrafları yüklenemedi.");
              return;
            }

            const imagesData =
              (await imagesResponse.json()) as ProviderImage[];

            if (!active) return;

            setProviderImages(imagesData);
            setImageError("");
          } catch {
            if (active) {
              setImageError("İşletme fotoğrafları yüklenemedi.");
            }
          } finally {
            if (active) setImagesLoading(false);
          }
        })();

        void (async () => {
          try {
            const analyticsResponse = await fetch(
              `${apiBaseUrl}/api/provider-panel/analytics`,
              {
                headers,
                cache: "no-store",
              },
            );

            if (!active) return;

            if (!analyticsResponse.ok) {
              setAnalyticsError("İstatistik verileri şu anda alınamadı.");
              return;
            }

            const analyticsData =
              (await analyticsResponse.json()) as ProviderAnalyticsSummary;

            if (!active) return;

            setAnalytics(analyticsData);
            setAnalyticsError("");
          } catch {
            if (active) {
              setAnalyticsError("İstatistik verileri şu anda alınamadı.");
            }
          } finally {
            if (active) setAnalyticsLoading(false);
          }
        })();
      } catch {
        if (active) setError("İşletme paneli yüklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPanel();

    return () => {
      active = false;
    };
  }, [router]);

  async function refreshProviderImages() {
    const token = getAccessToken();
    if (!token) return;

    const response = await fetch(
      `${apiBaseUrl}/api/provider-panel/image`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("İşletme fotoğrafları alınamadı.");
    }

    const data = (await response.json()) as ProviderImage[];
    setProviderImages(data);
  }

  async function uploadProviderImage(file: File) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    if (providerImages.length >= 5) {
      setImageError("Bir işletme en fazla 5 fotoğraf yükleyebilir.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setImageWorking(true);
    setImageError("");
    setImageNotice("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setImageError(data?.message ?? "Fotoğraf yüklenemedi.");
        return;
      }

      await refreshProviderImages();
      setImageNotice("İşletme fotoğrafı başarıyla yüklendi.");
    } catch {
      setImageError("Fotoğraf yüklenirken bir hata oluştu.");
    } finally {
      setImageWorking(false);
    }
  }

  async function setProviderCover(index: number) {
    const token = getAccessToken();
    if (!token) return;

    setImageWorking(true);
    setImageError("");
    setImageNotice("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image/cover/${index}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setImageError(data?.message ?? "Kapak fotoğrafı değiştirilemedi.");
        return;
      }

      await refreshProviderImages();
      setImageNotice("Kapak fotoğrafı değiştirildi.");
    } catch {
      setImageError("Kapak fotoğrafı değiştirilirken bir hata oluştu.");
    } finally {
      setImageWorking(false);
    }
  }

  async function deleteProviderImage(index: number) {
    const token = getAccessToken();
    if (!token) return;

    if (!window.confirm("Bu işletme fotoğrafını silmek istiyor musunuz?")) {
      return;
    }

    setImageWorking(true);
    setImageError("");
    setImageNotice("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/image/${index}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setImageError(data?.message ?? "Fotoğraf silinemedi.");
        return;
      }

      await refreshProviderImages();
      setImageNotice("İşletme fotoğrafı silindi.");
    } catch {
      setImageError("Fotoğraf silinirken bir hata oluştu.");
    } finally {
      setImageWorking(false);
    }
  }

  function getDraft(needId: string): OfferDraft {
    return drafts[needId] ?? { message: "", price: "" };
  }

  function updateDraft(
    needId: string,
    field: keyof OfferDraft,
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [needId]: {
        ...getDraft(needId),
        [field]: value,
      },
    }));
  }

  async function submitOffer(
    event: FormEvent<HTMLFormElement>,
    needId: string,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const draft = getDraft(needId);
    const cleanMessage = draft.message.trim();

    if (cleanMessage.length < 5) {
      setError("Teklif mesajı en az 5 karakter olmalıdır.");
      return;
    }

    const price = draft.price.trim() ? Number(draft.price) : null;

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setError("Teklif tutarı geçerli değil.");
      return;
    }

    setError("");
    setMessage("");
    setSendingNeedId(needId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/needs/${needId}/offers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: cleanMessage,
            price,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Teklif gönderilemedi.");
        return;
      }

      setOffers((current) => [
        {
          id: data.id,
          needRequestId: data.needRequestId,
          needTitle:
            needs.find((need) => need.id === needId)?.title ?? "İhtiyaç",
          needStatus: "offerreceived",
          needDescription: needs.find(n => n.id === needId)?.description ?? "",
          needCategory: needs.find(n => n.id === needId)?.category ?? "",
          needCity: needs.find(n => n.id === needId)?.city ?? "",
          needDistrict: needs.find(n => n.id === needId)?.district ?? "",
          needCreatedAtUtc: needs.find(n => n.id === needId)?.createdAtUtc ?? data.createdAtUtc,
          requesterName: needs.find(n => n.id === needId)?.requesterName ?? null,
          requesterMemberSinceUtc: null,
          requesterCompletedNeedCount: 0,
          contactByPhone: needs.find(n => n.id === needId)?.contactByPhone ?? false,
          contactByWhatsapp: needs.find(n => n.id === needId)?.contactByWhatsapp ?? false,
          contactByEmail: needs.find(n => n.id === needId)?.contactByEmail ?? false,
          contactBySystemMessage: needs.find(n => n.id === needId)?.contactBySystemMessage ?? false,
          requesterPhone: null,
          requesterWhatsapp: null,
          requesterEmail: null,
          message: data.message,
          price: data.price,
          status: data.status,
          createdAtUtc: data.createdAtUtc,
          updatedAtUtc: data.createdAtUtc,
        },
        ...current,
      ]);

      setDrafts((current) => {
        const copy = { ...current };
        delete copy[needId];
        return copy;
      });

      setMessage("Teklif başarıyla gönderildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSendingNeedId(null);
    }
  }

  async function saveNotificationPreferences(
    next: ProviderPanelProfile["notificationPreferences"],
  ) {
    const token = getAccessToken();

    if (!token || !profile) {
      router.replace("/giris");
      return;
    }

    setSavingNotifications(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/notification-preferences`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(next),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Bildirim tercihleri kaydedilemedi.");
        return;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              notificationPreferences: {
                email: data.email,
                sms: data.sms,
                whatsapp: data.whatsapp,
                push: data.push,
              },
              version: data.version,
            }
          : current,
      );

      setMessage("Bildirim tercihleri kaydedildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSavingNotifications(false);
    }
  }

  function startEditingOffer(offer: ProviderOffer) {
    if (offer.status !== "pending") return;

    setEditingOfferId(offer.id);
    setEditingOfferDraft({
      message: offer.message,
      price: offer.price === null ? "" : String(offer.price),
    });
    setOfferEditError("");
  }

  function cancelEditingOffer() {
    if (savingOfferId !== null) return;
    setEditingOfferId(null);
    setOfferEditError("");
  }

  async function saveEditedOffer(offerId: string) {
    if (savingOfferId !== null) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/giris");
      return;
    }

    const cleanMessage = editingOfferDraft.message.trim();
    if (cleanMessage.length < 5 || cleanMessage.length > 2000) {
      setOfferEditError("Teklif mesajı 5 ile 2000 karakter arasında olmalıdır.");
      return;
    }

    const price = editingOfferDraft.price.trim()
      ? Number(editingOfferDraft.price)
      : null;

    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100000000)) {
      setOfferEditError("Teklif tutarı geçerli değil.");
      return;
    }

    setOfferEditError("");
    setSavingOfferId(offerId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/offers/${offerId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: cleanMessage, price }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setOfferEditError(data?.message ?? "Teklif güncellenemedi.");
        return;
      }

      setOffers((current) =>
        current.map((offer) =>
          offer.id === offerId
            ? {
                ...offer,
                message: data.message,
                price: data.price,
                updatedAtUtc: data.updatedAtUtc,
              }
            : offer,
        ),
      );

      setEditingOfferId(null);
      setMessage("Teklif başarıyla güncellendi.");
    } catch {
      setOfferEditError("Sunucuya bağlanılamadı.");
    } finally {
      setSavingOfferId(null);
    }
  }

  async function withdrawOffer(offerId: string) {
    const token = getAccessToken();

    if (!token) {
      router.replace("/giris");
      return;
    }

    const confirmed = window.confirm(
      "Bu teklifi geri çekmek istediğine emin misin?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setWithdrawingOfferId(offerId);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/provider-panel/offers/${offerId}/withdraw`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Teklif geri çekilemedi.");
        return;
      }

      setOffers((current) =>
        current.map((offer) =>
          offer.id === offerId
            ? {
                ...offer,
                status: "withdrawn",
                needStatus: data.needStatus,
                updatedAtUtc: new Date().toISOString(),
              }
            : offer,
        ),
      );

      setMessage("Teklif geri çekildi.");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setWithdrawingOfferId(null);
    }
  }
  if (loading) {
    return (
      <SiteLayout hideFooter>
        <section className="section-shell py-12">
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
        </section>
      </SiteLayout>
    );
  }

  if (error && !profile) {
    return (
      <SiteLayout hideFooter>
        <section className="section-shell py-12">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <h1 className="font-display text-2xl font-bold">
              İşletme paneli açılamadı
            </h1>

            <p className="mt-3 text-muted-foreground">{error}</p>
          </div>
        </section>
      </SiteLayout>
    );
  }

  if (!profile) return null;

  const averageRating = reviewSummary?.averageRating ?? 0;
  const reviewCount = reviewSummary?.reviewCount ?? 0;
  const reviews = reviewSummary?.reviews ?? [];

  return (
    <SiteLayout hideFooter>
      <div className="section-shell flex flex-col gap-6 py-6 lg:flex-row lg:items-stretch">
        <BusinessSidebar providerSlug={profile.slug} businessName={profile.businessName} />
        <div className="min-w-0 flex-1">
          {section === "mesajlar" && <MessagesClient embedded />}

      <section className="py-4 sm:py-6">
        {section === "genel-bakis" && (
        <div id="genel-bakis" className="grid scroll-mt-24 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Building2 className="size-5 text-primary" aria-hidden="true" />

              <div>
                <div className="text-sm text-muted-foreground">
                  Profil Durumu
                </div>

                <div className="mt-1 font-semibold">
                  {profile.publicationStatus === "published"
                    ? "Yayında"
                    : profile.publicationStatus === "draft"
                      ? "Taslak"
                      : "Yayından Kaldırıldı"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <MessageSquareText
                className="size-5 text-primary"
                aria-hidden="true"
              />

              <div>
                <div className="text-sm text-muted-foreground">
                  Eşleşen İhtiyaç
                </div>

                <div className="mt-1 font-semibold">
                  {profile.matchedNeedCount}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <UserRound className="size-5 text-primary" aria-hidden="true" />

              <div>
                <div className="text-sm text-muted-foreground">
                  Verilen Teklif
                </div>

                <div className="mt-1 font-semibold">{offers.length}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Star
                className="size-5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />

              <div>
                <div className="text-sm text-muted-foreground">
                  Ortalama Puan
                </div>

                <div className="mt-1 font-semibold">
                  {reviewCount > 0
                    ? `${averageRating.toLocaleString("tr-TR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })} / 5`
                    : "Henüz yok"}
                </div>
              </div>
            </div>
          </div>
        </div>

        )}

        {section === "istatistikler" && (
        <div id="istatistikler" className="mt-8 scroll-mt-24 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Müşteri Etkileşimleri ve Sonuçlar
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                İşletmenizin görünürlüğünü, müşteri iletişimlerini, hizmet sonuçlarını
                ve teklif performansını seçtiğiniz döneme göre takip edin.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["weekly", "Haftalık"],
                ["monthly", "Aylık"],
                ["yearly", "Yıllık"],
                ["total", "Toplam"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setAnalyticsPeriod(
                      value as "weekly" | "monthly" | "yearly" | "total",
                    )
                  }
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    analyticsPeriod === value
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <div className="mt-5 h-80 animate-pulse rounded-xl border border-border bg-muted/40" />
          ) : analytics ? (
            (() => {
              const data = analytics.periods[analyticsPeriod];
              const unresolved =
                data.pending + data.considering + data.notContacted;

              const periodLabel = {
                weekly: "Son 7 Gün",
                monthly: "Son 30 Gün",
                yearly: "Son 1 Yıl",
                total: "Tüm Zamanlar",
              }[analyticsPeriod];

              return (
                <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
                  <div className="flex flex-col gap-1 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-semibold">{periodLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      Seçili dönem performansı
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          Profil Görüntülenme
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.profileViews}
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          İletişim Tıklaması
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.totalContactClicks}
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          Kayıtlı İletişim
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.totalTrackedContacts}
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/35 p-4">
                        <div className="text-xs text-muted-foreground">
                          Hizmet Alan
                        </div>
                        <div className="mt-1 text-3xl font-bold">
                          {data.serviceReceived}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-xl border border-border p-4">
                        <div className="text-sm font-semibold">
                          Müşteri İletişimi
                        </div>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Telefon</span>
                            <strong>{data.trackedPhoneContacts}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">WhatsApp</span>
                            <strong>{data.trackedWhatsappContacts}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">E-posta</span>
                            <strong>{data.emailContacts}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4">
                        <div className="text-sm font-semibold">
                          Hizmet Sonucu
                        </div>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Hizmet Aldı</span>
                            <strong>{data.serviceReceived}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Hizmet Almadı</span>
                            <strong>{data.noService}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Sonuç Bekleniyor</span>
                            <strong>{unresolved}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4">
                        <div className="text-sm font-semibold">
                          Teklif Performansı
                        </div>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Verilen Teklif</span>
                            <strong>{data.offersGiven}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Kabul Edilen</span>
                            <strong>{data.offersAccepted}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Teklif İletişimi</span>
                            <strong>{data.offerContacts}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              {analyticsError || "Henüz görüntülenecek istatistik bulunmuyor."}
            </div>
          )}
        </div>

        )}


        {section === "hizmetler" && (
          <ProviderServicesEditor
            profile={profile}
            onSaved={(updated) =>
              setProfile((current) =>
                current ? { ...current, ...updated } : current
              )
            }
          />
        )}

        {section === "hizmetler" && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-semibold">
              Hizmet Sunum Tercihlerim
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              İşletmenizin hizmet sunum tercihlerini buradan yönetin.
            </p>
            <EmergencyDeclarationControl />
            <OnsiteServiceControl
              initialValue={profile.onsiteService}
              onSaved={(value) =>
                setProfile((current) =>
                  current ? { ...current, onsiteService: value } : current
                )
              }
            />
          </div>
        )}

        {section === "hizmetler" && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                İşletme Fotoğrafları
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Dijital vitrininizde gösterilecek fotoğrafları yönetin. En fazla
                5 adet JPG, PNG veya WebP fotoğraf yükleyebilirsiniz.
              </p>
            </div>

            <label
              className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition ${
                imageWorking || providerImages.length >= 5
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-primary/90"
              }`}
            >
              {imageWorking ? "İşleniyor..." : "Fotoğraf Ekle"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={imageWorking || providerImages.length >= 5}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";

                  if (file) {
                    void uploadProviderImage(file);
                  }
                }}
              />
            </label>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            {providerImages.length} / 5 fotoğraf
          </div>

          {imageNotice && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {imageNotice}
            </div>
          )}

          {imageError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {imageError}
            </div>
          )}

          {imagesLoading ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="aspect-[4/3] animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : providerImages.length === 0 ? (
            <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
              <Building2
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="mt-3 font-medium">
                Henüz işletme fotoğrafı yüklenmemiş
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                İlk yüklediğiniz fotoğraf otomatik olarak kapak fotoğrafı olur.
              </div>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {providerImages.map((image) => (
                <div
                  key={image.index}
                  className="overflow-hidden rounded-xl border border-border bg-background"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    <img
                      src={`${apiBaseUrl}${image.imageUrl}?v=${image.index}-${image.isCover ? "cover" : "image"}`}
                      alt={`${profile.businessName} işletme fotoğrafı`}
                      className="h-full w-full object-cover"
                    />

                    {image.isCover && (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow">
                        Kapak Fotoğrafı
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 p-3">
                    {!image.isCover && (
                      <button
                        type="button"
                        disabled={imageWorking}
                        onClick={() => void setProviderCover(image.index)}
                        className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-3 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
                      >
                        Kapak Yap
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={imageWorking}
                      onClick={() => void deleteProviderImage(image.index)}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        )}

        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div
          className={
            section === "ayarlar" || section === "talepler" || section === "teklifler"
              ? "mt-6 grid grid-cols-1 gap-6"
              : "mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
          }
        >
          <div className="space-y-6">
            {section === "talepler" && (
              <div id="musteri-talepleri" className="scroll-mt-24 space-y-5">
                {(() => {
                  const selectedNeed = visibleNeeds.find(
                    (need) => need.id === (selectedNeedId ?? notificationNeedId),
                  );

                  if (selectedNeed) {
                    const draft = getDraft(selectedNeed.id);
                    const alreadyOffered = offeredNeedIds.has(selectedNeed.id);

                    return (
                      <div id={`talep-${selectedNeed.id}`} className="space-y-5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNeedId(null);
                            if (notificationNeedId) router.replace("/panel");
                          }}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        >
                          ← İş Fırsatlarına Dön
                        </button>

                        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-8">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
                                İş Fırsatı Detayı
                              </p>
                              <h2 className="font-display text-2xl font-bold">
                                {selectedNeed.title}
                              </h2>
                              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="size-4" aria-hidden="true" />
                                {selectedNeed.city} / {selectedNeed.district}
                              </p>
                            </div>
                            <span className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                              {new Date(selectedNeed.createdAtUtc).toLocaleString("tr-TR")}
                            </span>
                          </div>

                          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-600">
                            <span aria-hidden="true">◉</span>
                            {selectedNeed.offerCount === 0
                              ? "Henüz teklif verilmedi"
                              : `${selectedNeed.offerCount} teklif alındı`}
                          </div>

                          <div className="mt-6 border-t border-border pt-6">
                            <h3 className="font-semibold">İhtiyaç Açıklaması</h3>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                              {selectedNeed.description}
                            </p>
                          </div>

                          <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-6 text-xs">
                            <span className="rounded-full bg-muted px-3 py-2">
                              {selectedNeed.category}
                            </span>
                            <span className="rounded-full bg-muted px-3 py-2">
                              {selectedNeed.city} / {selectedNeed.district}
                            </span>
                          </div>

                          <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                            <h3 className="text-sm font-semibold text-foreground">
                              Talep Sahibi ve İletişim
                            </h3>

                            <div className="mt-4 flex items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                                {(selectedNeed.requesterName ?? "K").charAt(0).toLocaleUpperCase("tr-TR")}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {selectedNeed.requesterName ?? "Kullanıcı"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedNeed.city} / {selectedNeed.district}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                              {selectedNeed.contactByPhone && (
                                selectedNeed.requesterPhone ? (
                                  <a
                                    href={`tel:${selectedNeed.requesterPhone}`}
                                    className="inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                                  >
                                    Telefon Et
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="rounded-lg bg-orange-500/40 px-4 py-2 text-sm font-medium text-white/90"
                                  >
                                    Telefon Et
                                  </button>
                                )
                              )}

                              {selectedNeed.contactByWhatsapp && (
                                selectedNeed.requesterWhatsapp ? (
                                  <a
                                    href={`https://wa.me/${selectedNeed.requesterWhatsapp.replace(/\\D/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
                                  >
                                    WhatsApp
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="rounded-lg bg-green-500/40 px-4 py-2 text-sm font-medium text-white/90"
                                  >
                                    WhatsApp
                                  </button>
                                )
                              )}

                              {selectedNeed.contactByEmail && (
                                selectedNeed.requesterEmail ? (
                                  <a
                                    href={`mailto:${selectedNeed.requesterEmail}`}
                                    className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                                  >
                                    E-posta
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground opacity-50"
                                  >
                                    E-posta
                                  </button>
                                )
                              )}

                              {selectedNeed.contactBySystemMessage && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void openNeedConversation(selectedNeed.id)}
                                  disabled={openingConversationId !== null}
                                >
                                  {openingConversationId === selectedNeed.id
                                    ? "Açılıyor..."
                                    : "Mesaj"}
                                </Button>
                              )}
                            </div>

                            {conversationError && (
                              <p role="alert" className="mt-3 text-xs text-red-600">
                                {conversationError}
                              </p>
                            )}

                            {!selectedNeed.contactByPhone &&
                              !selectedNeed.contactByWhatsapp &&
                              !selectedNeed.contactByEmail &&
                              !selectedNeed.contactBySystemMessage && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                  Talep sahibi iletişim yöntemi belirtmemiş.
                                </p>
                              )}

                            {!alreadyOffered &&
                              (selectedNeed.contactByPhone ||
                                selectedNeed.contactByWhatsapp ||
                                selectedNeed.contactByEmail) && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                  İletişim seçenekleri teklif verdikten sonra kullanılabilir.
                                </p>
                              )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-8">
                          <h3 className="font-display text-xl font-semibold">
                            Teklifinizi Hazırlayın
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Yapacağınız işi ve teklif koşullarınızı müşteriye açıklayın.
                          </p>

                          {alreadyOffered ? (
                            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                              Bu talebe teklif verdiniz.
                            </div>
                          ) : (
                            <form
                              onSubmit={(event) => submitOffer(event, selectedNeed.id)}
                              className="mt-6 space-y-5"
                            >
                              <div>
                                <label htmlFor="offer-price" className="mb-2 block text-sm font-semibold">
                                  Teklif Tutarı (TL) — İsteğe bağlı
                                </label>
                                <input
                                  id="offer-price"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={draft.price}
                                  onChange={(event) => updateDraft(selectedNeed.id, "price", event.target.value)}
                                  placeholder="Örn. 1500"
                                  className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
                                />
                              </div>
                              <div>
                                <label htmlFor="offer-message" className="mb-2 block text-sm font-semibold">
                                  Teklif Mesajı
                                </label>
                                <textarea
                                  id="offer-message"
                                  value={draft.message}
                                  onChange={(event) => updateDraft(selectedNeed.id, "message", event.target.value)}
                                  rows={5}
                                  maxLength={2000}
                                  placeholder="Yapılacak işlemleri, hizmet kapsamını ve teklifinizi açıklayın..."
                                  className="w-full resize-y rounded-lg border border-input bg-background p-4 text-sm"
                                />
                              </div>
                              <div className="flex justify-end">
                                <Button type="submit" disabled={sendingNeedId === selectedNeed.id}>
                                  {sendingNeedId === selectedNeed.id ? "Gönderiliyor..." : "Teklif Ver"}
                                </Button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h2 className="font-display text-2xl font-bold">İş Fırsatları</h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            İşletmenizin hizmetleriyle eşleşen açık müşteri talepleri.
                          </p>
                        </div>
                        <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                          {visibleNeeds.length} fırsat
                        </span>
                      </div>

                      {visibleNeeds.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
                          Şu anda işletmenizle eşleşen açık talep bulunmuyor.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {visibleNeeds.map((need) => (
                            <button
                              key={need.id}
                              id={`talep-${need.id}`}
                              type="button"
                              onClick={() => setSelectedNeedId(need.id)}
                              className="block w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:p-6"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <span className="mb-2 inline-block text-xs font-semibold text-orange-600">
                                    Yeni İş Fırsatı
                                  </span>
                                  <h3 className="font-display text-lg font-semibold">{need.title}</h3>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(need.createdAtUtc).toLocaleString("tr-TR")}
                                </span>
                              </div>
                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                {need.description}
                              </p>
                              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                                <span className="inline-flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="size-4" aria-hidden="true" />
                                    {need.city} / {need.district}
                                  </span>
                                  <span className="font-medium text-slate-600">
                                    {need.offerCount === 0
                                      ? "Henüz teklif verilmedi"
                                      : `${need.offerCount} teklif alındı`}
                                  </span>
                                </span>
                                <span className="inline-flex shrink-0 items-center gap-2 cursor-pointer rounded-lg border border-orange-500 bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors group-hover:border-orange-600 group-hover:bg-orange-600">
                                  Detayları Gör
                                  <span aria-hidden="true">↗</span>
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {section === "istatistikler" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Aldığım Değerlendirmeler
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Tamamlanmış işler sonrası müşterilerin bıraktığı puan ve
                    yorumlar.
                  </p>
                </div>

                {reviewCount > 0 && (
                  <div className="flex items-center gap-3">
                    <RatingStars value={averageRating} />

                    <div>
                      <div className="font-semibold">
                        {averageRating.toLocaleString("tr-TR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        / 5
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {reviewCount} değerlendirme
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {reviewCount === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Henüz müşteri değerlendirmesi bulunmuyor.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="font-semibold">
                            {review.reviewerName}
                          </div>

                          <div className="mt-1 text-sm text-muted-foreground">
                            {review.needTitle}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <RatingStars value={review.rating} />

                            <span className="text-sm font-medium">
                              {review.rating} / 5
                            </span>
                          </div>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAtUtc).toLocaleString("tr-TR")}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {review.comment}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            )}
            {section === "teklifler" && (
              <div id="tekliflerim" className="w-full min-w-0 flex-1 space-y-5">
                <div className="border-b border-border pb-4">
                  <h1 className="font-display text-2xl font-bold">
                    Verdiğim Teklifler
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gönderdiğiniz teklifleri ve güncel durumlarını buradan takip edebilirsiniz.
                  </p>
                </div>

                <h2 className="text-sm font-semibold">
                  Tekliflerim
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({offers.length})
                  </span>
                </h2>

                {offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Henüz teklif vermediniz.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {offers.map((offer) => (
                      <details
                        key={offer.id}
                        className="group rounded-xl border border-border bg-card shadow-sm"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {offer.needTitle}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {offer.price !== null
                                ? `${offer.price.toLocaleString("tr-TR")} TL`
                                : "Fiyat belirtilmedi"}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${offerStatusClass(offer.status)}`}
                            >
                              {offerStatusLabel(offer.status)}
                            </span>
                            <span className="text-xs font-medium text-primary group-open:hidden">
                              Detayları Gör ↓
                            </span>
                            <span className="hidden text-xs font-medium text-primary group-open:inline">
                              Kapat ↑
                            </span>
                          </div>
                        </summary>

                        <div className="border-t border-border px-4 pb-4 pt-4">
                          <div className="rounded-2xl border border-border p-5 sm:p-7">
                            <p className="text-xs font-bold uppercase tracking-widest text-primary">
                              İş Fırsatı Detayı
                            </p>
                            <h3 className="mt-3 font-display text-xl font-bold">
                              {offer.needTitle}
                            </h3>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span>{new Date(offer.needCreatedAtUtc).toLocaleDateString("tr-TR")}</span>
                              <span>{[offer.needDistrict, offer.needCity].filter(Boolean).join(" / ")}</span>
                            </div>
                            <div className="mt-5 border-t border-border pt-5">
                              <h4 className="font-semibold">İhtiyaç Açıklaması</h4>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                                {offer.needDescription || "Açıklama belirtilmedi."}
                              </p>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {offer.needCategory && (
                                <span className="rounded-full border px-3 py-1 text-xs">
                                  {offer.needCategory}
                                </span>
                              )}
                              {(offer.needCity || offer.needDistrict) && (
                                <span className="rounded-full border px-3 py-1 text-xs">
                                  {[offer.needDistrict, offer.needCity].filter(Boolean).join(" / ")}
                                </span>
                              )}
                            </div>
                            <div className="mt-6 rounded-xl border border-border p-4 sm:p-5">
                              <h4 className="font-semibold">Talep Sahibi ve İletişim</h4>
                              <div className="mt-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                                  {(offer.requesterName || "K").charAt(0).toLocaleUpperCase("tr-TR")}
                                </div>
                                <div>
                                  <p className="font-semibold">{offer.requesterName || "Kullanıcı"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {[offer.needDistrict, offer.needCity].filter(Boolean).join(" / ")}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {offer.requesterMemberSinceUtc && (
                                  <span>Üyelik: {new Date(offer.requesterMemberSinceUtc).toLocaleDateString("tr-TR")}</span>
                                )}
                                <span>Tamamlanan talep: {offer.requesterCompletedNeedCount}</span>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                                {offer.contactByPhone && (
                                  offer.requesterPhone ? (
                                    <a
                                      href={`tel:${offer.requesterPhone}`}
                                      className="inline-flex items-center rounded-lg bg-orange-300 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
                                    >
                                      Telefon Et
                                    </a>
                                  ) : (
                                    <button type="button" disabled className="rounded-lg bg-orange-300 px-4 py-2 text-sm font-medium text-white opacity-50">
                                      Telefon Et
                                    </button>
                                  )
                                )}

                                {offer.contactByWhatsapp && (
                                  offer.requesterWhatsapp ? (
                                    <a
                                      href={`https://wa.me/${offer.requesterWhatsapp.replace(/\\D/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-white hover:bg-green-400"
                                    >
                                      WhatsApp
                                    </a>
                                  ) : (
                                    <button type="button" disabled className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-white opacity-50">
                                      WhatsApp
                                    </button>
                                  )
                                )}

                                {offer.contactByEmail && (
                                  offer.requesterEmail ? (
                                    <a
                                      href={`mailto:${offer.requesterEmail}`}
                                      className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                                    >
                                      E-posta
                                    </a>
                                  ) : (
                                    <button type="button" disabled className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground opacity-50">
                                      E-posta
                                    </button>
                                  )
                                )}

                                {offer.contactBySystemMessage && offer.status !== "withdrawn" && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={openingConversationId !== null}
                                    onClick={() => void openNeedConversation(offer.needRequestId)}
                                  >
                                    Mesaj
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 rounded-2xl border border-border p-5 sm:p-7">
                            <h3 className="text-base font-semibold">Verdiğim Teklif</h3>

                          {editingOfferId === offer.id ? (
                            <form
                              className="mt-4 space-y-4"
                              onSubmit={(event) => {
                                event.preventDefault();
                                void saveEditedOffer(offer.id);
                              }}
                            >
                              <div>
                                <label htmlFor={`edit-price-${offer.id}`} className="mb-2 block text-sm font-semibold">
                                  Teklif Tutarı (TL) — İsteğe bağlı
                                </label>
                                <input
                                  id={`edit-price-${offer.id}`}
                                  type="number"
                                  min={0}
                                  max={100000000}
                                  step="0.01"
                                  value={editingOfferDraft.price}
                                  onChange={(event) =>
                                    setEditingOfferDraft((current) => ({
                                      ...current,
                                      price: event.target.value,
                                    }))
                                  }
                                  className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm"
                                />
                              </div>
                              <div>
                                <label htmlFor={`edit-message-${offer.id}`} className="mb-2 block text-sm font-semibold">
                                  Teklif Mesajı
                                </label>
                                <textarea
                                  id={`edit-message-${offer.id}`}
                                  value={editingOfferDraft.message}
                                  onChange={(event) =>
                                    setEditingOfferDraft((current) => ({
                                      ...current,
                                      message: event.target.value,
                                    }))
                                  }
                                  rows={5}
                                  maxLength={2000}
                                  className="w-full resize-y rounded-lg border border-input bg-background p-4 text-sm"
                                />
                              </div>

                              {offerEditError && (
                                <p role="alert" className="text-sm text-red-600">
                                  {offerEditError}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={savingOfferId !== null}>
                                  {savingOfferId === offer.id
                                    ? "Kaydediliyor..."
                                    : "Değişiklikleri Kaydet"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={savingOfferId !== null}
                                  onClick={cancelEditingOffer}
                                >
                                  Vazgeç
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <>
                          <p className="mt-3 text-xs font-medium text-muted-foreground">
                            Teklif Tutarı
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {offer.price !== null
                              ? `${offer.price.toLocaleString("tr-TR")} TL`
                              : "Belirtilmedi"}
                          </p>

                          <p className="mt-4 text-xs font-medium text-muted-foreground">
                            Teklif Mesajı
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                            {offer.message}
                          </p>

                          <p className="mt-4 text-xs text-muted-foreground">
                            Teklif tarihi: {new Date(offer.createdAtUtc).toLocaleString("tr-TR")}
                          </p>

                            </>
                          )}

                          {offer.status === "pending" && editingOfferId !== offer.id && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={savingOfferId !== null || withdrawingOfferId !== null}
                                onClick={() => startEditingOffer(offer)}
                              >
                                Teklifi Düzenle
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={withdrawingOfferId === offer.id}
                                onClick={() => void withdrawOffer(offer.id)}
                                className="border-red-600 text-red-600 hover:bg-red-50"
                              >
                                {withdrawingOfferId === offer.id
                                  ? "Geri Çekiliyor..."
                                  : "Teklifi Geri Çek"}
                              </Button>
                            </div>
                          )}

                          {offer.status === "accepted" && (
                            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                              Müşteri teklifinizi kabul etti.
                            </div>
                          )}

                          {offer.status === "withdrawn" && (
                            <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                              Bu teklif geri çekildi.
                            </div>
                          )}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {section === "ayarlar" && (
            <div className="w-full space-y-6">
              <div className="border-b border-border pb-5">
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  Ayarlar
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  İşletme bilgilerinizi ve bildirim tercihlerinizi buradan yönetin.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
                <div className="mb-6">
                  <h2 className="font-display text-lg font-semibold">
                    İşletme Bilgileri
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    İşletmenize ait mevcut kayıt bilgileri.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="text-xs text-muted-foreground">İşletme Adı</div>
                    <div className="mt-2 font-semibold">{profile.businessName}</div>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="text-xs text-muted-foreground">Konum</div>
                    <div className="mt-2 font-medium">
                      {profile.citySlug?.charAt(0).toLocaleUpperCase("tr-TR")}{profile.citySlug?.slice(1)} / {profile.districtSlug?.charAt(0).toLocaleUpperCase("tr-TR")}{profile.districtSlug?.slice(1)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="text-xs text-muted-foreground">Ana Hizmet</div>
                    <div className="mt-2 font-medium break-words">
                      {profile.categorySlug} → {profile.serviceSlug}
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-4">
                    <div className="text-xs text-muted-foreground">Telefon</div>
                    <div className="mt-2 font-medium">
                      {profile.publicPhone || "Telefon belirtilmemiş"}
                    </div>
                  </div>

                  {profile.additionalCategorySlug &&
                    profile.additionalServices.length > 0 && (
                      <div className="rounded-xl bg-muted/40 p-4">
                        <div className="text-xs text-muted-foreground">Ek Hizmet</div>
                        <div className="mt-2 font-medium break-words">
                          {profile.additionalCategorySlug} →{" "}
                          {profile.additionalServices[0]}
                        </div>
                      </div>
                    )}

                  {profile.workingHours && (
                    <div className="rounded-xl bg-muted/40 p-4">
                      <div className="text-xs text-muted-foreground">Çalışma Saatleri</div>
                      <div className="mt-2 font-medium">{profile.workingHours}</div>
                    </div>
                  )}

                  {profile.emergencyService && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="text-xs text-muted-foreground">Acil Servis</div>
                      <div className="mt-2 font-medium text-primary">
                        Acil servis mevcut
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
                <h2 className="font-display text-lg font-semibold">
                  Bildirim Tercihleri
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Yeni ihtiyaç taleplerini hangi kanallardan almak istediğinizi seçin.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["email", "E-posta"],
                  ["sms", "SMS"],
                  ["whatsapp", "WhatsApp"],
                  ["push", "Mobil bildirim"],
                ].map(([key, label]) => {
                  const typedKey =
                    key as keyof ProviderPanelProfile["notificationPreferences"];

                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-4 transition-colors hover:bg-muted/30"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <input
                        type="checkbox"
                        checked={profile.notificationPreferences[typedKey]}
                        disabled={savingNotifications}
                        onChange={(event) => {
                          const next = {
                            ...profile.notificationPreferences,
                            [typedKey]: event.target.checked,
                          };

                          setProfile((current) =>
                            current
                              ? {
                                  ...current,
                                  notificationPreferences: next,
                                }
                              : current,
                          );

                          void saveNotificationPreferences(next);
                        }}
                        className="size-4 accent-primary"
                      />
                    </label>
                  );
                })}

                </div>

                <p className="mt-5 rounded-xl bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
                  Tercihleriniz kaydedilir. Uygulama içi bildirim şu anda aktiftir.
                  E-posta, SMS ve WhatsApp dış gönderimleri ilgili servis
                  entegrasyonları tamamlandığında bu tercihlere göre çalışacaktır.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
                  <h2 className="font-display text-lg font-semibold">
                    Puan Özeti
                  </h2>
              {reviewCount === 0 ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Henüz müşteri değerlendirmesi yok.
                </p>
              ) : (
                <div className="mt-4">
                  <RatingStars value={averageRating} />

                  <div className="mt-2 text-3xl font-bold">
                    {averageRating.toLocaleString("tr-TR", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    {reviewCount} müşteri değerlendirmesi
                  </div>
                </div>
              )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-7">
                  <h2 className="font-display text-lg font-semibold">
                    Teklif Sistemi
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Teklif sistemi yalnızca hesabınıza bağlı, eşleşen ve
                    sonuçlanmamış taleplerde çalışır.
                  </p>
                </div>
              </div>
              <AccountSecurity />
            </div>
          )}
        </div>
      </section>
        </div>
      </div>
    </SiteLayout>
  );
}

export function ProviderPanelWorkspace({
  section = "talepler",
}: {
  section?: ProviderPanelSection;
}) {
  return (
    <Suspense
      fallback={
        <SiteLayout hideFooter>
          <div
            data-panel-suspense-wrapper
            className="section-shell py-12"
          >
            <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </SiteLayout>
      }
    >
      <ProviderPanelPageContent section={section} />
    </Suspense>
  );
}
