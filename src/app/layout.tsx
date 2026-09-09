import type { Metadata } from "next";
import "./globals.css";
import { Starfield } from "@/components/ui/starfield";

export const metadata: Metadata = {
  title: "나는 돈을 끌어당기는 사람일까, 놓치는 사람일까?",
  description: "내 사주엔 큰돈이 들어오는 때가 있을까? 생년월일로 알아보는 나의 재물운 무료 진단",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Starfield />
        {children}
      </body>
    </html>
  );
}
