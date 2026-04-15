import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#CC5500",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 7,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 42,
          color: "white",
          fontWeight: 900,
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        6
      </div>
    </div>,
    { ...size }
  );
}
