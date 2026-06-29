import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Skill Exchange",
    short_name: "SkillExchange",
    description: "Learn, Teach, Grow. Swap skills and knowledge securely.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Matches",
        url: "/matches",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Exchanges",
        url: "/exchanges",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Points",
        url: "/points",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
