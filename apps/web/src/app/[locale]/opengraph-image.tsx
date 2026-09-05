import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Skill Exchange — Master new skills by trading what you know";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(124, 58, 237, 0.25) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.2) 0%, transparent 50%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* Brand Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "rgba(124, 58, 237, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.4)",
            borderRadius: "9999px",
            padding: "8px 24px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "9999px",
              backgroundColor: "#a78bfa",
            }}
          />
          <span
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#c4b5fd",
              letterSpacing: "0.05em",
            }}
          >
            SKILL EXCHANGE
          </span>
        </div>

        {/* Main Title */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: "1000px",
            marginBottom: "24px",
            letterSpacing: "-0.03em",
          }}
        >
          Master New Skills by{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(to right, #a78bfa, #818cf8, #38bdf8)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Trading What You Know
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
            marginBottom: "48px",
          }}
        >
          Connect with learners & professionals worldwide. Exchange expertise 1-on-1 through live HD video sessions.
        </div>

        {/* Badges / Pill Tags */}
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          {["Live Video Sessions", "Skill-for-Skill Swaps", "Points Economy", "4 Languages"].map(
            (badge) => (
              <div
                key={badge}
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "#d4d4d8",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "10px 20px",
                }}
              >
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
