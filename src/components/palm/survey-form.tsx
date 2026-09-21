"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanionHeading } from "@/components/angel-companion";
import { FINANCE_QUESTIONS, type FinanceQuestionId } from "@/lib/finance-question";
import {
  futureEventAnswersComplete,
  futureEventPlan,
  INCOME_CHANGE_OPTIONS,
  LIVING_BUFFER_OPTIONS,
  primaryFutureEvent,
  selectFutureEvents,
  selectPrimaryFutureEvent,
} from "@/lib/future-event";
import {
  DEBT_INTEREST_OPTIONS,
  DEBT_MATURITY_OPTIONS,
  DEBT_PAYMENT_OPTIONS,
  EMERGENCY_FUND_OPTIONS,
  EXPENSE_AWARENESS_OPTIONS,
  FUTURE_EVENT_AMOUNT_OPTIONS,
  FUTURE_EVENT_OPTIONS,
  FUTURE_EVENT_PREPARED_OPTIONS,
  FUTURE_EVENT_TIMING_OPTIONS,
  JOB_TYPE_OPTIONS,
  MONEY_MANAGEMENT_UNIT_OPTIONS,
  PRIVACY_NOTICE,
  REPAYMENT_TYPE_OPTIONS,
  SPENDING_PATTERN_OPTIONS,
  type SurveyInput,
  type SurveyOption,
} from "@/lib/survey-input";

function TapOption({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "rounded-full border min-h-11 px-3 py-2 text-[15px] transition-colors " +
        (selected
          ? "border-(--gold) bg-(--gold-soft) text-(--gold)"
          : "border-border text-foreground/80")
      }
    >
      {label}
    </button>
  );
}

function SingleSelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SurveyOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="survey-field">
      <legend className="text-base font-medium">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((option) => (
          <TapOption
            key={option.value}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
            label={option.label}
          />
        ))}
      </div>
    </fieldset>
  );
}

function MultiSelectField({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: SurveyOption[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    if (value === "none") {
      onChange(values.includes("none") ? [] : ["none"]);
      return;
    }
    const next = values.filter((item) => item !== "none");
    onChange(next.includes(value) ? next.filter((item) => item !== value) : [...next, value]);
  }

  return (
    <fieldset className="survey-field">
      <legend className="text-base font-medium">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((option) => (
          <TapOption
            key={option.value}
            selected={values.includes(option.value)}
            onClick={() => toggle(option.value)}
            label={option.label}
          />
        ))}
      </div>
    </fieldset>
  );
}

function NumberField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper?: string;
}) {
  const id = useId();
  return (
    <div className="survey-field">
      <label htmlFor={id} className="text-base font-medium">{label}</label>
      {helper && <p className="mt-1 text-sm text-muted-foreground">{helper}</p>}
      <input
        id={id}
        min={0}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value / 10000 : ""}
        onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value) * 10000)}
        placeholder="예: 300"
        className="mt-2 min-h-11 w-full border-none bg-transparent p-0 text-xl font-semibold tabular-nums outline-none"
      />
    </div>
  );
}

function MoneyStringField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="survey-field">
      <label htmlFor={id} className="text-base font-medium">{label}</label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          min={0}
          step="0.1"
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예: 250"
          className="min-h-11 min-w-0 flex-1 border-none bg-transparent p-0 text-xl font-semibold tabular-nums outline-none"
        />
        <span className="text-sm text-muted-foreground">만원</span>
      </div>
    </div>
  );
}

const initialInput: SurveyInput = {
  biggestConcern: "",
  financeQuestionIds: [],
  jobType: "",
  futureEvents: [],
  monthlyIncomeKrw: NaN,
  monthlyFixedCostKrw: NaN,
  monthlyLivingCostKrw: NaN,
  monthlySavingsKrw: NaN,
  expenseAwareness: "",
  emergencyFund: "",
  moneyManagementUnit: "",
  spendingPatterns: ["none"],
};

export function SurveyForm({
  onComplete,
  onBack,
  initialValue,
}: {
  onComplete: (input: SurveyInput) => void;
  onBack: () => void;
  initialValue?: SurveyInput;
}) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<SurveyInput>(initialValue ?? initialInput);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, [step]);

  function set<K extends keyof SurveyInput>(key: K, value: SurveyInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const eventPlan = futureEventPlan(input);
  const primaryEvent = primaryFutureEvent(input);
  const hasFutureEvent = input.futureEvents.length > 0 && !input.futureEvents.includes("none");

  const step1Complete =
    (input.financeQuestionIds ?? []).length > 0 &&
    input.jobType !== "" &&
    input.moneyManagementUnit !== "" &&
    input.futureEvents.length > 0 &&
    (!hasFutureEvent || Boolean(primaryEvent)) &&
    futureEventAnswersComplete(input);

  const freelancerComplete =
    input.jobType !== "freelancer" ||
    [input.freelancerIncomeLow, input.freelancerIncomeAvg, input.freelancerIncomeHigh]
      .every((value) => Boolean(value?.trim()));

  const debtComplete =
    input.hasDebt !== true ||
    Boolean(
      input.debtInterestRate &&
      input.debtMonthlyPayment &&
      input.debtMaturity &&
      input.debtRepaymentType,
    );

  const businessComplete =
    input.jobType !== "business_owner" && input.moneyManagementUnit !== "mixed_biz_personal"
      ? true
      : input.businessSeparatesFinance !== undefined;

  const step2Complete =
    [input.monthlyIncomeKrw, input.monthlyFixedCostKrw, input.monthlyLivingCostKrw, input.monthlySavingsKrw]
      .every((value) => Number.isFinite(value) && value >= 0) &&
    input.expenseAwareness !== "" &&
    input.emergencyFund !== "" &&
    input.hasDebt !== undefined &&
    debtComplete &&
    freelancerComplete &&
    businessComplete;

  return (
    <div ref={topRef} className="survey-form flex flex-1 flex-col scroll-mt-6">
      <CompanionHeading state="finance-guide">
        <p className="section-eyebrow">현실 재무질문 · {step} / 2</p>
        <h2 className="mt-2 text-2xl font-semibold">
          {step === 1 ? "지금의 상황부터" : "한 달의 흐름만 확인할게요"}
        </h2>
      </CompanionHeading>

      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        {step === 1
          ? "사주에서 본 나를 실제 삶으로 이어보기 위해, 지금의 상황을 조금만 더 알려주세요."
          : "사주에서 본 성향과 지금의 생활을 함께 놓고, 앞으로의 방향을 더 구체적으로 이어봅니다."}
      </p>
      {step === 1 && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{PRIVACY_NOTICE}</p>}

      {step === 1 && (
        <div className="mt-4 space-y-4">
          <MultiSelectField
            label="지금 신경 쓰이는 고민을 모두 골라주세요"
            options={FINANCE_QUESTIONS.map((question) => ({ value: question.id, label: question.label }))}
            values={input.financeQuestionIds ?? []}
            onChange={(values) => set("financeQuestionIds", values as FinanceQuestionId[])}
          />

          <div className="survey-field">
            <label htmlFor="money-concern" className="text-base font-medium">
              추가로 적고 싶은 내용 <span className="text-sm text-muted-foreground">· 선택</span>
            </label>
            <textarea
              id="money-concern"
              value={input.biggestConcern}
              onChange={(event) => set("biggestConcern", event.target.value)}
              placeholder="예: 2년 안에 결혼도 준비하고 싶은데 대출도 있어서 무엇부터 해야 할지 고민돼요"
              rows={3}
              className="mt-1.5 w-full resize-none border-none bg-transparent p-0 text-base outline-none"
            />
          </div>

          <SingleSelectField
            label="지금 어떤 형태로 일하고 계세요?"
            options={JOB_TYPE_OPTIONS}
            value={input.jobType}
            onChange={(value) => set("jobType", value)}
          />

          <div>
            <SingleSelectField
              label="앞으로 입력할 소득·지출은 어디까지 포함할까요?"
              options={MONEY_MANAGEMENT_UNIT_OPTIONS}
              value={input.moneyManagementUnit}
              onChange={(value) => set("moneyManagementUnit", value)}
            />
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              예: 부모님이 생활비나 주거비를 계속 지원하고 있다면 ‘부모·가족의 지원까지 포함’을 선택해주세요.
            </p>
          </div>

          <MultiSelectField
            label="1년 안팎으로 예정된 큰 변화가 있나요?"
            options={FUTURE_EVENT_OPTIONS}
            values={input.futureEvents}
            onChange={(values) => setInput((prev) => selectFutureEvents(prev, values))}
          />

          {hasFutureEvent && input.futureEvents.length > 1 && (
            <SingleSelectField
              label="지금 가장 먼저 준비해야 하는 하나를 골라주세요"
              options={FUTURE_EVENT_OPTIONS.filter((option) => input.futureEvents.includes(option.value))}
              value={primaryEvent}
              onChange={(value) => setInput((prev) => selectPrimaryFutureEvent(prev, value))}
            />
          )}

          {eventPlan && (
            <SingleSelectField
              label={eventPlan.timing}
              options={FUTURE_EVENT_TIMING_OPTIONS}
              value={input.futureEventTiming}
              onChange={(value) => set("futureEventTiming", value)}
            />
          )}

          {eventPlan?.kind === "purpose" && (
            <>
              <SingleSelectField
                label={eventPlan.amount}
                options={FUTURE_EVENT_AMOUNT_OPTIONS}
                value={input.futureEventAmount}
                onChange={(value) => set("futureEventAmount", value)}
              />
              <SingleSelectField
                label={eventPlan.prepared}
                options={FUTURE_EVENT_PREPARED_OPTIONS}
                value={input.futureEventPrepared}
                onChange={(value) => set("futureEventPrepared", value)}
              />
            </>
          )}

          {eventPlan?.kind === "income" && (
            <>
              <SingleSelectField
                label={eventPlan.income}
                options={INCOME_CHANGE_OPTIONS}
                value={input.futureIncomeChange}
                onChange={(value) => set("futureIncomeChange", value)}
              />
              <SingleSelectField
                label={eventPlan.buffer}
                options={LIVING_BUFFER_OPTIONS}
                value={input.futureLivingBuffer}
                onChange={(value) => set("futureLivingBuffer", value)}
              />
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 space-y-4">
          <NumberField
            label="월 실수령 또는 월 평균 소득(만원)"
            value={input.monthlyIncomeKrw}
            onChange={(value) => set("monthlyIncomeKrw", value)}
          />
          <NumberField
            label="월 고정지출·대출상환액(만원)"
            value={input.monthlyFixedCostKrw}
            onChange={(value) => set("monthlyFixedCostKrw", value)}
            helper="월세·보험·정기결제·대출 원리금처럼 반복해서 나가는 돈을 합쳐주세요."
          />
          <NumberField
            label="월 생활비·변동지출(만원)"
            value={input.monthlyLivingCostKrw}
            onChange={(value) => set("monthlyLivingCostKrw", value)}
          />
          <NumberField
            label="월 저축·투자액(만원)"
            value={input.monthlySavingsKrw}
            onChange={(value) => set("monthlySavingsKrw", value)}
          />

          <SingleSelectField
            label="내 지출을 얼마나 정확히 알고 있나요?"
            options={EXPENSE_AWARENESS_OPTIONS}
            value={input.expenseAwareness}
            onChange={(value) => set("expenseAwareness", value)}
          />

          <SingleSelectField
            label="바로 꺼내 쓸 돈으로 생활비를 얼마나 버틸 수 있나요?"
            options={EMERGENCY_FUND_OPTIONS}
            value={input.emergencyFund}
            onChange={(value) => set("emergencyFund", value)}
          />

          <div className="survey-field">
            <p className="text-base font-medium">대출이나 빚이 있나요?</p>
            <div className="mt-2.5 flex gap-2">
              <TapOption
                selected={input.hasDebt === false}
                onClick={() => set("hasDebt", false)}
                label="없음"
              />
              <TapOption
                selected={input.hasDebt === true}
                onClick={() => set("hasDebt", true)}
                label="있음"
              />
            </div>
          </div>

          {input.hasDebt === true && (
            <>
              <p className="px-1 pt-2 text-sm leading-6 text-muted-foreground">
                부채가 있다면 잔액만 보지 않고 금리·월 상환·만기·상환방식을 함께 확인합니다.
              </p>
              <SingleSelectField
                label="가장 높은 대출 금리는 어느 구간인가요?"
                options={DEBT_INTEREST_OPTIONS}
                value={input.debtInterestRate}
                onChange={(value) => set("debtInterestRate", value)}
              />
              <SingleSelectField
                label="한 달에 실제로 갚는 금액은 어느 정도인가요?"
                options={DEBT_PAYMENT_OPTIONS}
                value={input.debtMonthlyPayment}
                onChange={(value) => set("debtMonthlyPayment", value)}
              />
              <SingleSelectField
                label="가장 가까운 대출 만기는 언제인가요?"
                options={DEBT_MATURITY_OPTIONS}
                value={input.debtMaturity}
                onChange={(value) => set("debtMaturity", value)}
              />
              <SingleSelectField
                label="현재 주된 상환 방식은 무엇인가요?"
                options={REPAYMENT_TYPE_OPTIONS}
                value={input.debtRepaymentType}
                onChange={(value) => set("debtRepaymentType", value)}
              />
            </>
          )}

          {input.jobType === "freelancer" && (
            <>
              <p className="px-1 pt-2 text-sm leading-6 text-muted-foreground">
                평균만 보면 놓치는 달이 있어 낮은 달·평균·높은 달을 나눠 봅니다.
              </p>
              <MoneyStringField
                label="최근 낮은 달 소득"
                value={input.freelancerIncomeLow}
                onChange={(value) => set("freelancerIncomeLow", value)}
              />
              <MoneyStringField
                label="평균적인 달 소득"
                value={input.freelancerIncomeAvg}
                onChange={(value) => set("freelancerIncomeAvg", value)}
              />
              <MoneyStringField
                label="최근 높은 달 소득"
                value={input.freelancerIncomeHigh}
                onChange={(value) => set("freelancerIncomeHigh", value)}
              />
            </>
          )}

          {(input.jobType === "business_owner" || input.moneyManagementUnit === "mixed_biz_personal") && (
            <div className="survey-field">
              <p className="text-base font-medium">사업자금과 생활비를 실제로 분리해서 관리하고 있나요?</p>
              <div className="mt-2.5 flex gap-2">
                <TapOption
                  selected={input.businessSeparatesFinance === true}
                  onClick={() => set("businessSeparatesFinance", true)}
                  label="분리하고 있음"
                />
                <TapOption
                  selected={input.businessSeparatesFinance === false}
                  onClick={() => set("businessSeparatesFinance", false)}
                  label="섞여 있음"
                />
              </div>
            </div>
          )}

          <MultiSelectField
            label="돈 관리에서 반복되는 모습이 있다면 골라주세요"
            options={SPENDING_PATTERN_OPTIONS}
            values={input.spendingPatterns}
            onChange={(values) => set("spendingPatterns", values)}
          />
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-8">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            if (step > 1) setStep(1);
            else onBack();
          }}
          className="h-13 rounded-full"
        >
          이전
        </Button>
        <Button
          size="lg"
          disabled={step === 1 ? !step1Complete : !step2Complete}
          onClick={() => {
            if (step === 1) setStep(2);
            else onComplete(input);
          }}
          className="h-13 flex-1 rounded-full text-base"
        >
          {step === 1 ? "다음" : "내 현재 흐름 보기"}
        </Button>
      </div>
    </div>
  );
}
