"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionHeading } from "@/components/angel-companion";
import { JourneyHeader } from "@/components/journey-header";
import { JourneyScene } from "@/components/journey-scene";
import { suggestManagementMethod, type ManagementMethod } from "@/lib/management-method";
import type { ChoiceTendency } from "@/lib/indirect-experience-data";
import { VerdictCard } from "@/components/diagnosis/verdict-card";
import { ReportSection, ParagraphSection, EvidenceItemCard, EvidenceToggle } from "@/components/diagnosis/report-section";
import { IndirectExperience } from "@/components/palm/indirect-experience";
import { SurveyForm } from "@/components/palm/survey-form";
import { AnalysisResultCard } from "@/components/palm/analysis-result-card";
import { PaymentScreen } from "@/components/palm/payment-screen";
import {
  analyzePalmFromCanvas,
  preloadHandLandmarker,
} from "@/lib/palm-detection";
import { isPalmFactsUsable, describePalmFailureReasons, type PalmFacts } from "@/lib/palm-facts";
import { PalmReadingSections, TripleCompareSection } from "@/components/palm/palm-reading-sections";
import { derivePalmKeyword } from "@/lib/palm-keyword";
import { buildAnalysisResult, type AnalysisResult } from "@/lib/analysis-result";
import type { SurveyInput } from "@/lib/survey-input";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { CompareItem } from "@/lib/triple-compare";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { WealthTypeResult } from "@/lib/wealth-type";
import { track } from "@/lib/analytics";

type Stage = "upload" | "detecting" | "retake" | "loading" | "result" | "saju_only" | "error";

const HAND_SHAPE_KO: Record<PalmFacts["handShape"], string> = {
  square: "사각형 손바닥 · 짧은 손가락",
  rectangular: "사각형 손바닥 · 긴 손가락",
  elongated: "길쭉한 손바닥 · 짧은 손가락",
  slender: "길쭉한 손바닥 · 긴 손가락",
  unknown: "확인 안 됨",
};

async function fileToCanvas(file: File, maxDim = 1280): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context 생성 실패");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

/** 최종 통합 리포트(finalReport)를 렌더링한다. 손금이 있을 때(withPalm)와
 * 없을 때(saju-only) 양쪽에서 재사용한다. NO_DUPLICATION: 1차 무료 결과
 * (result-step.tsx)에서 이미 보여준 필드는 여기서 다시 보여주지 않는다 —
 * "아까 본 얘기 또 하네"를 만들지 않기 위해 아직 안 보여준 나머지 섹션만
 * 싣는다. result-step.tsx가 7질문 구조로 재배치되면서 wealthStructure/
 * bigMoneyAffinity/cautions/nextMove/timingShift가 전부 pre-palm 전용으로
 * 옮겨갔으니 여기서는 절대 다시 쓰지 않는다. 별도의 "이 분석의 한계"
 * 섹션은 만들지 않는다 — 필요한 고지는 화면 맨 아래에 한 줄로만 둔다. */
function FinalReportSections({ report }: { report: FreeSajuReport }) {
  return (
    <div className="mt-3">
      <ParagraphSection title="조직에서 강한 부분" paragraph={report.teamStrength} />
      <ParagraphSection title="독립적으로 움직일 때 강한 부분" paragraph={report.soloStrength} />
      <ParagraphSection title="사람과 돈" paragraph={report.peopleAndMoney} />
      <ParagraphSection title="의사결정 스타일" paragraph={report.decisionStyle} />
      <ParagraphSection title="기회를 잡는 방식" paragraph={report.opportunityStyle} />
      <ReportSection title="나의 강점 3가지">
        <div className="space-y-2.5">
          {report.strengths.map((s, i) => (
            <EvidenceItemCard key={s.title} index={i + 1} title={s.title} detail={s.detail} evidence={s.evidence} />
          ))}
        </div>
      </ReportSection>
      <div className="mt-7 px-2 sm:px-0">
        <EvidenceToggle evidence={report.evidenceExplainer} />
      </div>
    </div>
  );
}

/** 손금 완료 -> 간접체험(재물유형×손금 개인화) -> 재무 설문 -> 병목 진단 ->
 * 분석 결과 확인(결제 버튼 없음) -> 결제 화면. 이전 라운드의 "현실정보
 * 입력 -> 사주 연결진단" 다리를 대체한다 — 병목 판단은 설문 응답만 쓰고
 * 사주·손금 요소가 전혀 개입하지 않으므로(§7 원칙) 서버 호출 없이 순수
 * 클라이언트 함수로 동작한다. 결제 이후 실제 실행 리포트 생성 로직은
 * 이번 라운드에서도 확정하지 않는다 — PaywallOffer의 CTA는 실제 결제로
 * 이어지지 않아 도달할 방법 자체가 없다. */
type FunnelStage = "experience" | "survey" | "analysis" | "payment";

function ConversionFunnel({
  wealthType,
  palmFacts,
  onReset,
  onStart,
  onChapterChange,
}: {
  wealthType: WealthTypeResult | null;
  palmFacts: PalmFacts | null;
  onReset: () => void;
  onStart: () => void;
  onChapterChange: (chapter: 3 | 4 | 5) => void;
}) {
  const [stage, setStage] = useState<FunnelStage>("experience");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const [choiceTendencies, setChoiceTendencies] = useState<ChoiceTendency[]>([]);
  const [surveyInput, setSurveyInput] = useState<SurveyInput | undefined>();
  const [method, setMethod] = useState<ManagementMethod | null>(null);
  const [choiceSummary, setChoiceSummary] = useState<string | null>(null);

  if (!wealthType) return null;

  function handleExperienceComplete(summary: string, choices: ChoiceTendency[]) {
    setChoiceTendencies(choices);
    onChapterChange(4);
    setChoiceSummary(summary);
    track("indirect_experience_completed");
    setStage("survey");
    requestAnimationFrame(() => {
      document.getElementById("conversion-funnel")?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }

  function handleSurveyComplete(input: SurveyInput) {
    track("survey_completed");
    setSurveyInput(input);
    setMethod(suggestManagementMethod(choiceTendencies, input.spendingPatterns, input));
    setAnalysisResult(buildAnalysisResult(input));
    setStage("analysis");
    track("analysis_result_viewed");
  }

  return (
    <div id="conversion-funnel" className="mt-8 scroll-mt-6">
      {stage === "experience" && (
        <>
          <div className="mb-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="text-base leading-7">
              여기까지는 사주·손금·직접 응답으로 나를 해석한 단계예요. 이제부터는 그 해석을 사실로 단정하지 않고, 실제 소득·지출·저축 숫자로 현재 돈의 구조를 확인합니다.
            </p>
          </div>
          <IndirectExperience
          wealthTypeCode={wealthType.code}
          palmKeyword={derivePalmKeyword(palmFacts)}
          onStart={() => { onStart(); onChapterChange(3); }}
          onComplete={handleExperienceComplete}
        />
        </>
      )}

      {stage === "survey" && <SurveyForm initialValue={surveyInput} onComplete={handleSurveyComplete} />}

      {stage === "analysis" && analysisResult && (
        <AnalysisResultCard
          result={analysisResult}
          method={method}
          innateSummary={wealthType.pieces.typeAndDiagnosis}
          choiceSummary={choiceSummary}
          onRevise={() => setStage("survey")}
          onProceed={() => {
            track("payment_screen_viewed");
            onChapterChange(5);
            setStage("payment");
          }}
        />
      )}

      {stage === "payment" && <PaymentScreen method={method} onBack={() => { onChapterChange(4); setStage("analysis"); }} />}

      <button
        type="button"
        onClick={onReset}
        className="mt-6 flex w-full items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
      >
        <RotateCcw className="size-3.5" />
        손금부터 다시 보기
      </button>
    </div>
  );
}

export function PalmPageClient({
  birthInput,
  personalityInput,
}: {
  birthInput: BirthInput | null;
  personalityInput?: PersonalityInputEcho;
}) {
  const [stage, setStage] = useState<Stage>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [palmFacts, setPalmFacts] = useState<PalmFacts | null>(null);
  const [finalReport, setFinalReport] = useState<FreeSajuReport | null>(null);
  const [tripleCompare, setTripleCompare] = useState<CompareItem[]>([]);
  const [verdict, setVerdict] = useState<ReportParagraph | null>(null);
  const [wealthType, setWealthType] = useState<WealthTypeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retakeAttempts, setRetakeAttempts] = useState(0);
  const [funnelActive, setFunnelActive] = useState(false);
  const [readingOpen, setReadingOpen] = useState(true);
  const [chapter, setChapter] = useState<2 | 3 | 4 | 5>(2);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    preloadHandLandmarker();
  }, []);

  async function fetchReport(facts: PalmFacts | null) {
    if (!birthInput) {
      setErrorMsg("생년월일 정보를 찾을 수 없어요. 사주 결과 화면에서 다시 들어와주세요.");
      setStage("error");
      return;
    }
    const res = await fetch("/api/palm/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...birthInput,
        palmFacts: facts,
        personalityAnswers: personalityInput?.personalityAnswers ?? undefined,
        mbti: personalityInput?.mbti ?? undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    if (!data.usable) {
      setRetakeAttempts((n) => n + 1);
      setPalmFacts((prev) => (prev ? { ...prev, warnings: data.warnings ?? prev.warnings } : prev));
      setStage("retake");
      return;
    }

    setFinalReport(data.freeReport?.report ?? null);
    setTripleCompare(data.tripleCompare ?? []);
    setVerdict(data.verdict ?? null);
    setWealthType(data.wealthType ?? null);
    track("free_report_completed", { palmSkipped: Boolean(data.palmSkipped) });
    setStage(data.palmSkipped ? "saju_only" : "result");
  }

  async function handleFile(file: File) {
    setErrorMsg(null);
    setStage("detecting");
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });

    try {
      const canvas = await fileToCanvas(file);
      const facts = await analyzePalmFromCanvas(canvas);
      setPalmFacts(facts);

      // 손금 성공 판정은 오직 실제 ONNX 결과 기준(isPalmFactsUsable)으로만
      // 한다 — Sobel 휴리스틱이 뭔가 "검출됐다"고 해도 여기서 걸러진다.
      if (!isPalmFactsUsable(facts)) {
        setRetakeAttempts((n) => n + 1);
        setStage("retake");
        return;
      }

      setStage("loading");
      await fetchReport(facts);
    } catch {
      setErrorMsg("분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      setStage("error");
    }
  }

  /** 손금 없이 계속 보기 — 처음부터 건너뛸 때도, 반복 실패 뒤에도 쓴다.
   * 실패한 손금을 성공한 것처럼 꾸며서 보여주지 않는다: 사주만으로 완결된
   * 리포트를 정직하게 보여준다. */
  async function handleSkipPalm() {
    setErrorMsg(null);
    setStage("loading");
    try {
      await fetchReport(null);
    } catch {
      setErrorMsg("분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      setStage("error");
    }
  }

  function reset() {
    setFunnelActive(false);
    setReadingOpen(true);
    setChapter(2);
    setStage("upload");
    setPalmFacts(null);
    setFinalReport(null);
    setTripleCompare([]);
    setVerdict(null);
    setWealthType(null);
    setErrorMsg(null);
    setRetakeAttempts(0);
  }

  if (!birthInput) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          생년월일 정보를 찾을 수 없어요. 사주 결과 화면에서 다시 들어와주세요.
        </p>
        <Button asChild size="lg" className="mt-6 h-13 w-full rounded-full text-base">
          <Link href="/diagnosis">사주 진단으로 이동</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`journey-surface ${stage === "result" || stage === "saju_only" ? "result-bright" : ""}`}
    >
      <div className="journey-shell">
      <JourneyHeader chapter={chapter} />
      <div hidden={funnelActive}>
      <CompanionHeading showCompanion={stage !== "upload"} state={stage === "upload" ? "palm-guide" : "palm-observing"} presence={stage === "upload" ? "transition" : "quiet"}>
      <p className="section-eyebrow">두 번째 분석 · 손금</p>
      <h1 className="mt-2 text-xl leading-snug font-semibold tracking-tight">
        {stage === "result" ? "손에서 관측한 것부터, 하나씩" : stage === "saju_only" ? "사주에서 선택으로 이어보기" : <>손금에서는<br />어떤 내가 보일까요?</>}
      </h1>
      </CompanionHeading>
      </div>

      {stage === "upload" && (
        <div className="mt-6 flex flex-1 flex-col">
          <JourneyScene scene="palm" companion="palm-guide" />
          <div className="mt-5">
            <p className="text-base leading-7 text-muted-foreground">
              밝은 곳에서 손바닥 전체를 담아주세요.
              <br />
              손가락을 살짝 펴고, 손금선에 초점을 맞춰요.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => cameraInputRef.current?.click()}
              className="primary-cta h-14 w-full rounded-full text-base"
            >
              <Camera className="size-4" />
              카메라로 촬영하기
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              className="h-13 w-full rounded-full text-base"
            >
              <ImagePlus className="size-4" />
              사진 선택하기
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={handleSkipPalm}
            className="mt-auto pt-8 text-center text-sm text-muted-foreground"
          >
            손금 없이 사주 결과만 볼게요
          </button>
        </div>
      )}

      {(stage === "detecting" || stage === "loading") && (
        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-6 text-center">
          {previewUrl && (
            <div className="mystic-ring size-40 overflow-hidden rounded-2xl border border-(--gold-soft)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="size-full object-cover" />
            </div>
          )}
          <motion.div
            className="h-10 w-10 rounded-full border-2 border-(--gold-soft) border-t-(--gold)"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-base text-muted-foreground">
            {stage === "detecting" ? "손과 손금선을 확인하는 중이에요" : "리포트를 만드는 중이에요"}
          </p>
        </div>
      )}

      {stage === "retake" && palmFacts && (
        <div className="mt-8 flex flex-1 flex-col">
          {previewUrl && (
            <div className="mystic-ring mx-auto size-36 overflow-hidden rounded-2xl border border-(--gold-soft) opacity-70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="size-full object-cover" />
            </div>
          )}
          <div className="mystic-card mt-5 p-5">
            <p className="text-base font-medium text-(--gold)">손금선이 충분히 읽히지 않았어요</p>
            <ul className="mt-2 space-y-1.5 text-base leading-7 text-muted-foreground">
              {describePalmFailureReasons(palmFacts, retakeAttempts).map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Button size="lg" onClick={reset} className="h-13 w-full rounded-full text-base">
              <RotateCcw className="size-4" />
              다시 촬영하기
            </Button>
            {retakeAttempts >= 2 && (
              <button type="button" onClick={handleSkipPalm} className="text-center text-sm text-muted-foreground">
                손금 없이 사주 결과만 계속 보기
              </button>
            )}
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="mt-8 flex flex-1 flex-col">
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg ?? "문제가 발생했어요."}
          </div>
          <div className="mt-auto pt-8">
            <Button size="lg" onClick={reset} className="h-13 w-full rounded-full text-base">
              다시 시도하기
            </Button>
          </div>
        </div>
      )}

      {funnelActive && <button type="button" className="reading-toggle" aria-expanded={readingOpen} aria-controls="previous-reading" onClick={() => setReadingOpen(!readingOpen)}>{readingOpen ? "이전 결과 접기" : "이전 사주·손금 결과 다시 보기"}<span aria-hidden="true">{readingOpen ? "−" : "+"}</span></button>}
      <div id="previous-reading" hidden={!readingOpen}>
      {stage === "result" && palmFacts && finalReport && (
        <div className="mt-6 flex flex-1 flex-col">
          <motion.div
            initial={{ opacity: 0.6, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mystic-ring rounded-2xl border border-(--gold-soft) bg-card p-5"
          >
            <div className="flex items-center gap-3">
              {previewUrl && (
                <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-(--gold-soft)">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="" className="size-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  {palmFacts.handSide === "left" ? "왼손" : palmFacts.handSide === "right" ? "오른손" : "손"} ·{" "}
                  {HAND_SHAPE_KO[palmFacts.handShape]}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소이자, 사주와
           * 독립된 두 번째 분석이다(§3): 실제 손 관측 -> 손금 자체 해석 ->
           * (그 다음에야) 사주와의 비교. "사주 문단 + 손에도 같은 모습이
           * 보여요" 식으로 섞지 않는다. */}
          <div className="mt-5">
            <PalmReadingSections facts={palmFacts} />
            <TripleCompareSection items={tripleCompare} />
          </div>

          <FinalReportSections report={finalReport} />
          {verdict && <VerdictCard verdict={verdict} />}
        </div>
      )}

      {stage === "saju_only" && finalReport && (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="mystic-card p-4 text-sm text-muted-foreground">
            이번 결과는 사주와 입력한 정보를 중심으로 봤어요.
          </div>
          <TripleCompareSection items={tripleCompare} withPalm={false} />
          <FinalReportSections report={finalReport} />
          {verdict && <VerdictCard verdict={verdict} />}
        </div>
      )}

      </div>
      {(stage === "result" || stage === "saju_only") && <ConversionFunnel wealthType={wealthType} palmFacts={stage === "result" ? palmFacts : null} onReset={reset} onStart={() => { setFunnelActive(true); setReadingOpen(false); }} onChapterChange={setChapter} />}

      {/* 무료 리포트 Peak와 다음 행동(운세지도) 사이에 고지 문구가 끼면
       * 몰입이 끊긴다(§O) — 필요한 고지는 여기, 진짜 페이지 최하단에만 둔다. */}
      {(stage === "result" || stage === "saju_only") && (
        <p className="mt-8 text-center text-sm leading-relaxed text-muted-foreground">사주·손금은 자신을 돌아보는 전통 해석입니다. 실제 재무 판단은 소득·지출 등 확인된 정보를 기준으로 해요.</p>
      )}
      </div>
    </div>
  );
}
