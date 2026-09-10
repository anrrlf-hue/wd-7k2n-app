// MBTI + 6문항을 "사주에서 계산된 구조가 현실에서 어떻게 나타나는지"를
// 구체화하는 개인화 문단으로 쓴다. 이전 라운드는 MBTI를 triple-compare의
// 네 번째 boolean 신호("J=빠른 결정, F=감정적")로 넣었는데, 이번 요구는
// 그 방식을 명시적으로 금지한다 — 그래서 여기서는 비교/투표가 아니라
// "이 사람의 현실 모습을 설명하는 문장"으로만 쓴다.
//
// MBTI 4축의 정의는 이번에 지어낸 게 아니라 MBTI 자체의 표준 정의를 그대로
// 옮긴 것이다:
//   E/I → 에너지·외부 상호작용 선호
//   S/N → 정보·가능성을 받아들이는 방식
//   T/F → 판단할 때 우선 고려하는 기준
//   J/P → 구조화·계획 선호 vs 열린 선택·유연성
//
// 우선순위 규칙: 6문항(speed/plan/autonomy)이 실제로 답변됐으면 그 직접
// 응답이 "지금 이 사람이 어떻게 움직이는지"의 1차 근거가 된다. MBTI는
// 6문항이 직접 묻지 않는 축(E/I, S/N)을 채우고, 6문항과 겹치는 축(J/P↔
// plan/speed, F/T↔autonomy)에서는 "설명을 더하는 두 번째 시선"으로만
// 쓴다. 둘이 다르면 오류로 취급하지 않고 "상황에 따라 다르게 나타나는
// 두 얼굴"로 그대로 보여준다 — 사주 계산값도, 6문항 응답도 고치지 않는다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { ReportParagraph } from "@/lib/free-report-schema";
import type { PersonalityInput } from "@/lib/personality-check";
import type { MbtiType } from "@/lib/mbti-facts";

function ei(mbti: MbtiType): string {
  return mbti[0] === "E"
    ? "사람들과 부딪히고 이야기하면서 에너지를 얻는 편"
    : "혼자 정리할 시간이 있어야 에너지가 차는 편";
}

function sn(mbti: MbtiType): string {
  return mbti[1] === "S"
    ? "지금 눈앞의 사실과 경험을 먼저 보고 판단하는 편"
    : "가능성과 패턴을 먼저 읽고 판단하는 편";
}

/** plan/speed 6문항 응답 → "구조화 선호" 서술. 6문항이 없으면 null(MBTI로 대체). */
function structureFromCheck(check: PersonalityInput["check"]): string | null {
  if (!check) return null;
  const planned = check.levels.plan === "왼쪽";
  const fast = check.levels.speed === "왼쪽";
  if (planned && fast) return "미리 계획을 세우고 빠르게 결정을 닫는 편";
  if (planned && !fast) return "계획은 세워두되 결정 자체는 충분히 생각하고 내리는 편";
  if (!planned && fast) return "즉흥적으로 움직이면서도 결정만큼은 빠르게 내리는 편";
  return "즉흥적으로 움직이면서 결정도 천천히, 여지를 두고 내리는 편";
}

function structureFromMbti(mbti: MbtiType): string {
  return mbti[3] === "J" ? "미리 구조를 짜고 계획대로 움직이는 편" : "열어두고 상황에 맞춰 움직이는 편";
}

/** autonomy 6문항 응답 → "관계 영향" 서술. 6문항이 없으면 null(MBTI로 대체). */
function relationFromCheck(check: PersonalityInput["check"]): string | null {
  if (!check) return null;
  return check.levels.autonomy === "오른쪽"
    ? "결정을 내릴 때 주변 사람 의견에 실제로 영향받는 편"
    : "결정을 내릴 때 주변 의견보다 스스로 판단을 우선하는 편";
}

function relationFromMbti(mbti: MbtiType): string {
  return mbti[2] === "F" ? "관계와 그 결정이 미칠 영향을 먼저 헤아리는 편" : "원칙과 논리를 먼저 따지는 편";
}

/** 사주 영역(재물/일/관계)마다 이 성향이 다르게 나타나는 실제 장면.
 * structured(계획적)·relational(관계영향) 두 축의 조합 4가지로 나눈다 —
 * MBTI/6문항 자체가 아니라 그 결과로 나온 두 축을 보고 장면을 고른다. */
function realLifeScene(structured: boolean, relational: boolean, domain: "money" | "work" | "relationship"): string {
  const scenes: Record<"money" | "work" | "relationship", [string, string, string, string]> = {
    money: [
      // structured & relational
      "돈 쓰는 계획도 미리 짜두고, 그 계획도 가족이나 파트너와 맞춰서 조정하는 편이에요.",
      // structured & !relational
      "예산을 스스로 짜두고 누가 뭐라 해도 그 기준대로 밀고 나가는 편이에요.",
      // !structured & relational
      "정해둔 예산보다, 그때그때 주변 상황과 사람에 맞춰 지출이 왔다 갔다 하는 편이에요.",
      // !structured & !relational
      "예산을 미리 짜두기보다, 필요할 때 스스로 판단해서 바로 쓰는 편이에요.",
    ],
    work: [
      "일정을 촘촘히 짜두고, 팀과 계속 맞춰가며 진행하는 방식이 잘 맞아요.",
      "혼자 계획을 세우고 그 계획대로 끝까지 밀어붙이는 방식이 잘 맞아요.",
      "정해진 절차보다, 그때그때 팀 분위기에 맞춰 유연하게 움직이는 방식이 잘 맞아요.",
      "정해진 틀 없이, 혼자 판단해서 즉흥적으로 처리하는 방식이 잘 맞아요.",
    ],
    relationship: [
      "관계에서도 미리 약속을 정해두고, 그 약속을 상대와 함께 지켜나가는 편이에요.",
      "관계에서 자기 기준이 뚜렷해서, 상대가 흔들어도 잘 안 흔들리는 편이에요.",
      "정해진 게 없어도, 상대 상황에 맞춰 유연하게 관계를 맞춰가는 편이에요.",
      "관계에서도 자기 리듬대로 움직이고, 상대에게 크게 맞추지 않는 편이에요.",
    ],
  };
  const idx = structured ? (relational ? 0 : 1) : relational ? 2 : 3;
  return scenes[domain][idx];
}

/** 강점이 약점으로 뒤집히는 지점 — structured/relational 조합별로 다른
 * 문장을 준다(모든 조합에 "과유불급"이 있다는 걸 보여주기 위함). */
function strengthFlip(structured: boolean, relational: boolean): string {
  if (structured && relational) return "다만 계획도 관계도 다 챙기려다 정작 자기 결정을 뒤로 미루는 순간이 있을 수 있어요.";
  if (structured && !relational) return "다만 계획이 틀어지는 상황에서 유독 완고해져서, 주변 도움을 놓칠 수 있어요.";
  if (!structured && relational) return "다만 상황과 사람에 맞추다 보면 정작 자기 기준이 흐려질 때가 있을 수 있어요.";
  return "다만 혼자 판단하고 즉흥적으로 움직이다 보면, 중요한 순간에 필요한 정보를 놓칠 수 있어요.";
}

export function buildRealWorldPersonalization(
  facts: SajuFacts,
  personality: PersonalityInput,
): ReportParagraph | null {
  const { mbti, check } = personality;
  if (!mbti && !check) return null;

  const sentences: string[] = [];
  const evidenceParts: string[] = [];

  if (mbti) {
    sentences.push(`${ei(mbti)}이고, ${sn(mbti)}이에요.`);
    evidenceParts.push(`MBTI ${mbti}`);
  }

  const structuredText = structureFromCheck(check) ?? (mbti ? structureFromMbti(mbti) : null);
  const relationText = relationFromCheck(check) ?? (mbti ? relationFromMbti(mbti) : null);

  if (structuredText) {
    const fromCheck = structureFromCheck(check) !== null;
    sentences.push(`${fromCheck ? "직접 답한 것만 보면" : "MBTI로 보면"} ${structuredText}이에요.`);
    if (fromCheck && mbti) {
      const mbtiStructured = mbti[3] === "J";
      const checkStructured = check!.levels.plan === "왼쪽";
      if (mbtiStructured !== checkStructured) {
        sentences.push(
          `그런데 MBTI(${mbti[3]}형)로 보면 ${structureFromMbti(mbti)}이라고 나와요 — 익숙한 영역에서는 응답 그대로, 낯선 영역에서는 MBTI 쪽 얼굴이 나오는 식으로 상황마다 다르게 보일 수 있어요.`,
        );
      }
    }
    evidenceParts.push(structureFromCheck(check) !== null ? "6문항 speed/plan" : `MBTI ${mbti![3]}`);
  }

  if (relationText) {
    const fromCheck = relationFromCheck(check) !== null;
    sentences.push(`${fromCheck ? "직접 답한 것만 보면" : "MBTI로 보면"} ${relationText}이에요.`);
    evidenceParts.push(fromCheck ? "6문항 autonomy" : `MBTI ${mbti![2]}`);
  }

  // 두 축(구조화/관계) 조합으로 재물·일·관계 장면을 각각 다르게 만든다 —
  // "사주 본문"에 실제로 personalization이 반영되는 지점.
  const structured = structuredText
    ? (structureFromCheck(check) !== null ? check!.levels.plan === "왼쪽" : mbti![3] === "J")
    : facts.dayStrength === "strong";
  const relational = relationText
    ? (relationFromCheck(check) !== null ? check!.levels.autonomy === "오른쪽" : mbti![2] === "F")
    : facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount;

  sentences.push(realLifeScene(structured, relational, "money"));
  sentences.push(realLifeScene(structured, relational, "work"));
  sentences.push(strengthFlip(structured, relational));

  return {
    text: sentences.join(" "),
    evidence: evidenceParts.length > 0 ? evidenceParts.join(", ") : "성향체크 없음",
  };
}
