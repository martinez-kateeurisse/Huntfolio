import { ImageResponse } from "next/og";
import { LOGO } from "@/components/logo";

// Home-screen icon (iPhone "Add to Home Screen" and others): the mark on a
// white tile. Rendered to PNG from the same shapes as the in-app logo.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

function markSvg(): string {
  const { bars, barRadius, crossbar, cut, dot } = LOGO;
  const rects = bars
    .map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${barRadius}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
<rect width="32" height="32" fill="#fff"/>
<line x1="${cut.x1}" y1="${cut.y1}" x2="${cut.x2}" y2="${cut.y2}" stroke="#000" stroke-width="${cut.width}"/>
<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.ring}" fill="#000"/>
</mask></defs>
<g fill="#1e293b" mask="url(#cut)">${rects}<polygon points="${crossbar}"/></g>
<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="#6366f1"/>
</svg>`;
}

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(markSvg()).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={128} height={128} alt="" />
      </div>
    ),
    size,
  );
}
