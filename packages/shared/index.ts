export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface VideoTokenResponse {
  token: string;
}

export * from "./src/schemas/profile.schema";
export * from "./src/schemas/upload.schema";
