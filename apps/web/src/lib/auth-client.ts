import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL!,
  plugins: [emailOTPClient()],
  fetchOptions:{
    credentials: "include"
  }
});

export const { useSession, signIn, signOut, signUp } = authClient;
