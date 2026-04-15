import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: "#F47521",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          color: "#fff",
          fontSize: 46,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        6
      </div>
    </div>,
    { ...size }
  );
}
