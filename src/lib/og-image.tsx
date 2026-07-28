import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageAlt = "Power IT — Tecnología que impulsa tu mundo";
export const ogImageContentType = "image/png";

export async function renderOgImage() {
  const logoData = await readFile(
    join(process.cwd(), "public", "POWER_IT_logo-white.png"),
    "base64"
  );
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #05070a 0%, #0e1623 55%, #072436 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -140,
            right: -140,
            width: 480,
            height: 480,
            borderRadius: 480,
            background:
              "radial-gradient(circle, rgba(60,200,242,0.35) 0%, rgba(60,200,242,0) 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -160,
            left: -120,
            width: 420,
            height: 420,
            borderRadius: 420,
            background:
              "radial-gradient(circle, rgba(23,150,210,0.25) 0%, rgba(23,150,210,0) 70%)",
          }}
        />
        <img src={logoSrc} width={620} height={307} style={{ objectFit: "contain" }} />
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            color: "#aeb7c1",
            letterSpacing: 2,
          }}
        >
          Tecnología que impulsa tu mundo
        </div>
      </div>
    ),
    ogImageSize
  );
}
