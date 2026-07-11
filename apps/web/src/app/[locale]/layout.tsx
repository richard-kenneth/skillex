import { Navbar } from "@/components/navbar";
import { QueryProvider } from "@/components/providers";
import { ReferralTracking } from "@/components/referrals/referral-tracking";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { PWARegistration } from "@/components/pwa-registration";
import { MobileNav } from "@/components/mobile-nav";
import { RealtimeNotificationsProvider } from "@/components/notifications/realtime-notifications-provider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const isValidLocale = hasLocale(routing.locales, locale);
  const displayLocale = isValidLocale ? locale : routing.defaultLocale;

  setRequestLocale(displayLocale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={displayLocale} messages={messages}>
      <QueryProvider>
        <RealtimeNotificationsProvider>
          <ReferralTracking />
          <PWARegistration />
          <Navbar />
          <main className="flex-1 flex flex-col pb-16 md:pb-0">{children}</main>
          <MobileNav />
          <Toaster position="bottom-right" richColors />
        </RealtimeNotificationsProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
