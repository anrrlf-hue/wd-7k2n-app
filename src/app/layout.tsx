import type { Metadata } from "next";
import { AmbientBgm } from "@/components/ambient-bgm";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "운·돈 · 타고난 나에서 지금의 나, 그리고 나와 이 사람",
  description: "사주로 타고난 나를 보고, 양손 손금으로 지금의 변화를 살펴본 뒤 연애·일·재물·관계 질문까지 이어보는 개인화 사주 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <SiteFooter />
        <AmbientBgm />
      </body>
    </html>
  );
}
