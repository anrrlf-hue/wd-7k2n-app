"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionHeading } from "@/components/brand-companion";
import { JourneyHeader } from "@/components/journey-header";
import { JourneyScene } from "@/components/journey-scene";
import { VerdictCard } from "@/components/diagnosis/verdict-card";
import { ReportSection, ParagraphSection, EvidenceItemCard } from "@/components/diagnosis/report-section";
import {
  analyzePalmFromCanvas,
  assessPalmCaptureFrame,
  preloadHandLandmarker,
} from "@/lib/palm-detection";
import { isPalmFactsUsable, describePalmFailureReasons, type PalmFacts } from "@/lib/palm-facts";
import { PalmReadingSections, PalmBilateralSection, PalmFutureTimelineSection, TripleCompareSection } from "@/components/palm/palm-reading-sections";
import { RealityAnswerFunnel } from "@/components/palm/reality-answer-funnel";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { CompareItem } from "@/lib/triple-compare";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { WealthTypeResult } from "@/lib/wealth-type";
import type { SajuFocus } from "@/lib/saju-focus";
import { track } from "@/lib/analytics";
import type { DominantHand, PalmBilateralReading, PalmFutureTimeline } from "@/lib/palm-bilateral";

type Stage = "upload" | "detecting" | "retake" | "loading" | "result" | "saju_only" | "error";

function realityJourneyKey(birthInput: BirthInput | null, focus: SajuFocus): string | null {
  if (!birthInput) return null;
  return [
    "saju-app:reality-journey:v2",
    focus,
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
  leftPalmFacts?: PalmFacts | null;
  rightPalmFacts?: PalmFacts | null;
  dominantHand?: DominantHand;
  bilateralReading?: PalmBilateralReading | null;
  futurePalmTimeline?: PalmFutureTimeline | null;
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

async function fileToCanvas(file: File, maxDim = 1024): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;
  let objectUrl: string | null = null;

  try {
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        bitmap = null;
      }
    }

    if (!bitmap) {
      objectUrl = URL.createObjectURL(file);
      image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const next = new Image();
        next.onload = () => resolve(next);
        next.onerror = () => reject(new Error("browser image decode failed"));
        next.src = objectUrl!;
      });
    }

    const width = bitmap?.width ?? image?.naturalWidth ?? 0;
    const height = bitmap?.height ?? image?.naturalHeight ?? 0;
    if (!width || !height) throw new Error("image dimensions unavailable");

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context 생성 실패");
    ctx.drawImage((bitmap ?? image)!, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
      <ParagraphSection title="혼자 움직일 때 강한 부분" paragraph={report.soloStrength} />
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

export function PalmPageClient({
  birthInput,
  personalityInput,
  focus = "overall",
  initialQuestion = null,
}: {
  birthInput: BirthInput | null;
  personalityInput?: PersonalityInputEcho;
  focus?: SajuFocus;
  initialQuestion?: string | null;
}) {
  const resumeKey = realityJourneyKey(birthInput, focus);
  const [stage, setStage] = useState<Stage>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rightPreviewUrl, setRightPreviewUrl] = useState<string | null>(null);
  const [leftPreviewUrl, setLeftPreviewUrl] = useState<string | null>(null);
  const [captureHand, setCaptureHand] = useState<DominantHand>("right");
  const [dominantHand, setDominantHand] = useState<DominantHand | null>(null);
  const [rightPalmFacts, setRightPalmFacts] = useState<PalmFacts | null>(null);
  const [leftPalmFacts, setLeftPalmFacts] = useState<PalmFacts | null>(null);
  const [palmFacts, setPalmFacts] = useState<PalmFacts | null>(null);
  const [bilateralReading, setBilateralReading] = useState<PalmBilateralReading | null>(null);
  const [futurePalmTimeline, setFuturePalmTimeline] = useState<PalmFutureTimeline | null>(null);
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
      setLeftPalmFacts(saved.leftPalmFacts ?? null);
      setRightPalmFacts(saved.rightPalmFacts ?? null);
      setDominantHand(saved.dominantHand ?? null);
      setBilateralReading(saved.bilateralReading ?? null);
      setFuturePalmTimeline(saved.futurePalmTimeline ?? null);
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
    void video.play().catch(() => {
      setCameraMessage("카메라 화면을 시작하지 못했어요. 다시 시도하거나 사진 선택을 이용해주세요.");
    });

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
              ? "좋습니다. 지금 찍으시면 됩니다."
              : assessment.ready
                ? "좋아요. 초점이 안정되도록 잠깐만 그대로 있어주세요."
                : assessment.message,
          );
        }
      } catch {
        if (!cancelled) {
          cameraStableFramesRef.current = 0;
          setCameraReady(false);
          setCameraMessage("자동 선명도 확인이 잠시 불안정해도 촬영은 가능합니다.");
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
    if (!initialQuestion?.trim()) return;
    if (stage !== "result" && stage !== "saju_only") return;
    if (funnelActive) return;
    setFunnelActive(true);
    setReadingOpen(false);
    setChapter(4);
  }, [initialQuestion, stage, funnelActive]);

  useEffect(() => {
    if (!resumeKey || (stage !== "result" && stage !== "saju_only")) return;
    const saved: PalmResumeState = {
      stage,
      palmFacts,
      leftPalmFacts,
      rightPalmFacts,
      dominantHand: dominantHand ?? undefined,
      bilateralReading,
      futurePalmTimeline,
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
    leftPalmFacts,
    rightPalmFacts,
    dominantHand,
    bilateralReading,
    futurePalmTimeline,
    finalReport,
    tripleCompare,
    verdict,
    wealthType,
    funnelActive,
    readingOpen,
    chapter,
  ]);

  async function fetchReport(
    facts: PalmFacts | null,
    leftFacts: PalmFacts | null = leftPalmFacts,
    rightFacts: PalmFacts | null = rightPalmFacts,
  ) {
    function retryCurrentHand() {
    stopLiveCamera();
    setErrorMsg(null);
    setRetakeAttempts(0);
    setPalmFacts(null);
    replacePreview(null);
    setStage("upload");
  }

  if (!birthInput) {
      setErrorMsg("생년월일 정보를 찾을 수 없어요. 사주 결과 화면에서 다시 들어와주세요.");
      setStage("error");
      return;
    }
    const res = await withTimeout(
      fetch("/api/palm/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          palmFacts: facts,
          leftPalmFacts: leftFacts,
          rightPalmFacts: rightFacts,
          dominantHand: dominantHand ?? undefined,
          personalityAnswers: personalityInput?.personalityAnswers ?? undefined,
          mbti: personalityInput?.mbti ?? undefined,
        }),
      }),
      30000,
      "리포트 생성이 오래 걸리고 있어요. 다시 시도해주세요.",
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    if (!data.usable) {
      setRetakeAttempts((n) => n + 1);
      setPalmFacts((prev) => (prev ? { ...prev, warnings: data.warnings ?? prev.warnings } : prev));
      setStage("retake");
      return;
    }

    setBilateralReading(data.bilateralReading ?? null);
    setFuturePalmTimeline(data.futurePalmTimeline ?? null);
    setFinalReport(data.freeReport?.report ?? null);
    setTripleCompare(data.tripleCompare ?? []);
    setVerdict(data.verdict ?? null);
    setWealthType(data.wealthType ?? null);
    track("free_report_completed", {
      palmSkipped: Boolean(data.palmSkipped),
      bilateral: Boolean(leftFacts && rightFacts),
    });
    setStage(data.palmSkipped ? "saju_only" : "result");
  }

  function replacePreview(next: string | null) {
    setPreviewUrl(next);
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
    if (!dominantHand) {
      setErrorMsg("먼저 평소 주로 쓰는 손을 선택해주세요.");
      return;
    }
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
      stopLiveCamera();
      setErrorMsg("카메라를 열 수 없어요. 브라우저의 카메라 권한을 허용하거나 아래 ‘사진 선택하기’를 이용해주세요.");
    }
  }

  async function processPalmCanvas(canvas: HTMLCanvasElement, preview: string) {
    setErrorMsg(null);
    setStage("detecting");
    replacePreview(preview);

    try {
      const analyzed = await withTimeout(
        analyzePalmFromCanvas(canvas),
        60000,
        "손금 분석 준비가 오래 걸리고 있어요. 다시 촬영하거나 사진 선택으로 시도해주세요.",
      );
      // 사용자가 화면 안내에 맞춰 오른손/왼손을 순서대로 찍으므로 그 촬영 단계의
      // 손 방향을 결과에 고정한다. 카메라 미러링에 따라 handedness가 뒤집히는 문제를 피한다.
      const facts: PalmFacts = { ...analyzed, handSide: captureHand };
      setPalmFacts(facts);

      if (!isPalmFactsUsable(facts)) {
        setRetakeAttempts((n) => n + 1);
        setStage("retake");
        return;
      }

      if (captureHand === "right") {
        setRightPalmFacts(facts);
        setRightPreviewUrl(preview);
        setCaptureHand("left");
        setRetakeAttempts(0);
        replacePreview(null);
        setStage("upload");
        return;
      }

      const nextLeft = facts;
      const nextRight = rightPalmFacts;
      setLeftPalmFacts(nextLeft);
      setLeftPreviewUrl(preview);

      if (!nextRight) {
        setErrorMsg("오른손 분석 정보가 없어 오른손부터 다시 촬영해주세요.");
        setCaptureHand("right");
        setStage("upload");
        return;
      }

      const primary = dominantHand === "left" ? nextLeft : nextRight;
      setPalmFacts(primary);
      setStage("loading");
      await fetchReport(primary, nextLeft, nextRight);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
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
    if (!dominantHand) {
      setErrorMsg("먼저 평소 주로 쓰는 손을 선택해주세요.");
      return;
    }
    try {
      const canvas = await fileToCanvas(file);
      await processPalmCanvas(canvas, canvas.toDataURL("image/jpeg", 0.9));
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message.includes("손금 분석")
          ? err.message
          : "사진을 불러오지 못했어요. JPG·PNG 사진으로 다시 시도하거나 카메라 촬영을 이용해주세요.",
      );
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
    setCaptureHand("right");
    setDominantHand(null);
    setRightPalmFacts(null);
    setLeftPalmFacts(null);
    setRightPreviewUrl(null);
    setLeftPreviewUrl(null);
    setPalmFacts(null);
    setBilateralReading(null);
    setFuturePalmTimeline(null);
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
            <div className="pb-28">
              <div className="mb-4 rounded-2xl border border-(--gold-soft) bg-card p-4 text-center">
                <p className="section-eyebrow">{captureHand === "right" ? "1 / 2 · 오른손 촬영" : "2 / 2 · 왼손 촬영"}</p>
                <p className="mt-1 text-base font-semibold">
                  {captureHand === "right" ? "오른손 손바닥을 정면으로 보여주세요" : "이제 왼손 손바닥을 정면으로 보여주세요"}
                </p>
              </div>
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
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  손바닥이 화면의 70~85% 정도 차지하게 가까이 맞추고, 손가락 끝부터 손목 주름까지 모두 보이게 해주세요.
                  카메라와 손바닥을 최대한 평행하게 두고 반사광이 생기지 않게 한 뒤 잠깐 멈춰주세요.
                </p>
                <p className={`mt-2 text-base font-medium leading-7 ${cameraReady ? "text-(--gold)" : "text-foreground"}`}>
                  {cameraMessage}
                </p>
              </div>
              <div className="mt-4">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={stopLiveCamera}
                  className="h-13 w-full rounded-full text-base"
                >
                  취소
                </Button>
              </div>
              <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-4 pt-3 pb-4 backdrop-blur">
                <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-2">
                  <Button
                    type="button"
                    aria-label="손금 사진 촬영"
                    onClick={captureLiveCamera}
                    className="primary-cta flex size-20 flex-col gap-1 rounded-full p-0 shadow-xl"
                  >
                    <Camera className="size-5" />
                    <span className="text-xs font-semibold">촬영</span>
                  </Button>
                  {!cameraReady && (
                    <p className="text-center text-xs leading-5 text-muted-foreground">
                      자동 확인이 끝나지 않아도 촬영할 수 있어요. 결과가 흐리면 다시 안내합니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <JourneyScene scene="palm" companion="palm-guide" />

              {!rightPalmFacts && (
                <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">평소 주로 쓰는 손을 먼저 알려주세요</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    양손 차이를 해석할 때 참고하며, 한쪽을 무조건 타고난 운으로 단정하지 않습니다.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={dominantHand === "right" ? "default" : "outline"}
                      onClick={() => setDominantHand("right")}
                      className="h-11 rounded-xl"
                    >
                      오른손
                    </Button>
                    <Button
                      type="button"
                      variant={dominantHand === "left" ? "default" : "outline"}
                      onClick={() => setDominantHand("left")}
                      className="h-11 rounded-xl"
                    >
                      왼손
                    </Button>
                  </div>
                </div>
              )}

              {rightPalmFacts && rightPreviewUrl && captureHand === "left" && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-(--gold-soft) bg-card p-4">
                  <div className="size-14 overflow-hidden rounded-xl border border-(--gold-soft)">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rightPreviewUrl} alt="오른손 촬영 완료" className="size-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-(--gold)">오른손 분석 완료</p>
                    <p className="mt-1 text-sm text-muted-foreground">이제 왼손 한 장만 더 찍으면 양손 비교까지 봅니다.</p>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <p className="section-eyebrow">{captureHand === "right" ? "1 / 2 · 오른손" : "2 / 2 · 왼손"}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {captureHand === "right" ? "먼저 오른손을 찍어주세요" : "이제 왼손을 찍어주세요"}
                </p>
                <p className="mt-2 text-base leading-7 text-muted-foreground">
                  밝은 곳에서 손바닥을 화면의 70~85% 정도로 크게 담고, 손가락 끝부터 손목 주름까지 모두 나오게 해주세요.
                  손바닥은 카메라와 평행하게, 손가락은 자연스럽게 펴고 반사광이 없게 찍는 것이 가장 좋습니다.
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  처음 촬영할 때만 카메라 사용 권한이 뜹니다. <span className="font-medium text-foreground">허용</span>을 눌러주세요.
                </p>
                {errorMsg && (
                  <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">
                    {errorMsg}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Button
                  size="lg"
                  onClick={openLiveCamera}
                  disabled={!dominantHand}
                  className="primary-cta h-14 w-full rounded-full text-base"
                >
                  <Camera className="size-4" />
                  카메라로 촬영하기
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  disabled={!dominantHand}
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
            {stage === "detecting"
              ? `${captureHand === "right" ? "오른손" : "왼손"}의 손 모양과 손금선을 확인하는 중이에요`
              : "양손 손금과 생년월일의 앞으로 흐름을 함께 정리하는 중이에요"}
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
            <Button size="lg" onClick={retryCurrentHand} className="h-13 w-full rounded-full text-base">
              <RotateCcw className="size-4" />
              {captureHand === "right" ? "오른손 다시 촬영하기" : "왼손 다시 촬영하기"}
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
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Button size="lg" onClick={reset} className="h-13 w-full rounded-full text-base">
              다시 촬영하기
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              className="h-13 w-full rounded-full text-base"
            >
              <ImagePlus className="size-4" />
              다른 사진 선택하기
            </Button>
            <button type="button" onClick={handleSkipPalm} className="text-center text-sm text-muted-foreground">
              손금 없이 사주 결과만 계속 보기
            </button>
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
        <RealityAnswerFunnel
          birthInput={birthInput}
          personalityInput={personalityInput}
          palmLines={palmFacts?.onnxLines ?? null}
          palmFacts={palmFacts}
          resumeKey={resumeKey}
          initialFocus={focus}
          initialQuestion={initialQuestion}
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
