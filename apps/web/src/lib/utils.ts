import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAuthCallbackUrl() {
  return process.env.NEXT_PUBLIC_CLIENT_BASE_URL! + "/dashboard";
}
