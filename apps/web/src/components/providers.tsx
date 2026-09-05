"use client";

import { useSession } from "@/lib/auth-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { identifyUser, resetUser } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";

function UserIdentification() {
  const { data: session, isPending } = useSession();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isPending) return;

    const user = session?.user;
    const previousId = previousUserId.current;

    if (!user) {
      if (previousId) {
        resetUser();
      }
      previousUserId.current = null;
      return;
    }

    if (previousId && previousId !== user.id) {
      resetUser();
    }

    if (previousId !== user.id) {
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
      });
    }

    previousUserId.current = user.id;
  }, [isPending, session?.user]);

  return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UserIdentification />
      {children}
    </QueryClientProvider>
  );
}
