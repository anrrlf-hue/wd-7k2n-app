import type {
  RealityAction,
  RealityAnswer,
  RealityEvidence,
  RealityQuestion,
} from "@/lib/reality-answer-contract";
import { daeunFlavor } from "@/lib/fortune-candidates";
import type { PersonalityInput } from "@/lib/personality-check";
import type { SajuFacts } from "@/lib/saju-facts";

export interface RealityAnswerBuildInput {
  question: RealityQuestion;
  facts: SajuFacts;
  evidence: RealityEvidence[];
  personality?: PersonalityInput | null;
}

function level(personality: PersonalityInput | null | undefined, key: string): string | null {
  const value = personality?.check?.levels?.[key];
  return value && value !== "미확인" ? value : null;
}

function flowSentence(facts: SajuFacts): string {
  if (!facts.currentDaeun) {
    return "출생시간이 없거나 현재 대운 정보가 충분하지 않아, 지금의 시기를 좁혀 단정하지 않고 원국과 실제 상황을 중심으로 봅니다.";
  }
  return `${facts.currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(facts.currentDaeun)} 흐름입니다. 이 흐름은 결과를 정해주는 예언이라기보다, 지금 어떤 선택을 더 의식해서 점검할지 정하는 참고축으로 씁니다.`;
}

function timingFor(facts: SajuFacts) {
  const now = facts.currentDaeun
    ? `현재는 ${facts.currentDaeun.ageRange}세부터 이어지는 ${daeunFlavor(facts.currentDaeun)} 흐름을 참고하되, 실제 결정은 지금 확인되는 조건과 함께 판단합니다.`
    : "정밀한 현재 대운을 확인하기 어려워 특정 시기를 단정하지 않습니다. 지금 확인 가능한 현실 조건을 우선합니다.";

  const nextCheckpoint = facts.nextDaeun
    ? `현실 행동은 먼저 30일 뒤 점검하고, 큰 방향은 다음 대운(${facts.nextDaeun.ageRange}세부터)으로 넘어갈 때 다시 비교할 수 있습니다.`
    : "먼저 30일 뒤 실행 결과를 확인하고, 실제 상황이 달라졌을 때 다시 판단합니다.";

  return { now, nextCheckpoint, precision: "daeun_only" as const };
}

function patternFor(
  question: RealityQuestion,
  facts: SajuFacts,
  personality: PersonalityInput | null | undefined,
): string {
  const speed = level(personality, "speed");
  const plan = level(personality, "plan");
  const autonomy = level(personality, "autonomy");
  const risk = level(personality, "risk");
  const spend = level(personality, "spendAwareness");

  switch (question.domain) {
    case "career":
      if (speed === "왼쪽") return "답답함이 커지면 조건을 다 확인하기 전에 결론부터 내릴 수 있습니다. 이번 결정에서는 '떠날 이유'와 '옮길 곳의 조건'을 따로 확인하는 게 중요합니다.";
      if (plan === "왼쪽") return "준비를 오래 하는 힘은 있지만, 기준을 계속 보완하다 실제 지원 시점을 늦출 수 있습니다. 준비 완료 기준을 먼저 정하는 편이 좋습니다.";
      return "현재 직장이 힘든 이유와 다음 직장에서 얻고 싶은 조건을 섞어서 판단하기 쉽습니다. 두 항목을 분리하면 결정이 선명해집니다.";
    case "work_business":
      if (risk === "왼쪽") return "새 기회가 보이면 실행 속도가 빨라질 수 있습니다. 사업이나 새 역할에서는 가능성보다 먼저 '돈을 내는 사람·권한·비용'을 확인해야 합니다.";
      return "좋은 가능성과 실제 사업성·역할 조건을 같은 것으로 보기 쉽습니다. 시작 여부보다 검증해야 할 현실 조건을 먼저 고정하는 편이 좋습니다.";
    case "money":
      if (spend === "오른쪽") return "돈이 들어오는 문제보다 어디로 빠져나가는지 체감이 늦어질 수 있습니다. 재물 흐름 해석과 별개로 실제 거래내역을 확인해야 원인을 잡을 수 있습니다.";
      if (risk === "왼쪽") return "기회가 보일 때 수익 가능성에 먼저 시선이 갈 수 있습니다. 큰 결정보다 감당 가능한 손실과 현금 여유를 먼저 확인하는 방식이 필요합니다.";
      return "재물운의 좋고 나쁨보다, 들어온 돈을 남기는 기준과 실제 현금흐름을 분리해서 보는 것이 중요합니다.";
    case "love":
      if (autonomy === "오른쪽") return "관계를 지키려는 마음 때문에 상대의 반응을 기준으로 내 결정을 늦출 수 있습니다. 관계의 미래보다 반복되는 실제 행동이 달라지는지를 보는 편이 좋습니다.";
      return "감정이 강할수록 '좋아하는 마음'과 '관계를 계속해도 되는 근거'를 같은 것으로 보기 쉽습니다. 두 가지를 따로 확인해야 합니다.";
    case "relationship":
      if (autonomy === "왼쪽") return "내 기준이 분명할수록 갈등에서 설명보다 결론을 먼저 제시할 수 있습니다. 상대를 설득하기 전에 서로 원하는 것을 한 번 분리해 확인하는 게 도움이 됩니다.";
      return "갈등의 원인을 성격 전체로 확대하기보다, 반복되는 대화 장면 한두 개를 찾아 행동 단위로 보는 편이 해결에 가깝습니다.";
    case "wellbeing":
      return "피로와 스트레스를 사주 신호로 질병처럼 해석하면 실제 원인을 놓칠 수 있습니다. 생활 리듬과 증상을 기록하고, 필요한 경우 의료 확인으로 분리하는 게 중요합니다.";
    case "overall":
      if (speed === "왼쪽") return "변화가 필요하다고 느끼는 순간 한 번에 크게 바꾸려는 쪽으로 갈 수 있습니다. 작은 실험으로 먼저 확인하면 불필요한 손실을 줄일 수 있습니다.";
      return "막연한 변화 욕구를 여러 문제에 동시에 적용하면 무엇이 효과가 있었는지 알기 어렵습니다. 지금 가장 바꾸고 싶은 것 하나부터 확인하는 편이 좋습니다.";
  }
}

function action(title: string, detail: string, doneWhen: string): RealityAction {
  return { title, detail, doneWhen };
}

const ELEMENT_TONE: Record<string, string> = {
  목: "한곳에 머무르기보다 성장할 방향과 다음 가능성을 찾을 때 힘이 살아나는 편입니다.",
  화: "생각을 안에 오래 두기보다 표현하고 움직이며 반응을 확인할 때 흐름이 살아나는 편입니다.",
  토: "급하게 판을 바꾸기보다 기준을 세우고 안정적으로 쌓아갈 때 강점이 살아나는 편입니다.",
  금: "무엇을 할지보다 무엇을 하지 않을지 기준을 세울 때 판단이 선명해지는 편입니다.",
  수: "한 번에 결론을 닫기보다 상황을 읽고 여러 가능성을 비교할 때 강점이 살아나는 편입니다.",
};

function questionReadingFor(
  question: RealityQuestion,
  facts: SajuFacts,
  personality: PersonalityInput | null | undefined,
): string {
  const opening =
    ELEMENT_TONE[facts.dayElement] ??
    "한쪽으로 밀어붙이기보다 상황을 읽고 자기 기준을 세울 때 강점이 살아나는 편입니다.";

  const speed = level(personality, "speed");
  const autonomy = level(personality, "autonomy");
  const spend = level(personality, "spendAwareness");

  if (question.domain === "career") {
    const workTone =
      facts.officerStarCount > facts.outputStarCount
        ? "일에서는 역할과 책임이 분명해야 마음이 놓이는 쪽이 강합니다. 그래서 현재 자리가 답답해도 아무 방향으로나 벗어나기보다, 다음 자리의 역할과 기준이 분명할 때 움직임이 더 안정적입니다."
        : facts.outputStarCount > facts.officerStarCount
          ? "정해진 틀만 따르기보다 내가 직접 판단하고 결과를 만들어낼 여지가 있을 때 힘이 붙는 편입니다. 일이 막힐 때는 직장 자체보다 '내가 움직일 수 있는 범위가 너무 좁은가'가 더 큰 문제일 수 있습니다."
          : "조직의 안정성과 내 방식대로 움직일 여지를 둘 다 필요로 하는 편입니다. 한쪽만 보고 직장을 고르면 처음에는 좋아 보여도 시간이 지나 같은 답답함이 반복될 수 있습니다.";
    const personal =
      speed === "왼쪽"
        ? "결정이 빠른 편이라 답답함이 커졌을 때 퇴사 결론부터 앞서지 않도록 다음 조건을 먼저 확인하는 것이 중요합니다."
        : "결정을 충분히 생각하는 편이라 준비만 길어지지 않도록 실제 지원이라는 확인 단계까지 이어가는 것이 중요합니다.";
    return `${opening} ${workTone} ${personal}`;
  }

  if (question.domain === "work_business") {
    const workTone =
      facts.wealthStarCount + facts.outputStarCount > facts.officerStarCount + facts.peerStarCount
        ? "기회를 발견하면 직접 움직여 결과로 연결하려는 힘이 비교적 강한 편입니다. 다만 아이디어가 맞는지보다 실제 고객·권한·수익 구조가 확인됐는지가 사업과 새 역할의 성패를 가르는 현실 조건이 됩니다."
        : "혼자 판을 크게 벌이기보다 역할과 조건이 분명한 상태에서 실력을 쌓을 때 안정적으로 힘을 내는 편입니다. 새로운 제안이나 독립은 '할 수 있느냐'보다 내게 남는 권한·경력·수익 구조가 있는지를 먼저 보는 것이 중요합니다.";
    return `${opening} ${workTone} 지금 질문에서는 가능성 자체보다 실제로 검증할 수 있는 조건이 있는지가 핵심입니다.`;
  }

  if (question.domain === "money") {
    const moneyTone =
      facts.wealthStarCount > 0 && facts.outputStarCount > 0
        ? "돈과 기회가 보이면 그것을 실제 결과로 연결하려는 힘이 있는 편입니다. 반대로 들어오는 기회가 많아질수록 어디에 돈을 쓰고 무엇을 남길지 기준이 흐려지면 체감상 '버는데 남지 않는' 느낌이 커질 수 있습니다."
        : facts.wealthStarCount === 0
          ? "한 번의 큰 재물 기회를 기다리기보다 내가 잘하는 일을 반복해서 수입으로 연결하고, 들어온 돈을 지키는 구조를 만드는 쪽이 더 잘 맞습니다. 재물운의 좋고 나쁨보다 돈을 남기는 습관이 결과 차이를 크게 만들 수 있습니다."
          : "돈을 다루는 감각과 실제 생활의 현금흐름은 따로 볼 필요가 있습니다. 기회가 있어도 지출 기준과 남기는 규칙이 없으면 재물 흐름을 체감하기 어렵습니다.";
    const personal =
      spend === "오른쪽"
        ? "특히 스스로 지출이 잘 보이지 않는다고 답한 만큼, 이번 질문은 사주보다 실제 결제내역을 함께 확인할 때 훨씬 선명해집니다."
        : "이번 질문에서는 버는 힘보다 들어온 돈을 어떤 기준으로 남길지가 더 중요한 확인점입니다.";
    return `${opening} ${moneyTone} ${personal}`;
  }

  if (question.domain === "love") {
    const relationTone =
      autonomy === "오른쪽"
        ? "관계에서는 상대의 반응과 분위기를 많이 고려하는 편이라, 마음이 남아 있거나 관계를 지키고 싶을 때 내 기준을 뒤로 미룰 수 있습니다. 그래서 '좋아하는가'와 '이 관계가 실제로 나아지고 있는가'를 따로 보는 것이 중요합니다."
        : "관계에서도 자기 기준이 분명한 편이라 애매한 상태를 오래 끌기보다 결론을 내리고 싶어질 수 있습니다. 다만 상대의 마음이나 관계의 미래는 내 사주만으로 정할 수 없으므로 실제 대화와 행동 변화를 함께 봐야 합니다.";
    return `${opening} ${relationTone} 지금 질문에서는 감정의 크기보다 관계가 반복해서 보여주는 현실적인 패턴이 더 중요한 판단 기준입니다.`;
  }

  if (question.domain === "relationship") {
    return `${opening} 사람 사이에서 의견이 다를 때는 누가 옳은지 빨리 정하기보다 서로 무엇을 중요하게 보는지 확인할수록 관계가 덜 소모됩니다. 특히 반복되는 충돌은 성격 전체의 문제가 아니라 같은 상황에서 비슷한 말과 행동이 되풀이되는지 살펴보는 편이 더 정확합니다. 지금 질문은 '내가 문제인가'보다 '어떤 장면에서 충돌이 반복되는가'로 바꾸어 보는 것이 좋습니다.`;
  }

  if (question.domain === "wellbeing") {
    return `${opening} 사주에서 보이는 기질은 생활 리듬을 돌아보는 참고는 될 수 있지만, 몸의 상태나 질병 여부를 판단하는 근거가 되지는 않습니다. 지금처럼 피로가 크게 느껴질 때는 버티는 성향이나 몰아서 움직이는 습관이 있는지 확인하고, 수면·휴식·증상의 실제 변화를 기록하는 쪽이 더 도움이 됩니다. 몸의 불편이 지속되면 사주 해석과 분리해 의료적으로 확인해야 합니다.`;
  }

  return `${opening} 지금은 '무엇이 생길까'보다 내가 어떤 방식으로 변화를 선택하는지가 더 중요해 보입니다. 한 번에 여러 영역을 바꾸면 결과를 비교하기 어렵기 때문에, 가장 답답한 한 가지를 고르고 작게 시험해 보는 방식이 잘 맞습니다. 변화 자체가 목적이 아니라 실제로 삶이 나아지는지를 확인할 수 있어야 다음 선택도 선명해집니다.`;
}

function currentFlowReadingFor(question: RealityQuestion, facts: SajuFacts): string {
  if (!facts.currentDaeun) {
    return "출생시간이 없거나 현재 대운 정보가 충분하지 않아 지금의 시기를 세밀하게 나누어 말하기는 어렵습니다. 대신 현재 질문에서는 타고난 선택 방식과 지금 실제로 확인되는 상황을 중심으로 보는 편이 맞습니다. 시기를 억지로 좁히기보다 현실에서 한 번 행동해보고 그 결과를 다시 비교하는 방식이 더 안전합니다.";
  }

  const current = daeunFlavor(facts.currentDaeun);
  const next = facts.nextDaeun ? daeunFlavor(facts.nextDaeun) : null;
  const domainLine: Record<RealityQuestion["domain"], string> = {
    career: "일에서는 지금 자리를 지킬지 옮길지보다, 어떤 역할과 환경에서 내 힘을 제대로 쓸 수 있는지가 더 크게 느껴질 수 있습니다.",
    work_business: "일과 사업에서는 새로운 책임이나 기회를 그냥 지나치기보다 실제로 잡을 가치가 있는지 따져보고 싶어지는 때입니다.",
    money: "돈에서는 들어오고 나가는 양보다 어떤 기회를 잡고 무엇을 지킬지에 대한 기준이 중요하게 느껴질 수 있습니다.",
    love: "관계에서는 마음만으로 밀고 가기보다 약속과 행동이 실제로 맞는지 확인하고 싶어지는 때입니다.",
    relationship: "사람 사이에서는 평소 넘기던 차이나 불편이 더 분명하게 느껴져 관계의 기준을 다시 세우고 싶어질 수 있습니다.",
    wellbeing: "생활에서는 부담을 무작정 견디기보다 내 리듬이 어디서 무너지는지 확인하고 조정할 필요가 커질 수 있습니다.",
    overall: "전체적으로는 익숙한 방식을 계속 가져갈지, 새로운 방식으로 바꿀지에 대한 생각이 커질 수 있습니다.",
  };

  const nextLine = facts.nextDaeun
    ? `다음 대운으로 넘어가면 ${next} 쪽으로 결이 바뀌므로, 지금의 선택을 영구적인 결론으로 보기보다 현재 구간에서 확인할 것을 확인하고 다음 흐름에서 다시 비교하는 편이 좋습니다.`
    : "다음 대운을 정밀하게 연결할 정보가 부족하므로 지금 단계에서는 현재 행동의 결과를 먼저 확인하는 것이 좋습니다.";

  return `${facts.currentDaeun.ageRange}세부터 이어지는 지금 흐름은 ${current} 쪽에 무게가 실립니다. ${domainLine[question.domain]} ${nextLine}`;
}

function solutionReadingFor(
  question: RealityQuestion,
  choose: string,
  avoid: string,
  pattern: string,
): string {
  return `이 질문을 풀 때 가장 중요한 것은 ${choose} 반대로 ${avoid} 쪽으로 가면 현재 고민의 원인을 확인하기 전에 결론만 먼저 내릴 수 있습니다. ${pattern} 그래서 이번에는 큰 결정을 한 번에 끝내기보다 아래 행동 3가지를 실제로 해보고, 그 결과가 달라지는지를 기준으로 다음 선택을 정하는 편이 좋습니다.`;
}

function domainPlan(question: RealityQuestion): {
  headline: string;
  avoid: string;
  choose: string;
  actions: [RealityAction, RealityAction, RealityAction];
  realityChecks: string[];
  safetyNote?: string;
} {
  const q = question.raw;

  if (question.domain === "career") {
    if (/취업|면접|지원|합격/.test(q)) {
      return {
        headline: "지원 수만 늘리기보다, 먼저 지원 방향과 실제 병목을 좁히는 편이 좋습니다.",
        avoid: "어디든 붙어야 한다는 마음으로 서로 다른 직무에 같은 준비물을 반복해서 보내는 것.",
        choose: "지원할 직무를 좁히고, 탈락이 많이 생기는 단계부터 보완하는 것.",
        actions: [
          action("지원 직무를 2개 이하로 좁히기", "원하는 직무와 실제 경력으로 지원 가능한 직무를 비교해 최대 2개만 남깁니다.", "지원 직무명이 2개 이하로 적혀 있음"),
          action("최근 지원 5건을 단계별로 나누기", "서류·과제·면접 중 어디에서 가장 많이 멈췄는지 기록합니다.", "가장 많이 막힌 단계 1개가 특정됨"),
          action("보여줄 결과물 하나 보강하기", "가장 중요한 직무에 맞춰 포트폴리오·경력기술·과제 예시 중 하나를 실제로 수정합니다.", "지원할 때 첨부하거나 보여줄 파일/링크 1개가 완성됨"),
        ],
        realityChecks: ["실제 채용공고 수요", "요구 경력·자격", "최근 서류·면접 피드백"],
      };
    }
    return {
      headline: "퇴사 결정보다 다음 자리의 조건을 먼저 확인한 뒤 움직이는 편이 좋습니다.",
      avoid: "현재가 힘들다는 이유만으로 다음 직장의 조건을 확인하기 전에 퇴사일을 먼저 정하는 것.",
      choose: "재직 상태에서 다음 직장의 조건과 실제 이동 가능성을 확인하는 것.",
      actions: [
        action("다음 직장의 필수조건 3개 적기", "연봉·업무·성장·근무형태 중 포기할 수 없는 조건을 3개만 정합니다.", "필수조건 3개가 문장으로 남음"),
        action("실제 공고 5개 비교하기", "현재 직장과 비교해 좋아지는 조건과 나빠지는 조건을 표시합니다.", "공고 5개에 장단점 표시가 완료됨"),
        action("퇴사 전 시장 반응 확인하기", "지원하거나 채용담당자와 접촉해 내 경력이 실제로 어떤 반응을 받는지 확인합니다.", "지원 2건 이상 또는 실제 채용 접점 1건이 생김"),
      ],
      realityChecks: ["실제 채용 가능성", "연봉·직무 범위", "퇴사 후 버틸 기간", "출퇴근·근무조건"],
    };
  }

  if (question.domain === "work_business") {
    if (/사업|창업|독립|장사/.test(q)) {
      return {
        headline: "시작 여부보다 먼저, 실제 고객이 돈을 낼 문제인지 검증하는 단계가 필요합니다.",
        avoid: "준비가 됐다는 느낌만으로 고정비나 퇴사 같은 되돌리기 어려운 결정을 먼저 하는 것.",
        choose: "작게 팔아본 뒤 실제 결제 반응을 보고 확대하는 것.",
        actions: [
          action("팔 상품을 한 문장으로 정하기", "누구의 어떤 문제를 무엇으로 해결하고 얼마를 받을지 한 문장으로 씁니다.", "고객·문제·상품·가격이 한 문장에 모두 있음"),
          action("잠재고객 10명에게 실제 제안하기", "설명만 듣는 인터뷰가 아니라 가격이 포함된 실제 제안을 보냅니다.", "제안 기록 10건이 남음"),
          action("확대 기준을 숫자로 정하기", "정한 기간 안에 결제 건수나 문의 건수가 어느 정도 나오면 확대할지 기준을 정합니다.", "확대·수정·중단을 가르는 숫자 기준이 있음"),
        ],
        realityChecks: ["실제 고객 수요", "가격 반응", "원가·고정비", "규제·계약 조건", "생활비 여유"],
      };
    }
    return {
      headline: "새 역할은 책임보다 권한·보상·경력가치가 함께 커지는지 확인한 뒤 결정하는 편이 좋습니다.",
      avoid: "좋은 기회라는 말만 듣고 역할 범위와 지원 조건을 확인하지 않은 채 수락하는 것.",
      choose: "6개월 뒤 내게 무엇이 남는 역할인지 확인하고 결정하는 것.",
      actions: [
        action("권한과 책임을 따로 적기", "새 역할에서 내가 책임질 것과 실제로 결정할 수 있는 것을 나눠 씁니다.", "책임 목록과 권한 목록이 각각 존재함"),
        action("보상과 평가기준 확인하기", "급여·성과평가·승진·직급 중 무엇이 실제로 달라지는지 확인합니다.", "변경되는 보상/평가 조건이 문서나 대화로 확인됨"),
        action("6개월 뒤 남는 경력자산 정하기", "이 역할을 맡았을 때 이력서에 남길 성과나 경험을 한 문장으로 씁니다.", "6개월 뒤 남길 결과 한 문장이 정해짐"),
      ],
      realityChecks: ["보상", "의사결정 권한", "업무량", "지원 인력·시간", "조직의 실제 기대"],
    };
  }

  if (question.domain === "money") {
    return {
      headline: "재물운의 좋고 나쁨보다, 실제로 돈이 들어오고 남는 구조부터 확인하는 것이 먼저입니다.",
      avoid: "사주 흐름만으로 투자·대출·고액 지출 결정을 확정하는 것.",
      choose: "최근 현금흐름을 확인하고, 돈을 남기는 규칙 하나를 먼저 만드는 것.",
      actions: [
        action("최근 한 달 지출을 세 묶음으로 나누기", "고정비·생활비·선택지출로 나눠 실제 결제내역을 봅니다.", "최근 한 달 지출이 세 묶음으로 정리됨"),
        action("소득 직후 남길 금액 정하기", "생활비를 쓰고 남기는 방식이 아니라 소득이 들어온 직후 먼저 남길 금액을 정합니다.", "자동이체 또는 별도 계좌 이동 금액이 정해짐"),
        action("30일 뒤 잔액 변화 확인하기", "정한 규칙을 한 번 실행한 뒤 실제 잔액과 지출 변화를 비교합니다.", "시작 전·후 잔액을 비교할 수 있음"),
      ],
      realityChecks: ["실제 월소득", "고정·변동지출", "부채와 금리", "비상자금", "금융상품 조건"],
    };
  }

  if (question.domain === "love") {
    if (/재회|헤어진|이별/.test(q)) {
      return {
        headline: "그리움보다 먼저, 헤어진 원인이 실제로 달라졌는지를 확인하는 편이 좋습니다.",
        avoid: "상대의 현재 의사를 확인하지 않은 채 반복해서 연락하거나 재회를 압박하는 것.",
        choose: "헤어진 원인의 변화 여부를 확인하고, 연락한다면 목적이 분명한 한 번의 소통으로 제한하는 것.",
        actions: [
          action("헤어진 핵심 이유를 한 문장으로 적기", "감정 표현이 아니라 실제로 관계를 끝내게 만든 사건이나 반복 행동을 씁니다.", "핵심 이유가 한 문장으로 정리됨"),
          action("달라진 증거를 확인하기", "그 문제가 지금 달라졌다고 볼 수 있는 실제 행동이나 상황이 있는지 적습니다.", "변화 증거가 있거나 없다는 판단이 가능함"),
          action("연락 목적을 하나로 제한하기", "연락한다면 답을 강요하지 않고 확인하고 싶은 내용 하나만 전달합니다.", "한 번 보낼 메시지의 목적이 한 문장으로 정해짐"),
        ],
        realityChecks: ["상대방이 연락을 원하는지", "이별 원인의 실제 변화", "현재 각자의 관계 상태", "서로의 경계와 의사"],
      };
    }
    return {
      headline: "좋아하는 마음만으로 미래를 정하기보다, 반복되는 문제가 실제로 달라지는지를 기준으로 보는 편이 좋습니다.",
      avoid: "상대의 마음이나 미래 행동을 사주로 대신 확정하는 것.",
      choose: "관계에서 반복되는 문제 하나를 정하고, 대화 뒤 실제 행동 변화가 있는지 확인하는 것.",
      actions: [
        action("반복 갈등 한 가지 적기", "최근 가장 자주 반복된 갈등을 성격 평가가 아니라 행동으로 씁니다.", "반복 갈등이 구체적 행동 한 문장으로 정리됨"),
        action("바라는 변화 한 가지 말하기", "상대에게 바라는 행동을 하나만 구체적으로 전달합니다.", "요구가 추상 표현이 아닌 행동 문장으로 전달됨"),
        action("2~4주 동안 실제 변화 확인하기", "말보다 실제 행동이 달라지는지 관찰하고 기록합니다.", "같은 갈등의 반복 여부를 비교할 기록이 있음"),
      ],
      realityChecks: ["상대방의 의사", "신뢰와 약속 이행", "실제 갈등 빈도", "관계에서 지켜야 할 경계"],
    };
  }

  if (question.domain === "relationship") {
    return {
      headline: "누가 문제인지 결론내리기보다, 반복해서 부딪히는 장면을 행동 단위로 바꾸어 보는 것이 먼저입니다.",
      avoid: "한 번의 갈등을 상대나 내 성격 전체의 문제로 확대하는 것.",
      choose: "최근 갈등에서 반복되는 말과 행동을 찾고, 내가 바꿀 부분과 지켜야 할 경계를 나누는 것.",
      actions: [
        action("최근 갈등 3건을 기록하기", "누구와 무슨 상황에서 어떤 말로 시작됐는지 짧게 적습니다.", "갈등 사례 3건이 같은 형식으로 기록됨"),
        action("다음 대화에서 요구를 되묻기", "내 결론을 말하기 전에 상대가 원하는 것을 한 문장으로 확인합니다.", "상대 요구를 되묻는 대화를 1회 실행함"),
        action("2주 뒤 반복 여부 비교하기", "같은 유형의 갈등 횟수가 줄었는지 확인합니다.", "시작 전과 2주 뒤 반복 횟수를 비교할 수 있음"),
      ],
      realityChecks: ["상대의 실제 행동", "조직·가족의 관계 구조", "반복되는 갈등의 맥락", "내가 통제할 수 없는 상대의 선택"],
    };
  }

  if (question.domain === "wellbeing") {
    return {
      headline: "사주로 질병을 판단하기보다, 지금 무너진 생활 리듬과 실제 불편을 먼저 확인하는 것이 좋습니다.",
      avoid: "피로·통증·수면 문제를 사주 때문이라고 단정해 필요한 의료 확인을 미루는 것.",
      choose: "생활 리듬을 기록하면서 증상이 지속되거나 심하면 의료기관에서 확인하는 것.",
      actions: [
        action("7일간 수면과 피로 기록하기", "취침·기상시간과 하루 피로도를 간단히 적습니다.", "7일 기록이 연속으로 남음"),
        action("하루 종료 시간을 정하기", "업무나 활동을 멈추고 쉬기 시작할 시간을 하나 정합니다.", "정한 종료 시간을 최소 5일 지켜봄"),
        action("지속되는 불편은 의료 확인하기", "증상이 계속되거나 악화되면 의료기관에서 상태를 확인합니다.", "필요한 경우 진료 예약 또는 상담을 완료함"),
      ],
      realityChecks: ["실제 증상과 지속기간", "수면시간", "복용 중인 약", "기존 질환", "의료진의 평가"],
      safetyNote: "이 답변은 질병 진단이나 치료를 대신하지 않습니다.",
    };
  }

  return {
    headline: "한 번에 크게 바꾸기보다, 지금 가장 바꾸고 싶은 것 하나를 작은 실험으로 확인하는 편이 좋습니다.",
    avoid: "막연한 변화 욕구 때문에 일·관계·돈을 동시에 크게 바꾸는 것.",
    choose: "변화 하나를 정해 짧게 시험하고, 실제 결과를 보고 확대할지 결정하는 것.",
    actions: [
      action("바꾸고 싶은 것 하나 고르기", "일·관계·돈·생활 중 지금 가장 답답한 영역 하나만 선택합니다.", "변화 대상이 하나로 정해짐"),
      action("30일짜리 작은 실험 만들기", "되돌릴 수 있는 범위에서 행동 하나를 30일 동안 시험합니다.", "무엇을 얼마나 할지 적힌 실험 계획이 있음"),
      action("유지·확대·중단 기준 정하기", "30일 뒤 어떤 결과면 계속하고 어떤 결과면 멈출지 미리 정합니다.", "세 가지 판단 기준이 문장으로 정리됨"),
    ],
    realityChecks: ["실제 비용", "시간 여유", "가족·직장 등 이해관계", "되돌릴 수 있는 범위"],
  };
}

export function buildRealityAnswerFallback(input: RealityAnswerBuildInput): RealityAnswer {
  const plan = domainPlan(input.question);
  const uncertainty: string[] = [
    "현재 V1은 대운 수준의 흐름만 사용하며 특정 월·날짜를 사주 근거로 정하지 않습니다.",
  ];
  if (!input.facts.hasTimeInput) {
    uncertainty.push("출생시간이 없어 시주와 정밀 대운 정보 일부를 사용하지 않습니다.");
  }

  const repeatingPattern = patternFor(input.question, input.facts, input.personality);
  const report = {
    questionReading: questionReadingFor(input.question, input.facts, input.personality),
    currentFlow: currentFlowReadingFor(input.question, input.facts),
    solutionReading: solutionReadingFor(input.question, plan.choose, plan.avoid, repeatingPattern),
  };

  return {
    question: input.question,
    headline: plan.headline,
    report,
    whyNow: report.currentFlow,
    repeatingPattern,
    avoid: plan.avoid,
    choose: plan.choose,
    actions: plan.actions,
    timing: timingFor(input.facts),
    realityChecks: plan.realityChecks,
    evidence: input.evidence,
    uncertainty,
    safetyNote: plan.safetyNote,
  };
}
