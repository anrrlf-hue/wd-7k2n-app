"use client";
import { CompanionHeading } from "@/components/angel-companion";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_PRICE } from "@/lib/pricing";
import { eunNeun } from "@/lib/korean-particle";
import type { AnalysisResult } from "@/lib/analysis-result";
import type { ManagementMethod } from "@/lib/management-method";
export function AnalysisResultCard({ result, innateSummary, choiceSummary, method, onProceed, onRevise }: {
  result: AnalysisResult; innateSummary: string; choiceSummary: string | null;
  method: ManagementMethod | null;
  onProceed: () => void; onRevise: () => void;
}) {
  const insufficient = result.bottleneck === "insufficient_data";
  return <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
    <CompanionHeading state="diagnosis-reveal">
    <p className="section-eyebrow">나의 무료 총평</p>
    <h2 className="mt-3 text-2xl leading-snug font-semibold tracking-tight">타고난 나, 선택한 나,<br />그리고 지금의 돈</h2>
    </CompanionHeading>
    <div className="diagnosis-layers mt-7">
      <div><p className="section-eyebrow">01 · 타고난 재물성향</p><p className="mt-2 text-sm">{innateSummary}</p><p className="mt-1 text-xs text-muted-foreground">사주 해석 · 자기이해를 위한 관점</p></div>
      <div><p className="section-eyebrow">02 · 실제로 고른 선택</p><p className="mt-2 text-sm">{choiceSummary ?? "선택 기록이 없어 비교하지 않았습니다."}</p></div>
      <div><p className="section-eyebrow">03 · 현재 현실 재무상태</p><p className="mt-2 text-sm">{result.lifeMeaning}</p>
        {result.surplusKrw !== null && <div className="my-4"><p className="text-xs text-muted-foreground">저축까지 배분한 뒤 남는 돈</p><p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{result.surplusKrw.toLocaleString("ko-KR")}원 <span className="text-sm font-normal">/ 월</span></p></div>}
        <p className="mt-1 text-xs text-muted-foreground">소득 − 고정지출(대출상환 포함) − 생활비 − 저축·투자. 재무 우선순위는 설문 답변만으로 판단해요.</p>
      </div>
    </div>
    <section className="diagnosis-priority mt-8">
      <p className="section-eyebrow">{insufficient ? "먼저 확인할 정보" : result.bottleneck === "no_priority_bottleneck" ? "현재의 우선순위" : "지금 가장 먼저 풀 부분"}</p>
      <h3 className="mt-3 text-2xl leading-snug font-semibold">{result.headline}</h3>
      <p className="mt-4 text-base">{result.why}</p>
    </section>
    <div className="mt-6 rounded-2xl bg-accent p-5 text-accent-foreground">
      <h3 className="text-sm font-semibold">지금은 뒤로 둬도 괜찮아요</h3>
      <p className="mt-2 text-sm">{result.notUrgent}{eunNeun(result.notUrgent)} 우선순위가 아닙니다. {result.notUrgentReason}</p>
    </div>
    <div className="mt-6">
      <h3 className="text-base font-semibold">오늘은 이것 하나부터</h3>
      <p className="mt-2 text-base">{result.immediateDirection}</p>
      <p className="mt-3 text-xs text-muted-foreground">{result.gapStatement}</p>
    </div>
    {!insufficient && method && <div className="mt-6 border-l-2 border-(--gold-soft) pl-4">
      <p className="section-eyebrow">이 행동을 이어가는 나만의 방식</p>
      <h3 className="mt-2 text-base font-semibold">{method.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{method.reason} {method.routine}</p>
      <p className="mt-2 text-xs text-muted-foreground">이번 응답을 바탕으로 한 제안이에요. 편한 방식으로 조정해도 괜찮아요.</p>
    </div>}
    {insufficient ? <Button size="lg" onClick={onRevise} className="mt-6 h-14 w-full rounded-full">답변 확인하고 다시 진단하기</Button> :
      <div className="transition-panel mt-8">
        <p className="section-eyebrow">내 상황에 맞는 다음 단계</p>
        <h3 className="mt-2 text-xl font-semibold">방향을 알았다면,<br />이제 나에게 맞는 관리방법</h3>
        <p className="mt-3 text-sm text-muted-foreground">내 돈의 구조에 맞춘 우선순위, 30일 실행계획과 90일 관리 루틴. 무엇을 할지에서, 어떻게 이어갈지로 연결합니다.</p>
        <p className="mt-4 text-sm">맞춤 관리 리포트 · <strong>{RECOMMENDED_PRICE.label}</strong></p>
        <Button size="lg" onClick={onProceed} className="mt-4 h-14 w-full rounded-full text-base">내 맞춤 관리방법 보기 <ArrowRight className="size-4" /></Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">리포트 구성 확인 · 결제 연결 준비 중</p>
      </div>}
    {!insufficient && <button type="button" onClick={onRevise} className="mt-5 min-h-11 w-full text-center text-xs text-muted-foreground underline underline-offset-4">재무 답변 수정하기</button>}
  </motion.div>;
}
