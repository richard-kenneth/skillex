import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "SkillEx — Master new skills by trading what you know";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
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
          "radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.25) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "50px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative corner accent - top left */}
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "200px",
          height: "200px",
          background:
            "linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, transparent 60%)",
          display: "flex",
        }}
      />

      {/* Decorative corner accent - bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          right: "0",
          width: "250px",
          height: "250px",
          background:
            "linear-gradient(315deg, rgba(6, 182, 212, 0.12) 0%, transparent 60%)",
          display: "flex",
        }}
      />

      {/* Decorative line - top */}
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          right: "0",
          height: "3px",
          background:
            "linear-gradient(to right, transparent, #a78bfa, #818cf8, #38bdf8, transparent)",
          display: "flex",
        }}
      />

      {/* Brand Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "rgba(124, 58, 237, 0.2)",
          border: "1px solid rgba(139, 92, 246, 0.5)",
          borderRadius: "9999px",
          padding: "10px 28px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "9999px",
            backgroundColor: "#a78bfa",
            boxShadow: "0 0 10px rgba(167, 139, 250, 0.6)",
          }}
        />
        <span
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#c4b5fd",
            letterSpacing: "0.08em",
          }}
        >
          SKILL EXCHANGE
        </span>
      </div>

      {/* Main Title */}
      <div
        style={{
          fontSize: "68px",
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.1,
          maxWidth: "1000px",
          marginBottom: "20px",
          letterSpacing: "-0.03em",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span>Master New Skills by</span>
        <span
          style={{
            backgroundImage:
              "linear-gradient(to right, #c084fc, #818cf8, #38bdf8)",
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
          fontSize: "22px",
          color: "#a1a1aa",
          textAlign: "center",
          maxWidth: "750px",
          lineHeight: 1.5,
          marginBottom: "36px",
        }}
      >
        1-on-1 live video skill swaps with learners &amp; professionals
        worldwide.
      </div>

      {/* Badges / Pill Tags */}
      <div
        style={{
          display: "flex",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {[
          { emoji: "🎥", text: "Live Video" },
          { emoji: "🔄", text: "Skill Swaps" },
          { emoji: "💎", text: "Points Economy" },
          { emoji: "🌍", text: "4 Languages" },
        ].map((badge) => (
          <div
            key={badge.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#e4e4e7",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              padding: "10px 20px",
            }}
          >
            <span>{badge.emoji}</span>
            <span>{badge.text}</span>
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
    },
  );
}
