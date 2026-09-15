"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Building2,
  Copy,
  Eye,
  Search,
  TicketPercent,
  Users,
} from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { apiBaseUrl } from "@/lib/api";

type Organization = {
  id: string;
  name: string;
  type: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  isActive: boolean;
  campaignCount: number;
};

type Campaign = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  name: string;
  codePrefix: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  planCode: string | null;
  quantity: number;
  startsAtUtc: string | null;
  expiresAtUtc: string | null;
  isActive: boolean;
  totalCodes: number;
  usedCodes: number;
  expiredCodes: number;
  availableCodes: number;
  totalDiscount: number;
  participantCount: number;
};

type CodeItem = {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  planCode: string | null;
  usedCount: number;
  usedAtUtc: string | null;
  expiresAtUtc: string | null;
  isActive: boolean;
  campaignId: string | null;
  campaignName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  status: "available" | "used" | "expired" | "inactive" | "scheduled";
};

type CampaignDetail = {
  campaign: {
    id: string;
    name: string;
    codePrefix: string;
    description: string | null;
    discountType: "percentage" | "fixed";
    discountValue: number;
    planCode: string | null;
    quantity: number;
    startsAtUtc: string | null;
    expiresAtUtc: string | null;
    isActive: boolean;
  };
  organization: {
    id: string;
    name: string;
    type: string;
  } | null;
  summary: {
    total: number;
    used: number;
    expired: number;
    available: number;
    totalDiscount: number;
    participants: number;
  };
  codes: Array<{
    id: string;
    code: string;
    status: string;
    usedAtUtc: string | null;
    expiresAtUtc: string | null;
    isActive: boolean;
  }>;
  usages: Array<{
    id: string;
    userId: string | null;
    userDisplayName: string | null;
    userEmail: string | null;
    planCode: string;
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
    paymentStatus: string;
    usedAtUtc: string;
  }>;
};

const planLabels: Record<string, string> = {
  kobi: "KOBİ",
  avantaj: "Avantaj",
  profesyonel: "Profesyonel",
};

const statusLabels: Record<string, string> = {
  available: "Kullanılabilir",
  used: "Kullanıldı",
  expired: "Süresi doldu",
  inactive: "Pasif",
  scheduled: "Başlamadı",
};

export default function AdminPromotionsPage() {
  const [tab, setTab] = useState<"campaigns" | "codes">("campaigns");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("oda");
  const [orgContactName, setOrgContactName] = useState("");
  const [orgContactPhone, setOrgContactPhone] = useState("");
  const [orgContactEmail, setOrgContactEmail] = useState("");

  const [campaignOrgId, setCampaignOrgId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignPrefix, setCampaignPrefix] = useState("");
  const [discountType, setDiscountType] =
    useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("100");
  const [planCode, setPlanCode] = useState("kobi");
  const [quantity, setQuantity] = useState("100");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [orgResponse, campaignResponse, codeResponse] =
        await Promise.all([
          adminFetch(
            `${apiBaseUrl}/api/admin/promotions/organizations`,
            { cache: "no-store" },
          ),
          adminFetch(
            `${apiBaseUrl}/api/admin/promotions/campaigns`,
            { cache: "no-store" },
          ),
          adminFetch(
            `${apiBaseUrl}/api/admin/promotions`,
            { cache: "no-store" },
          ),
        ]);

      const [orgData, campaignData, codeData] =
        await Promise.all([
          orgResponse.json(),
          campaignResponse.json(),
          codeResponse.json(),
        ]);

      if (!orgResponse.ok || !campaignResponse.ok || !codeResponse.ok) {
        setError(
          orgData?.message ??
            campaignData?.message ??
            codeData?.message ??
            "Promosyon verileri yüklenemedi.",
        );
        return;
      }

      setOrganizations(orgData as Organization[]);
      setCampaigns(campaignData as Campaign[]);
      setCodes(codeData as CodeItem[]);

      if (!campaignOrgId && orgData.length > 0) {
        setCampaignOrgId(orgData[0].id);
      }
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  }, [campaignOrgId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const filteredCodes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");

    if (!needle) return codes;

    return codes.filter((item) =>
      [
        item.code,
        item.description ?? "",
        item.campaignName ?? "",
        item.organizationName ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(needle),
    );
  }, [codes, query]);

  async function createOrganization(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!orgName.trim()) {
      setError("Kurum / oda / firma adı zorunludur.");
      return;
    }

    setSavingOrg(true);

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/promotions/organizations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: orgName.trim(),
            type: orgType,
            contactName: orgContactName.trim() || null,
            contactPhone: orgContactPhone.trim()
              ? `+90 ${orgContactPhone.replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "")}`
              : null,
            contactEmail: orgContactEmail.trim() || null,
            notes: null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kurum oluşturulamadı.");
        return;
      }

      setMessage(`${data.name} oluşturuldu.`);
      setOrgName("");
      setOrgContactName("");
      setOrgContactPhone("");
      setOrgContactEmail("");
      await loadAll();
      setCampaignOrgId(data.id);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSavingOrg(false);
    }
  }

  async function createCampaign(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!campaignOrgId) {
      setError("Önce kurum / oda / firma seçin.");
      return;
    }

    const count = Number(quantity);
    const discount = Number(discountValue);

    if (!Number.isInteger(count) || count < 1 || count > 5000) {
      setError("Kod adedi 1 ile 5000 arasında olmalıdır.");
      return;
    }

    if (!Number.isFinite(discount) || discount <= 0) {
      setError("Geçerli bir indirim değeri girin.");
      return;
    }

    setSavingCampaign(true);

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/promotions/campaigns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: campaignOrgId,
            name: campaignName.trim(),
            codePrefix: campaignPrefix.trim(),
            description: null,
            discountType,
            discountValue: discount,
            planCode: planCode === "all" ? null : planCode,
            quantity: count,
            startsAtUtc: startsAt
              ? new Date(startsAt).toISOString()
              : null,
            expiresAtUtc: expiresAt
              ? new Date(expiresAt).toISOString()
              : null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kampanya oluşturulamadı.");
        return;
      }

      setMessage(
        `${data.name}: ${data.generatedCount} tek kullanımlık kod oluşturuldu.`,
      );
      setCampaignName("");
      setCampaignPrefix("");
      await loadAll();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSavingCampaign(false);
    }
  }

  async function openCampaign(id: string) {
    setError("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/promotions/campaigns/${id}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Kampanya detayı açılamadı.");
        return;
      }

      setSelectedCampaign(data as CampaignDetail);
    } catch {
      setError("Sunucuya bağlanılamadı.");
    }
  }

  async function copyCampaignCodes(detail: CampaignDetail) {
    const text = detail.codes.map((item) => item.code).join("\n");
    await navigator.clipboard.writeText(text);
    setMessage(`${detail.codes.length} kod panoya kopyalandı.`);
  }

  async function consumeTest(item: CodeItem) {
    if (
      !window.confirm(
        `${item.code} kodu test kullanımıyla KALICI olarak tüketilsin mi?`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await adminFetch(
        `${apiBaseUrl}/api/admin/promotions/${item.id}/consume-test`,
        { method: "POST" },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message ?? "Test kullanımı yapılamadı.");
        return;
      }

      setMessage(`${item.code} test kullanımında tüketildi.`);
      await loadAll();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    }
  }

  const totalCodes = campaigns.reduce(
    (sum, item) => sum + item.totalCodes,
    0,
  );
  const usedCodes = campaigns.reduce(
    (sum, item) => sum + item.usedCodes,
    0,
  );
  const expiredCodes = campaigns.reduce(
    (sum, item) => sum + item.expiredCodes,
    0,
  );
  const totalDiscount = campaigns.reduce(
    (sum, item) => sum + item.totalDiscount,
    0,
  );

  return (
    <SiteLayout>
      <AdminNav />

      <section className="border-b border-border bg-cream">
        <div className="section-shell py-8 sm:py-10">
          <p className="text-sm font-medium text-primary">Yönetim</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Promosyon Yönetimi
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Oda, kurum ve firmalara kampanya tanımla; toplu tek kullanımlık
            kod üret; kimlerin katıldığını ve sağlanan indirimi takip et.
          </p>
        </div>
      </section>

      <section className="section-shell py-8 sm:py-10">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam Kod", totalCodes],
            ["Kullanılan", usedCodes],
            ["Süresi Dolan", expiredCodes],
            [
              "Toplam İndirim",
              `${totalDiscount.toLocaleString("tr-TR")} TL`,
            ],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="text-xs font-medium text-muted-foreground">
                {label}
              </div>
              <div className="mt-1 text-2xl font-black">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant={tab === "campaigns" ? "default" : "outline"}
            onClick={() => setTab("campaigns")}
          >
            Kurumlar & Kampanyalar
          </Button>
          <Button
            type="button"
            variant={tab === "codes" ? "default" : "outline"}
            onClick={() => setTab("codes")}
          >
            Tüm Kodlar
          </Button>
        </div>

        {tab === "campaigns" ? (
          <>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <form
                onSubmit={createOrganization}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">
                    Kurum / Oda / Firma Ekle
                  </h2>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                    placeholder="Örn. Osmaniye Elektrikçiler Odası"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
                  />

                  <select
                    value={orgType}
                    onChange={(event) => setOrgType(event.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="oda">Oda</option>
                    <option value="kurum">Kurum</option>
                    <option value="firma">Firma</option>
                    <option value="dernek">Dernek</option>
                    <option value="belediye">Belediye</option>
                    <option value="diger">Diğer</option>
                  </select>

                  <input
                    value={orgContactName}
                    onChange={(event) =>
                      setOrgContactName(event.target.value)
                    }
                    placeholder="Yetkili kişi"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />

                  <div className="flex h-10 overflow-hidden rounded-xl border border-input bg-background">
                    <span className="grid shrink-0 place-items-center border-r border-border bg-muted/40 px-3 text-sm font-medium">
                      +90
                    </span>
                    <input
                      value={orgContactPhone}
                      onChange={(event) =>
                        setOrgContactPhone(
                          event.target.value
                            .replace(/\D/g, "")
                            .replace(/^90/, "")
                            .replace(/^0/, "")
                            .slice(0, 10),
                        )
                      }
                      inputMode="numeric"
                      placeholder="5XX XXX XX XX"
                      className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                    />
                  </div>

                  <input
                    type="email"
                    value={orgContactEmail}
                    onChange={(event) =>
                      setOrgContactEmail(event.target.value)
                    }
                    placeholder="İletişim e-postası"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingOrg}
                  className="mt-4 w-full"
                >
                  {savingOrg ? "Kaydediliyor..." : "Kurumu Kaydet"}
                </Button>
              </form>

              <form
                onSubmit={createCampaign}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-center gap-2">
                  <TicketPercent className="size-5 text-primary" />
                  <h2 className="font-display text-lg font-bold">
                    Toplu Kod Kampanyası
                  </h2>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <select
                    value={campaignOrgId}
                    onChange={(event) =>
                      setCampaignOrgId(event.target.value)
                    }
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm sm:col-span-2"
                  >
                    <option value="">Kurum seçin</option>
                    {organizations
                      .filter((item) => item.isActive)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>

                  <input
                    value={campaignName}
                    onChange={(event) =>
                      setCampaignName(event.target.value)
                    }
                    placeholder="Kampanya adı"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />

                  <input
                    value={campaignPrefix}
                    onChange={(event) =>
                      setCampaignPrefix(
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="Kod öneki: ELEK"
                    maxLength={20}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />

                  <select
                    value={discountType}
                    onChange={(event) =>
                      setDiscountType(
                        event.target.value as
                          | "percentage"
                          | "fixed",
                      )
                    }
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="percentage">Yüzde (%)</option>
                    <option value="fixed">Sabit TL</option>
                  </select>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={discountValue}
                    onChange={(event) =>
                      setDiscountValue(event.target.value)
                    }
                    placeholder="İndirim"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />

                  <select
                    value={planCode}
                    onChange={(event) => setPlanCode(event.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Tüm paketler</option>
                    <option value="kobi">KOBİ</option>
                    <option value="avantaj">Avantaj</option>
                    <option value="profesyonel">Profesyonel</option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="Kod adedi"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />

                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-2 text-xs"
                  />

                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-2 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingCampaign}
                  className="mt-4 w-full"
                >
                  {savingCampaign
                    ? "Kodlar üretiliyor..."
                    : "Kampanya ve Kodları Oluştur"}
                </Button>
              </form>
            </div>

            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
              ) : campaigns.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  Henüz kurum kampanyası oluşturulmadı.
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <article
                    key={campaign.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                      <div>
                        <div className="font-display text-lg font-bold">
                          {campaign.organizationName}
                        </div>
                        <div className="text-sm font-semibold text-primary">
                          {campaign.name}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {campaign.totalCodes} kod
                          </span>
                          <span>
                            {campaign.usedCodes} kullanıldı
                          </span>
                          <span>
                            {campaign.expiredCodes} süresi doldu
                          </span>
                          <span>
                            {campaign.availableCodes} kullanılabilir
                          </span>
                          <span>
                            {campaign.participantCount} katılımcı
                          </span>
                          <span>
                            {campaign.totalDiscount.toLocaleString(
                              "tr-TR",
                            )}{" "}
                            TL indirim
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void openCampaign(campaign.id)}
                      >
                        <Eye className="mr-2 size-4" />
                        Detay
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="mt-5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Kod, kurum veya kampanya ara..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm"
              />
            </label>

            <div className="mt-4 space-y-2">
              {filteredCodes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="font-bold">{item.code}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.organizationName ?? "Bireysel"} ·{" "}
                      {item.campaignName ?? "Tek kod"} ·{" "}
                      {item.planCode
                        ? planLabels[item.planCode] ?? item.planCode
                        : "Tüm paketler"}{" "}
                      · {statusLabels[item.status] ?? item.status}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void navigator.clipboard.writeText(item.code)
                      }
                    >
                      <Copy className="size-4" />
                    </Button>

                    {item.status === "available" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void consumeTest(item)}
                      >
                        Test Kullan
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedCampaign ? (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
            <div className="mx-auto my-8 max-w-5xl rounded-2xl bg-background p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">
                    {selectedCampaign.organization?.name}
                  </div>
                  <h2 className="font-display text-2xl font-bold">
                    {selectedCampaign.campaign.name}
                  </h2>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCampaign(null)}
                >
                  Kapat
                </Button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-5">
                {[
                  ["Üretilen", selectedCampaign.summary.total],
                  ["Kullanılan", selectedCampaign.summary.used],
                  ["Aktif", selectedCampaign.summary.available],
                  ["Süresi Dolan", selectedCampaign.summary.expired],
                  [
                    "İndirim",
                    `${selectedCampaign.summary.totalDiscount.toLocaleString(
                      "tr-TR",
                    )} TL`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl bg-muted/50 p-3"
                  >
                    <div className="text-[11px] text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 text-lg font-bold">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">
                  Katılanlar
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void copyCampaignCodes(selectedCampaign)
                  }
                >
                  <Copy className="mr-2 size-4" />
                  Tüm Kodları Kopyala
                </Button>
              </div>

              {selectedCampaign.usages.length === 0 ? (
                <div className="mt-3 rounded-xl border border-border p-5 text-sm text-muted-foreground">
                  Henüz kullanılan kod yok.
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="p-2">Kişi / İşletme</th>
                        <th className="p-2">E-posta</th>
                        <th className="p-2">Paket</th>
                        <th className="p-2">İndirim</th>
                        <th className="p-2">Tutar</th>
                        <th className="p-2">Durum</th>
                        <th className="p-2">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCampaign.usages.map((usage) => (
                        <tr
                          key={usage.id}
                          className="border-b border-border/60"
                        >
                          <td className="p-2">
                            {usage.userDisplayName ?? "Bilinmiyor"}
                          </td>
                          <td className="p-2">
                            {usage.userEmail ?? "-"}
                          </td>
                          <td className="p-2">
                            {planLabels[usage.planCode] ??
                              usage.planCode}
                          </td>
                          <td className="p-2">
                            {usage.discountAmount.toLocaleString(
                              "tr-TR",
                            )}{" "}
                            TL
                          </td>
                          <td className="p-2">
                            {usage.finalPrice.toLocaleString("tr-TR")} TL
                          </td>
                          <td className="p-2">
                            {usage.paymentStatus}
                          </td>
                          <td className="p-2">
                            {new Date(
                              usage.usedAtUtc,
                            ).toLocaleString("tr-TR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6">
                <h3 className="font-display text-lg font-bold">
                  Kodlar
                </h3>
                <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {selectedCampaign.codes.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
                    >
                      <span className="font-mono font-semibold">
                        {item.code}
                      </span>
                      <span className="text-muted-foreground">
                        {statusLabels[item.status] ?? item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-800">
          Her kod yalnızca bir kez kullanılabilir. Ödeme iptal veya başarısız
          olsa bile tüketilen kod tekrar açılmaz. %100 indirimli kodlarda claim
          sonucu ödeme gerektirmez; işletme kayıt tamamlama bağlantısı sonraki
          kayıt akışı adımında bağlanacaktır.
        </div>
      </section>
    </SiteLayout>
  );
}