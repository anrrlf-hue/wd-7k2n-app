// 무료 사주 V2의 결정론적(deterministic) 생성기. API 키 없이도 17섹션 전체를
// 항상 완결된 형태로 만든다. be-realdeveloper/saju의 "근거 사전 + 궁위론"
// 패턴(코드가 아니라 구조를 REUSE)과, lguz/humanize-writing-skill·
// boraoztunc/skills(stop-slop, MIT) 조사에서 확인한 "반복 구조 제거" 원칙을
// 함께 적용한다: 모든 문단이 같은 리듬으로 끝나지 않도록, 섹션마다
// (도입부/자기확인 방식) 조합을 다르게 만든다.
//
// 절대 규칙: 콘텐츠(주장/근거)는 오직 SajuFacts에서만 나온다. compose()가
// 하는 일은 같은 사실을 다른 문장 구조에 담는 것뿐, 사실 자체를 바꾸지 않는다.
//
// text/evidence 분리(이번 라운드 신규): 이전에는 "재성 2개", "비겁+관성",
// "격국", "건록·제왕" 같은 전문 계산근거를 본문 문장 끝에 그대로 붙였다 —
// "전문용어를 몰라도 이해 가능해야 한다"는 요구를 어기는 구조였다. 모든
// 서술형 필드는 이제 {text, evidence}로 나뉜다: text는 생활 언어만, evidence는
// "왜 이렇게 봤나요?" 보조 펼침영역에만 쓴다(free-report-schema.ts의
// JARGON_IN_TEXT_PATTERNS가 text에 이 용어들이 들어가면 검증에서 걸러낸다).
//
// 손금/자기보고 비교 로직 이전(Round D): 이전에는 각 주제 문단
// (재물구조/의사결정/사람과 돈/기회) 안에 "감정선이 보이는 편이라..."처럼
// 손금·자기보고 신호를 조용히 섞어 넣었다 — "손금은 사주와 독립된 두
// 번째 분석이어야 한다"는 요구에 따라, 그 비교는 여기서 빼고
// triple-compare.ts의 별도 통합 비교 섹션으로 옮겼다. 이 파일의 13개 주제
// 문단은 지금도 순수 사주 근거로만 구성된다 — 이 원칙은 안 바뀌었다.
//
// MBTI+6문항 재도입: triple-compare에 boolean 투표로 넣는 방식은
// 금지됐다 — 대신 realWorldPersonalization이라는 별도 문단 하나로
// "사주에서 계산된 구조가 현실에서 어떻게 나타나는지"를 설명한다(성향체크를
// 안 했으면 null). 실제 구성은 real-world-personalization.ts에 있다.
//
// 대운 필드 2개 신규(이번 라운드): nextMove("지금 무엇을 해야 하는가")와
// timingShift("앞으로 언제 큰 변화가 오는가")는 항상 채워지는(null 없는)
// daeun 기반 문단이다. realWorldPersonalization은 이제 MBTI/6문항 자체의
// 특성·장면 서술에만 집중하고(대운 이야기는 두 필드가 전담), 손금까지
// 엮은 "종합판정"은 이 파일이 아니라 손금 스캔 이후에만 호출 가능한
// real-world-personalization.ts의 buildComprehensiveVerdict가 api/palm/
// interpret/route.ts에서 직접 만든다 — palm은 무료 사주 단계(/api/saju)엔
// 존재하지 않으므로 이 파일/이 함수는 palm을 아예 받지 않는다.

import { buildPersonalReading } from "@/lib/personal-reading";
import { deriveSajuWorkCore } from "@/lib/saju-work-core";
import type { SajuFacts, PillarFact } from "@/lib/saju-facts";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { PersonalityInput } from "@/lib/personality-check";
import { dayStrengthShort } from "@/lib/saju-labels";
import { buildSajuReadingCoherence } from "@/lib/saju-reading-coherence";
import { buildRealWorldPersonalization, buildNextMove, buildTimingShift } from "@/lib/real-world-personalization";

// ---------- 문장 구조 다양화 유틸 ----------

/** 종성(받침) 유무로 이/가, 은/는을 자동 선택한다. "목이(가)" 같은 미완성
 * 플레이스홀더가 그대로 노출되는 문제를 막는다(실제 스크린샷 검수에서 발견). */
function hasJongseong(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1) - 0xac00;
  if (ch < 0 || ch > 11171) return false;
  return ch % 28 !== 0;
}
function 이가(word: string): string {
  return `${word}${hasJongseong(word) ? "이" : "가"}`;
}
function 은는(word: string): string {
  return `${word}${hasJongseong(word) ? "은" : "는"}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** claim(핵심 결론) + scene(생활 속 구체적 모습)을 seed에 따라 다른 순서로
 * 조립해 text를 만들고, evidence는 별도 필드로 그대로 둔다(본문에 절대
 * 섞지 않는다 — 전문용어는 evidence 전용). */
function compose(seed: number, parts: { claim: string; scene: string; evidence: string }): ReportParagraph {
  const { claim, scene, evidence } = parts;
  const text = seed % 2 === 0 ? `${scene} ${claim}` : `${claim} ${scene}`;
  return { text: text.trim(), evidence };
}

function pillarNamesKo(pillars: PillarFact["pillar"][]): string {
  const label: Record<PillarFact["pillar"], string> = { year: "연주", month: "월주", day: "일지", hour: "시주" };
  return pillars.map((p) => label[p]).join(", ");
}

function levelOf(count: number): "없음" | "적음" | "보통" | "강함" {
  if (count === 0) return "없음";
  if (count === 1) return "적음";
  if (count <= 2) return "보통";
  return "강함";
}

// ---------- 12운성·신살 심화(REUSE-FIRST) ----------
// ssaju는 이미 pillarStages(기둥별 12운성 bong/geo + specialSals)를 계산해
// 주는데, 이전까지는 peakStagePillars(건록·제왕 자리)로만 걸러 쓰고 나머지는
// 완전히 버려졌다 — 새 계산 엔진 없이 이미 있는 계산 결과를 더 쓰는 것만으로
// 실제 서사 깊이를 늘릴 수 있는 지점이다. 의미 매핑은 사주닥터 레포
// (be-realdeveloper/saju)의 interpretation.md 해석 사전을 그대로 옮긴 것이지
// 이번에 새로 지어낸 판정이 아니다. 신살은 "양념"이라 실제로 검출된 것만
// 풀이하고(없으면 억지로 안 만듦), 의미를 모르는 신살은 이름을 대지 않는다.
const SINSAL_MEANING: Record<string, { meaning: string; tone: "길" | "주의" }> = {
  도화: { meaning: "사람을 끌어당기는 매력", tone: "길" },
  역마: { meaning: "이동·변화와 잘 맞는 활동성", tone: "길" },
  화개: { meaning: "몰입하고 파고드는 힘", tone: "길" },
  천을귀인: { meaning: "위기일 때 나타나는 귀인의 도움", tone: "길" },
  문창: { meaning: "공부·시험과 잘 맞는 총명함", tone: "길" },
  양인: { meaning: "강하게 밀어붙이는 기세", tone: "주의" },
  백호: { meaning: "강렬하고 극단적인 존재감", tone: "주의" },
  괴강: { meaning: "강렬하고 극단적인 존재감", tone: "주의" },
};

function findNamedSinsal(
  pillarStages: SajuFacts["pillarStages"],
  tone: "길" | "주의",
): { name: string; meaning: string } | null {
  for (const s of pillarStages) {
    for (const raw of s.specialSals) {
      const base = raw.replace(/살$/, "");
      const entry = SINSAL_MEANING[base];
      if (entry && entry.tone === tone) return { name: base, meaning: entry.meaning };
    }
  }
  return null;
}

// ---------- 본체 ----------

export function buildFreeSajuReport(facts: SajuFacts, personality?: PersonalityInput): FreeSajuReport {
  const {
    dayStemKo,
    dayElement,
    dayStrength,
    dayStrengthReliable,
    geukguk,
    dominantElement,
    missingElements,
    wealthStarCount,
    wealthStarPillars,
    peerStarCount,
    outputStarCount,
    officerStarCount,
    resourceStarCount,
    hyungsin,
    gilsin,
    gwimunRelations,
    currentDaeun,
    daeunList,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    pillarStages,
    yongsin,
    fiveElements,
  } = facts;

  const core = deriveSajuWorkCore(facts);
  const baseSeed = hashStr(
    `${dayStemKo}${dayStrengthReliable ? dayStrength : "strength-unknown"}${facts.hasTimeInput ? geukguk : "geukguk-unknown"}${wealthStarCount}${peerStarCount}${outputStarCount}${officerStarCount}${resourceStarCount}${gwimunRelations.length}`,
  );
  const seedFor = (i: number) => hashStr(`${baseSeed}:${i}`);

  const wLevel = levelOf(wealthStarCount);
  const socialCompare: "officer" | "resource" | "tie" | "unobserved" =
    officerStarCount === 0 && resourceStarCount === 0 ? "unobserved"
      : officerStarCount === resourceStarCount ? "tie" : officerStarCount > resourceStarCount ? "officer" : "resource";
  const strengthEvidence = dayStrengthReliable
    ? `신강신약 ${dayStrengthShort(dayStrength)}`
    : "출생시간 미상으로 신강신약 확정하지 않음";
  // Use the same composite reading as the deeper report, before any palm input.
  const personal = buildPersonalReading(facts);
  const coherent = buildSajuReadingCoherence(facts);
  const snapshot: ReportParagraph = {
    text: personal.preview,
    evidence: `일간 ${dayStemKo}(${dayElement}), ${facts.hasTimeInput ? `격국 ${geukguk}` : "격국 미확정"}, ${strengthEvidence}, 비겁 ${peerStarCount}개, 식상 ${outputStarCount}개, 관성 ${officerStarCount}개, 인성 ${resourceStarCount}개, 재성 ${wealthStarCount}개. 전통적 성향 해석이며 실제 성격·관계·직업·자산 상태를 측정한 결과는 아닙니다.`,
  };

  // The free summary and later verdict use the premium report's natal question.
  const temperament = coherent.temperament;

  // 사람과 관계를 맺는 방식 — 상대의 마음을 예측하지 않고, 관계에서
  // 본인이 어떤 기준과 반응 방식을 쓰기 쉬운지만 설명한다.
  const relationshipStyle: ReportParagraph =
    socialCompare === "unobserved"
      ? {
          text: "약속을 중시하는지, 상대의 이유를 먼저 이해하려는지는 이 비교만으로 정하기 어렵습니다. 관계를 돌아볼 때는 실제 대화에서 편하게 느끼는 조건을 함께 살펴볼 수 있습니다. 의견이 다를 때, 내 생각을 말하기 전에 어떤 이야기를 듣고 싶은가요?",
          evidence: "관성 0개 · 인성 0개. 드러난 글자에 두 요소가 모두 없어, 이 비교는 관계 성향의 판단 근거로 사용하지 않았습니다.",
        }
      : socialCompare === "officer"
      ? {
          text:
            "사람과의 관계에서는 역할과 약속이 분명할수록 마음이 편한 편입니다. 애매한 태도나 말이 자주 바뀌는 상황에서는 신뢰가 빠르게 떨어질 수 있습니다. 대신 기준이 맞는 사람에게는 오래 책임지고 관계를 이어가는 힘이 있습니다.",
          evidence: `관성 ${officerStarCount}개 · 인성 ${resourceStarCount}개. 상대방의 성격·의도·행동을 예측한 것이 아니라 본인의 관계 기준을 전통적으로 해석한 결과입니다.`,
        }
      : socialCompare === "resource"
        ? {
            text:
              "사람을 볼 때 말의 내용만큼 분위기와 맥락을 함께 읽는 편입니다. 상대에게 맞춰주는 힘이 있지만, 관계를 오래 지키려다 내 불편을 늦게 알아차릴 수도 있습니다. 중요한 관계일수록 내가 받아들일 수 있는 선을 먼저 정해두는 편이 좋습니다.",
            evidence: `인성 ${resourceStarCount}개 · 관성 ${officerStarCount}개. 실제 대인관계 이력은 확인하지 않았습니다.`,
          }
        : {
            text:
              "관계에서는 내 기준과 상대의 입장을 둘 다 보려는 편입니다. 그래서 중간에서 조율하는 힘은 좋지만, 서로 원하는 것이 다를 때 결론을 오래 미룰 수 있습니다. 가까운 관계일수록 애매하게 넘기기보다 서로 기대하는 것을 말로 확인하는 편이 잘 맞습니다.",
            evidence: `관성 ${officerStarCount}개 · 인성 ${resourceStarCount}개의 균형`,
          };

  // 연애·결혼에서의 나 — 궁합이나 상대의 마음·결혼 결과를 예측하지 않는다.
  const loveStyle: ReportParagraph = {
    text:
      !dayStrengthReliable
        ? "연애에서는 상대의 마음을 내 사주만으로 대신 판단하지 않고, 내가 관계에서 중요하게 보는 기준과 표현 방식을 중심으로 봅니다. 출생시간이 없어 관계에서 밀고 나가는 힘과 맞춰가는 힘 중 어느 쪽이 더 강한지는 단정하지 않습니다. 실제 관계에서는 말과 약속이 일치하는지, 내 기준을 무리하게 양보하고 있지는 않은지를 함께 확인하는 편이 좋습니다."
        : dayStrength === "strong"
        ? "연애에서는 마음이 생겨도 쉽게 상대에게 끌려가기보다 내 기준을 유지하려는 편입니다. 관계가 깊어질수록 약속과 태도의 일관성을 중요하게 보고, 신뢰가 깨지면 마음을 다시 여는 데 시간이 걸릴 수 있습니다. 다만 내가 이미 결론을 내린 뒤에는 상대의 설명을 들을 여지가 줄어들 수 있어, 중요한 갈등일수록 결론보다 대화를 먼저 두는 편이 좋습니다."
        : dayStrength === "weak"
          ? "연애에서는 상대의 반응과 관계의 분위기를 세심하게 살피는 편입니다. 상대를 이해하고 맞춰주는 힘이 장점이지만, 관계를 지키려다 내 기준과 불편을 뒤로 미룰 수 있습니다. 좋아하는 마음과 실제로 관계가 건강하게 이어지는지는 따로 확인하는 것이 중요합니다."
          : "연애에서는 내 마음과 상대의 반응을 함께 보며 균형을 맞추려는 편입니다. 너무 빠르게 확신하지도, 쉽게 관계를 끊지도 않는 편이라 안정감이 있지만 애매한 상태가 길어질 수 있습니다. 관계가 중요한 만큼 서로의 말보다 실제 행동과 약속이 맞는지를 확인하는 편이 좋습니다.",
    evidence: `${strengthEvidence}, 관성 ${officerStarCount}개, 인성 ${resourceStarCount}개. 상대방의 마음·궁합·결혼 여부는 판단하지 않습니다.`,
  };

  // 생활 리듬·스트레스 패턴 — 질병·장기·치료 해석 금지.
  const lifeRhythm: ReportParagraph =
    outputStarCount > resourceStarCount
      ? {
          text:
            "생각이 생기면 밖으로 움직이고 결과를 만들어야 에너지가 풀리는 편입니다. 여러 일을 한꺼번에 벌이면 성취감은 크지만, 멈추는 시점을 놓쳐 피로가 뒤늦게 몰릴 수 있습니다. 일정 안에 쉬는 시간을 따로 넣고, 하루를 끝내는 기준을 정해두는 방식이 생활 리듬을 지키는 데 도움이 됩니다.",
          evidence: `식상 ${outputStarCount}개 · 인성 ${resourceStarCount}개. 생활 성향 해석이며 질병·건강상태 진단이 아닙니다.`,
        }
      : resourceStarCount > outputStarCount
        ? {
            text:
              "혼자 생각을 정리하고 충분히 이해한 뒤 움직일 때 안정감을 느끼는 편입니다. 일정이 복잡하거나 사람을 많이 상대하면 겉으로는 버텨도 안에서 피로가 오래 남을 수 있습니다. 조용히 쉬는 시간과 정보에서 떨어지는 시간을 의식적으로 만드는 편이 생활 리듬을 회복하는 데 잘 맞습니다.",
            evidence: `인성 ${resourceStarCount}개 · 식상 ${outputStarCount}개. 의료적 판단이 아니라 전통적 생활 성향 해석입니다.`,
          }
        : {
            text:
              "움직이는 시간과 혼자 정리하는 시간이 모두 필요한 편입니다. 어느 한쪽이 너무 길어지면 집중력이 떨어지거나 답답함이 커질 수 있어, 일과 휴식의 경계를 분명히 두는 것이 중요합니다. 몸의 불편이나 피로가 계속될 때는 사주와 별개로 실제 생활기록과 의료 확인을 우선해야 합니다.",
            evidence: `식상 ${outputStarCount}개 · 인성 ${resourceStarCount}개의 균형. 질병 예측에 사용하지 않습니다.`,
          };

  // ③ 재물운/돈복의 큰 구조
  const wealthStructure = compose(seedFor(3), {
    claim:
      wLevel === "없음"
        ? "재물 자체를 좇기보다, 잘하는 일과 전문성이 쌓이면서 현실적인 보상으로 이어지는 흐름에 가깝습니다. 한 번의 큰 기회보다 오래 가져갈 실력과 신뢰가 더 중요하게 작용합니다."
        : wLevel === "강함"
          ? "재물과 기회를 빠르게 인식하고 현실적으로 다루는 감각이 비교적 분명한 편입니다. 다만 알아보는 힘과 실제로 남기는 힘은 같은 것이 아니어서, 선택 이후의 관리가 중요합니다."
          : "재물과의 관계가 한쪽으로 과하게 치우치지는 않습니다. 그래서 무엇을 버느냐보다 어떤 기준으로 지키고 이어가느냐에서 차이가 커지는 편입니다.",
    scene:
      missingElements.length > 0
        ? `타고난 기운 중 ${이가(missingElements.join(", "))} 비어 있어, 그 성향이 필요한 순간에는 사람·환경·습관을 통해 보완할수록 균형이 좋아집니다.`
        : `오행 다섯 가지가 비교적 고르게 있어, 한 가지 방식만 고집하기보다 상황에 맞춰 대응하는 폭이 넓은 편입니다.`,
    evidence: `재성 ${wealthStarCount}개, 용신 ${yongsin.join(", ") || "특이 없음"}`,
  });

  // Shared work interpretation: roles and execution autonomy may coexist.
  const earningStyle = core.sections.earningStyle;

  // ⑤ 돈을 지키는 방식
  const keepingStyle: ReportParagraph =
    !dayStrengthReliable
      ? {
          text: "재물과 관련된 선택에서 얼마나 강하게 밀고 나가는지는 출생시간에 따라 달라질 수 있어 한쪽으로 단정하지 않습니다. 대신 현재 확인되는 재성·식상·관성·인성의 비중을 중심으로, 기회를 찾는 것과 지키는 기준이 어떻게 균형을 이루는지 넓게 봅니다. 실제 큰 선택에서는 사주보다 소득·지출·계약 조건을 우선 확인해야 합니다.",
          evidence: `출생시간 미상으로 신강신약 미확정, 재성 ${wealthStarCount}개·식상 ${outputStarCount}개·관성 ${officerStarCount}개·인성 ${resourceStarCount}개`,
        }
      : dayStrength === "strong"
      ? {
          text:
            `재물과 관련된 선택에서는 의외로 기준이 분명한 편입니다. 마음이 움직이는 제안을 만나도 처음 세운 원칙에 맞는지를 확인하려 하고, 한번 납득한 기준은 쉽게 바꾸지 않습니다. ` +
            `이 성향은 흔들림을 줄여주는 힘이 되지만, 확신이 강해질수록 새로운 정보보다 자신의 판단을 더 믿게 될 수 있습니다. 큰 선택일수록 반대 관점 하나를 일부러 확인하는 것이 균형을 잡아줍니다.`,
          evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)}), 격국 ${geukguk}`,
        }
      : dayStrength === "weak"
        ? {
            text: `재물과 관련된 선택에서는 혼자 모든 것을 결정하기보다 믿을 만한 사람의 조언이나 정리된 기준을 활용할 때 안정감이 생깁니다. 좋은 정보를 잘 받아들이는 장점이 있지만, 상대의 확신을 그대로 내 판단으로 받아들이면 흔들릴 수 있습니다. 결국 오래 유지되는 기준은 ‘왜 이 선택을 하는지’를 스스로 납득했을 때 만들어집니다.`,
            evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})`,
          }
        : {
            text: `재물과 관련된 선택에서는 한 가지 원칙만 고집하기보다 상황을 보며 기준을 조정하는 편입니다. 그래서 변화에는 강하지만, 기준이 자주 바뀌면 방향이 흐려질 수 있습니다. 바꿔도 되는 조건과 끝까지 지킬 조건을 나누어둘수록 이 유연함이 강점으로 작동합니다.`,
            evidence: `일간 ${dayStemKo}(중화)`,
          };

  // ⑥ 돈을 놓치는 반복 패턴
  const cautionSinsal = findNamedSinsal(pillarStages, "주의");
  const leakPattern = compose(seedFor(6), {
    claim: cautionSinsal
      ? `${이가(cautionSinsal.meaning)} 있어, 그 기세가 지나치게 튈 때 오히려 손해로 이어지는 패턴이 반복될 수 있습니다.`
      : hyungsin.length > 0
        ? "사주에 있는 특정 기운 탓에, 급하게 밀어붙이거나 감정이 앞선 순간에 손해로 이어지는 패턴이 반복되기 쉽습니다."
        : "뚜렷한 위험 신호는 없지만, 벌어들이는 힘과 실행하는 힘의 균형이 무너질 때가 돈이 새는 신호입니다.",
    scene:
      hyungsin.length > 0 || cautionSinsal
        ? "큰 결정 앞에서는 하루만 미루고 다시 보는 습관을 들이면 판단 근거를 다시 확인해 볼 수 있습니다."
        : "평소보다 결정을 빨리 내리고 있다면, 그것이 신호일 수 있습니다.",
    evidence: cautionSinsal
      ? `신살 ${cautionSinsal.name}`
      : hyungsin.length > 0
        ? `흉신 ${hyungsin.join(", ")}`
        : `재성 ${wealthStarCount}개·비겁 ${peerStarCount}개 균형`,
  });

  // ⑦ 큰돈/기회와 관계된 성향
  const bigMoneyAffinity = compose(seedFor(7), {
    claim:
      wealthOpportunityDaeunCount === null
        ? "출생시간이 없어 평생 대운에서 재물 신호가 몇 차례 들어오는지는 확정하지 않습니다. 지금은 확인된 글자의 돈과 일에 관한 의미로 큰 흐름을 봅니다."
        : wealthOpportunityDaeunCount === 0
          ? "재물 신호가 강하게 몰리는 시기보다, 본업과 전문성을 통해 꾸준히 현실적인 성과를 만드는 방식이 더 중요하게 읽힙니다. 크게 한 번 잡는 것보다 오래 쌓아가는 힘이 결과를 만듭니다."
          : wealthOpportunityDaeunCount <= 2
            ? "재물과 관련된 선택이 평소보다 중요해지는 시기가 몇 차례 들어오는 편입니다. 그때는 기회를 잡는 것보다, 내가 감당할 수 있는 조건인지 차분히 확인하는 힘이 더 중요합니다."
            : "재물과 기회가 크게 부각되는 시기가 여러 번 들어오는 편입니다. 다만 기회가 많다는 것이 곧 결과를 뜻하지는 않습니다. 준비된 기준과 실행력이 있을 때 그 흐름을 자기 것으로 만들 수 있습니다.",
    scene:
      peakStagePillars.length > 0 && wealthStarPillars.some((p) => peakStagePillars.includes(p))
        ? "특히 재물과 관련된 선택 앞에서는 반응이 빨라지고 추진력이 붙을 수 있습니다. 이때 속도만 앞서지 않고 조건을 끝까지 확인하는 것이 중요합니다."
        : "기회가 보이더라도 실제 결과는 정보, 실행력, 시장 상황 같은 현실 조건과 함께 결정됩니다.",
    evidence: `${wealthOpportunityDaeunCount === null ? "대운 중 재성 겹침 횟수 미확인" : `대운 중 재성 겹침 ${wealthOpportunityDaeunCount}회`}, 정점 12운성 자리 ${pillarNamesKo(peakStagePillars) || "없음"}`,
  });

  const { jobOrientation, teamStrength, soloStrength } = core.sections;

  // ⑪ 사람과 돈
  const peopleAndMoney: ReportParagraph =
    socialCompare === "unobserved"
      ? {
          text: "사람과 돈이 함께 걸린 선택에서 책임을 맡는 방식이나 도움을 구하는 태도는 이 비교만으로 정하지 않습니다. 함께하는 일을 떠올린다면 각자가 기대하는 역할과 조건을 대화로 확인하는 데 참고해볼 수 있습니다. 내가 맡고 싶은 부분과 먼저 의논하고 싶은 부분은 무엇인가요?",
          evidence: "관성 0개 · 인성 0개. 드러난 글자에 두 요소가 모두 없어, 이 비교는 책임을 맡거나 도움을 받는 태도의 판단 근거로 사용하지 않았습니다.",
        }
      : socialCompare === "officer"
      ? {
          text:
            `사람과 재물이 얽힌 일에서는 애매함을 오래 견디는 편이 아닙니다. 역할과 약속이 분명해야 마음이 놓이고, 누가 무엇을 맡는지가 선명할수록 신뢰가 생깁니다. ` +
            `다만 역할까지 정해진 뒤에는 세세하게 통제받기보다, 맡은 범위 안에서 자기 방식대로 풀어갈 여지가 있어야 가장 힘을 잘 냅니다.`,
          evidence: `관성(편관+정관) ${officerStarCount}개`,
        }
      : socialCompare === "resource"
        ? {
            text:
              `사람과 재물이 얽힌 일에서는 혼자 판단하기보다 경험 있는 사람의 설명이나 주변의 도움을 잘 활용하는 편입니다. ` +
              `좋은 조언을 빠르게 흡수하는 장점이 있지만, 상대의 확신에 끌려가면 자기 기준이 흐려질 수 있습니다. 결국 내 상황에 맞는 부분만 골라 쓸 때 판단력이 가장 살아납니다.`,
            evidence: `인성(편인+정인) ${resourceStarCount}개`,
          }
        : {
            text: `사람과 재물이 얽힌 일에서는 약속과 책임도 중요하게 보고, 상대에게 배우거나 도움받는 것도 자연스럽게 받아들이는 편입니다. 독단적으로 끌고 가기보다 역할을 분명히 나눈 뒤 서로 필요한 부분을 채워주는 관계에서 안정감이 큽니다.`,
            evidence: `관성 ${officerStarCount}개·인성 ${resourceStarCount}개의 균형`,
          };

  const decisionStyle = coherent.decisionStyle;

  // ⑬ 기회를 잡는 방식
  const luckySinsal = findNamedSinsal(pillarStages, "길");
  const opportunityStyle = compose(seedFor(13), {
    claim:
      peakStagePillars.length >= 2
        ? "기회가 보일 때 빠르게 반응하고 주도권을 잡는 힘이 여러 상황에서 드러나기 쉽습니다."
        : peakStagePillars.length === 1
          ? "특정 상황에서는 기회가 왔을 때 빠르게 반응하고 주도권을 잡는 힘이 또렷해집니다."
          : "기회를 한 번에 낚아채기보다 준비를 쌓아 실제 기회로 연결하는 쪽에 가깝습니다.",
    scene: luckySinsal
      ? `${이가(luckySinsal.meaning)} 기회를 여는 한 통로가 될 수 있습니다.`
      : gilsin.length > 0
        ? "결정적인 순간에는 사람이나 상황의 도움을 받아 다음 단계로 넘어가는 흐름이 나타날 수 있습니다."
        : "외부의 도움을 기다리기보다 스스로 준비해온 것이 기회와 만날 때 힘이 붙는 편입니다.",
    evidence: `정점(건록·제왕) 자리 ${pillarNamesKo(peakStagePillars) || "없음"}, 길신 ${gilsin.join(", ") || "없음"}${luckySinsal ? `, 신살 ${luckySinsal.name}` : ""}`,
  });

  const strengths = coherent.strengths;
  const cautions = coherent.cautions;

  // ⑯ 왜 이런 결과가 나왔나 — 전체 리포트용 "근거 요약" 보조 섹션. 여기는
  // 전문용어를 써도 된다(이 필드 자체가 펼쳐보는 근거 영역이라서).
  // 시간축 Truth Gate: "앞으로 1~3년" 같은 임의 구간을 말하지 않고, 실제
  // daeunList/currentDaeun에 있는 나이 구간만 그대로 인용한다.
  const daeunFlowNote =
    daeunList.length > 0
      ? `평생 대운은 총 ${daeunList.length}단계로 흘러가며, 지금은 그중 ${currentDaeun ? `${currentDaeun.ageRange}세부터 시작된 ${currentDaeun.ganzhi}` : "특정"} 구간입니다.`
      : "대운 정보는 이번 계산에서 확인되지 않았습니다.";

  const evidenceExplainer =
    `이 결과는 태어난 날의 하늘 기운(일간) ${dayStemKo}(${dayElement})이 ${dayStrengthShort(dayStrength)}이라는 점, 원국 여덟 글자에서 돈(재성)·경쟁(비겁)·활동(식상)·조직(관성)·정보(인성)를 뜻하는 글자가 몇 개씩 있는지, 격국(${geukguk})과 용신(${yongsin.join(", ") || "특이 없음"}), 그리고 12운성으로 그 힘이 어느 시기에 정점을 찍는지를 함께 보고 판단했습니다. ` +
    `${daeunFlowNote} ` +
    `오행 분포는 ${Object.entries(fiveElements).map(([k, v]) => `${k} ${v}개`).join(", ")}이며, 그중 ${이가(dominantElement)} 가장 강했습니다${missingElements.length > 0 ? `, 반대로 ${은는(missingElements.join(", "))} 아예 없었습니다` : ""}.`;

  // ⑰ MBTI+6문항이 있을 때만 채워지는 "현실 발현" 개인화 문단.
  const realWorldPersonalization = personality
    ? buildRealWorldPersonalization(facts, personality)
    : null;

  const nextMove = buildNextMove(facts, personality ?? null);
  const timingShift = buildTimingShift(facts);

  return {
    snapshot,
    temperament,
    relationshipStyle,
    loveStyle,
    lifeRhythm,
    wealthStructure,
    earningStyle,
    keepingStyle,
    leakPattern,
    bigMoneyAffinity,
    jobOrientation,
    teamStrength,
    soloStrength,
    peopleAndMoney,
    decisionStyle,
    opportunityStyle,
    strengths,
    cautions,
    evidenceExplainer,
    realWorldPersonalization,
    nextMove,
    timingShift,
  };
}
