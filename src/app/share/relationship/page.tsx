"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FREE_SHARE_ENTRY_PATH } from "@/lib/relationship-share";

export default function RelationshipSharePage() {
  useEffect(() => {
    // Old links may carry a personal report in the fragment. Do not read,
    // decode, render, log or forward it. Remove it from this history entry.
    window.history.replaceState(null, "", window.location.pathname);
    window.location.replace(FREE_SHARE_ENTRY_PATH);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-semibold">운·돈 무료 사주로 이동합니다</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">공유 링크는 개인 풀이를 표시하지 않고 내 사주를 시작하는 화면으로 이어집니다.</p>
      <Link href={FREE_SHARE_ENTRY_PATH} className="mt-6 rounded-full border border-border p-3 text-center">무료 사주 시작하기</Link>
    </main>
  );
}
