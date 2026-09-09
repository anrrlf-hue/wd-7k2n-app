import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnoseSaju, type FullSajuDiagnosis } from "@/lib/saju";
import { computeSajuFacts } from "@/lib/saju-facts";
import { getInterpretation } from "@/lib/interpretation-engine";

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

  // 딥 파이프라인은 별도 try/catch로 감싸, 여기서 무엇이 터지든 얕은 결과는
  // 이미 계산되어 있으므로 fallback으로 응답할 수 있다.
  let deep: FullSajuDiagnosis["deep"] = null;
  let resultSource: FullSajuDiagnosis["resultSource"] = "fallback";

  try {
    const facts = computeSajuFacts(parsed.data);
    const result = await getInterpretation(facts, { timeoutMs: 9000 });

    deep = {
      source: result.source,
      interpretation: result.interpretation,
      evidencePreview: result.interpretation.evidence.slice(0, 3),
    };
    resultSource = "deep";
  } catch (err) {
    // 딥 계산 자체(ssaju 등)가 실패한 경우. 로그만 남기고 fallback으로 응답한다.
    console.error("deep interpretation pipeline failed, falling back to shallow result:", err);
    deep = null;
    resultSource = "fallback";
  }

  const payload: FullSajuDiagnosis = { ...shallow, resultSource, deep };
  return NextResponse.json(payload);
}
