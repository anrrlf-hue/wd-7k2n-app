import type { FreeSajuReport } from "@/lib/free-report-schema";
import type { PalmFacts } from "@/lib/palm-facts";
import { buildPalmBilateralReading, type DominantHand, type PalmBilateralReading } from "@/lib/palm-bilateral";
import type { SajuFacts, TenGodGroup } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";
import { type SajuFocus, type SajuDetailFocus } from "@/lib/saju-focus";
import { buildSajuAnnualOutlook, type SajuAnnualOutlook } from "@/lib/saju-timing";
import { eulReul, iGa } from "@/lib/korean-particle";

type MonthlyEmphasis = SajuAnnualOutlook["months"][number]["comparisons"][number]["emphasis"];

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
  changeWhen: string;
  monthlyActions: Record<MonthlyEmphasis, string>;
  timing: string;
}

export interface PremiumReport {
  title: string;
  summary: string;
  freeSummary: string;
  focus: SajuFocus;
  corePatterns: string[];
  balance: PremiumBalanceItem[];
  domains: PremiumDomainSection[];
  annual: SajuAnnualOutlook;
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
  목: { meaning: "새로운 시도를 작은 단위로 시작하는 습관", action: "미뤄둔 일 하나를 20분 안에 시작할 수 있는 크기로 나누고, 가능한 날을 달력에 넣어보세요.", check: "성공 여부보다 실제로 시작한 횟수와 다음에 바꿀 조건 한 가지를 남기세요." },
  화: { meaning: "생각을 밖으로 표현하는 습관", action: "완성한 것 하나를 신뢰하는 사람에게 보여주고 구체적인 반응을 한 문장 받아보세요.", check: "내가 예상한 반응과 실제 반응이 달랐던 점을 비교하세요." },
  토: { meaning: "반복되는 일을 마무리하는 습관", action: "하루를 마칠 때 미완료 일 하나와 내일 끝낼 시각을 적으세요.", check: "미뤄둔 일의 개수가 줄었는지, 계획이 지나치게 빡빡했는지 확인하세요." },
  금: { meaning: "선택과 거절의 기준을 말로 정하는 습관", action: "새 부탁을 받기 전에 가능한 시간·역할·마감 세 가지를 적고, 이번 주 한 번은 그 범위를 전달하세요.", check: "범위를 말한 뒤 불필요한 재작업이나 약속 변경이 줄었는지 보세요." },
  수: { meaning: "정보를 정리하고 잠깐 멈추는 습관", action: "중요한 결정을 앞두고 선택의 이유를 남기고 다음 날 다시 읽어보세요. 급하지 않다면 그때 확정하세요.", check: "하루 뒤 바뀐 판단과 그대로 유지된 판단을 나눠 적으세요." },
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
      title: `${element}${eulReul(element)} 생활 습관으로 번역하면`,
      whatItMeans: `${facts.hasTimeInput ? "입력된 네 기둥" : "시간을 제외한 세 기둥"}에서 ${element}${iGa(element)} 0개로 집계됩니다. 전통적으로 ${guide.meaning}${eulReul(guide.meaning)} 돌아보는 상징으로 읽을 수 있습니다. 실제 능력의 결핍을 뜻하지는 않습니다.`,
      howToFill: guide.action,
      goodResult: guide.check,
    }];
  });
  items.push({
    title: `${first.meaning}에 멈춤 기준 더하기`,
    whatItMeans: `${first.key} ${first.value}개라는 구조에서 ${first.risk}${eulReul(first.risk)} 점검 대상으로 삼았습니다. 경험에 맞는지 먼저 확인하세요.`,
    howToFill: first.practice,
    goodResult: "비슷한 일이 다시 생겼을 때 전보다 부담이 줄었는지 보세요. 경험에 맞지 않는 조언은 따르지 않아도 됩니다.",
  });
  return items;
}

function domainSection(key: SajuDetailFocus, facts: SajuFacts, annual: SajuAnnualOutlook): PremiumDomainSection {
  const outspoken = facts.outputStarCount + facts.peerStarCount >= facts.resourceStarCount + facts.officerStarCount;
  const outputFirst = facts.outputStarCount >= facts.officerStarCount;
  const moneyFirst = facts.wealthStarCount > facts.resourceStarCount;
  const moneyBalanced = facts.wealthStarCount === facts.resourceStarCount;
  const active = facts.outputStarCount + facts.officerStarCount >= facts.resourceStarCount;
  const templates = {
    love_relationship: {
      headline: outspoken ? "내 표현 뒤에 상대의 기준을 놓아보기" : "혼자 정리한 마음을 작은 요청으로 바꾸기",
      scene: outspoken ? "대화를 빨리 정리하고 싶을 때, 상대가 원하는 것이 조언인지 공감인지부터 확인해보세요." : "생각은 정리됐는데 상대가 알아주기를 기다린 장면이 있다면, 바라는 행동 하나를 말로 전해보세요.",
      evidence: `표현·주도 신호 ${facts.outputStarCount + facts.peerStarCount}개와 검토·역할 신호 ${facts.resourceStarCount + facts.officerStarCount}개를 비교했습니다. 관계 상태나 상대의 마음은 이 계산으로 알 수 없습니다.`,
      experiment: outspoken ? "중요한 대화를 시작할 때 ‘지금 들어주면 될까, 같이 방법을 찾을까’를 먼저 확인하고, 합의한 다음 행동만 적으세요." : "한 번에 요청 하나만 전해보세요. ‘이번 주에 20분 같이 이야기하고 싶어’처럼 상대가 답할 수 있게 시간과 행동을 붙이세요.",
      checkpoint: "대화 후 서로 기억하는 약속이 같은지 확인하세요. 횟수를 늘려도 불편함이 커지면 상대의 거절과 거리 두기를 존중하세요.",
      changeWhen: "기억하는 약속이 다르면 대화 횟수를 늘리기보다 합의한 행동 하나를 다시 확인하세요. 상대가 원하지 않거나 불편함이 커지면 요청을 멈추세요.",
      monthlyActions: {
        실험: outspoken ? "중요한 대화 한 번에서 조언과 공감 중 원하는 것을 먼저 확인해보세요." : "상대가 답할 수 있게 시간과 행동을 붙인 요청 하나를 전해보세요.",
        유지: "서로 편안했던 대화 방식을 한 번 더 써보세요. 아직 그런 경험이 없다면 최근 대화 하나부터 기록하세요.",
        점검: "최근 합의한 약속 하나를 서로 같은 뜻으로 기억하는지 확인하세요. 합의가 없었다면 바라는 행동 하나를 먼저 적어보세요.",
      },
    },
    work: {
      headline: outputFirst ? "결과물 하나로 역할의 범위를 확인하기" : "책임의 경계를 정하고 작은 개선을 시험하기",
      scene: outputFirst ? "아이디어를 더 모으기 전에 현재 하는 일에서 보여줄 수 있는 결과 하나를 골라보세요." : "새 역할을 맡기 전에 누가 결정하고 무엇을 끝내야 하는지 확인하는 과정을 넣어보세요.",
      evidence: `만들어내는 활동(식상 ${facts.outputStarCount}개)과 역할·규율(관성 ${facts.officerStarCount}개)을 비교했습니다. ${facts.outputStarCount === facts.officerStarCount ? "개수가 같아 어느 쪽이 강하다고 정하지 않고, 작은 시안의 반응을 출발점으로 삼았습니다." : outputFirst ? "식상이 더 많아 시안에 대한 반응을 먼저 확인하는 과제를 골랐습니다. 이 비교 방향이 같으면 같은 과제를 제안합니다." : "관성이 더 많아 역할과 완료 기준을 먼저 합의하는 과제를 골랐습니다."} 직업 적합성이나 이직 성패를 판정하는 검사는 아닙니다.`,
      experiment: outputFirst ? "지금 맡은 일에서 작은 시안 하나를 만들고 실제로 쓰는 사람 한 명에게 수정할 점 두 가지를 받아보세요. 시작 전 소요시간 상한을 정하세요." : "진행 중인 업무 한 건의 담당·마감·완료 기준을 한 장으로 정리하고 관계자와 확인하세요. 일주일 뒤 수정 요청이 어디서 나왔는지 기록하세요.",
      checkpoint: "투입 시간과 재작업 횟수를 비교하세요. 계약·수입·업무 조건이 확인되지 않았다면 이 해석만으로 이직이나 사업 확대를 결정하지 마세요.",
      changeWhen: outputFirst
        ? "피드백이 담당자나 완료 기준에 대한 혼선으로 모이면 다음 시안을 만들기 전에 역할 합의로 바꾸세요. 소요시간 상한을 넘기면 결과물의 범위를 줄이세요."
        : "담당·마감·완료 기준에 합의했는데도 같은 수정이 반복되면 문서를 더 늘리지 말고 작은 시안 하나로 기대한 결과를 확인하세요.",
      monthlyActions: {
        실험: outputFirst ? "시안 하나를 이용자 한 명에게 보여주고 수정점 두 가지를 받는 단계를 배치해보세요." : "진행 중인 일 한 건의 담당·마감·완료 기준을 한 장으로 정리해 관계자와 합의해보세요.",
        유지: outputFirst ? "받은 수정점 중 하나만 반영해 다시 보여주세요. 아직 피드백이 없다면 시안 하나의 반응을 먼저 받으세요." : "합의한 완료 기준으로 업무 한 건을 마무리해보세요. 아직 합의하지 못했다면 그 확인부터 시작하세요.",
        점검: outputFirst ? "최근 결과물 한 건의 투입시간과 수정 요청을 적어보세요. 결과물이 없다면 시안의 시간 상한과 보여줄 사람부터 정하세요." : "최근 수정 요청 한 건이 역할 혼선 때문이었는지 살펴보세요. 기록이 없다면 현재 업무 한 건의 담당자부터 확인하세요.",
      },
    },
    money: {
      headline: moneyBalanced ? "선택한 이유와 실제 지출을 함께 비교하기" : moneyFirst ? "눈에 보이는 결과와 실제 남는 자원 구분하기" : "검토한 내용을 작은 기록 습관으로 옮기기",
      scene: moneyBalanced ? "결정 전에 적은 이유가 지출 뒤에도 납득되는지, 예상 비용과 함께 한 기록에서 확인해보세요." : moneyFirst ? "성과가 커 보였던 선택 하나를 돌아보며 그 뒤에 들어간 시간과 지출까지 함께 적어보세요." : "정보를 모으는 동안 정작 내 지출과 약속이 어떻게 바뀌었는지 놓친 적이 있는지 살펴보세요.",
      evidence: `자원·결과(재성 ${facts.wealthStarCount}개)와 검토·정보(인성 ${facts.resourceStarCount}개)를 비교한 해석입니다. ${moneyBalanced ? "동점이므로 어느 쪽도 우선 성향으로 정하지 않고, 선택 이유와 비용을 함께 확인하는 과제를 골랐습니다." : moneyFirst ? "재성이 더 많아 예상한 결과에서 빠진 비용을 먼저 확인하는 과제를 골랐습니다." : "인성이 더 많아 생각한 내용과 실제 거래 기록의 차이를 먼저 확인하는 과제를 골랐습니다."} 자산이나 부채, 투자 성향을 측정한 값은 아닙니다.`,
      experiment: moneyBalanced ? "예정된 지출 한 건의 선택 이유와 예상 비용을 먼저 적고, 지출 뒤 실제 비용과 만족한 점을 같은 줄에 기록하세요. 새 지출을 만들 필요는 없습니다." : moneyFirst ? "최근 지출 세 건의 예상 비용과 실제 비용을 나란히 적고 차이가 난 이유를 한 줄씩 남기세요." : "15분만 시간을 내서 최근 거래 내역을 확인하고 기억과 달랐던 항목 세 개에 표시하세요. 새 금융상품을 고르는 과제로 바꾸지 마세요.",
      checkpoint: "예상과 기록의 차이가 줄었는지 확인하세요. 월별 해석은 투자·대출·매매 시점이나 수익을 알려주지 않습니다.",
      changeWhen: moneyBalanced
        ? "비용은 예상과 맞지만 만족하지 못했다면 다음 선택의 이유부터 바꿔보세요. 이유는 납득되는데 예상 비용을 넘겼다면 빠뜨린 비용 항목부터 확인하세요."
        : moneyFirst ? "예상 비용을 반복해서 넘기면 기록 건수를 늘리기보다 결정 전에 빠뜨린 비용 항목을 확인하는 방식으로 바꾸세요."
          : "기억과 내역의 차이가 반복되면 확인하는 날을 더 자주 정해보세요. 차이가 줄었다면 같은 주기로 이어가며 기록 항목을 늘리지 않아도 됩니다.",
      monthlyActions: {
        실험: moneyBalanced ? "이미 예정된 지출 한 건에 선택 이유와 예상 비용을 함께 적고 실제 결과와 비교해보세요." : moneyFirst ? "이미 예정된 지출의 예상 비용과 실제 비용을 나란히 적는 방식을 써보세요. 새 지출을 만들 필요는 없습니다." : "15분을 정해 최근 거래 내역에서 기억과 달랐던 항목을 찾아보세요.",
        유지: moneyBalanced ? "선택 이유와 비용이 모두 납득됐던 기록 방식을 이어가세요. 아직 기록이 없다면 최근 지출 한 건부터 비교하세요." : moneyFirst ? "예상과 실제 비용을 빠짐없이 적을 수 있었던 방식을 이어가세요. 기록이 없다면 최근 지출 한 건부터 시작하세요." : "거래 기억과 내역을 비교했던 주기를 이어가세요. 기록이 없다면 주 1회 확인할 시간을 먼저 정하세요.",
        점검: moneyBalanced ? "지난 지출 한 건에서 선택 이유에 대한 아쉬움과 예상 밖 비용을 나눠 적어보세요." : moneyFirst ? "최근 지출에서 예상에 빠졌던 비용이 있는지 확인하세요. 기록이 없다면 영수증이나 거래 내역 한 건부터 보세요." : "최근 거래 기억과 내역이 달랐던 항목을 돌아보세요. 비교 기록이 없다면 한 건부터 대조하세요.",
      },
    },
    wellbeing: {
      headline: active ? "바쁜 날에도 남길 여백 정하기" : "생각을 멈추고 생활 리듬 확인하기",
      scene: active ? "약속과 할 일이 몰렸던 날, 쉬는 시간을 먼저 지웠는지 돌아보세요." : "충분히 쉬었다고 생각한 날에도 머릿속 일이 계속 이어졌는지 기록해보세요.",
      evidence: `활동·책임 신호 ${facts.outputStarCount + facts.officerStarCount}개와 검토·정리 신호 ${facts.resourceStarCount}개를 생활 습관의 질문으로 바꿨습니다. 건강 상태나 질병을 추론하지 않습니다.`,
      experiment: active ? "일정 사이에 비워둘 10분을 한 칸 정하고 실제로 지킨 날만 표시하세요. 못 지킨 날에는 밀려온 일정 하나를 적으세요." : "하루 끝에 5분만 써서 머릿속에 남은 일과 내일로 넘길 일을 나눠 적으세요. 기록 뒤 새 할 일을 더하지 않아도 됩니다.",
      checkpoint: "전후 일주일의 주관적인 부담을 비교하세요. 차이가 없으면 시간을 바꿔보세요. 몸의 증상은 이 리포트로 판단하지 마세요.",
      changeWhen: "정한 시간을 반복해서 못 지켰다면 시간을 더 확보하려고 밀어붙이기보다 배치할 시각을 바꿔보세요. 부담이 커지면 기록할 항목을 하나로 줄이세요.",
      monthlyActions: {
        실험: active ? "일정 사이에 비워둘 10분 한 칸을 정하고 실제 지킨 날을 표시해보세요." : "하루 끝 5분 동안 남은 일과 내일로 넘길 일을 나눠 적어보세요.",
        유지: "부담이 줄었던 시간 배치를 이어가세요. 아직 확인한 경험이 없다면 하루만 기록해 시작하세요.",
        점검: "쉬거나 정리할 시간이 밀린 날의 일정 하나를 살펴보세요. 기록이 없다면 어제의 일정부터 되짚어보세요.",
      },
    },
  };
  const template = templates[key];
  const stages = annual.months.map((month) => ({ label: month.label, emphasis: month.comparisons.find((item) => item.domain === key)!.emphasis }));
  const changes = stages.filter((stage, index) => index === 0 || stage.emphasis !== stages[index - 1].emphasis);
  return {
    key, label: ({ love_relationship: "연애·관계", money: "재물", work: "직장·일", wellbeing: "생활 리듬" })[key], headline: template.headline,
    paragraphs: [template.scene, template.evidence],
    experiment: template.experiment,
    checkpoint: template.checkpoint,
    changeWhen: template.changeWhen,
    monthlyActions: template.monthlyActions,
    timing: changes.length > 1
      ? `${changes.slice(0, 3).map((stage) => `${stage.label} ${stage.emphasis}`).join(" → ")} 순으로 제안이 바뀝니다. 월별 표에서 이 분야의 흐름을 비교하세요. 달보다 실제 일정과 기록을 우선하세요.`
      : "12개월의 차이가 뚜렷하지 않아 특정 달을 따로 권하지 않습니다. 실제 일정에 맞춰 위의 행동을 시도해보세요.",
  };
}

export function buildPremiumReport(input: {
  facts: SajuFacts;
  // Only the compact recap consumes free copy; the plan has its own inputs.
  freeReport: FreeSajuReport;
  focus?: SajuFocus;
  referenceDate?: Date;
  leftPalm?: PalmFacts | null;
  rightPalm?: PalmFacts | null;
  dominantHand?: DominantHand | null;
}): PremiumReport {
  const { facts } = input;
  const annual = buildSajuAnnualOutlook(facts, input.referenceDate);
  const { first, second, basis, places } = profile(facts);
  const domains = (["love_relationship", "money", "work", "wellbeing"] as const)
    .map((key) => domainSection(key, facts, annual));
  const palm = input.leftPalm && input.rightPalm && input.dominantHand
    ? buildPalmBilateralReading(input.leftPalm, input.rightPalm, input.dominantHand) : null;
  return {
    title: "프리미엄 통합 연간 리포트", focus: "overall",
    summary: `${annual.startLabel}부터 ${annual.endLabel}까지. ‘${first.meaning}’에 ‘${second.meaning}’를 더하는 방향으로 연애·재물·직장을 함께 살펴봅니다.`,
    freeSummary: input.freeReport.snapshot?.text.split(/(?<=[.!?])\s+/)[0] ?? "",
    corePatterns: [
      `‘${first.meaning}’가 먼저 떠오를 때, ‘${second.meaning}’도 함께 해보세요. ${basis}라는 구성을 생활에 대입해본 해석입니다.`,
      `${places || "입력된 원국"} 자리에 ${first.key}${iGa(first.key)} 보입니다. 이 영역에서 ${first.risk}${iGa(first.risk)} 있었는지 최근 사례 한 건을 적어보세요. 해당 경험이 없다면 이 가설은 내려놓아도 됩니다.`,
      facts.dayStrengthReliable
        ? `${facts.dayStrength === "weak" ? "한꺼번에 벌이는 일의 수를 줄이는" : facts.dayStrength === "strong" ? "혼자 정하기 전에 외부 반응을 받는" : "실행과 검토에 쓸 시간을 나누는"} 방식을 시험해보세요. 강약 분류(${facts.dayStrengthGrade})를 생활 방식에 연결했으며 체력이나 정신 상태를 뜻하지 않습니다.`
        : "출생시간이 없어 강약 분류와 시주를 이용한 세밀한 가설은 생략했습니다. 세 기둥의 해석을 실제 경험과 비교하며 실제 상황에 맞는 부분만 참고하세요.",
    ],
    balance: balanceItems(facts), domains, annual, palm,
    note: "전통적 해석을 생활에 적용한 참고 리포트입니다. 미래·수익·건강을 보장하지 않으며 실제 상황과 판단을 우선해주세요.",
  };
}
