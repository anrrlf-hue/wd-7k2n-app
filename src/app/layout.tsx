import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "내 사주엔 얼마나 큰 재물운이 숨어 있을까?",
  description: "생년월일로 알아보는 나의 재물운 무료 진단",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
