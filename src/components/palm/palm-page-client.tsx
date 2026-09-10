"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw, HandMetal, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { ReportSection, EvidenceItemCard } from "@/components/diagnosis/report-section";
import {
  analyzePalmFromCanvas,
  preloadHandLandmarker,
} from "@/lib/palm-detection";
import { isPalmFactsUsable, describePalmFailureReasons, onnxDetectedLineCount, type PalmFacts } from "@/lib/palm-facts";
import { buildRealObservationText, buildTraditionalReadingText } from "@/lib/palm-observation-text";
import type { FreeSajuReport } from "@/lib/free-report-schema";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";

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
 * 없을 때(saju-only) 양쪽에서 재사용한다 — 데이터가 있으면 관련 섹션에
 * 자연스럽게 녹아 있고(free-report-mock.ts에서 이미 처리됨), 없으면
 * 사주만으로도 완결된 리포트다. 별도의 "이 분석의 한계" 섹션은 만들지
 * 않는다 — 필요한 고지는 화면 맨 아래에 한 줄로만 둔다. */
function FinalReportSections({ report }: { report: FreeSajuReport }) {
  return (
    <div className="mt-3">
      <ReportSection title="타고난 성향">
        <p>{report.temperament}</p>
      </ReportSection>
      <ReportSection title="재물운·돈복의 큰 구조">
        <p>{report.wealthStructure}</p>
      </ReportSection>
      <ReportSection title="돈을 버는 방식">
        <p>{report.earningStyle}</p>
      </ReportSection>
      <ReportSection title="돈을 지키는 방식">
        <p>{report.keepingStyle}</p>
      </ReportSection>
      <ReportSection title="돈을 놓치는 반복 패턴">
        <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{report.leakPattern}</p>
      </ReportSection>
      <ReportSection title="큰돈·기회와 관계된 성향">
        <p>{report.bigMoneyAffinity}</p>
      </ReportSection>
      <ReportSection title="직장형일까, 사업형일까">
        <p>{report.jobOrientation}</p>
      </ReportSection>
      <ReportSection title="조직에서 강한 부분">
        <p>{report.teamStrength}</p>
      </ReportSection>
      <ReportSection title="독립적으로 움직일 때 강한 부분">
        <p>{report.soloStrength}</p>
      </ReportSection>
      <ReportSection title="사람과 돈">
        <p>{report.peopleAndMoney}</p>
      </ReportSection>
      <ReportSection title="의사결정 스타일">
        <p>{report.decisionStyle}</p>
      </ReportSection>
      <ReportSection title="기회를 잡는 방식">
        <p>{report.opportunityStyle}</p>
      </ReportSection>
      <ReportSection title="나의 강점 3가지">
        <div className="space-y-2.5">
          {report.strengths.map((s, i) => (
            <EvidenceItemCard key={s.title} index={i + 1} title={s.title} detail={s.detail} evidence={s.evidence} />
          ))}
        </div>
      </ReportSection>
      <ReportSection title="조심하면 좋은 점 3가지">
        <div className="space-y-2.5">
          {report.cautions.map((c, i) => (
            <EvidenceItemCard key={c.title} index={i + 1} title={c.title} detail={c.detail} evidence={c.evidence} />
          ))}
        </div>
      </ReportSection>
      <ReportSection title="나와 비교해볼까요">
        <div className="space-y-2">
          {report.selfCheckQuestions.map((q) => (
            <p key={q} className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
              <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
              {q}
            </p>
          ))}
        </div>
      </ReportSection>
      <ReportSection title="왜 이런 결과가 나왔을까">
        <p className="text-sm text-muted-foreground">{report.evidenceExplainer}</p>
      </ReportSection>
    </div>
  );
}

const BRIDGE_LINES: Record<FreeSajuReport["bridgeProfile"], { headline: string; body: string }> = {
  business: {
    headline: "기회를 잡는 힘이 강한 편으로 나왔어요.",
    body: "중요한 건 언제 움직이느냐예요.",
  },
  stable: {
    headline: "무리해서 움직이기보다 좋은 흐름을 놓치지 않는 편이 잘 맞아요.",
    body: "그 흐름이 언제인지 아는 게 중요해요.",
  },
  leak: {
    headline: "버는 힘만큼 지키는 타이밍이 중요한 구조로 나왔어요.",
    body: "언제 조심해야 하는지가 관건이에요.",
  },
};

/** 결제 직전 Bridge(§21-22) — 가격은 여기서 절대 안 보여준다. 사용자가
 * 개인화된 문구를 읽고 스스로 CTA를 눌러야만 그 아래 가격이 있는
 * PaywallOffer가 열린다. 모든 사람에게 같은 문구를 쓰지 않는다 —
 * bridgeProfile(사업형/안정형/leak형)에 따라 헤드라인이 달라진다. */
function Bridge({ profile, onOpen }: { profile: FreeSajuReport["bridgeProfile"]; onOpen: () => void }) {
  const lines = BRIDGE_LINES[profile];
  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="mt-8 rounded-2xl border border-(--gold-soft) p-5 text-center"
    >
      <p className="text-sm text-muted-foreground">지금까지는 당신이 어떤 돈의 구조를 가진 사람인지 봤어요.</p>
      <p className="mt-3 text-base leading-snug font-semibold">{lines.headline}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{lines.body}</p>
      <p className="mt-3 text-sm">그렇다면, 이 흐름이 언제 강해지는지도 궁금하지 않아요?</p>
      <Button size="lg" onClick={onOpen} className="mt-5 h-13 w-full rounded-full text-base">
        내 재물운의 시기 보기
      </Button>
    </motion.div>
  );
}

/** 모든 무료 콘텐츠가 끝난 뒤 딱 한 번 나오는 마지막 선택 영역.
 * Bridge를 먼저 보여주고, 사용자가 직접 눌러야만 가격이 있는 결제창을 연다
 * (§21 — 결제창을 무료 결과 직후 자동으로 보여주지 않는다). */
function FinalChoice({ report, onReset }: { report: FreeSajuReport; onReset: () => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        사주·손금 해석은 참고용 콘텐츠입니다.
      </p>
      {!opened ? (
        <Bridge profile={report.bridgeProfile} onOpen={() => setOpened(true)} />
      ) : (
        <div className="mt-5">
          <PaywallOffer
            title="내 재물 흐름은 언제 강해지고, 언제 조심해야 할까요"
            includedItems={[
              "앞으로 1~3년 재물 흐름이 강해지는 시기",
              "조심해야 할 시기와 이유",
              "지금 시기에 필요한 구체적 행동",
            ]}
            ctaText="내 재물운의 시기 열어보기"
          />
        </div>
      )}
      <button
        type="button"
        onClick={onReset}
        className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
      >
        <RotateCcw className="size-3.5" />
        다른 사진으로 다시 보기
      </button>
    </>
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retakeAttempts, setRetakeAttempts] = useState(0);

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
    setStage("upload");
    setPalmFacts(null);
    setFinalReport(null);
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
      className={`mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10 ${stage === "result" || stage === "saju_only" ? "result-bright" : ""}`}
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

          <button
            type="button"
            onClick={handleSkipPalm}
            className="mt-auto pt-8 text-center text-xs text-muted-foreground"
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
          <p className="text-sm text-muted-foreground">
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
            <p className="text-sm font-medium text-(--gold)">손금선이 충분히 읽히지 않았어요</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
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
              <button type="button" onClick={handleSkipPalm} className="text-center text-xs text-muted-foreground">
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
                <p className="mt-0.5 text-xs text-(--gold)">
                  이미지 품질 양호 · 주요 선 {onnxDetectedLineCount(palmFacts)}/3개 검출
                </p>
              </div>
            </div>
          </motion.div>

          {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소. "실제 관측값"과
           * "손금 전통 해석"을 먼저 실제 ONNX 결과로 보여준 다음(Sobel은 여기
           * 화면에 노출하지 않는다), 최종 통합 리포트로 바로 이어간다 —
           * 별도의 "손금×사주 공통점/차이점/한계" 섹션 없이, 관련 있는
           * 리포트 섹션 안에 이미 손금 신호가 녹아 있다. */}
          <div className="mt-5">
            <ReportSection step="①" title="실제 이미지에서 관측된 것">
              <p>{buildRealObservationText(palmFacts)}</p>
            </ReportSection>
            <ReportSection step="②" title="손금 전통 해석 (참고용)">
              <p className="text-sm text-muted-foreground">{buildTraditionalReadingText(palmFacts)}</p>
            </ReportSection>
          </div>

          <FinalReportSections report={finalReport} />
          <FinalChoice report={finalReport} onReset={reset} />
        </div>
      )}

      {stage === "saju_only" && finalReport && (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="mystic-card p-4 text-sm text-muted-foreground">
            이번엔 손금 없이 사주만으로 리포트를 만들었어요. 나중에 손금 사진을 추가하면 더 정확해질 수 있어요.
          </div>
          <FinalReportSections report={finalReport} />
          <FinalChoice report={finalReport} onReset={reset} />
        </div>
      )}
    </div>
  );
}
