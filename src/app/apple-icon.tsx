import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4F8CFF, #2FE4E0)",
        }}
      >
        <svg width="108" height="108" viewBox="0 0 24 24" fill="#ffffff">
          <circle cx="10" cy="14" r="5.5" />
          <circle cx="16.5" cy="7" r="2.6" />
        </svg>
      </div>
    ),
    size,
  );
}
