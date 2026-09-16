// SajuFacts를 "명식(命式)" 화면 표시용으로 변환하는 순수 레이어. 새 계산은
// 하나도 없다 — ssaju/oh-my-saju가 이미 계산해서 SajuFacts에 담아둔 값을
// 표시 순서·형태로만 재배열한다. 무료 결과에서 이 서비스의 실제 계산
// 깊이(자평진전·적천수)를 노출하는 게 목적이라, 없는 근거는 절대 말하지
// 않는다 — geukgukSource가 ssaju_fallback이면 판정 방식 문장을 아예 만들지
// 않는다(myeongsik-section.tsx가 그 문장을 렌더할지 말지 결정한다).

import type { SajuFacts, PillarFact, DaeunFact } from "@/lib/saju-facts";

export interface MyeongsikPillarView {
  pillar: PillarFact["pillar"];
  stemHanja: string | null;
  branchHanja: string | null;
  stemKo: string | null;
  branchKo: string | null;
  stemTenGod: string | null;
  branchTenGod: string | null;
}

export interface MyeongsikView {
  hasTimeInput: boolean;
  /** 항상 연/월/일/시 4개 — 시간 미상이면 hour 항목의 필드가 전부 null */
  pillars: MyeongsikPillarView[];
  fiveElements: Record<string, number>;
  geukguk: string;
  dayStrength: SajuFacts["dayStrength"];
  dayStrengthScore: number;
  geukgukSource: SajuFacts["geukgukSource"];
  wealthStarPillars: PillarFact["pillar"][];
  officerStarPillars: PillarFact["pillar"][];
  currentDaeun: DaeunFact | null;
}

const PILLAR_ORDER: PillarFact["pillar"][] = ["year", "month", "day", "hour"];

export function buildMyeongsikView(facts: SajuFacts): MyeongsikView {
  const byPillar = new Map(facts.pillars.map((p) => [p.pillar, p]));

  const pillars: MyeongsikPillarView[] = PILLAR_ORDER.map((pillar) => {
    const p = byPillar.get(pillar);
    if (!p) {
      return {
        pillar,
        stemHanja: null,
        branchHanja: null,
        stemKo: null,
        branchKo: null,
        stemTenGod: null,
        branchTenGod: null,
      };
    }
    return {
      pillar,
      stemHanja: p.stemHanja,
      branchHanja: p.branchHanja,
      stemKo: p.stemKo,
      branchKo: p.branchKo,
      stemTenGod: p.stemTenGod,
      branchTenGod: p.branchTenGod,
    };
  });

  return {
    hasTimeInput: facts.hasTimeInput,
    pillars,
    fiveElements: facts.fiveElements,
    geukguk: facts.geukguk,
    dayStrength: facts.dayStrength,
    dayStrengthScore: facts.dayStrengthScore,
    geukgukSource: facts.geukgukSource,
    wealthStarPillars: facts.wealthStarPillars,
    officerStarPillars: facts.officerStarPillars,
    currentDaeun: facts.currentDaeun,
  };
}
