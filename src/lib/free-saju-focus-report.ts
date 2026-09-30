import { daeunFlavor } from "@/lib/fortune-candidates";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { SajuFacts } from "@/lib/saju-facts";
import type { SajuFocus } from "@/lib/saju-focus";

export type FocusedSajuDomain = Exclude<SajuFocus, "overall">;

export interface FocusedSajuSection {
  title: string;
  paragraph: ReportParagraph;
}

export interface FocusedSajuReport {
  focus: FocusedSajuDomain;
  intro: string;
  sections: [
    FocusedSajuSection,
    FocusedSajuSection,
    FocusedSajuSection,
    FocusedSajuSection,
    FocusedSajuSection,
  ];
}

function p(title: string, text: string, evidence: string): FocusedSajuSection {
  return { title, paragraph: { text, evidence } };
}

function currentFlow(facts: SajuFacts, domain: FocusedSajuDomain): ReportParagraph {
  if (!facts.currentDaeun) {
    return {
      text:
        "출생시간이 없거나 현재 대운 정보가 충분하지 않아 지금 시기를 세밀하게 나누어 말하지 않습니다. 이 경우에는 타고난 성향과 분야별 기본 흐름을 중심으로 풀이합니다. 정확한 연도·월보다는 어떤 흐름이 반복되기 쉬운지를 넓게 보는 편이 맞습니다.",
      evidence: "현재 대운 정보 부족. 특정 월·날짜를 임의로 만들지 않음.",
    };
  }

  const flavor = daeunFlavor(facts.currentDaeun);
  const domainText: Record<FocusedSajuDomain, string> = {
    love_relationship:
      "관계에서는 새로운 인연이 들어오거나 기존 관계의 거리감이 달라지는 일이 평소보다 또렷하게 느껴질 수 있습니다. 마음이 움직이는 속도와 실제 관계가 가까워지는 속도가 다르게 나타날 수도 있습니다.",
    work:
      "일에서는 현재 역할이 달라지거나 새로운 제안·이동·독립에 대한 생각이 커질 수 있습니다. 실제 이직이나 사업뿐 아니라 맡는 일의 성격이 바뀌는 방식으로도 흐름이 나타날 수 있습니다.",
    money:
      "재물에서는 돈과 관련된 기회·보상·거래가 평소보다 자주 움직이는 느낌이 커질 수 있습니다. 한 번의 큰돈보다 수입 기회가 늘거나 돈과 관련된 선택이 많아지는 방식으로 나타날 수도 있습니다.",
    wellbeing:
      "생활에서는 평소 유지하던 리듬이 달라지거나 에너지를 쓰는 방식의 변화가 더 크게 느껴질 수 있습니다. 사주에서는 생활 흐름까지만 보며 질병이나 치료 시기를 뜻하는 것은 아닙니다.",
  };

  return {
    text:
      facts.currentDaeun.ageRange +
      "세부터 이어지는 현재 대운은 " +
      flavor +
      " 흐름으로 읽힙니다. " +
      domainText[domain] +
      " 이 흐름은 특정 사건을 확정하는 예언이 아니라 어떤 주제가 상대적으로 더 부각되는지를 보는 시기 흐름입니다.",
    evidence:
      "현재 대운 " +
      facts.currentDaeun.ageRange +
      "세 " +
      facts.currentDaeun.ganzhi +
      ". 대운 수준 해석만 사용.",
  };
}

function conflictPattern(facts: SajuFacts): ReportParagraph {
  if (facts.dayStrength === "strong") {
    return {
      text:
        "마음이 정해지면 결론을 오래 끌지 않는 편이라 갈등에서도 내 기준을 먼저 세울 수 있습니다. 이 힘은 관계를 분명하게 만들지만, 이미 결론을 낸 뒤에는 상대의 설명을 충분히 듣지 못할 수 있습니다. 중요한 관계일수록 결론을 말하기 전에 서로 원하는 것을 한 번 더 확인하는 편이 좋습니다.",
      evidence: "일간 강약 " + facts.dayStrength + ". 관계 결과가 아니라 본인의 결정 성향만 해석.",
    };
  }
  if (facts.dayStrength === "weak") {
    return {
      text:
        "갈등이 생기면 상대의 반응과 분위기를 많이 살피는 편이라 내 불편을 바로 말하지 못할 수 있습니다. 관계를 지키는 힘은 좋지만 참는 시간이 길어지면 작은 문제가 한꺼번에 커질 수 있습니다. 불편이 작을 때 행동 단위로 말하는 것이 관계를 오래 끄는 것보다 도움이 됩니다.",
      evidence: "일간 강약 " + facts.dayStrength + ". 상대방의 마음은 판단하지 않음.",
    };
  }
  return {
    text:
      "갈등이 생기면 내 입장과 상대 입장을 모두 보려는 편이라 중간에서 조율하는 힘이 있습니다. 다만 양쪽을 다 이해하려고 하다 보면 정작 내 결론이 늦어질 수 있습니다. 어떤 것은 조정할 수 있고 어떤 것은 양보하지 않을지 먼저 나누는 편이 좋습니다.",
    evidence: "일간 강약 " + facts.dayStrength + ".",
  };
}

function workDecisionPattern(facts: SajuFacts): ReportParagraph {
  const output = facts.outputStarCount;
  const officer = facts.officerStarCount;
  const peer = facts.peerStarCount;

  if (output + peer > officer) {
    return {
      text:
        "일에서는 정해진 역할을 수행하는 것만큼 내가 직접 판단하고 움직일 여지가 있어야 힘이 붙는 편입니다. 답답함이 커지면 환경 자체를 바꾸고 싶어질 수 있지만, 이직이나 사업은 자유로움만으로 결정하면 같은 문제가 반복될 수 있습니다. 다음 자리에서 실제로 가질 권한과 책임, 결과로 남길 것을 먼저 확인하는 편이 좋습니다.",
      evidence: "식상 " + output + "개 · 비겁 " + peer + "개 · 관성 " + officer + "개.",
    };
  }

  return {
    text:
      "일에서는 역할과 책임, 기대치가 분명한 환경에서 안정적으로 힘을 쓰는 편입니다. 반대로 기준이 자주 바뀌거나 책임만 있고 결정권이 적은 자리에서는 피로가 커질 수 있습니다. 직장을 옮기거나 새 역할을 받을 때는 이름보다 실제 업무 범위와 평가기준을 먼저 보는 편이 맞습니다.",
    evidence: "관성 " + officer + "개 · 식상 " + output + "개 · 비겁 " + peer + "개.",
  };
}

function moneyPattern(facts: SajuFacts): ReportParagraph {
  if (facts.outputStarCount + facts.wealthStarCount > facts.officerStarCount + facts.resourceStarCount) {
    return {
      text:
        "돈에서는 기회를 발견하고 움직이는 쪽의 힘이 상대적으로 먼저 살아나는 편입니다. 벌 기회를 찾는 감각이 있어도 동시에 여러 선택을 잡으면 돈과 시간이 분산될 수 있습니다. 새 기회를 더 찾기 전에 지금 들어오는 돈이 실제로 어디에 남는지 확인하는 것이 재물 흐름을 안정시키는 데 중요합니다.",
      evidence:
        "식상 " +
        facts.outputStarCount +
        "개 · 재성 " +
        facts.wealthStarCount +
        "개 · 관성 " +
        facts.officerStarCount +
        "개 · 인성 " +
        facts.resourceStarCount +
        "개.",
    };
  }

  return {
    text:
      "돈에서는 크게 한 번 움직이기보다 지키고 누적하는 기준이 중요하게 작용하는 편입니다. 신중함은 손실을 줄이는 장점이 있지만, 모든 조건이 완벽해질 때까지 기다리면 좋은 선택도 늦어질 수 있습니다. 감당할 수 있는 범위를 먼저 정하고 그 안에서 작은 결정을 실행하는 편이 잘 맞습니다.",
    evidence:
      "관성 " +
      facts.officerStarCount +
      "개 · 인성 " +
      facts.resourceStarCount +
      "개 · 재성 " +
      facts.wealthStarCount +
      "개.",
  };
}

function wellbeingPattern(facts: SajuFacts): ReportParagraph {
  if (facts.outputStarCount > facts.resourceStarCount) {
    return {
      text:
        "생각이 생기면 움직이고 결과를 만들어야 답답함이 풀리는 편이라 바쁠 때 오히려 속도가 붙을 수 있습니다. 문제는 멈추는 시점을 놓치면 피로가 뒤늦게 몰릴 수 있다는 점입니다. 하루를 끝내는 시간과 쉬는 시간을 일정에 먼저 넣는 방식이 생활 리듬을 지키는 데 도움이 됩니다.",
      evidence:
        "식상 " +
        facts.outputStarCount +
        "개 · 인성 " +
        facts.resourceStarCount +
        "개. 의료 진단이 아닌 생활 성향 해석.",
    };
  }

  return {
    text:
      "혼자 생각을 정리하고 충분히 쉬어야 다시 움직일 힘이 생기는 편입니다. 사람과 일정이 계속 겹치면 겉으로는 버텨도 안에서 피로가 오래 남을 수 있습니다. 조용히 쉬는 시간과 정보에서 떨어지는 시간을 의식적으로 만드는 편이 회복 리듬에 잘 맞습니다.",
    evidence:
      "인성 " +
      facts.resourceStarCount +
      "개 · 식상 " +
      facts.outputStarCount +
      "개. 질병·치료 예측에 사용하지 않음.",
  };
}

export function buildFocusedSajuReport(
  facts: SajuFacts,
  report: FreeSajuReport,
  focus: SajuFocus,
): FocusedSajuReport | null {
  if (focus === "overall") return null;

  if (focus === "love_relationship") {
    const conflict = conflictPattern(facts);
    const flow = currentFlow(facts, focus);
    return {
      focus,
      intro:
        "연애와 인간관계를 따로 떼기보다, 사람을 믿고 가까워지고 갈등을 풀어가는 내 방식 전체를 깊게 봅니다.",
      sections: [
        p("관계에서 내가 중요하게 보는 것", report.relationshipStyle.text, report.relationshipStyle.evidence),
        p("연애에서 마음이 움직이는 방식", report.loveStyle.text, report.loveStyle.evidence),
        p("갈등이 생길 때 반복하기 쉬운 패턴", conflict.text, conflict.evidence),
        p("지금 관계 흐름을 보는 법", flow.text, flow.evidence),
        p(
          "인연 흐름이 나타나는 모습",
          "인연운이 움직이는 시기에는 꼭 새로운 연애가 바로 시작되는 것만 뜻하지 않습니다. 소개나 새로운 만남이 늘거나, 알고 지내던 사람이 갑자기 가까워지거나, 기존 관계의 방향이 달라지는 식으로도 나타날 수 있습니다. 상대방의 마음 자체는 내 사주만으로 확정할 수 없으므로 관계의 시작 여부와는 구분해서 봅니다.",
          "관계 흐름은 본인 사주 기준. 상대방 의사와 실제 관계 결과는 별도.",
        ),
      ],
    };
  }

  if (focus === "work") {
    const workPattern = workDecisionPattern(facts);
    const flow = currentFlow(facts, focus);
    return {
      focus,
      intro:
        "취업·이직·직장·사업을 한 묶음으로 보고, 어떤 환경에서 힘이 나고 어떤 선택에서 같은 답답함이 반복되는지 깊게 봅니다.",
      sections: [
        p("일할 때 힘이 나는 조건", report.jobOrientation.text, report.jobOrientation.evidence),
        p(
          "조직 안과 혼자 움직일 때의 차이",
          report.teamStrength.text + " " + report.soloStrength.text,
          report.teamStrength.evidence + " / " + report.soloStrength.evidence,
        ),
        p("이직·사업 앞에서 결정하는 방식", workPattern.text, workPattern.evidence),
        p("지금 일의 흐름을 보는 법", flow.text, flow.evidence),
        p(
          "일의 변화가 나타나는 모습",
          "일의 흐름이 강해지는 시기에는 실제 이직만이 아니라 새로운 역할, 책임의 변화, 팀 이동, 제안, 독립에 대한 생각처럼 여러 모습이 함께 나타날 수 있습니다. 같은 사주 흐름도 현재 직장에 있는 사람과 사업을 하는 사람에게는 서로 다른 사건으로 보일 수 있습니다. 그래서 이 분야는 '무슨 일이 반드시 생긴다'보다 변화가 어느 방향으로 모이는지를 봅니다.",
          "일의 변화는 직업 형태에 따라 다른 사건으로 나타날 수 있음.",
        ),
      ],
    };
  }

  if (focus === "money") {
    const pattern = moneyPattern(facts);
    const flow = currentFlow(facts, focus);
    return {
      focus,
      intro:
        "재물운을 한 줄로 좋다·나쁘다 판단하지 않고, 돈과 기회가 들어오는 방식과 재물 흐름이 강해지는 때를 깊게 봅니다.",
      sections: [
        p(
          "내 재물 성향의 기본 구조",
          report.wealthStructure.text +
            " 재물운은 단순히 많고 적음보다 어떤 형태의 기회가 반복해서 들어오고, 그 흐름이 어느 시기에 강해지는지를 함께 보는 편이 더 자연스럽습니다.",
          report.wealthStructure.evidence,
        ),
        p(
          "돈을 만드는 방식",
          report.earningStyle.text +
            " 같은 재물 구조라도 사람마다 실제로 나타나는 모습은 다르며, 일거리·보상·거래·새로운 기회처럼 여러 형태로 드러날 수 있습니다.",
          report.earningStyle.evidence,
        ),
        p(
          "돈이 머물고 빠지는 패턴",
          report.keepingStyle.text + " " + report.leakPattern.text + " " + pattern.text,
          report.keepingStyle.evidence + " / " + report.leakPattern.evidence + " / " + pattern.evidence,
        ),
        p("지금 재물 흐름을 보는 법", flow.text, flow.evidence),
        p(
          "재물 흐름이 강해질 때 나타나는 모습",
          "재물운이 강해진다는 것은 돈이 자동으로 늘어난다는 뜻보다 돈과 관련된 움직임이 커지는 시기에 가깝습니다. 새로운 수입 기회나 보상, 거래, 지출 결정이 함께 많아질 수 있고 사람에 따라서는 돈보다 일의 기회가 먼저 들어오는 모습으로 나타날 수도 있습니다. 투자나 수익 결과를 보장하는 뜻으로 해석하지는 않습니다.",
          "재물 흐름과 실제 투자·수익 결과는 동일하지 않음.",
        ),
      ],
    };
  }

  const rhythm = wellbeingPattern(facts);
  const flow = currentFlow(facts, focus);
  return {
    focus,
    intro:
      "질병을 예측하는 방식이 아니라, 평소 에너지를 쓰고 스트레스를 받고 다시 회복하는 생활 패턴을 깊게 봅니다.",
    sections: [
      p("내 생활 리듬의 기본형", report.lifeRhythm.text, report.lifeRhythm.evidence),
      p("스트레스가 쌓이기 쉬운 방식", rhythm.text, rhythm.evidence),
      p("결정이 많을 때 리듬이 흔들리는 방식", report.decisionStyle.text, report.decisionStyle.evidence),
      p("지금 생활 흐름을 보는 법", flow.text, flow.evidence),
      p(
        "현실에서 꼭 확인할 것",
        "사주로 질병이나 장기 상태를 진단할 수는 없습니다. 수면시간, 피로가 지속되는 기간, 통증이나 불편의 변화처럼 실제 생활기록을 먼저 보고, 증상이 계속되거나 심해지면 의료기관에서 확인하는 것이 우선입니다. 여기서는 생활 리듬을 돌아보는 참고까지만 사용합니다.",
        "증상·질환·치료 여부는 의료적으로 확인해야 하며 사주 판단 대상이 아님.",
      ),
    ],
  };
}
