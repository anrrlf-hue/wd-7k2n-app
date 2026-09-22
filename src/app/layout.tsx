import type { Metadata } from "next";
import { AmbientBgm } from "@/components/ambient-bgm";
import "./globals.css";

export const metadata: Metadata = {
  title: "운·돈 · 타고난 흐름을 현실로",
  description: "사주와 손금에서 시작해 지금의 나에게 맞는 현실적인 돈의 방향까지 연결하는 무료 재물운 진단",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <AmbientBgm />
      </body>
    </html>
  );
}
