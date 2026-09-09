// Mini-IPIP(Donnellan et al., 2006) 문항 중 재무/성향 해석에 바로 쓸 수 있는
// 5개 요인 각 2문항(총 10문항)만 선별해 한국어로 옮긴 짧은 자기보고 검사.
// Mini-IPIP는 IPIP(International Personality Item Pool, Public Domain) 문항
// 풀에서 파생된 공개 문항이며, 상업적 사용에 제약이 없다 — 새 문항을 만들지
// 않고 기존 문항 텍스트만 재사용(REUSE)한다.
// 이 결과는 사주 해석을 "맞추기 위한" 용도가 아니라, 사주와 자기보고가
// 얼마나 일치/불일치하는지 보여주는 비교 자료로만 쓴다.

export type Big5Trait = "extraversion" | "agreeableness" | "conscientiousness" | "neuroticism" | "openness";

export interface Big5Item {
  id: string;
  trait: Big5Trait;
  text: string;
  /** true면 그대로, false면 역채점(6-score) */
  keyedPositive: boolean;
}

export const BIG5_ITEMS: Big5Item[] = [
  { id: "e1", trait: "extraversion", text: "나는 모임에서 분위기를 주도하는 편이다", keyedPositive: true },
  { id: "e2", trait: "extraversion", text: "나는 말을 많이 하지 않는 편이다", keyedPositive: false },
  { id: "a1", trait: "agreeableness", text: "나는 다른 사람의 감정에 잘 공감하는 편이다", keyedPositive: true },
  { id: "a2", trait: "agreeableness", text: "나는 다른 사람의 고민에 별로 관심이 없는 편이다", keyedPositive: false },
  { id: "c1", trait: "conscientiousness", text: "나는 해야 할 일을 바로바로 처리하는 편이다", keyedPositive: true },
  { id: "c2", trait: "conscientiousness", text: "나는 물건을 제자리에 두는 걸 자주 잊는 편이다", keyedPositive: false },
  { id: "n1", trait: "neuroticism", text: "나는 기분이 자주 오르내리는 편이다", keyedPositive: true },
  { id: "n2", trait: "neuroticism", text: "나는 대체로 마음이 편안한 편이다", keyedPositive: false },
  { id: "o1", trait: "openness", text: "나는 상상력이 풍부한 편이다", keyedPositive: true },
  { id: "o2", trait: "openness", text: "나는 추상적인 개념에 별로 흥미가 없는 편이다", keyedPositive: false },
];

export type Big5Level = "낮음" | "보통" | "높음";

export interface Big5Facts {
  scores: Record<Big5Trait, number>; // 1~5
  levels: Record<Big5Trait, Big5Level>;
}

function levelOf(score: number): Big5Level {
  if (score <= 2.3) return "낮음";
  if (score >= 3.7) return "높음";
  return "보통";
}

/** answers: 문항 id -> 1~5 응답. 10문항 전부 응답해야 완전한 결과가 나온다. */
export function scoreBig5(answers: Record<string, number>): Big5Facts {
  const traits: Big5Trait[] = ["extraversion", "agreeableness", "conscientiousness", "neuroticism", "openness"];
  const scores = {} as Record<Big5Trait, number>;
  const levels = {} as Record<Big5Trait, Big5Level>;

  for (const trait of traits) {
    const items = BIG5_ITEMS.filter((i) => i.trait === trait);
    const values = items.map((i) => {
      const raw = answers[i.id] ?? 3;
      return i.keyedPositive ? raw : 6 - raw;
    });
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    scores[trait] = Math.round(avg * 10) / 10;
    levels[trait] = levelOf(avg);
  }

  return { scores, levels };
}
