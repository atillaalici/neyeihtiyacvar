import { notFound } from "next/navigation";

import ProviderProfileView, {
  type Provider,
} from "@/components/provider/ProviderProfileView";
import { serverApiBaseUrl } from "@/lib/seo";

async function getProvider(slug: string): Promise<Provider | null> {
  try {
    const response = await fetch(
      `${serverApiBaseUrl}/api/providers/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Provider;
  } catch {
    return null;
  }
}

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await getProvider(slug);

  if (!provider) {
    notFound();
  }

  return <ProviderProfileView providerOverride={provider} />;
}
