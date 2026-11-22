import type { Metadata } from "next";
import { AmbientBgm } from "@/components/ambient-bgm";
import "./globals.css";

export const metadata: Metadata = {
  title: "운·돈 | 평생사주 · 궁합 · 재물운 · 손금 · 타로",
  description: "내 사주 무료 미리보기부터 평생 심층사주, 연인·부부·친구 궁합, 재물운, 신년운세, 손금과 타로까지 한곳에서 즐기는 운세 쇼핑 플랫폼",
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
