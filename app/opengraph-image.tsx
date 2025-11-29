import { ImageResponse } from "next/og";

// Required for static export
export const dynamic = "force-static";

export const alt = "不想努力了 I Give Up - AI Marketing Content Generator";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background grid effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Ghost icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 36 36"
          style={{ marginBottom: 30 }}
        >
          <defs>
            <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect width="36" height="36" rx="6" fill="url(#iconGrad)" />
          <path
            d="M18,3c-6.63,0-12,5.37-12,12v18l4.5-4.5,3.75,3.75,3.75-3.75,3.75,3.75,3.75-3.75,4.5,4.5V15c0-6.63-5.37-12-12-12Z"
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path
            d="M12,19.81s2.25,3,6,3,6-3,6-3"
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <circle cx="13.07" cy="12.97" r="1.95" fill="#ffffff" />
          <circle cx="22.93" cy="12.97" r="1.95" fill="#ffffff" />
        </svg>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              background: "linear-gradient(90deg, #ffffff 0%, #a5b4fc 100%)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-0.02em",
            }}
          >
            不想努力了
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#94a3b8",
              letterSpacing: "0.05em",
            }}
          >
            I GIVE UP ON LIFE
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 40,
            fontSize: 24,
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "#3b82f6" }}>AI</span>
          <span>Marketing Content Generator</span>
        </div>

        {/* Features */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 24,
          }}
        >
          {["Product Analysis", "Content Generation", "Image Creation"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  padding: "8px 20px",
                  background: "rgba(59, 130, 246, 0.2)",
                  borderRadius: 20,
                  fontSize: 16,
                  color: "#93c5fd",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                {feature}
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
