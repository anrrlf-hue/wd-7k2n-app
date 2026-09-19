import type { Metadata } from "next";
import { AmbientBgm } from "@/components/ambient-bgm";
import "./globals.css";


export const metadata: Metadata = {
  title: "재물사주 · 내 돈의 흐름을 현실로",
  description: "내 사주엔 큰돈이 들어오는 때가 있을까? 생년월일로 알아보는 나의 재물운 무료 진단",
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
