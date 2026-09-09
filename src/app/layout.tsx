import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "왜 나는 돈이 안 모일까?",
  description: "생년월일로 알아보는 나의 돈 성향 무료 진단",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
