// "간접체험" 전용 데이터 — 순수 데이터, 로직 없음. 운영자가 검수 후 통째로
// 교체할 수 있어야 한다(wealth-type-copy.ts와 같은 패턴). 재물유형(4종)이
// 상황·선택지를 결정하는 주 분기축이고, 손금 키워드(HandShape)는 장면
// 도입부에 성향 묘사 한 줄을 얹는 보조 연출로만 쓴다 — 완전 교차(4×5)
// 시나리오를 전부 새로 쓰지 않는다(콘텐츠는 운영자 검수 필요 항목).
//
// 상황은 전부 사주 재물유형이 이미 짚은 "문제"를 그대로 체험 소재로 쓴다:
// ACCUM=모이는데 방치됨, LEAK=설명 안 되게 샘, HOLD=기회를 미루다 놓침,
// TIGHT=여유가 얇음. 특정 해법은 지목하지 않는다(기존 원칙 유지).

import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import type { PalmKeyword } from "@/lib/palm-keyword";

export interface ExperienceChoice {
  id: string;
  label: string;
  tone: "good" | "neutral" | "bad";
}

export interface ExperienceScene {
  id: string;
  situation: string;
  choices: ExperienceChoice[];
}

/** 손금 손 모양(HandShape)에 따른 성향 묘사 한 줄. unknown이면 문장을
 * 아예 생략한다(없는 근거를 말하지 않는다). */
export const PALM_FLAVOR_LINE: Record<PalmKeyword, string | null> = {
  square: "손이 사각형에 가까운 분들은 실용적이고 현실적으로 판단하는 편입니다.",
  rectangular: "손바닥이 길쭉한 사각형에 가까운 분들은 신중하게 따져보고 움직이는 편입니다.",
  elongated: "손가락이 길고 가느다란 분들은 섬세하고 감각적으로 판단하는 편입니다.",
  slender: "손이 갸름한 분들은 유연하고 직관적으로 움직이는 편입니다.",
  unknown: null,
};

export const INDIRECT_EXPERIENCE_SCENES: Record<WealthTypeCode, ExperienceScene[]> = {
  ACCUM: [
    {
      id: "accum1",
      situation: "월급이 들어왔습니다. 이번에도 특별히 쓸 곳을 정하지 않았습니다.",
      choices: [
        { id: "leave", label: "따로 정리하지 않고 그대로 둔다", tone: "bad" },
        { id: "sort", label: "일부를 다른 목적통장으로 옮겨본다", tone: "good" },
        { id: "later", label: "나중에 정리하기로 하고 미룬다", tone: "neutral" },
      ],
    },
    {
      id: "accum2",
      situation: "통장에 여유자금이 꽤 쌓였습니다. 어떻게 하시겠어요?",
      choices: [
        { id: "leave", label: "계속 그대로 둔다", tone: "bad" },
        { id: "review", label: "어디에 쓸지 한번 검토해본다", tone: "good" },
        { id: "later", label: "그냥 두되 나중에 생각한다", tone: "neutral" },
      ],
    },
    {
      id: "accum3",
      situation: "괜찮은 기회가 보였는데, 지금 자산이 어디에 얼마나 있는지 바로 확인이 안 됩니다.",
      choices: [
        { id: "skip", label: "기회를 넘긴다", tone: "bad" },
        { id: "check", label: "지금이라도 자산 현황을 정리해본다", tone: "good" },
        { id: "later", label: "다음에 생각한다", tone: "neutral" },
      ],
    },
  ],
  LEAK: [
    {
      id: "leak1",
      situation: "월급이 들어왔습니다. 이번 달에도 예상 못 한 지출이 벌써 몇 건 있었습니다.",
      choices: [
        { id: "ignore", label: "그냥 넘어간다", tone: "bad" },
        { id: "note", label: "어디에 썼는지 한번 적어본다", tone: "good" },
        { id: "shrug", label: "신경 쓰지 않는다", tone: "neutral" },
      ],
    },
    {
      id: "leak2",
      situation: "카드 명세서를 보니 기억 안 나는 결제가 여럿입니다.",
      choices: [
        { id: "ignore", label: "그냥 넘어간다", tone: "bad" },
        { id: "check", label: "하나씩 확인해본다", tone: "good" },
        { id: "later", label: "다음 달에 보기로 한다", tone: "neutral" },
      ],
    },
    {
      id: "leak3",
      situation: "월말, 예상보다 돈이 안 남았습니다.",
      choices: [
        { id: "ignore", label: "왜 그런지 몰라도 그냥 넘어간다", tone: "bad" },
        { id: "review", label: "이번 달 지출을 되짚어본다", tone: "good" },
        { id: "hope", label: "다음 달엔 다를 거라 생각한다", tone: "neutral" },
      ],
    },
  ],
  HOLD: [
    {
      id: "hold1",
      situation: "괜찮은 제안이 왔는데, 결정을 미루고 있습니다.",
      choices: [
        { id: "delay", label: "계속 미룬다", tone: "bad" },
        { id: "review", label: "지금 검토해본다", tone: "good" },
        { id: "later", label: "나중에 생각한다", tone: "neutral" },
      ],
    },
    {
      id: "hold2",
      situation: "묶여 있는 돈을 움직일 타이밍이 왔습니다.",
      choices: [
        { id: "leave", label: "그대로 둔다", tone: "bad" },
        { id: "move", label: "지금 움직여본다", tone: "good" },
        { id: "watch", label: "좀 더 지켜본다", tone: "neutral" },
      ],
    },
    {
      id: "hold3",
      situation: "다시 비슷한 기회가 왔습니다.",
      choices: [
        { id: "delay", label: "또 미룬다", tone: "bad" },
        { id: "decide", label: "이번엔 바로 결정한다", tone: "good" },
        { id: "think", label: "고민만 한다", tone: "neutral" },
      ],
    },
  ],
  TIGHT: [
    {
      id: "tight1",
      situation: "월급이 들어왔지만 고정지출이 대부분입니다.",
      choices: [
        { id: "same", label: "그냥 쓰던 대로 쓴다", tone: "bad" },
        { id: "check", label: "고정지출을 한번 점검해본다", tone: "good" },
        { id: "shrug", label: "어쩔 수 없다고 넘긴다", tone: "neutral" },
      ],
    },
    {
      id: "tight2",
      situation: "작은 지출 하나가 생겼습니다.",
      choices: [
        { id: "spend", label: "바로 쓴다", tone: "bad" },
        { id: "think", label: "정말 필요한지 한번 생각해본다", tone: "good" },
        { id: "delay", label: "미룬다", tone: "neutral" },
      ],
    },
    {
      id: "tight3",
      situation: "이번 달도 빠듯하게 끝났습니다.",
      choices: [
        { id: "same", label: "다음 달도 똑같을 거라 생각한다", tone: "bad" },
        { id: "plan", label: "어디서부터 손댈지 생각해본다", tone: "good" },
        { id: "ignore", label: "그냥 넘어간다", tone: "neutral" },
      ],
    },
  ],
};

export const EXPERIENCE_OUTCOME_TEXT: Record<WealthTypeCode, { good: string; mixed: string; bad: string }> = {
  ACCUM: {
    good: "쌓아둔 돈을 실제로 움직이기 시작했습니다. 방치되던 자산이 이제 일을 하기 시작합니다.",
    mixed: "일부는 정리했지만, 여전히 상당액이 그대로 멈춰 있습니다.",
    bad: "이번에도 돈은 쌓였지만 그대로입니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
  LEAK: {
    good: "어디로 새는지 조금씩 보이기 시작했습니다. 다음 달은 지금과 다를 수 있습니다.",
    mixed: "몇 군데는 짚었지만, 여전히 설명 안 되는 지출이 남아 있습니다.",
    bad: "이번 달도 돈이 어디로 갔는지 모른 채 끝났습니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
  HOLD: {
    good: "미루던 기회를 실제로 잡아봤습니다. 묶여 있던 돈과 기회가 조금씩 움직이기 시작합니다.",
    mixed: "한 번은 움직였지만, 여전히 망설이다 놓친 것도 있습니다.",
    bad: "이번에도 기회는 왔지만 그냥 지나갔습니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
  TIGHT: {
    good: "빠듯한 와중에도 어디서부터 손댈지 짚어봤습니다. 작지만 분명한 변화입니다.",
    mixed: "몇 가지는 점검했지만, 여전히 빠듯한 구조 자체는 그대로입니다.",
    bad: "이번 달도 여유 없이 끝났습니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
};
