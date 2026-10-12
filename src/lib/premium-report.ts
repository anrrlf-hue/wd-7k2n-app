import type { FreeSajuReport } from "@/lib/free-report-schema";
import type { PalmFacts } from "@/lib/palm-facts";
import { buildPalmBilateralReading, type DominantHand, type PalmBilateralReading } from "@/lib/palm-bilateral";
import type { SajuFacts, TenGodGroup } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";
import { SAJU_FOCUS_LABELS, type SajuFocus, type SajuDetailFocus } from "@/lib/saju-focus";
import { buildSajuAnnualOutlook, type SajuAnnualOutlook } from "@/lib/saju-timing";

export interface PremiumBalanceItem {
  title: string;
  whatItMeans: string;
  howToFill: string;
  goodResult: string;
}

export interface PremiumDomainSection {
  key: SajuDetailFocus;
  label: string;
  headline: string;
  paragraphs: string[];
  experiment: string;
  checkpoint: string;
  timing: string;
}

export interface PremiumReport {
  title: string;
  summary: string;
  focus: SajuFocus;
  corePatterns: string[];
  balance: PremiumBalanceItem[];
  domains: PremiumDomainSection[];
  annual: SajuAnnualOutlook;
  actionPlan: Array<{ title: string; text: string }>;
  palm: PalmBilateralReading | null;
  note: string;
}

const GROUPS: Array<{ key: TenGodGroup; count: keyof Pick<SajuFacts,
  "peerStarCount" | "outputStarCount" | "wealthStarCount" | "officerStarCount" | "resourceStarCount">;
  meaning: string; risk: string; practice: string }> = [
  { key: "비겁", count: "peerStarCount", meaning: "직접 정하고 실행하기", risk: "상대의 동의를 확인하기 전에 속도를 올리는 장면", practice: "함께 결정할 일 하나를 골라 내 의견을 말하기 전에 상대의 기준을 먼저 적어보세요." },
  { key: "식상", count: "outputStarCount", meaning: "만들어 보여주기", risk: "새 일을 시작하느라 이미 약속한 마무리가 밀리는 장면", practice: "이번 주에는 새 과제를 더하기 전에 진행 중인 결과물 하나를 끝내고 반응을 기록하세요." },
  { key: "재성", count: "wealthStarCount", meaning: "자원과 결과를 연결하기", risk: "눈앞의 성과를 위해 쓸 수 있는 시간보다 많은 약속을 잡는 장면", practice: "제안을 받을 때 필요한 시간과 지출을 한 줄씩 적고, 이번 주에 감당할 범위부터 정하세요." },
  { key: "관성", count: "officerStarCount", meaning: "역할과 약속을 지키기", risk: "내 책임이 아닌 일까지 떠안아 자신의 일정이 사라지는 장면", practice: "이번 주 맡은 일마다 담당자와 종료 조건을 적고, 불분명한 일 한 건은 범위를 다시 확인하세요." },
  { key: "인성", count: "resourceStarCount", meaning: "정보를 모으고 검토하기", risk: "확인을 반복하다 작은 시도까지 미루는 장면", practice: "자료를 찾는 시간을 30분으로 정하고, 남은 의문 하나를 실제 경험으로 확인해보세요." },
];

const ELEMENT_PRACTICE: Record<string, { meaning: string; action: string; check: string }> = {
  목: { meaning: "새로운 시도를 작은 단위로 시작하는 습관", action: "2주 동안 처음 해볼 일 하나를 골라 주 2회 20분씩 달력에 넣으세요.", check: "성공 여부보다 실제로 시작한 횟수와 다음에 바꿀 조건 한 가지를 남기세요." },
  화: { meaning: "생각을 밖으로 표현하는 습관", action: "2주 동안 주 1회, 완성한 것 하나를 신뢰하는 사람에게 보여주고 구체적인 반응을 한 문장 받아보세요.", check: "내가 예상한 반응과 실제 반응이 달랐던 점을 비교하세요." },
  토: { meaning: "반복되는 일을 마무리하는 습관", action: "2주 동안 하루가 끝날 때 5분을 정해 미완료 일 하나와 내일 끝낼 시각을 적으세요.", check: "미뤄둔 일의 개수가 줄었는지, 계획이 지나치게 빡빡했는지 확인하세요." },
  금: { meaning: "선택과 거절의 기준을 말로 정하는 습관", action: "새 부탁을 받기 전에 가능한 시간·역할·마감 세 가지를 적고, 이번 주 한 번은 그 범위를 전달하세요.", check: "범위를 말한 뒤 불필요한 재작업이나 약속 변경이 줄었는지 보세요." },
  수: { meaning: "정보를 정리하고 잠깐 멈추는 습관", action: "2주 동안 중요한 결정 두 건의 이유를 남기고 다음 날 다시 읽어보세요. 급하지 않다면 그때 확정하세요.", check: "하루 뒤 바뀐 판단과 그대로 유지된 판단을 나눠 적으세요." },
};

function profile(facts: SajuFacts) {
  const ranked = GROUPS.map((group) => ({ ...group, value: facts[group.count] }))
    .sort((a, b) => b.value - a.value);
  const first = ranked[0];
  const second = ranked[1];
  const places = facts.pillars.filter((pillar) =>
    TEN_GOD_GROUP[pillar.stemTenGod] === first.key || TEN_GOD_GROUP[pillar.branchTenGod] === first.key)
    .map((pillar) => ({ year: "가족·기반", month: "사회·업무", day: "가까운 관계", hour: "실행·마무리" })[pillar.pillar]);
  return { first, second, basis: `${first.key} ${first.value}개·${second.key} ${second.value}개`, places: [...new Set(places)].join(", ") };
}

function balanceItems(facts: SajuFacts): PremiumBalanceItem[] {
  const { first } = profile(facts);
  const items = facts.missingElements.slice(0, 2).flatMap((element) => {
    const guide = ELEMENT_PRACTICE[element];
    if (!guide) return [];
    return [{
      title: `${element}을 생활 습관으로 번역하면`,
      whatItMeans: `${facts.hasTimeInput ? "입력된 네 기둥" : "시간을 제외한 세 기둥"}에서 ${element}이 0개로 집계됩니다. 전통적으로 ${guide.meaning}을 돌아보는 상징으로 읽을 수 있습니다. 실제 능력의 결핍을 뜻하지는 않습니다.`,
      howToFill: guide.action,
      goodResult: guide.check,
    }];
  });
  items.push({
    title: `${first.meaning}에 멈춤 기준 더하기`,
    whatItMeans: `${first.key} ${first.value}개라는 구조에서 ${first.risk}을 점검 대상으로 삼았습니다. 경험에 맞는지 먼저 확인하세요.`,
    howToFill: first.practice,
    goodResult: "2주 뒤 비슷한 상황을 두 건 비교하세요. 부담이 줄었다면 유지하고, 달라진 점이 없으면 이 해석 대신 실제 상황에 맞는 규칙을 새로 정하세요.",
  });
  return items;
}

function domainSection(key: SajuDetailFocus, facts: SajuFacts, annual: SajuAnnualOutlook): PremiumDomainSection {
  const { first, second, basis } = profile(facts);
  const outspoken = facts.outputStarCount + facts.peerStarCount >= facts.resourceStarCount + facts.officerStarCount;
  const outputFirst = facts.outputStarCount >= facts.officerStarCount;
  const moneyFirst = facts.wealthStarCount >= facts.resourceStarCount;
  const active = facts.outputStarCount + facts.officerStarCount >= facts.resourceStarCount;
  const templates = {
    love_relationship: {
      headline: outspoken ? "내 표현 뒤에 상대의 기준을 놓아보기" : "혼자 정리한 마음을 작은 요청으로 바꾸기",
      scene: outspoken ? "대화를 빨리 정리하고 싶을 때, 상대가 원하는 것이 조언인지 공감인지부터 확인해보세요." : "생각은 정리됐는데 상대가 알아주기를 기다린 장면이 있다면, 바라는 행동 하나를 말로 전해보세요.",
      evidence: `표현·주도 신호 ${facts.outputStarCount + facts.peerStarCount}개와 검토·역할 신호 ${facts.resourceStarCount + facts.officerStarCount}개를 비교했습니다. 관계 상태나 상대의 마음은 이 계산으로 알 수 없습니다.`,
      experiment: outspoken ? "2주 동안 중요한 대화 두 번에서 ‘지금 들어주면 될까, 같이 방법을 찾을까’를 먼저 확인하고, 합의한 다음 행동만 적으세요." : "2주 동안 한 번에 요청 하나만 전해보세요. ‘이번 주에 20분 같이 이야기하고 싶어’처럼 상대가 답할 수 있게 시간과 행동을 붙이세요.",
      checkpoint: "대화 후 서로 기억하는 약속이 같은지 확인하세요. 횟수를 늘려도 불편함이 커지면 상대의 거절과 거리 두기를 존중하세요.",
    },
    work: {
      headline: outputFirst ? "결과물 하나로 역할의 범위를 확인하기" : "책임의 경계를 정하고 작은 개선을 시험하기",
      scene: outputFirst ? "아이디어를 더 모으기 전에 현재 하는 일에서 보여줄 수 있는 결과 하나를 골라보세요." : "새 역할을 맡기 전에 누가 결정하고 무엇을 끝내야 하는지 확인하는 과정을 넣어보세요.",
      evidence: `만들어내는 활동(식상 ${facts.outputStarCount}개)과 역할·규율(관성 ${facts.officerStarCount}개)의 비중을 읽었습니다. 직업 적합성이나 이직 성패를 판정하는 검사는 아닙니다.`,
      experiment: outputFirst ? "2주 안에 보여줄 작은 시안 하나를 만들고 실제로 쓰는 사람 한 명에게 수정할 점 두 가지를 받아보세요. 시작 전 소요시간 상한을 정하세요." : "진행 중인 업무 한 건의 담당·마감·완료 기준을 한 장으로 정리하고 관계자와 확인하세요. 일주일 뒤 수정 요청이 어디서 나왔는지 기록하세요.",
      checkpoint: "투입 시간과 재작업 횟수를 비교하세요. 계약·수입·업무 조건이 확인되지 않았다면 이 실험만으로 이직이나 사업 확대를 결정하지 마세요.",
    },
    money: {
      headline: moneyFirst ? "눈에 보이는 결과와 실제 남는 자원 구분하기" : "검토한 내용을 작은 기록 습관으로 옮기기",
      scene: moneyFirst ? "성과가 커 보였던 선택 하나를 돌아보며 그 뒤에 들어간 시간과 지출까지 함께 적어보세요." : "정보를 모으는 동안 정작 내 지출과 약속이 어떻게 바뀌었는지 놓친 적이 있는지 살펴보세요.",
      evidence: `자원·결과(재성 ${facts.wealthStarCount}개)와 검토·정보(인성 ${facts.resourceStarCount}개)를 비교한 해석입니다. 자산이나 부채, 투자 성향을 측정한 값은 아닙니다.`,
      experiment: moneyFirst ? "2주 동안 선택한 지출 세 건의 예상 비용과 실제 비용을 나란히 적고 차이가 난 이유를 한 줄씩 남기세요." : "2주 동안 주 1회 15분씩 최근 거래 내역을 확인하고 기억과 달랐던 항목 세 개에 표시하세요. 새 금융상품을 고르는 과제로 바꾸지 마세요.",
      checkpoint: "예상과 기록의 차이가 줄었는지 확인하세요. 월별 해석은 투자·대출·매매 시점이나 수익을 알려주지 않습니다.",
    },
    wellbeing: {
      headline: active ? "바쁜 날에도 남길 여백 정하기" : "생각을 멈추고 생활 리듬 확인하기",
      scene: active ? "약속과 할 일이 몰렸던 날, 쉬는 시간을 먼저 지웠는지 돌아보세요." : "충분히 쉬었다고 생각한 날에도 머릿속 일이 계속 이어졌는지 기록해보세요.",
      evidence: `활동·책임 신호 ${facts.outputStarCount + facts.officerStarCount}개와 검토·정리 신호 ${facts.resourceStarCount}개를 생활 습관의 질문으로 바꿨습니다. 건강 상태나 질병을 추론하지 않습니다.`,
      experiment: active ? "2주 동안 일정 사이에 비워둘 10분을 한 칸 정하고 실제로 지킨 날만 표시하세요. 못 지킨 날에는 밀려온 일정 하나를 적으세요." : "2주 동안 하루 끝에 5분만 써서 머릿속에 남은 일과 내일로 넘길 일을 나눠 적으세요. 기록 뒤 새 할 일을 더하지 않아도 됩니다.",
      checkpoint: "전후 일주일의 주관적인 부담을 비교하세요. 차이가 없으면 시간을 바꿔보세요. 몸의 증상은 이 리포트로 판단하지 마세요.",
    },
  };
  const template = templates[key];
  const experiments = annual.months.filter((month) => month.comparisons.find((item) => item.domain === key)?.emphasis === "실험");
  const checks = annual.months.filter((month) => month.comparisons.find((item) => item.domain === key)?.emphasis === "점검");
  const labels = (months: typeof annual.months) => months.slice(0, 2).map((month) => month.label).join(", ");
  return {
    key, label: SAJU_FOCUS_LABELS[key], headline: template.headline,
    paragraphs: [template.scene, template.evidence,
      `내 구조와 연결하면: ${first.meaning}과 ${second.meaning}을 함께 시험해볼 수 있습니다(${basis}). 먼저 작은 행동을 해본 뒤 실제 반응이 해석과 맞는지 확인하세요.`],
    experiment: template.experiment,
    checkpoint: template.checkpoint,
    timing: experiments.length && checks.length
      ? `${labels(experiments)}에는 아래 실험을 작게 해보고, ${labels(checks)}에는 남긴 기록을 점검하는 일정으로 활용해보세요. ‘점검’인 달에 나쁜 일이 생긴다는 뜻은 아닙니다.`
      : "12개월의 차이가 뚜렷하지 않아 특정 달을 따로 권하지 않습니다. 지금 가능한 2주를 골라 실험하고 실제 결과를 비교하세요.",
  };
}

export function buildPremiumReport(input: {
  facts: SajuFacts;
  // Kept for callers; premium copy deliberately does not consume free paragraphs.
  freeReport: FreeSajuReport;
  focus?: SajuFocus;
  referenceDate?: Date;
  leftPalm?: PalmFacts | null;
  rightPalm?: PalmFacts | null;
  dominantHand?: DominantHand | null;
}): PremiumReport {
  const { facts, focus = "overall" } = input;
  const annual = buildSajuAnnualOutlook(facts, input.referenceDate);
  const { first, second, basis, places } = profile(facts);
  const domains = (["love_relationship", "work", "money", "wellbeing"] as const)
    .map((key) => domainSection(key, facts, annual));
  if (focus !== "overall") domains.sort((a, b) => Number(b.key === focus) - Number(a.key === focus));
  const priority = domains[0];
  const palm = input.leftPalm && input.rightPalm && input.dominantHand
    ? buildPalmBilateralReading(input.leftPalm, input.rightPalm, input.dominantHand) : null;
  return {
    title: "프리미엄 1년 리포트", focus,
    summary: `${annual.startLabel}부터 ${annual.endLabel}까지, ${focus === "overall" ? "네 분야를 함께 비교하며" : `${SAJU_FOCUS_LABELS[focus]}을 먼저 살펴보며`} 행동과 점검 일정을 정리합니다. ${first.meaning}과 ${second.meaning}의 조합(${basis})을 출발점으로 삼되, 자신의 경험과 맞는 부분만 선택하세요.`,
    corePatterns: [
      `${first.meaning}을 먼저 쓰는 상황을 찾아보세요. ${basis}가 나란히 나타나므로 ‘${first.meaning} → ${second.meaning}’ 두 단계를 이번 주의 결정 한 건에 적용해 비교해볼 수 있습니다. 개수는 능력 점수가 아닙니다.`,
      `${places || "입력된 원국"} 자리에 ${first.key}이 보입니다. 이 영역에서 ${first.risk}이 있었는지 최근 사례 한 건을 적어보세요. 해당 경험이 없다면 이 가설은 내려놓아도 됩니다.`,
      facts.dayStrengthReliable
        ? `${facts.dayStrength === "weak" ? "한꺼번에 벌이는 일의 수를 줄이는" : facts.dayStrength === "strong" ? "혼자 정하기 전에 외부 반응을 받는" : "실행과 검토에 쓸 시간을 나누는"} 방식을 시험해보세요. 강약 분류(${facts.dayStrengthGrade})를 행동 실험으로 번역했으며 체력이나 정신 상태를 뜻하지 않습니다.`
        : "출생시간이 없어 강약 분류와 시주를 이용한 세밀한 가설은 생략했습니다. 세 기둥의 해석을 실제 경험과 비교하며 작은 실험부터 시작하세요.",
    ],
    balance: balanceItems(facts), domains, annual, palm,
    actionPlan: [
      { title: `첫 2주 · ${priority.label}`, text: priority.experiment },
      { title: "2주 뒤 · 기록으로 수정하기", text: priority.checkpoint },
      { title: "매월 말 · 다음 달과 비교하기", text: "아래 월별 표에서 같은 분야의 다음 달을 비교하세요. 실험이면 작은 시도 하나, 유지이면 효과가 있었던 습관 하나, 점검이면 줄이거나 바꿀 일 하나를 적으세요. 실제 일정과 맞지 않으면 달에 구애받지 않아도 됩니다." },
    ],
    note: "사주와 손금은 전통적·상징적 해석이며 객관적으로 검증된 미래 예측이 아닙니다. 월별 표는 행동을 돌아보기 위한 참고입니다. 손금이 있으면 양손 차이를 별도로 보여주며 월별 시기나 확률을 보정하지 않습니다.",
  };
}
