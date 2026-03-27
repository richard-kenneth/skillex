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
