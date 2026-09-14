import { ImageResponse } from "next/og";

export const alt = "SignalDeck AI API 透明度监测";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0b1715", color: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700 }}><span style={{ width: 54, height: 54, borderRadius: 16, background: "#27a88f", display: "flex", alignItems: "center", justifyContent: "center" }}>S</span>SignalDeck</div>
      <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", flexDirection: "column", fontSize: 68, lineHeight: 1.1, fontWeight: 800 }}><span>AI API 中转站</span><span>透明度监测</span></div><div style={{ marginTop: 28, color: "#a9c9c2", fontSize: 28 }}>Token 计费 · 协议兼容 · 公开报告 · 独立目录</div></div>
      <div style={{ display: "flex", color: "#79d5c2", fontSize: 22 }}>付费只买展示位置，不买检测分数</div>
    </div>, size,
  );
}
