"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw, HandMetal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import { FreeBoundaryMarker } from "@/components/diagnosis/free-boundary-marker";
import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { LockedCard } from "@/components/diagnosis/locked-card";
import { ReportSection } from "@/components/diagnosis/report-section";
import {
  analyzePalmFromCanvas,
  preloadHandLandmarker,
} from "@/lib/palm-detection";
import { isPalmFactsUsable, type PalmFacts, type LineFeature } from "@/lib/palm-facts";
import type { CrossInterpretation } from "@/lib/cross-interpretation-schema";
import type { BirthInput } from "@/lib/saju";

type Stage = "upload" | "detecting" | "retake" | "cross_loading" | "result" | "error";

const HAND_SHAPE_KO: Record<PalmFacts["handShape"], string> = {
  square: "사각형 손바닥 · 짧은 손가락",
  rectangular: "사각형 손바닥 · 긴 손가락",
  elongated: "길쭉한 손바닥 · 짧은 손가락",
  slender: "길쭉한 손바닥 · 긴 손가락",
  unknown: "확인 안 됨",
};

/** confidence 낮은 항목을 과신하지 않도록 표현 강도를 다르게 문구화한다. */
function lineConfidencePhrase(f: LineFeature): string {
  if (!f.detected) return "이번 사진에서는 뚜렷하게 잡히지 않았어요";
  if (f.confidence >= 0.6) return `뚜렷하게 보여요 (${f.length}, ${f.direction})`;
  if (f.confidence >= 0.35) return `은은하게 보이는 편이에요 (${f.length}, ${f.direction})`;
  return `약하게 보여서 참고만 해주세요 (${f.length}, ${f.direction})`;
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

export function PalmPageClient({ birthInput }: { birthInput: BirthInput | null }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [palmFacts, setPalmFacts] = useState<PalmFacts | null>(null);
  const [crossResult, setCrossResult] = useState<{ source: "llm" | "mock"; interpretation: CrossInterpretation } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    preloadHandLandmarker();
  }, []);

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

      if (!isPalmFactsUsable(facts)) {
        setStage("retake");
        return;
      }

      if (!birthInput) {
        setErrorMsg("생년월일 정보를 찾을 수 없어요. 사주 결과 화면에서 다시 들어와주세요.");
        setStage("error");
        return;
      }

      setStage("cross_loading");
      const res = await fetch("/api/palm/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...birthInput, palmFacts: facts }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "요청 실패");

      if (!data.usable) {
        setPalmFacts((prev) => (prev ? { ...prev, warnings: data.warnings ?? prev.warnings } : prev));
        setStage("retake");
        return;
      }

      setCrossResult({ source: data.source, interpretation: data.interpretation });
      setStage("result");
    } catch {
      setErrorMsg("분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      setStage("error");
    }
  }

  function reset() {
    setStage("upload");
    setPalmFacts(null);
    setCrossResult(null);
    setErrorMsg(null);
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
      className={`mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10 ${stage === "result" ? "result-bright" : ""}`}
    >
      <StepBadge icon={<HandMetal className="size-5" />} />
      <p className="text-sm font-medium text-(--gold)">손금 x 사주 교차 분석</p>
      <h1 className="mt-2 text-xl leading-snug font-semibold tracking-tight">
        사주에서 보인 돈 성향,
        <br />
        손에도 같은 흐름이 있을까?
      </h1>

      {stage === "upload" && (
        <div className="mt-8 flex flex-1 flex-col">
          <div className="mystic-card flex flex-col items-center gap-3 p-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-(--gold-soft)">
              <PalmLineIllustration />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              손바닥 전체가 프레임 안에 들어오게, 밝은 곳에서 찍어주세요.
              <br />
              손금선이 잘 보이도록 손가락을 살짝 펴면 더 좋아요.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => cameraInputRef.current?.click()}
              className="h-13 w-full rounded-full text-base"
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

          <Link
            href="/diagnosis"
            className="mt-auto pt-8 text-center text-xs text-muted-foreground"
          >
            나중에 할게요
          </Link>
        </div>
      )}

      {(stage === "detecting" || stage === "cross_loading") && (
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
          <p className="text-sm text-muted-foreground">
            {stage === "detecting" ? "손과 손금선을 확인하는 중이에요" : "사주와 교차 해석하는 중이에요"}
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
            <p className="text-sm font-medium text-(--gold)">다시 촬영해주세요</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {palmFacts.warnings.map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Button size="lg" onClick={reset} className="h-13 w-full rounded-full text-base">
              <RotateCcw className="size-4" />
              다시 촬영하기
            </Button>
            <Link href="/diagnosis" className="text-center text-xs text-muted-foreground">
              나중에 할게요
            </Link>
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

      {stage === "result" && palmFacts && crossResult && (
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
                <p className="mt-0.5 text-xs text-(--gold)">
                  분석 신뢰도 {(palmFacts.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-border p-3.5">
              <p className="text-xs font-medium text-muted-foreground">손에서 검출된 특징</p>
              {palmFacts.lineFeatures.map((f) => (
                <div key={f.name} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${f.detected ? "bg-(--gold)" : "bg-muted"}`}
                  />
                  <p>
                    <span className="font-medium">{f.name}</span> — {lineConfidencePhrase(f)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소 */}
          <div className="mt-5">
            <ReportSection step="①" title="사주와 공통으로 보이는 성향">
              <p>{crossResult.interpretation.common}</p>
            </ReportSection>
            <ReportSection step="②" title="사주와 다르게 나타나는 부분">
              <p>{crossResult.interpretation.differences}</p>
            </ReportSection>
            <ReportSection step="③" title="돈을 대하는 방식·의사결정 스타일">
              <p>{crossResult.interpretation.moneyConnection}</p>
            </ReportSection>
            <ReportSection step="④" title="나와 비교해볼까요">
              <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">
                {crossResult.interpretation.selfComparisonQuestion}
              </p>
            </ReportSection>
            <ReportSection step="⑤" title="이 분석의 한계">
              <p className="text-xs text-muted-foreground">{crossResult.interpretation.uncertaintyNote}</p>
            </ReportSection>
          </div>

          <FreeBoundaryMarker />

          <div className="mt-5 flex flex-col gap-3">
            <LockedCard
              title="사주 + 손금 심화 교차 리포트"
              cta="심화 교차 리포트 열어보기"
            />
          </div>

          <PaywallOffer
            includedItems={[
              "사주+손금 심화 교차 비교(대운 흐름까지 반영)",
              "앞으로 1~3년 재물 흐름 정확한 시기",
              "현실 재무정보와 비교 검증",
              "지금 시기에 필요한 구체적 행동",
              "전체 계산 근거 원문",
            ]}
            ctaText="사주+손금 심화 교차 리포트 열기"
          />

          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Button size="lg" variant="outline" onClick={reset} className="h-13 w-full rounded-full text-base">
              <RotateCcw className="size-4" />
              다른 사진으로 다시 보기
            </Button>
            <Button asChild size="lg" className="h-13 w-full rounded-full text-base">
              <Link href="/diagnosis">처음 화면으로</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
