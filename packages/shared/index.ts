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
export * from "./src/schemas/exchange.schema";
export * from "./src/schemas/points.schema";
export * from "./src/schemas/video.schema";
export * from "./src/schemas/exchange-chat.schema";
export * from "./src/schemas/referral.schema";
export * from "./src/utils/currency";
export * from "./src/utils/string";
