import { HomeClient } from "@/components/home/home-client";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_BASE_URL || "https://skil-ex2.render.com";

  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        en: `${baseUrl}/en`,
        fr: `${baseUrl}/fr`,
        es: `${baseUrl}/es`,
        pt: `${baseUrl}/pt`,
      },
    },
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDescription"),
      url: `${baseUrl}/${locale}`,
      siteName: "Skill Exchange",
      locale: locale,
      type: "website",
      images: [
        {
          url: `${baseUrl}/icon-512.png`,
          width: 512,
          height: 512,
          alt: "Skill Exchange Logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("homeTitle"),
      description: t("homeDescription"),
      images: [`${baseUrl}/icon-512.png`],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_BASE_URL || "https://skil-ex2.render.com";

  // Structured Data (JSON-LD) for Search Engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/${locale}/#website`,
        "url": `${baseUrl}/${locale}`,
        "name": "Skill Exchange",
        "description": t("homeDescription"),
        "inLanguage": locale,
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/${locale}/#organization`,
        "name": "Skill Exchange",
        "url": `${baseUrl}/${locale}`,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/icon-512.png`,
          "width": 512,
          "height": 512,
        },
        "sameAs": [],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
