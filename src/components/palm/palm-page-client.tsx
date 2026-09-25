"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionHeading } from "@/components/brand-companion";
import { JourneyHeader } from "@/components/journey-header";
import { JourneyScene } from "@/components/journey-scene";
import type { FinanceQuestionId } from "@/lib/finance-question";
import { VerdictCard } from "@/components/diagnosis/verdict-card";
import { ReportSection, ParagraphSection, EvidenceItemCard } from "@/components/diagnosis/report-section";
import { SurveyForm } from "@/components/palm/survey-form";
import { AnalysisResultCard } from "@/components/palm/analysis-result-card";
import { PaymentScreen } from "@/components/palm/payment-screen";
import {
  analyzePalmFromCanvas,
  assessPalmCaptureFrame,
  preloadHandLandmarker,
} from "@/lib/palm-detection";
import { isPalmFactsUsable, describePalmFailureReasons, type PalmFacts } from "@/lib/palm-facts";
import { PalmReadingSections, TripleCompareSection } from "@/components/palm/palm-reading-sections";
import { buildAnalysisResult, type AnalysisResult } from "@/lib/analysis-result";
import type { SurveyInput } from "@/lib/survey-input";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { CompareItem } from "@/lib/triple-compare";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { WealthTypeResult } from "@/lib/wealth-type";
import { track } from "@/lib/analytics";

type Stage = "upload" | "detecting" | "retake" | "loading" | "result" | "saju_only" | "error";

function financeJourneyKey(birthInput: BirthInput | null): string | null {
  if (!birthInput) return null;
  return [
    "saju-app:finance-journey:v1",
    birthInput.year,
    birthInput.month,
    birthInput.day,
    birthInput.hour ?? "x",
    birthInput.minute ?? "x",
    birthInput.gender,
  ].join(":");
}

function readSessionJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

interface PalmResumeState {
  stage: "result" | "saju_only";
  palmFacts: PalmFacts | null;
  finalReport: FreeSajuReport | null;
  tripleCompare: CompareItem[];
  verdict: ReportParagraph | null;
  wealthType: WealthTypeResult | null;
  funnelActive: boolean;
  readingOpen: boolean;
  chapter: 2 | 3 | 4 | 5;
}

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

    </div>
  );
}

/** 손금 완료 뒤에는 추가 성향게임을 강제하지 않는다.
 * 짧은 현실 연결 -> 2단계 재무질문 -> 무료 우선순위 -> 사용자가 고른 질문 ->
 * 가격 미검증 상태의 상품 구성 미리보기 화면으로 이어진다. */
type FunnelStage = "intro" | "survey" | "analysis" | "payment";

interface FunnelResumeState {
  stage: FunnelStage;
  analysisResult: AnalysisResult | null;
  surveyInput?: SurveyInput;
  selectedQuestion: FinanceQuestionId | null;
}

function ConversionFunnel({
  birthInput,
  sajuSummary,
  resumeKey,
  onStart,
  onChapterChange,
}: {
  birthInput: BirthInput;
  sajuSummary: string | null;
  resumeKey: string;
  onStart: () => void;
  onChapterChange: (chapter: 3 | 4 | 5) => void;
}) {
  const stored = readSessionJson<FunnelResumeState>(`${resumeKey}:funnel`);
  const [stage, setStage] = useState<FunnelStage>(stored?.stage ?? "intro");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(stored?.analysisResult ?? null);
  const [surveyInput, setSurveyInput] = useState<SurveyInput | undefined>(stored?.surveyInput);
  const [selectedQuestion, setSelectedQuestion] = useState<FinanceQuestionId | null>(stored?.selectedQuestion ?? null);
  const funnelTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage === "intro") return;
    requestAnimationFrame(() => {
      funnelTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, [stage]);

  useEffect(() => {
    sessionStorage.setItem(
      `${resumeKey}:funnel`,
      JSON.stringify({ stage, analysisResult, surveyInput, selectedQuestion } satisfies FunnelResumeState),
    );
  }, [resumeKey, stage, analysisResult, surveyInput, selectedQuestion]);

  function handleSurveyComplete(input: SurveyInput) {
    track("survey_completed");
    setSurveyInput(input);
    setAnalysisResult(buildAnalysisResult(input));
    setStage("analysis");
    track("analysis_result_viewed");
  }

  return (
    <div id="conversion-funnel" ref={funnelTopRef} className="mt-8 scroll-mt-6">
      {stage === "intro" && (
        <div className="transition-panel">
          <p className="section-eyebrow">사주풀이에서 끝나지 않고 현실로 이어집니다</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">
            사주에서 본 나를,
            <br />
            지금의 삶으로 이어서 볼게요
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            사주와 손금에서 본 성향에 지금의 생활과 재무상황을 더해, 앞으로 어떤 방향으로 가면 좋을지 이어서 살펴봅니다.
          </p>
          <Button
            size="lg"
            onClick={() => {
              track("finance_bridge_started");
              onStart();
              onChapterChange(4);
              setStage("survey");
            }}
            className="mt-5 h-14 w-full rounded-full text-base"
          >
            현실과 이어서 보기
          </Button>
        </div>
      )}

      {stage === "survey" && (
        <SurveyForm
          initialValue={surveyInput}
          onComplete={handleSurveyComplete}
          onBack={() => {
            onChapterChange(3);
            setStage("intro");
          }}
        />
      )}

      {stage === "analysis" && analysisResult && (
        <AnalysisResultCard
          result={analysisResult}
          concerns={surveyInput?.financeQuestionIds ?? []}
          sajuSummary={sajuSummary}
          onRevise={() => setStage("survey")}
          onProceed={(question) => {
            setSelectedQuestion(question);
            track("payment_screen_viewed", { question });
            onChapterChange(5);
            setStage("payment");
          }}
        />
      )}

      {stage === "payment" && analysisResult && selectedQuestion && (
        <PaymentScreen
          question={selectedQuestion}
          concerns={surveyInput?.financeQuestionIds ?? []}
          sajuSummary={sajuSummary}
          result={analysisResult}
          input={surveyInput!}
          birthInput={birthInput}
          persistenceKey={`${resumeKey}:payment`}
          onBack={() => {
            onChapterChange(4);
            setStage("analysis");
          }}
        />
      )}
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
  const resumeKey = financeJourneyKey(birthInput);
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("손바닥 전체를 화면 안에 맞춰주세요.");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraProbeCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraProbeBusyRef = useRef(false);
  const cameraStableFramesRef = useRef(0);

  useEffect(() => {
    preloadHandLandmarker();
    if (!resumeKey) return;

    const saved = readSessionJson<PalmResumeState>(`${resumeKey}:palm`);
    if (!saved) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStage(saved.stage);
      setPalmFacts(saved.palmFacts);
      setFinalReport(saved.finalReport ?? null);
      setTripleCompare(saved.tripleCompare ?? []);
      setVerdict(saved.verdict ?? null);
      setWealthType(saved.wealthType ?? null);
      setFunnelActive(Boolean(saved.funnelActive));
      setReadingOpen(saved.readingOpen ?? true);
      setChapter(saved.chapter ?? 3);
    });
    return () => {
      cancelled = true;
    };
  }, [resumeKey]);

  useEffect(() => {
    if (!cameraOpen) return;
    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play();

    let cancelled = false;
    const timer = window.setInterval(async () => {
      if (cancelled || cameraProbeBusyRef.current || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      const probe = cameraProbeCanvasRef.current;
      if (!probe) return;

      const maxDim = 480;
      const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
      probe.width = Math.max(1, Math.round(video.videoWidth * scale));
      probe.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = probe.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, probe.width, probe.height);
      cameraProbeBusyRef.current = true;
      try {
        const assessment = await assessPalmCaptureFrame(probe);
        if (!cancelled) {
          if (assessment.ready) {
            cameraStableFramesRef.current += 1;
          } else {
            cameraStableFramesRef.current = 0;
          }
          const stableReady = assessment.ready && cameraStableFramesRef.current >= 2;
          setCameraReady(stableReady);
          setCameraMessage(
            stableReady
              ? assessment.message
              : assessment.ready
                ? "좋아요. 초점이 안정되도록 잠깐만 그대로 있어주세요."
                : assessment.message,
          );
        }
      } finally {
        cameraProbeBusyRef.current = false;
      }
    }, 650);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      video.srcObject = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!resumeKey || (stage !== "result" && stage !== "saju_only")) return;
    const saved: PalmResumeState = {
      stage,
      palmFacts,
      finalReport,
      tripleCompare,
      verdict,
      wealthType,
      funnelActive,
      readingOpen,
      chapter,
    };
    sessionStorage.setItem(`${resumeKey}:palm`, JSON.stringify(saved));
  }, [
    resumeKey,
    stage,
    palmFacts,
    finalReport,
    tripleCompare,
    verdict,
    wealthType,
    funnelActive,
    readingOpen,
    chapter,
  ]);

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

  function replacePreview(next: string | null) {
    setPreviewUrl((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return next;
    });
  }

  function stopLiveCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
    cameraStableFramesRef.current = 0;
    setCameraMessage("손바닥 전체를 화면 안에 맞춰주세요.");
  }

  async function openLiveCamera() {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      stopLiveCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch {
      cameraInputRef.current?.click();
    }
  }

  async function processPalmCanvas(canvas: HTMLCanvasElement, preview: string) {
    setErrorMsg(null);
    setStage("detecting");
    replacePreview(preview);

    try {
      const facts = await analyzePalmFromCanvas(canvas);
      setPalmFacts(facts);

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

  async function captureLiveCamera() {
    const video = cameraVideoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;

    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.9);
    stopLiveCamera();
    await processPalmCanvas(canvas, preview);
  }

  async function handleFile(file: File) {
    try {
      const canvas = await fileToCanvas(file);
      await processPalmCanvas(canvas, URL.createObjectURL(file));
    } catch {
      setErrorMsg("사진을 불러오지 못했어요. 다른 사진으로 다시 시도해주세요.");
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
    stopLiveCamera();
    if (resumeKey) {
      sessionStorage.removeItem(`${resumeKey}:palm`);
      sessionStorage.removeItem(`${resumeKey}:funnel`);
      sessionStorage.removeItem(`${resumeKey}:payment`);
    }
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
          {cameraOpen ? (
            <div>
              <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl border border-(--gold-soft) bg-black">
                <video
                  ref={cameraVideoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-[7%] rounded-[2rem] border-2 border-dashed border-white/70"
                />
              </div>
              <canvas ref={cameraProbeCanvasRef} className="hidden" />
              <div className="mystic-card mt-4 p-4 text-center">
                <p className="text-base leading-7 text-foreground">{cameraMessage}</p>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <Button
                  size="lg"
                  disabled={!cameraReady}
                  onClick={captureLiveCamera}
                  className="primary-cta h-14 w-full rounded-full text-base"
                >
                  <Camera className="size-4" />
                  {cameraReady ? "지금 촬영하기" : "손바닥을 맞추는 중"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={stopLiveCamera}
                  className="h-13 w-full rounded-full text-base"
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <JourneyScene scene="palm" companion="palm-guide" />
              <div className="mt-5">
                <p className="text-base leading-7 text-muted-foreground">
                  밝은 곳에서 손바닥 전체를 담아주세요.
                  <br />
                  손가락을 살짝 펴면 촬영 전에 선명도를 먼저 확인해요.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={openLiveCamera}
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
            </>
          )}

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
      {stage === "result" && palmFacts && (
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

          {finalReport && <FinalReportSections report={finalReport} />}
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
      {(stage === "result" || stage === "saju_only") && birthInput && resumeKey && (
        <ConversionFunnel
          birthInput={birthInput}
          sajuSummary={wealthType?.pieces.typeAndDiagnosis ?? null}
          resumeKey={resumeKey}
          onStart={() => { setFunnelActive(true); setReadingOpen(false); }}
          onChapterChange={setChapter}
        />
      )}

      {/* 무료 리포트 Peak와 다음 행동(운세지도) 사이에 고지 문구가 끼면
       * 몰입이 끊긴다(§O) — 필요한 고지는 여기, 진짜 페이지 최하단에만 둔다. */}

      </div>
    </div>
  );
}
