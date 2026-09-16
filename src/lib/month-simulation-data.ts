// "한 달 살아보기" 1회차의 순수 데이터 — 선택지·금액·유형별 세트. 로직은
// month-simulation.ts에 있다. 유형별 조건(운영 문서 표 그대로):
//  - LEAK: 충동 지출(impulse) 선택지가 과반으로 자주 등장
//  - TIGHT: 시작 금액이 낮고 고정지출(fixed) 비중이 높음
//  - ACCUM: 남는 돈을 그대로 방치하는 옵션이 최소 1개 존재
//  - HOLD: 기회를 미루면(procrastinate 선택) 그 턴에 얻을 수 있었던 돈을
//    놓치는(순소득 0) opportunity 스텝이 최소 1개

import type { WealthTypeCode } from "@/lib/wealth-type-copy";

export interface MonthChoiceOption {
  id: string;
  label: string;
  /** 부호 있는 증감액(KRW). 0이면 이번 스텝에서 돈이 움직이지 않는다. */
  amountKrw: number;
}

export interface MonthChoiceStep {
  id: string;
  category: "fixed" | "social" | "impulse" | "procrastinate" | "opportunity";
  prompt: string;
  options: MonthChoiceOption[];
}

export const MONTH_SIM_STARTING_INCOME_KRW: Record<WealthTypeCode, number> = {
  ACCUM: 3_000_000,
  LEAK: 3_000_000,
  HOLD: 3_000_000,
  TIGHT: 2_200_000,
};

export const MONTH_SIM_STEPS: Record<WealthTypeCode, MonthChoiceStep[]> = {
  ACCUM: [
    { id: "fixed1", category: "fixed", prompt: "월세와 공과금이 빠져나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -900_000 }] },
    {
      id: "social1",
      category: "social",
      prompt: "동료 결혼식이 있습니다. 축의금을 얼마나 내시겠어요?",
      options: [
        { id: "basic", label: "기본으로 낸다", amountKrw: -100_000 },
        { id: "extra", label: "넉넉히 챙긴다", amountKrw: -200_000 },
      ],
    },
    {
      id: "impulse1",
      category: "impulse",
      prompt: "마음에 드는 옷을 발견했습니다.",
      options: [
        { id: "buy", label: "산다", amountKrw: -120_000 },
        { id: "skip", label: "넘어간다", amountKrw: 0 },
      ],
    },
    {
      id: "opportunity1",
      category: "opportunity",
      prompt: "동창 모임에서 괜찮은 이야기가 나옵니다.",
      options: [
        { id: "followup", label: "연락처를 받아둔다", amountKrw: 0 },
        { id: "pass", label: "그냥 듣고 흘린다", amountKrw: 0 },
      ],
    },
    { id: "fixed2", category: "fixed", prompt: "카드값과 통신비가 나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -600_000 }] },
    {
      id: "procrastinate1",
      category: "procrastinate",
      prompt: "이번 달 남은 돈을 어떻게 두시겠어요?",
      options: [
        { id: "leave", label: "통장에 그대로 둔다", amountKrw: 0 },
        { id: "spend", label: "보고 싶던 걸 산다", amountKrw: -300_000 },
      ],
    },
  ],
  LEAK: [
    { id: "fixed1", category: "fixed", prompt: "월세와 공과금이 빠져나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -900_000 }] },
    {
      id: "impulse1",
      category: "impulse",
      prompt: "SNS에서 예쁜 신상을 봤습니다.",
      options: [
        { id: "buy", label: "산다", amountKrw: -180_000 },
        { id: "skip", label: "넘어간다", amountKrw: 0 },
      ],
    },
    {
      id: "impulse2",
      category: "impulse",
      prompt: "친구가 저녁에 좋은 곳 가자고 합니다.",
      options: [
        { id: "go", label: "간다", amountKrw: -150_000 },
        { id: "home", label: "집밥으로 한다", amountKrw: 0 },
      ],
    },
    {
      id: "impulse3",
      category: "impulse",
      prompt: "장바구니에 담아둔 물건이 세일합니다.",
      options: [
        { id: "buy", label: "지른다", amountKrw: -220_000 },
        { id: "wait", label: "장바구니만 본다", amountKrw: 0 },
      ],
    },
    { id: "social1", category: "social", prompt: "경조사비가 나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -100_000 }] },
    {
      id: "procrastinate1",
      category: "procrastinate",
      prompt: "가계부를 정리할 시간이 났습니다.",
      options: [
        { id: "later", label: "나중에 한다", amountKrw: 0 },
        { id: "now", label: "지금 확인한다", amountKrw: 0 },
      ],
    },
    {
      id: "impulse4",
      category: "impulse",
      prompt: "택배가 계속 옵니다.",
      options: [
        { id: "buy", label: "계속 주문한다", amountKrw: -130_000 },
        { id: "stop", label: "멈춘다", amountKrw: 0 },
      ],
    },
  ],
  HOLD: [
    { id: "fixed1", category: "fixed", prompt: "월세와 공과금이 빠져나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -900_000 }] },
    {
      id: "opportunity1",
      category: "opportunity",
      prompt: "부업 제안이 들어왔습니다. 오늘 안에 답해야 마감 전에 참여할 수 있습니다.",
      options: [
        { id: "act", label: "지금 바로 참여한다", amountKrw: 150_000 },
        { id: "later", label: "나중에 생각해본다", amountKrw: 0 },
      ],
    },
    { id: "social1", category: "social", prompt: "경조사비가 나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -100_000 }] },
    { id: "fixed2", category: "fixed", prompt: "카드값이 나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -600_000 }] },
    {
      id: "opportunity2",
      category: "opportunity",
      prompt: "오늘까지만 신청받는 재테크 상품 안내가 왔습니다.",
      options: [
        { id: "act", label: "바로 알아보고 넣는다", amountKrw: 100_000 },
        { id: "later", label: "다음에 알아본다", amountKrw: 0 },
      ],
    },
    {
      id: "opportunity3",
      category: "opportunity",
      prompt: "안 쓰는 물건을 중고로 팔 수 있습니다.",
      options: [
        { id: "sell", label: "지금 올린다", amountKrw: 80_000 },
        { id: "later", label: "나중에 올린다", amountKrw: 0 },
      ],
    },
  ],
  TIGHT: [
    { id: "fixed1", category: "fixed", prompt: "월세와 공과금이 빠져나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -900_000 }] },
    { id: "fixed2", category: "fixed", prompt: "통신비와 보험료가 나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -150_000 }] },
    { id: "fixed3", category: "fixed", prompt: "교통비와 식비가 나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -400_000 }] },
    { id: "social1", category: "social", prompt: "경조사비가 나갑니다.", options: [{ id: "pay", label: "확인", amountKrw: -100_000 }] },
    {
      id: "impulse1",
      category: "impulse",
      prompt: "저렴한 간식을 발견했습니다.",
      options: [
        { id: "buy", label: "산다", amountKrw: -30_000 },
        { id: "skip", label: "참는다", amountKrw: 0 },
      ],
    },
    {
      id: "opportunity1",
      category: "opportunity",
      prompt: "친구가 무료 강의를 같이 듣자고 합니다.",
      options: [
        { id: "go", label: "간다", amountKrw: 0 },
        { id: "pass", label: "안 간다", amountKrw: 0 },
      ],
    },
  ],
};

export const MONTH_SIM_CLOSING_TEMPLATE_POSITIVE =
  "이번 달, {amount}원 남았습니다.\n특별히 잘못한 선택은 없었습니다. 하나하나는 다 이유가 있었고요.\n그런데 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.\n여기서 무엇을 바꿔야 하는지는 사람마다 다릅니다.\n이미 해보신 것과 아직 안 해보신 것이 다르기 때문입니다.";

export const MONTH_SIM_CLOSING_TEMPLATE_NEGATIVE =
  "이번 달, {amount}원이 부족합니다.\n특별히 잘못한 선택은 없었습니다. 하나하나는 다 이유가 있었고요.\n그런데 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.\n여기서 무엇을 바꿔야 하는지는 사람마다 다릅니다.\n이미 해보신 것과 아직 안 해보신 것이 다르기 때문입니다.";
