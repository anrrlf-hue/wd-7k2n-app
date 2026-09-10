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
// 손금/자기보고 비교 로직 이전(이번 라운드): 이전에는 각 주제 문단
// (재물구조/의사결정/사람과 돈/기회) 안에 "감정선이 보이는 편이라..."처럼
// 손금·자기보고 신호를 조용히 섞어 넣었다 — 이번 요구사항은 "손금은 사주와
// 독립된 두 번째 분석이어야 한다"이므로, 그 비교는 여기서 빼고
// triple-compare.ts의 별도 통합 비교 섹션으로 옮겼다. 이 파일의 13개 주제
// 문단은 다시 순수 사주 근거로만 구성된다.

import type { SajuFacts, PillarFact } from "@/lib/saju-facts";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import { dayStrengthLabel, dayStrengthShort, elementTemperamentPhrase } from "@/lib/saju-labels";

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
  const variant = seed % 4;
  let text: string;
  switch (variant) {
    case 0:
      text = `${scene} ${claim}`;
      break;
    case 1:
      text = `${claim} 이를테면 ${scene} ${selfCheck(seed)}`;
      break;
    case 2:
      text = `${scene} ${selfCheck(seed + 1)} ${claim}`;
      break;
    default:
      text = `${claim} ${scene}`;
      break;
  }
  return { text: text.trim(), evidence };
}

const SELF_CHECK_POOL = [
  "문득 스스로도 이런 편이라고 느낀 적 있지 않나요?",
  "주변에서도 비슷한 얘기, 한 번쯤 들어봤을 거예요.",
  "최근에 있었던 일 하나를 떠올려보면 바로 확인될 거예요.",
  "실제로도 이렇게 움직이는 편인가요?",
  "이 모습, 스스로도 이미 알고 있었을 수 있어요.",
  "가까운 사람이라면 고개를 끄덕일 대목이에요.",
];
function selfCheck(seed: number): string {
  return SELF_CHECK_POOL[seed % SELF_CHECK_POOL.length];
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
const STAGE_ENERGY_PHRASE: Record<string, string> = {
  장생: "새로운 걸 막 시작할 때 힘이 붙는",
  목욕: "시행착오를 겪으며 다듬어가는",
  관대: "본격적으로 성장기에 들어선",
  건록: "가장 힘 있게 밀어붙이는",
  제왕: "정점에서 주도권을 쥐는",
  쇠: "속도를 늦추고 정리하는",
  병: "잠시 쉬어가며 회복하는",
  사: "멈춰서 방향을 다시 보는",
  묘: "안으로 쌓아두고 갈무리하는",
  절: "완전히 새로 시작하기 직전의",
  태: "씨앗처럼 가능성만 있는",
  양: "천천히 준비하며 키워가는",
};

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

export function buildFreeSajuReport(facts: SajuFacts): FreeSajuReport {
  const {
    dayStemKo,
    dayElement,
    dayStrength,
    geukguk,
    dominantElement,
    missingElements,
    wealthStarCount,
    wealthStarPillars,
    peerStarCount,
    outputStarCount,
    outputStarPillars,
    officerStarCount,
    officerStarPillars,
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

  const baseSeed = hashStr(
    `${dayStemKo}${dayStrength}${geukguk}${wealthStarCount}${peerStarCount}${outputStarCount}${officerStarCount}${resourceStarCount}${gwimunRelations.length}`,
  );
  const seedFor = (i: number) => hashStr(`${baseSeed}:${i}`);

  const wLevel = levelOf(wealthStarCount);
  const activeCompare: "output" | "peer" | "tie" =
    outputStarCount === peerStarCount ? "tie" : outputStarCount > peerStarCount ? "output" : "peer";
  const socialCompare: "officer" | "resource" | "tie" =
    officerStarCount === resourceStarCount ? "tie" : officerStarCount > resourceStarCount ? "officer" : "resource";

  // ① 한눈에 보는 나
  const snapshot: ReportParagraph = {
    text:
      `${dayStrengthLabel(dayStrength)}에 ${elementTemperamentPhrase(dayElement)} 사람이에요. ` +
      `재물 신호는 ${wLevel === "없음" ? "사주에 직접 드러나 있진 않고" : `${wLevel} 수준으로 보이고`}${wealthStarPillars.length > 0 ? `(${pillarNamesKo(wealthStarPillars)} 자리)` : ""}, ` +
      `${activeCompare === "output" ? "뭔가를 만들어내는 활동이 곧 돈이 되는" : activeCompare === "peer" ? "직접 부딪히고 경쟁하는 자리에서 돈이 붙는" : "타고난 균형 쪽 흐름이 더 크게 작동하는"} 구조예요.`,
    evidence: `일간 ${dayStemKo}(${dayElement}), 격국 ${geukguk}, 재성 ${wealthStarCount}개`,
  };

  // ② 타고난 성향
  const temperament = compose(seedFor(2), {
    claim: `${elementTemperamentPhrase(dayElement)}인데, ${dayStrength === "strong" ? "한번 정한 방향은 잘 안 바뀌는 편이에요" : dayStrength === "weak" ? "주변 분위기나 상황에 맞춰 스스로를 조정하는 편이에요" : "상황 따라 유연하게 태도를 바꾸는 편이에요"}.`,
    scene:
      dayStrength === "strong"
        ? "회의에서 방향이 흔들릴 때 오히려 중심을 잡는 쪽에 서게 되는 경우가 많아요."
        : dayStrength === "weak"
          ? "혼자 결정하기보다 분위기를 먼저 살피고 나서 움직이는 편이에요."
          : "어제와 오늘의 태도가 다를 수 있는데, 그게 오히려 자연스러운 유형이에요.",
    evidence: `일간 ${dayStemKo}(${dayElement}) · 신강신약 ${dayStrengthShort(dayStrength)}, 오행 최다 ${dominantElement}`,
  });
  // 일지(자기·내면 궁위) 12운성 — 겉으로 드러나는 태도와 별개로, 결정적인
  // 순간에 어떤 에너지 단계가 깔려 있는지를 한 겹 더 보여준다.
  const dayStage = pillarStages.find((s) => s.pillar === "day")?.geo;
  const dayStagePhrase = dayStage ? STAGE_ENERGY_PHRASE[dayStage] : null;
  if (dayStagePhrase) {
    temperament.text += ` 평소 태도와 별개로 본바탕에는 ${dayStagePhrase} 에너지가 깔려 있어서, 정작 중요한 순간엔 평소와 다른 얼굴이 나올 수 있어요.`;
    temperament.evidence += `, 일지 12운성 ${dayStage}`;
  }

  // ③ 재물운/돈복의 큰 구조
  const wealthStructure = compose(seedFor(3), {
    claim:
      wLevel === "없음"
        ? "재물이 저절로 굴러들어오는 구조는 아니고, 본업이나 전문성이 돈으로 바뀌는 흐름에 가까워요."
        : wLevel === "강함"
          ? "사주 자체에 재물을 다루는 축이 뚜렷하게 자리 잡고 있어요."
          : "재물이 완전히 낯설지도, 아주 익숙하지도 않은 균형점에 있어요.",
    scene:
      missingElements.length > 0
        ? `오행 중 ${이가(missingElements.join(", "))} 사주에 아예 없어서, 그 기운이 필요한 상황에서는 외부(사람·환경)에서 채워야 균형이 맞는 편이에요.`
        : `오행 다섯 가지가 어느 정도 골고루 있어서, 극단적으로 한쪽에 쏠리는 재물 패턴은 아니에요.`,
    evidence: `재성 ${wealthStarCount}개, 용신 ${yongsin.join(", ") || "특이 없음"}`,
  });

  // ④ 돈을 버는 방식
  const earningStyle: ReportParagraph =
    activeCompare === "output"
      ? {
          text:
            `아이디어를 내거나 뭔가를 만들어서 그게 돈으로 바뀌는 방식이 잘 맞는 사람이에요. ` +
            `특히 ${pillarNamesKo(outputStarPillars)} 자리에 그 힘이 있어서, ${outputStarPillars.includes("month") ? "실제 사회생활·업무에서" : outputStarPillars.includes("day") ? "본인 성향 자체에서" : "삶의 배경이 되는 부분에서"} 이 활동력이 두드러져요. ` +
            `벌여놓은 일을 하나 골라 마무리 짓는 주에 돈이 따라오는 편일 가능성이 커요.`,
          evidence: `식상(식신+상관) ${outputStarCount}개, 위치: ${pillarNamesKo(outputStarPillars) || "없음"}`,
        }
      : activeCompare === "peer"
        ? {
            text:
              `직접 경쟁하거나 스스로 실행해야 돈이 붙는 방식이에요. 남이 대신 해주는 일보다, 본인이 직접 판단하고 부딪히는 일에서 결과가 더 좋은 편이에요. ` +
              selfCheck(seedFor(4)),
            evidence: `비겁(비견+겁재) ${peerStarCount}개`,
          }
        : {
            text:
              `식상과 비겁이 뚜렷하게 우세하지 않아서, 벌어들이는 힘은 타고난 균형 쪽에서 더 크게 작동하는 편이에요. ` +
              `정해진 활동력보다는 상황과 타이밍에 맞춰 버는 방식이 유연하게 바뀌는 편일 수 있어요.`,
            evidence: `식상 ${outputStarCount}개·비겁 ${peerStarCount}개, 용신(${yongsin.join(", ") || "특이 없음"})`,
          };

  // ⑤ 돈을 지키는 방식
  const keepingStyle: ReportParagraph =
    dayStrength === "strong"
      ? {
          text:
            `자기 기준이 뚜렷해서 웬만해선 안 흔들려요. 다만 그 확신이 지나치면 주변 조언을 안 듣고 밀어붙이다 지키는 힘 자체를 스스로 깎아먹기도 해요. ` +
            `결정하기 전에 딱 한 번만 다른 사람 의견을 들어보는 걸 시도해보면 좋아요. 이미 마음을 정한 뒤에는 의견을 구해도 잘 안 듣게 되니, 결정하기 전이 핵심이에요.`,
          evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)}), 격국 ${geukguk}`,
        }
      : dayStrength === "weak"
        ? {
            text:
              `혼자 판단하기보다 믿을 만한 기준(사람이든 시스템이든)을 곁에 둘 때 돈이 더 잘 지켜져요. 자동이체·정기저축처럼 스스로 안 흔들려도 되는 장치를 만들어두는 게 실질적으로 도움이 돼요.`,
            evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})`,
          }
        : {
            text: `한쪽으로 치우치기보다 상황에 맞게 지키는 방식을 바꾸는 편이에요. 다만 기준이 유연한 만큼, 명확한 규칙 하나 정도는 고정해두는 게 흔들림을 줄여줘요.`,
            evidence: `일간 ${dayStemKo}(중화)`,
          };

  // ⑥ 돈을 놓치는 반복 패턴
  const cautionSinsal = findNamedSinsal(pillarStages, "주의");
  const leakPattern = compose(seedFor(6), {
    claim: cautionSinsal
      ? `${이가(cautionSinsal.meaning)} 있는 편이라, 그 기세가 지나치게 튈 때 오히려 손해로 이어지는 패턴이 반복될 수 있어요.`
      : hyungsin.length > 0
        ? "사주에 있는 특정 신호 탓에, 급하게 밀어붙이거나 감정이 앞선 순간에 손해로 이어지는 패턴이 반복될 수 있어요."
        : "뚜렷한 위험 신호는 없지만, 벌어들이는 힘과 실행하는 힘의 균형이 무너질 때가 돈이 새는 신호예요.",
    scene:
      hyungsin.length > 0 || cautionSinsal
        ? "큰 결정 앞에서는 하루만 미루고 다시 보는 습관을 들이면 이 패턴이 확실히 줄어들어요."
        : "평소보다 결정을 빨리 내리고 있다면, 그게 바로 신호일 수 있어요.",
    evidence: cautionSinsal
      ? `신살 ${cautionSinsal.name}`
      : hyungsin.length > 0
        ? `흉신 ${hyungsin.join(", ")}`
        : `재성 ${wealthStarCount}개·비겁 ${peerStarCount}개 균형`,
  });

  // ⑦ 큰돈/기회와 관계된 성향
  const bigMoneyAffinity = compose(seedFor(7), {
    claim:
      wealthOpportunityDaeunCount === 0
        ? "인생 전체 흐름 중 재물이 뚜렷하게 겹치는 구간은 없지만, 그렇다고 큰돈과 무관하다는 뜻은 아니에요. 다른 축(활동력·실행력)으로 돈을 만드는 유형이에요."
        : wealthOpportunityDaeunCount <= 2
          ? "평생 흐름 중 재물 기운이 함께 오는 구간이 있어요. 그 시기가 아니어도 꾸준히 관리하는 게 기본기가 돼요."
          : "평생 흐름 중 재물 기운이 함께 오는 구간이 여러 번 있어서, 인생 전체로 보면 기회 자체는 여러 번 찾아오는 유형이에요.",
    scene:
      peakStagePillars.length > 0 && wealthStarPillars.some((p) => peakStagePillars.includes(p))
        ? "특히 재물이 놓인 자리가 기운이 정점에 달하는 자리와 겹쳐서, 기회가 왔을 때 힘 있게 받아낼 수 있는 조건이에요."
        : "다만 기회가 왔을 때 그걸 잡을 준비(정보력, 실행력)가 함께 있어야 실제로 이어져요.",
    evidence: `대운 중 재성 겹침 ${wealthOpportunityDaeunCount}회, 정점 12운성 자리 ${pillarNamesKo(peakStagePillars) || "없음"}`,
  });

  // ⑧ 직장형/사업형 성향
  const jobOrientation: ReportParagraph =
    wealthStarCount + outputStarCount > peerStarCount + officerStarCount
      ? {
          text:
            `정해진 틀보다 성과가 직접 보이는 구조(사업/프리랜서/성과 기반)에서 진짜 힘을 발휘하는 편이에요. 매인 조직 안에 있더라도, 스스로 결과를 만들어내는 역할을 맡을 때 만족도가 훨씬 높아져요. ` +
            `지시받은 일보다 스스로 기획한 일이 더 잘 풀린다고 느낀 적 많지 않나요?`,
          evidence: `재성+식상 ${wealthStarCount + outputStarCount}개 vs 비겁+관성 ${peerStarCount + officerStarCount}개`,
        }
      : {
          text:
            `안정적인 체계 안에서 신뢰를 쌓아가는 방식에서 재물이 더 안정적으로 늘어나는 편이에요. 완전히 혼자 판을 짜기보다, 명확한 규칙과 역할이 있는 환경에서 오히려 더 크게 성장해요. ` +
            `자유롭게 알아서 하라고 하면 오히려 막막할 때가 있지 않나요?`,
          evidence: `비겁+관성 ${peerStarCount + officerStarCount}개 vs 재성+식상 ${wealthStarCount + outputStarCount}개`,
        };

  // ⑨ 조직에서 강한 부분
  const teamStrength = compose(seedFor(9), {
    claim:
      officerStarCount === 0
        ? "조직·규율을 뜻하는 기운이 사주에 없어서, 조직 안에서도 정해진 규칙보다 스스로 만든 기준으로 움직일 때 더 강해요."
        : "조직 안에서 역할과 책임이 분명할 때 오히려 힘이 붙는 편이에요.",
    scene:
      officerStarPillars.includes("month")
        ? "특히 실제 업무 환경에 그 힘이 있어서, 회사·조직 생활에서 이 성향이 더 뚜렷하게 드러나요."
        : officerStarCount > 0
          ? "책임을 맡았을 때 회피하지 않고 끝까지 챙기는 쪽에 가까워요."
          : "규칙이 너무 촘촘한 곳보다는, 결과로 평가받는 구조가 더 잘 맞아요.",
    evidence: `관성(편관+정관) ${officerStarCount}개, 위치 ${pillarNamesKo(officerStarPillars) || "없음"}`,
  });

  // ⑩ 독립적으로 움직일 때 강한 부분
  const soloStrength = compose(seedFor(10), {
    claim:
      peerStarCount + outputStarCount >= 3
        ? "실행력과 활동력이 함께 강해서, 혼자 판단하고 혼자 실행하는 상황에서 오히려 능력치가 올라가는 유형이에요."
        : "혼자 움직일 때 아주 도드라지는 유형은 아니지만, 필요할 때는 스스로 책임지고 마무리하는 힘이 있어요.",
    scene:
      peerStarCount + outputStarCount >= 3
        ? "누가 시키지 않아도 스스로 일을 벌이고, 끝까지 밀어붙이는 모습을 자주 보였을 거예요."
        : "여럿이 헤매는 상황에서 조용히 자기 몫부터 정리하는 쪽에 가까워요.",
    evidence: `비겁 ${peerStarCount}개 + 식상 ${outputStarCount}개`,
  });

  // ⑪ 사람과 돈
  const peopleAndMoney: ReportParagraph =
    socialCompare === "officer"
      ? {
          text:
            `조직이나 규칙, 정해진 관계 안에서 돈이 도는 걸 편하게 느끼는 편이에요. 이런 구조가 있는 자리에서 돈 관련 결정도 더 안정적으로 내려요. ` +
            `믿을 만한 시스템이나 계약이 있어야 마음이 놓이지 않나요?`,
          evidence: `관성(편관+정관) ${officerStarCount}개`,
        }
      : socialCompare === "resource"
        ? {
            text:
              `정보나 조언을 얻은 뒤에 돈 관련 결정을 내리는 편이에요. 믿을 만한 사람의 말 한마디가 실제 선택에 큰 영향을 줘요. ` +
              `중요한 결정 전에 꼭 누군가에게 물어보고 나서 움직이지 않나요?`,
            evidence: `인성(편인+정인) ${resourceStarCount}개`,
          }
        : {
            text: `사람에게 크게 기대지도, 완전히 혼자 판단하지도 않는 균형 잡힌 편이에요. 상황에 따라 조언을 참고하되 최종 결정은 스스로 내리는 쪽에 가까워요.`,
            evidence: `관성 ${officerStarCount}개·인성 ${resourceStarCount}개의 균형`,
          };

  // ⑫ 의사결정 스타일
  const decisionStyle: ReportParagraph =
    dayStrength === "strong"
      ? {
          text: `직관적으로 빠르게 결정하고 밀어붙이는 편이에요. 속도는 강점이지만, 중요한 결정일수록 하루 정도 시간을 두고 다시 보면 실수가 확 줄어요.`,
          evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})`,
        }
      : {
          text: `신중하게 정보를 모으고 나서 결정하는 편이에요. 다만 너무 오래 재다가 타이밍을 놓치는 경우도 있어서, 결정 기한을 스스로 정해두는 게 도움이 돼요.`,
          evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})`,
        };

  // ⑬ 기회를 잡는 방식
  const luckySinsal = findNamedSinsal(pillarStages, "길");
  const opportunityStyle = compose(seedFor(13), {
    claim:
      peakStagePillars.length >= 2
        ? "힘이 정점에 오른 자리가 여러 곳이라, 기회를 감지하는 순간 몸이 먼저 반응하는 편이에요."
        : peakStagePillars.length === 1
          ? "정점의 기운이 한 자리에 뚜렷해서, 특정 영역에서만큼은 기회를 놓치지 않는 유형이에요."
          : "정점 기운이 뚜렷하지 않아서, 순발력보다는 꾸준함으로 기회를 만드는 편에 가까워요.",
    scene: luckySinsal
      ? `사주에 ${이가(luckySinsal.meaning)} 있어서, 그게 기회를 여는 실제 통로가 될 수 있어요.`
      : gilsin.length > 0
        ? "사주에 길한 신호도 있어서, 결정적 순간에 예상치 못한 도움을 받을 때가 있어요."
        : "화려한 귀인의 도움보다는, 스스로 준비해온 것이 기회와 만나는 쪽에 가까워요.",
    evidence: `정점(건록·제왕) 자리 ${pillarNamesKo(peakStagePillars) || "없음"}, 길신 ${gilsin.join(", ") || "없음"}${luckySinsal ? `, 신살 ${luckySinsal.name}` : ""}`,
  });

  // ⑭ 강점 3개 — 실제 신호가 있는 항목만 후보로 넣는다. 이전에는 서로 다른
  // 단위(재성 개수 vs 길신 개수×2 같은 임의 가중치)를 억지로 비교해 Top3를
  // 뽑았다 — 카테고리마다 단위가 달라 비교 자체가 의미 없는 산술이었다.
  // 지금은 "이 항목의 근거가 실제로 있는가(present)"만 보고, 있는 항목을
  // 고정 우선순위로 나열한다 — 서로 다른 카테고리의 크기를 비교하지 않는다.
  // 실제 신호가 3개 미만이면(드문 경우) 근거가 약한 사람에게도 거짓으로
  // 확신 있는 강점을 지어내지 않고, 목록 끝에 둔 정직한 대체 문항으로 채운다.
  const strengthPool: { title: string; detail: string; evidence: string; present: boolean }[] = [
    {
      title: "재물을 알아보는 감각",
      detail: "돈이 될 만한 걸 남들보다 먼저 알아채는 감각이 있어요.",
      evidence: `재성 ${wealthStarCount}개(${facts.wealthStarTypes.join(", ") || "없음"})`,
      present: wealthStarCount > 0,
    },
    {
      title: "직접 밀어붙이는 추진력",
      detail: "남에게 미루지 않고 직접 부딪혀서 해결하는 실행력이 강점이에요.",
      evidence: `비겁 ${peerStarCount}개`,
      present: peerStarCount > 0,
    },
    {
      title: "만들어내고 표현하는 힘",
      detail: "아이디어를 실제 결과물로 바꾸는 표현력·실행력이 있어요.",
      evidence: `식상 ${outputStarCount}개`,
      present: outputStarCount > 0,
    },
    {
      title: "귀인의 도움을 받는 힘",
      detail: "결정적인 순간에 사람이나 상황의 도움을 받는 경우가 많아요.",
      evidence: `길신 ${gilsin.join(", ") || "없음"}`,
      present: gilsin.length > 0,
    },
    {
      title: "안정적으로 신뢰를 쌓는 힘",
      detail: "정해진 틀 안에서 꾸준히 신뢰를 쌓아 결과를 만들어내는 힘이 있어요.",
      evidence: `관성 ${officerStarCount}개`,
      present: officerStarCount > 0,
    },
    {
      title: "기회를 놓치지 않는 순발력",
      detail: "기회가 왔을 때 반응 속도가 빠른 편이에요.",
      evidence: `정점 자리 ${peakStagePillars.length}곳`,
      present: peakStagePillars.length > 0,
    },
    {
      title: "상황에 맞춰 균형을 잡는 힘",
      detail: "하나로 확 튀는 강점보다, 상황에 따라 필요한 쪽으로 무게중심을 옮기는 유연함이 있어요.",
      evidence: "특정 십성으로 뚜렷하게 쏠리지 않은 균형 구조",
      present: true,
    },
  ];
  const strengths = strengthPool
    .filter((c) => c.present)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑮ 조심할 점 3개 — 강점과 같은 원칙. "확실히 조심해야 할 이유가 있는지
  // (present)"만 보고 고정 우선순위로 나열, 임의 가중치로 비교하지 않는다.
  const cautionPool: { title: string; detail: string; evidence: string; present: boolean }[] = [
    {
      title: "감정이 앞서는 순간",
      detail: "특정 신호가 있을 때는 감정적으로 판단해 손해로 이어지기 쉬워요. 결정 전에 한 박자 늦추는 게 도움이 돼요.",
      evidence: `흉신 ${hyungsin.join(", ")}`,
      present: hyungsin.length > 0,
    },
    {
      title: "지나친 확신",
      detail: "스스로 옳다고 믿으면 주변 말이 잘 안 들어와요. 큰 결정일수록 의도적으로 반대 의견을 들어보세요.",
      evidence: `일간 ${dayStrengthShort(dayStrength)}`,
      present: dayStrength === "strong",
    },
    {
      title: "혼자 판단하다 정보 부족",
      detail: "확신 없이 결정했다가 나중에 정보 부족을 느끼는 경우가 있어요. 미리 정보원을 만들어두면 좋아요.",
      evidence: `일간 ${dayStrengthShort(dayStrength)}`,
      present: dayStrength === "weak",
    },
    {
      title: "불편한 조합이 만드는 스트레스",
      detail: "생각이 복잡해지고 예민해지는 시기에 돈 관련 결정을 미루는 게 나아요.",
      evidence: gwimunRelations.join(", "),
      present: gwimunRelations.length > 0,
    },
    {
      title: "벌여놓고 마무리를 못 짓는 패턴",
      detail: "새로 벌이는 힘은 있지만, 벌인 만큼 마무리가 따라가지 않으면 힘이 분산돼요.",
      evidence: `식상 ${outputStarCount}개`,
      present: outputStarCount >= 2,
    },
    {
      title: "없는 오행이 만드는 공백",
      detail: `타고난 기운 중 ${이가(missingElements.join(", "))} 없어서, 그 기운이 필요한 상황(예: 결단·유연성)에서 유독 힘들어질 수 있어요.`,
      evidence: `없는 오행 ${missingElements.join(", ")}`,
      present: missingElements.length > 0,
    },
    {
      title: "균형이 오히려 우유부단함으로 보일 수 있음",
      detail: "한쪽으로 뚜렷하게 쏠리지 않는 만큼, 결정을 미루는 사람으로 비칠 때가 있어요. 기준 하나만 미리 정해두면 도움이 돼요.",
      evidence: "특정 십성으로 뚜렷하게 쏠리지 않은 균형 구조",
      present: true,
    },
  ];
  const cautions = cautionPool
    .filter((c) => c.present)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑯ 왜 이런 결과가 나왔나 — 전체 리포트용 "근거 요약" 보조 섹션. 여기는
  // 전문용어를 써도 된다(이 필드 자체가 펼쳐보는 근거 영역이라서).
  // 시간축 Truth Gate: "앞으로 1~3년" 같은 임의 구간을 말하지 않고, 실제
  // daeunList/currentDaeun에 있는 나이 구간만 그대로 인용한다.
  const daeunFlowNote =
    daeunList.length > 0
      ? `이번 생애 대운은 총 ${daeunList.length}단계로 흘러가고, 지금은 그중 ${currentDaeun ? `${currentDaeun.ageRange}세 ${currentDaeun.ganzhi}` : "특정 시점"} 구간이에요.`
      : "대운 정보는 이번 계산에서 확인되지 않았어요.";

  const evidenceExplainer =
    `이 결과는 태어난 날의 하늘 기운(일간) ${dayStemKo}(${dayElement})이 ${dayStrengthShort(dayStrength)}이라는 점, 원국 여덟 글자에서 돈(재성)·경쟁(비겁)·활동(식상)·조직(관성)·정보(인성)를 뜻하는 글자가 몇 개씩 있는지, 격국(${geukguk})과 용신(${yongsin.join(", ") || "특이 없음"}), 그리고 12운성으로 그 힘이 어느 시기에 정점을 찍는지를 함께 봐서 나왔어요. ` +
    `${daeunFlowNote} ` +
    `오행 분포는 ${Object.entries(fiveElements).map(([k, v]) => `${k} ${v}개`).join(", ")}였고, 그중 ${이가(dominantElement)} 가장 강했어요${missingElements.length > 0 ? `, 반대로 ${은는(missingElements.join(", "))} 아예 없었고요` : ""}.`;

  return {
    snapshot,
    temperament,
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
  };
}
