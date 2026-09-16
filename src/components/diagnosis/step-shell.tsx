"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

export function StepShell({
  stepKey,
  progress,
  children,
}: {
  stepKey: string;
  progress: number;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10">
      {/* 이전엔 AnimatePresence(mode="wait")가 이전 스텝의 exit 애니메이션이
       * 끝나야 다음 스텝을 마운트/언마운트했다. 탭이 백그라운드로 가면(폰
       * 화면 꺼짐, 앱 전환, 브라우저 탭 전환 등) 크롬이 requestAnimationFrame과
       * CSS 트랜지션을 통째로 멈춰버려서 exit 애니메이션이 영원히 안
       * 끝나고, 그 결과 이전 스텝 화면이 새 스텝(특히 로딩 -> 결과) 위에
       * 그대로 남아 "화면이 안 바뀐다"로 보이는 문제를 직접 재현해서
       * 찾았다(콘솔 에러 없음 — 정확히 신고된 증상과 일치). mode="wait"
       * 제거만으로는 안 됐다 — exit 애니메이션 자체가 있는 한 탭이 백그라운드일
       * 때 새 스텝이 마운트돼도 이전 스텝이 여전히 DOM에 남아있었다.
       * exit을 아예 없애 React가 스텝 전환 시 이전 콘텐츠를 애니메이션
       * 완료를 기다리지 않고 그 자리에서 바로 언마운트하게 한다 — 등장
       * 애니메이션(initial/animate)만 유지해도 체감은 거의 같다. */}
      <Progress value={progress} className="mb-8 h-1.5" />
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}
