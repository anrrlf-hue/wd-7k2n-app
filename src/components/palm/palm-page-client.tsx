"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw, HandMetal, Compass, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { VerdictCard } from "@/components/diagnosis/verdict-card";
import { ReportSection, ParagraphSection, EvidenceItemCard, EvidenceToggle } from "@/components/diagnosis/report-section";
import {
  analyzePalmFromCanvas,
  preloadHandLandmarker,
} from "@/lib/palm-detection";
import { isPalmFactsUsable, describePalmFailureReasons, type PalmFacts } from "@/lib/palm-facts";
import { buildRealObservationText, buildTraditionalReadingText } from "@/lib/palm-observation-text";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { FortuneCandidate, FortuneInterestId, SituationOption } from "@/lib/fortune-candidates";
import type { CompareItem } from "@/lib/triple-compare";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
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

const COMPARE_KIND_LABEL: Record<CompareItem["kind"], string> = { 일치: "일치", 차이: "차이", 보완: "보완" };

/** 손금 자체 해석이 끝난 뒤 딱 한 번 나오는 사주×손금×자기응답 통합 비교.
 * 데이터가 있는 축만 서버(triple-compare.ts)에서 내려오므로, 여기서는
 * 있는 그대로 나열만 한다 — 일치로 억지로 맞추지 않는다. */
function TripleCompareSection({ items }: { items: CompareItem[] }) {
  if (items.length === 0) return null;
  return (
    <ReportSection step="③" title="사주 · 손금 · 자기응답 비교">
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.topic} className="rounded-xl border border-border p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="rounded-full bg-(--gold-soft) px-2 py-0.5 text-[11px] text-(--gold)">
                {COMPARE_KIND_LABEL[item.kind]}
              </span>
              {item.topic}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

/** "내 운세 지도" — 종합판정 다음에 뜬다. 3개를 동등하게 나열하지 않고,
 * selectPrimaryCandidate(이미 계산된 신호 재사용, 새 점수 없음)가 고른
 * 1개를 "지금 이것부터"로 먼저 크게 보여주고, 나머지 2개는 그 아래
 * 작게 — 사용자는 여전히 둘 중 아무거나 눌러서 바꿔볼 수 있다. */
function FortuneMap({
  candidates,
  primaryCandidateId,
  onSelect,
}: {
  candidates: FortuneCandidate[];
  primaryCandidateId: FortuneInterestId | null;
  onSelect: (c: FortuneCandidate) => void;
}) {
  const primary = candidates.find((c) => c.id === primaryCandidateId) ?? candidates[0];
  const secondary = candidates.filter((c) => c.id !== primary.id);

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="mt-8"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Compass className="size-4 text-(--gold)" />
        지금 가장 궁금할 흐름
      </p>

      <button
        type="button"
        onClick={() => onSelect(primary)}
        className="mystic-card mystic-ring mt-3 flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-(--gold-soft)"
      >
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-(--gold-soft) text-(--gold)">
          <Compass className="size-4" />
        </span>
        <span className="flex-1">
          <span className="block text-[11px] font-semibold tracking-wide text-(--gold)">지금 이것부터</span>
          <span className="mt-0.5 block text-sm font-semibold">{primary.label}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{primary.reason}</span>
        </span>
        <ArrowRight className="mt-1 size-4 shrink-0 text-(--gold)" />
      </button>

      <p className="mt-5 text-xs text-muted-foreground">다른 흐름도 궁금하다면</p>
      <div className="mt-2 flex flex-col gap-2">
        {secondary.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className="mystic-card flex items-start gap-3 p-3.5 text-left transition-colors hover:border-(--gold-soft)"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-(--gold-soft) text-(--gold)">
              {c.alreadyCovered ? <Check className="size-3" /> : <Compass className="size-3" />}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{c.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{c.reason}</span>
            </span>
            <ArrowRight className="mt-1 size-3.5 shrink-0 text-(--gold)" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/** 선택한 운의 실제 무료 미니리딩. 타고난 방식/현재 대운 흐름/다음 흐름
 * 변화/손금과의 비교(있으면)/생활 속 미래 장면까지 실제 정보량을 늘린
 * 무료 리딩을 먼저 다 보여준 다음(§H), 결제 유도 전에 재무 정보를 묻지
 * 않는 현재상황 1문항을 받는다(§I). 그 응답을 고른 뒤에야 "그래서 나는
 * 무엇을 해야 하나?" 질문과 두 번째 자발적 CTA가 나온다 — 그 전까지 가격은
 * 절대 렌더링하지 않는다(컴포넌트 자체를 mount하지 않음, §L). */
function MiniReading({
  candidate,
  finalReport,
  situationAnswer,
  onSituationSelect,
  onDeeper,
  onBack,
}: {
  candidate: FortuneCandidate;
  finalReport: FreeSajuReport;
  situationAnswer: string | null;
  onSituationSelect: (option: SituationOption) => void;
  onDeeper: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-8"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Compass className="size-4 text-(--gold)" />
        {candidate.label}
      </p>
      <p className="mt-3 text-sm leading-relaxed">{candidate.bornWay}</p>
      <p className="mt-2 text-sm leading-relaxed">{candidate.currentFlow}</p>
      {candidate.compareNote && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{candidate.compareNote}</p>
      )}
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
        {candidate.futureScene}
      </p>

      {/* 무료 심화 맛보기 4가지 — 전부 이미 계산된 데이터를 재사용한다 */}
      <div className="mt-4 space-y-2.5">
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] font-semibold text-(--gold)">지금 가장 강한 신호</p>
          <p className="mt-0.5 text-sm leading-relaxed">{candidate.currentFlow}</p>
        </div>
        {finalReport.cautions[0] && (
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] font-semibold text-(--gold)">지금 막히는 지점</p>
            <p className="mt-0.5 text-sm leading-relaxed">{finalReport.cautions[0].detail}</p>
          </div>
        )}
        {finalReport.strengths[0] && (
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] font-semibold text-(--gold)">지금 잘 쓰고 있는 강점</p>
            <p className="mt-0.5 text-sm leading-relaxed">{finalReport.strengths[0].detail}</p>
          </div>
        )}
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] font-semibold text-(--gold)">앞으로 바뀔 핵심</p>
          <p className="mt-0.5 text-sm leading-relaxed">{candidate.nextShift}</p>
        </div>
      </div>

      {!situationAnswer ? (
        <div className="mt-5">
          <p className="text-sm font-medium">{candidate.situation.question}</p>
          <div className="mt-3 flex flex-col gap-2">
            {candidate.situation.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSituationSelect(opt)}
                className="mystic-card p-3 text-left text-sm transition-colors hover:border-(--gold-soft)"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0.5, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="mt-5 text-sm font-medium">{candidate.situationCopy[situationAnswer].deeperQuestion}</p>
          <Button size="lg" onClick={onDeeper} className="mt-4 h-13 w-full rounded-full text-base">
            {candidate.situationCopy[situationAnswer].ctaLabel}
          </Button>
        </motion.div>
      )}

      <button type="button" onClick={onBack} className="mt-4 w-full text-center text-xs text-muted-foreground">
        다른 운 선택하기
      </button>
    </motion.div>
  );
}

/** 모든 무료 콘텐츠가 끝난 뒤 나오는 전환 흐름. 운세지도 -> 관심운 선택
 * -> 미니리딩 -> "더 보기" 클릭 -> 그제서야 개인화된 결제창. 결제창은
 * 선택한 운과 같은 대화를 이어간다(§M) — 모든 사람에게 같은 제목이 아니다. */
function ConversionFlow({
  candidates,
  finalReport,
  primaryCandidateId,
  onReset,
}: {
  candidates: FortuneCandidate[];
  finalReport: FreeSajuReport;
  primaryCandidateId: FortuneInterestId | null;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<FortuneCandidate | null>(null);
  const [situationAnswer, setSituationAnswer] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  function selectCandidate(c: FortuneCandidate) {
    setSelected(c);
    setSituationAnswer(null);
    setOpened(false);
    track("fortune_interest_selected", { interest: c.id });
    track("mini_reading_viewed", { interest: c.id });
  }

  function backToMap() {
    setSelected(null);
    setSituationAnswer(null);
    setOpened(false);
  }

  function selectSituation(option: SituationOption) {
    setSituationAnswer(option.value);
    track("mini_reading_viewed", { interest: selected?.id, situation: option.value });
  }

  function openPaywall() {
    setOpened(true);
    track("deeper_cta_clicked", { interest: selected?.id, situation: situationAnswer });
    track("paywall_viewed", { interest: selected?.id, situation: situationAnswer });
  }

  return (
    <>
      {!selected && (
        <FortuneMap candidates={candidates} primaryCandidateId={primaryCandidateId} onSelect={selectCandidate} />
      )}
      {selected && !opened && (
        <MiniReading
          candidate={selected}
          finalReport={finalReport}
          situationAnswer={situationAnswer}
          onSituationSelect={selectSituation}
          onDeeper={openPaywall}
          onBack={backToMap}
        />
      )}
      {selected && opened && situationAnswer && (
        <div className="mt-8">
          <PaywallOffer
            title={selected.situationCopy[situationAnswer].paywallTitle}
            includedItems={selected.situationCopy[situationAnswer].paywallItems}
            ctaText={selected.situationCopy[situationAnswer].ctaLabel}
          />
          <button
            type="button"
            onClick={() => setOpened(false)}
            className="mt-3 w-full text-center text-xs text-muted-foreground"
          >
            다른 운 선택하기
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onReset}
        className="mt-6 flex w-full items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
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
  const [fortuneCandidates, setFortuneCandidates] = useState<FortuneCandidate[]>([]);
  const [tripleCompare, setTripleCompare] = useState<CompareItem[]>([]);
  const [verdict, setVerdict] = useState<ReportParagraph | null>(null);
  const [primaryCandidateId, setPrimaryCandidateId] = useState<FortuneInterestId | null>(null);
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
    setFortuneCandidates(data.fortuneCandidates ?? []);
    setTripleCompare(data.tripleCompare ?? []);
    setVerdict(data.verdict ?? null);
    setPrimaryCandidateId(data.primaryCandidateId ?? null);
    track("free_report_completed", { palmSkipped: Boolean(data.palmSkipped) });
    track("fortune_map_viewed");
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
    setFortuneCandidates([]);
    setTripleCompare([]);
    setVerdict(null);
    setPrimaryCandidateId(null);
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
      <p className="text-sm font-medium text-(--gold)">손금까지 더해 마저 봅니다</p>
      <h1 className="mt-2 text-xl leading-snug font-semibold tracking-tight">
        사주에서 짚은 이 재물의 결,
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
              </div>
            </div>
          </motion.div>

          {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소이자, 사주와
           * 독립된 두 번째 분석이다(§3): 실제 손 관측 -> 손금 자체 해석 ->
           * (그 다음에야) 사주와의 비교. "사주 문단 + 손에도 같은 모습이
           * 보여요" 식으로 섞지 않는다. */}
          <div className="mt-5">
            <ReportSection step="①" title="실제 이미지에서 관측된 것">
              <p>{buildRealObservationText(palmFacts)}</p>
            </ReportSection>
            <ReportSection step="②" title="손금이 보여주는 것">
              <p className="text-sm text-muted-foreground">{buildTraditionalReadingText(palmFacts)}</p>
            </ReportSection>
            <TripleCompareSection items={tripleCompare} />
          </div>

          <FinalReportSections report={finalReport} />
          {verdict && <VerdictCard verdict={verdict} />}
          <ConversionFlow
            candidates={fortuneCandidates}
            finalReport={finalReport}
            primaryCandidateId={primaryCandidateId}
            onReset={reset}
          />
        </div>
      )}

      {stage === "saju_only" && finalReport && (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="mystic-card p-4 text-sm text-muted-foreground">
            이번 결과는 사주와 입력한 정보를 중심으로 봤어요.
          </div>
          <TripleCompareSection items={tripleCompare} />
          <FinalReportSections report={finalReport} />
          {verdict && <VerdictCard verdict={verdict} />}
          <ConversionFlow
            candidates={fortuneCandidates}
            finalReport={finalReport}
            primaryCandidateId={primaryCandidateId}
            onReset={reset}
          />
        </div>
      )}

      {/* 무료 리포트 Peak와 다음 행동(운세지도) 사이에 고지 문구가 끼면
       * 몰입이 끊긴다(§O) — 필요한 고지는 여기, 진짜 페이지 최하단에만 둔다. */}
      {(stage === "result" || stage === "saju_only") && (
        <p className="mt-8 text-center text-[11px] text-muted-foreground">이 결과로 중요한 결정을 대신하지 마세요.</p>
      )}
    </div>
  );
}
