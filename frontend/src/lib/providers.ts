export type ProviderSummary = {
  id: string;
  slug: string;
  businessName: string;
  shortDescription: string;
  categorySlug: string;
  serviceSlug: string;
  citySlug: string;
  districtSlug: string;
  publicPhone: string | null;
  publicWhatsapp: string | null;
  isVerifiedBusiness: boolean;
  publicationStatus: "published";
};

export type ProviderDetail = ProviderSummary & {
  description: string | null;
  additionalServices: string[];
  publicAddress: string | null;
  workingHours: string | null;
  experienceYears: number | null;
  emergencyService: boolean;
  onsiteService: boolean;
};

export function phoneHref(value: string | null) {
  if (!value) return undefined;

  const digits = value.replace(/[^0-9]/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return undefined;
  }

  return `tel:${digits}`;
}

export function whatsappHref(value: string | null) {
  if (!value) return undefined;

  let digits = value.replace(/[^0-9]/g, "");

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `90${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return undefined;
  }

  return `https://wa.me/${digits}`;
}
