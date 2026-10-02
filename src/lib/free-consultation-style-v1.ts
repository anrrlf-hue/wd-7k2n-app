import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";

export interface FreeConsultationSection {
  key: "self" | "relationship" | "work" | "money" | "life" | "strengths" | "cautions" | "now" | "future";
  eyebrow?: string;
  title: string;
  paragraphs: string[];
}

function textOf(paragraph: ReportParagraph | null | undefined): string | null {
  const text = paragraph?.text?.trim();
  return text || null;
}

function unique(parts: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    if (out.some((existing) => existing === value)) continue;
    out.push(value);
  }
  return out;
}

export function buildFreeConsultationSections(report: FreeSajuReport): FreeConsultationSection[] {
  const sections: FreeConsultationSection[] = [
    {
      key: "self",
      eyebrow: "먼저 나를 보면",
      title: "당신은 이런 사람입니다",
      paragraphs: unique([
        textOf(report.temperament),
        textOf(report.decisionStyle),
      ]),
    },
    {
      key: "relationship",
      eyebrow: "사람과 가까워질 때",
      title: "관계에서는 이렇게 나타나요",
      paragraphs: unique([
        textOf(report.relationshipStyle),
        textOf(report.loveStyle),
      ]),
    },
    {
      key: "work",
      eyebrow: "일을 할 때",
      title: "일에서는 이런 방식이 잘 드러납니다",
      paragraphs: unique([
        textOf(report.jobOrientation),
        textOf(report.teamStrength),
        textOf(report.soloStrength),
      ]),
    },
    {
      key: "money",
      eyebrow: "돈과 기회를 볼 때",
      title: "재물은 들어오는 방식과 남기는 방식이 다릅니다",
      paragraphs: unique([
        textOf(report.wealthStructure),
        textOf(report.earningStyle),
        textOf(report.keepingStyle),
        textOf(report.leakPattern),
      ]),
    },
    {
      key: "life",
      eyebrow: "생활 속에서는",
      title: "에너지를 쓰고 회복하는 방식도 보입니다",
      paragraphs: unique([
        textOf(report.lifeRhythm),
        textOf(report.realWorldPersonalization),
      ]),
    },
    {
      key: "strengths",
      eyebrow: "강점으로 쓰이면",
      title: "이런 장점이 살아납니다",
      paragraphs: report.strengths.map((item) => item.title + " — " + item.detail),
    },
    {
      key: "cautions",
      eyebrow: "반대로 지나치면",
      title: "이런 패턴은 조심해서 볼 만합니다",
      paragraphs: report.cautions.map((item) => item.title + " — " + item.detail),
    },
    {
      key: "now",
      eyebrow: "지금의 흐름",
      title: "지금은 무엇이 중요해지는 시기인가",
      paragraphs: unique([textOf(report.nextMove)]),
    },
    {
      key: "future",
      eyebrow: "앞으로의 변화",
      title: "다음 흐름에서는 무엇이 달라질까",
      paragraphs: unique([textOf(report.timingShift)]),
    },
  ];

  return sections.filter((section) => section.paragraphs.length > 0);
}

export const FREE_CONSULTATION_STYLE_RULES = [
  "원국 설명보다 사람을 먼저 설명한다.",
  "관계·일·돈·생활을 각각 다른 질문처럼 풀어 중복을 줄인다.",
  "전문용어는 기본 본문에 노출하지 않는다.",
  "현재 흐름과 앞으로의 변화는 실제 계산된 대운 정보만 사용한다.",
  "출생시간이 없으면 세밀한 시기를 새로 만들지 않는다.",
  "좋은 점만 이어붙이지 않고 강점과 그림자를 같이 보여준다.",
] as const;