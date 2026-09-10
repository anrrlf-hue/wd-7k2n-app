import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnoseSaju, type FullSajuDiagnosis } from "@/lib/saju";
import { computeSajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { getInterpretation } from "@/lib/interpretation-engine";
import { getFreeSajuReport } from "@/lib/free-report-engine";
import { scorePersonalityCheck } from "@/lib/personality-check";
import { MBTI_TYPES } from "@/lib/mbti-facts";

// 실제 진단 화면(/diagnosis)이 호출하는 유일한 엔드포인트.
// 요청 1회로 (1) 얕은 사주팔자+money-tendency(fallback/게이지 근거로 항상 유지)
// 와 (2) 딥 해석(ssaju facts -> Claude 또는 mock -> 검증)을 함께 계산해
// 왕복을 늘리지 않는다. 딥 파이프라인이 어떤 이유로든 실패해도 얕은 결과는
// 항상 반환되므로 화면이 통째로 실패하지 않는다.

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  /** 성향 스텝은 완전히 선택 사항 — 안 보내면 undefined */
  personalityAnswers: z.record(z.string(), z.number().min(1).max(5)).optional(),
  mbti: z.enum(MBTI_TYPES).optional(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let shallow;
  try {
    shallow = diagnoseSaju(parsed.data);
  } catch {
    return NextResponse.json(
      { error: "사주 계산 중 문제가 발생했습니다." },
      { status: 500 },
    );
  }

  // 딥 파이프라인(유료 업셀용 8필드)과 무료 사주 V2(12섹션)는 서로 독립
  // 시도한다 — 하나가 실패해도 다른 하나는 화면에 나갈 수 있어야 한다.
  let deep: FullSajuDiagnosis["deep"] = null;
  let resultSource: FullSajuDiagnosis["resultSource"] = "fallback";
  let freeReport: FullSajuDiagnosis["freeReport"] = null;

  try {
    const facts = enrichSajuFacts(computeSajuFacts(parsed.data), parsed.data);
    const personality = {
      mbti: parsed.data.mbti ?? null,
      check: parsed.data.personalityAnswers ? scorePersonalityCheck(parsed.data.personalityAnswers) : null,
    };

    const [interpretationResult, freeReportResult] = await Promise.all([
      getInterpretation(facts, { timeoutMs: 9000 }).catch((err) => {
        console.error("deep interpretation pipeline failed:", err);
        return null;
      }),
      getFreeSajuReport(facts, { timeoutMs: 9000, personality }).catch((err) => {
        console.error("free saju report pipeline failed:", err);
        return null;
      }),
    ]);

    if (interpretationResult) {
      deep = {
        source: interpretationResult.source,
        interpretation: interpretationResult.interpretation,
        evidencePreview: interpretationResult.interpretation.evidence.slice(0, 3),
      };
      resultSource = "deep";
    }

    if (freeReportResult) {
      freeReport = { source: freeReportResult.source, report: freeReportResult.report };
    }
  } catch (err) {
    // facts 계산 자체(ssaju 등)가 실패한 경우. 로그만 남기고 fallback으로 응답한다.
    console.error("saju facts computation failed, falling back to shallow result:", err);
  }

  const payload: FullSajuDiagnosis = {
    ...shallow,
    resultSource,
    deep,
    freeReport,
    birthInput: parsed.data,
    personalityInput: {
      personalityAnswers: parsed.data.personalityAnswers ?? null,
      mbti: parsed.data.mbti ?? null,
    },
  };
  return NextResponse.json(payload);
}
