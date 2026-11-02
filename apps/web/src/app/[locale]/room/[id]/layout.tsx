import { getTranslations } from "next-intl/server";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("roomTitle"),
    robots: "noindex, nofollow",
  };
}

export default function RoomLayout({ children }: Props) {
  return <>{children}</>;
}
