"use client";

import { HeroSection } from "./hero-section";
import { StatsSection } from "./stats-section";
import { HowItWorksSection } from "./how-it-works-section";
import { FeaturesSection } from "./features-section";
import { CategoriesSection } from "./categories-section";
import { PointsSection } from "./points-section";
import { PlatformSection } from "./platform-section";
import { TrustSection } from "./trust-section";
import { FAQSection } from "./faq-section";
import { CTAFooterSection } from "./cta-footer-section";

export function HomeClient() {
  return (
    <div className="flex w-full flex-col">
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CategoriesSection />
      <PointsSection />
      <PlatformSection />
      <TrustSection />
      <FAQSection />
      <CTAFooterSection />
    </div>
  );
}
