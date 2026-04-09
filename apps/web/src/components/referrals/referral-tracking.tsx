"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function ReferralTrackerInner() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (ref) {
      // Store the referral code in localStorage to persist until signup/dashboard
      localStorage.setItem("skilex_ref", ref);
    }
  }, [ref]);

  return null;
}

export function ReferralTracking() {
  return (
    <Suspense fallback={null}>
      <ReferralTrackerInner />
    </Suspense>
  );
}
