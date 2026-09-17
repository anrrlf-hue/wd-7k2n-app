import { EMERGENCY_FUND_OPTIONS, FUTURE_EVENT_AMOUNT_OPTIONS, FUTURE_EVENT_PREPARED_OPTIONS, FUTURE_EVENT_TIMING_OPTIONS, type SurveyInput, type SurveyOption } from "@/lib/survey-input";

type EventPlan = { label: string; timing: string } & (
  | { kind: "purpose"; amount: string; prepared: string }
  | { kind: "income"; income: string; buffer: string }
);

const purpose = (label: string, timing: string, fund: string): EventPlan => ({
  label, kind: "purpose", timing,
  amount: `${label}에 필요한 자금은 어느 정도인가요?`,
  prepared: `현재 ${fund}은 어느 정도 준비되어 있나요?`,
});
const income = (label: string, timing: string): EventPlan => ({
  label, kind: "income", timing,
  income: `${label === "휴직" ? "휴직 기간의" : label === "이직" ? "이직 전후의" : "퇴직 후"} 소득은 어떻게 달라질 예정인가요?`,
  buffer: `${label}에 대비해 바로 쓸 생활비는 몇 개월분 준비되어 있나요?`,
});

export const FUTURE_EVENT_PLANS: Record<string, EventPlan> = {
  marriage: purpose("결혼", "결혼은 언제쯤 예정되어 있나요?", "결혼자금"),
  moving: purpose("이사", "이사는 언제쯤 예정되어 있나요?", "이사자금"),
  home_purchase: purpose("주택 구입", "주택 구입은 언제쯤 계획하고 있나요?", "주택 구입자금"),
  car: purpose("자동차 구입", "자동차 구입은 언제쯤 계획하고 있나요?", "자동차 구입자금"),
  startup: purpose("창업", "창업은 언제쯤 계획하고 있나요?", "창업자금"),
  childbirth: purpose("출산", "출산은 언제쯤 예정되어 있나요?", "출산 준비자금"),
  medical: purpose("치료·수술", "치료·수술은 언제쯤 예정되어 있나요?", "치료·수술 자금"),
  leave: income("휴직", "휴직은 언제부터 예정되어 있나요?"),
  retirement: income("퇴직", "퇴직은 언제쯤 예정되어 있나요?"),
  job_change: income("이직", "이직은 언제쯤 계획하고 있나요?"),
};

export const INCOME_CHANGE_OPTIONS: SurveyOption[] = [
  { value: "same", label: "유지되거나 늘어남" },
  { value: "reduced", label: "일부 줄어듦" },
  { value: "stopped", label: "한동안 소득이 없음" },
  { value: "unknown", label: "아직 모름" },
];
export const LIVING_BUFFER_OPTIONS: SurveyOption[] = [...EMERGENCY_FUND_OPTIONS, { value: "unknown", label: "아직 모름" }];

export function primaryFutureEvent(input: Pick<SurveyInput, "futureEvents" | "primaryFutureEvent">): string | undefined {
  const events = input.futureEvents;
  if (!events.length || events.includes("none") || events.some((id) => !Object.hasOwn(FUTURE_EVENT_PLANS, id))) return undefined;
  if (input.primaryFutureEvent) return events.includes(input.primaryFutureEvent) ? input.primaryFutureEvent : undefined;
  return events.length === 1 ? events[0] : undefined;
}
export function futureEventPlan(input: Pick<SurveyInput, "futureEvents" | "primaryFutureEvent">): EventPlan | undefined {
  const id = primaryFutureEvent(input);
  return id ? FUTURE_EVENT_PLANS[id] : undefined;
}
const has = (options: SurveyOption[], value?: string) => options.some((option) => option.value === value);

/** "아직 모름" is a completed answer, but cannot support a financial diagnosis. */
export function futureEventAnswersComplete(input: SurveyInput): boolean {
  if (input.futureEvents.length === 1 && input.futureEvents[0] === "none") return true;
  const plan = futureEventPlan(input);
  if (!plan || !has(FUTURE_EVENT_TIMING_OPTIONS, input.futureEventTiming)) return false;
  return plan.kind === "purpose"
    ? has(FUTURE_EVENT_AMOUNT_OPTIONS, input.futureEventAmount) && has(FUTURE_EVENT_PREPARED_OPTIONS, input.futureEventPrepared)
    : has(INCOME_CHANGE_OPTIONS, input.futureIncomeChange) && has(LIVING_BUFFER_OPTIONS, input.futureLivingBuffer);
}
export function futureEventNeedsClarification(input: SurveyInput): boolean {
  return futureEventPlan(input)?.kind === "income" && (input.futureIncomeChange === "unknown" || input.futureLivingBuffer === "unknown");
}

function resetEventAnswers(input: SurveyInput): SurveyInput {
  return { ...input, futureEventTiming: undefined, futureEventAmount: undefined, futureEventPrepared: undefined, futureIncomeChange: undefined, futureLivingBuffer: undefined };
}
export function selectFutureEvents(input: SurveyInput, events: string[]): SurveyInput {
  // Adding a second event requires an explicit priority; don't silently pick one.
  const primary = events.length === 1 ? events[0] : input.futureEvents.length > 1 && events.includes(input.primaryFutureEvent ?? "") ? input.primaryFutureEvent : undefined;
  const next = { ...input, futureEvents: events, primaryFutureEvent: primary === "none" ? undefined : primary };
  return primaryFutureEvent(input) === primaryFutureEvent(next) ? next : resetEventAnswers(next);
}
export function selectPrimaryFutureEvent(input: SurveyInput, primary: string): SurveyInput {
  const next = { ...input, primaryFutureEvent: input.futureEvents.includes(primary) ? primary : undefined };
  return primaryFutureEvent(input) === primaryFutureEvent(next) ? next : resetEventAnswers(next);
}
