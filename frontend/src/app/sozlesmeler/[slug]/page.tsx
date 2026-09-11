import { notFound } from "next/navigation";

import { LegalDocument } from "@/components/legal/LegalDocument";
import {
  getLegalDocument,
  legalDocuments,
} from "@/components/legal/legal-data";
import { SiteLayout } from "@/components/site/SiteLayout";

export function generateStaticParams() {
  return legalDocuments.map((document) => ({
    slug: document.slug,
  }));
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) {
    notFound();
  }

  return (
    <SiteLayout>
      <LegalDocument document={document} />
    </SiteLayout>
  );
}