import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL!,
  fetchOptions:{
    credentials: "include"
  }
});

export const { useSession, signIn, signOut, signUp } = authClient;
