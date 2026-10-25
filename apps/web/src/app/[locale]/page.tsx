import { HomeClient } from "@/components/home/home-client";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_BASE_URL || "https://skil-ex2-web.vercel.app";

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
      siteName: "SkillEx",
      locale: locale,
      type: "website",
      images: [
        {
          url: `${baseUrl}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: t("homeTitle"),
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("homeTitle"),
      description: t("homeDescription"),
      images: [`${baseUrl}/${locale}/opengraph-image`],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  const tHome = await getTranslations({ locale, namespace: "home" });
  const baseUrl = process.env.NEXT_PUBLIC_CLIENT_BASE_URL || "https://skil-ex2-web.vercel.app";

  // Structured Data (JSON-LD) for Search Engines & Rich Results
  const faqItems = ["1", "2", "3", "4", "5", "6", "7"].map((key) => ({
    "@type": "Question",
    "name": tHome(`faq${key}Q`),
    "acceptedAnswer": {
      "@type": "Answer",
      "text": tHome(`faq${key}A`),
    },
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/${locale}/#website`,
        "url": `${baseUrl}/${locale}`,
        "name": "SkillEx",
        "description": t("homeDescription"),
        "inLanguage": locale,
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/${locale}/#organization`,
        "name": "SkillEx",
        "url": `${baseUrl}/${locale}`,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/icon-512.png`,
          "width": 512,
          "height": 512,
        },
        "sameAs": [],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/${locale}/#application`,
        "name": "SkillEx",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Web",
        // TODO: Replace with below when we launch on other platforms
        // "operatingSystem": "Web, Android, iOS",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
        "description": t("homeDescription"),
      },
      {
        "@type": "FAQPage",
        "@id": `${baseUrl}/${locale}/#faq`,
        "mainEntity": faqItems,
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
