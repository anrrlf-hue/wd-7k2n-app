"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  JOB_TYPE_OPTIONS,
  FUTURE_EVENT_OPTIONS,
  EXPENSE_AWARENESS_OPTIONS,
  EMERGENCY_FUND_OPTIONS,
  DEBT_INTEREST_OPTIONS,
  DEBT_PAYMENT_OPTIONS,
  DEBT_MATURITY_OPTIONS,
  REPAYMENT_TYPE_OPTIONS,
  FUTURE_EVENT_TIMING_OPTIONS,
  FUTURE_EVENT_AMOUNT_OPTIONS,
  FUTURE_EVENT_PREPARED_OPTIONS,
  MONEY_MANAGEMENT_UNIT_OPTIONS,
  SPENDING_PATTERN_OPTIONS,
  surplusKrw,
  PRIVACY_NOTICE,
  type SurveyInput,
  type SurveyOption,
} from "@/lib/survey-input";

function TapOption({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border min-h-11 px-3 py-2 text-[13px] transition-colors ${
        selected ? "border-(--gold) bg-(--gold-soft) text-(--gold)" : "border-border text-foreground/80"
      }`}
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
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((opt) => (
          <TapOption key={opt.value} selected={value === opt.value} onClick={() => onChange(opt.value)} label={opt.label} />
        ))}
      </div>
    </div>
  );
}

const EXCLUSIVE_MULTI_VALUES = new Set(["none", "해당없음"]);

function MultiSelectField({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: SurveyOption[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(value: string) {
    const isExclusive = EXCLUSIVE_MULTI_VALUES.has(value);
    if (isExclusive) {
      onChange(values.includes(value) ? [] : [value]);
      return;
    }
    const withoutExclusive = values.filter((v) => !EXCLUSIVE_MULTI_VALUES.has(v));
    onChange(
      withoutExclusive.includes(value) ? withoutExclusive.filter((v) => v !== value) : [...withoutExclusive, value],
    );
  }
  return (
    <div className="rounded-xl border border-border p-3.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((opt) => (
          <TapOption key={opt.value} selected={values.includes(opt.value)} onClick={() => toggle(opt.value)} label={opt.label} />
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="rounded-xl border border-border p-3.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        min={0}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        placeholder="0"
        className="mt-1.5 w-full border-none bg-transparent p-0 text-base font-semibold outline-none"
      />
    </div>
  );
}

const initialInput: SurveyInput = {
  biggestConcern: "",
  jobType: "",
  futureEvents: [],
  monthlyIncomeKrw: NaN,
  monthlyFixedCostKrw: NaN,
  monthlyLivingCostKrw: NaN,
  monthlySavingsKrw: NaN,
  expenseAwareness: "",
  emergencyFund: "",
  hasDebt: false,
  moneyManagementUnit: "",
  spendingPatterns: [],
};

/** 재무 설문 3스텝, 원페이지형. 진행바(1/3~3/3)만 표시하고 장면 연출은
 * 넣지 않는다 — 간접체험에서 이미 체감 장치를 썼으므로 여기선 속도가
 * 우선이다. 숫자 직접입력은 소득/고정지출/생활비/저축 4개. */
export function SurveyForm({ onComplete }: { onComplete: (input: SurveyInput) => void }) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<SurveyInput>(initialInput);

  function set<K extends keyof SurveyInput>(key: K, value: SurveyInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const isBusinessOwner = input.jobType === "business_owner";
  const isFreelancer = input.jobType === "freelancer";
  const hasFutureEvent = input.futureEvents.length > 0 && !input.futureEvents.includes("none");

  const step1Complete = input.jobType !== "" && input.futureEvents.length > 0;
  const step2Complete = [input.monthlyIncomeKrw, input.monthlyFixedCostKrw, input.monthlyLivingCostKrw, input.monthlySavingsKrw].every((n) => Number.isFinite(n) && n >= 0);
  const step3Complete =
    input.expenseAwareness !== "" &&
    input.emergencyFund !== "" &&
    input.moneyManagementUnit !== "" &&
    input.spendingPatterns.length > 0 &&
    (!input.hasDebt || (input.debtInterestRate && input.debtMonthlyPayment && input.debtMaturity && input.debtRepaymentType)) &&
    (!hasFutureEvent || (input.futureEventTiming && input.futureEventAmount && input.futureEventPrepared)) &&
    (!isBusinessOwner || input.businessSeparatesFinance !== undefined) &&
    (!isFreelancer || (input.freelancerIncomeLow && input.freelancerIncomeAvg && input.freelancerIncomeHigh));

  return (
    <div className="mt-8 flex flex-1 flex-col">
      <p className="section-eyebrow">현실 재무질문 · {step} / 3</p>
      <h2 className="mt-2 text-2xl font-semibold">{["지금의 생활부터", "한 달 돈의 흐름", "내게 필요한 준비"][step - 1]}</h2>
      {step === 1 && <p className="mt-1.5 text-xs text-muted-foreground">{PRIVACY_NOTICE}</p>}

      {step === 1 && (
        <div className="mt-3 space-y-4">
          <div className="rounded-xl border border-border p-3.5">
            <label className="text-sm font-medium">지금 가장 큰 재무 고민을 적어주세요</label>
            <textarea
              value={input.biggestConcern}
              onChange={(e) => set("biggestConcern", e.target.value)}
              placeholder="예: 매달 돈이 어디로 가는지 모르겠어요"
              rows={3}
              className="mt-1.5 w-full resize-none border-none bg-transparent p-0 text-sm outline-none"
            />
          </div>
          <SingleSelectField label="지금 어떤 형태로 일하고 계세요?" options={JOB_TYPE_OPTIONS} value={input.jobType} onChange={(v) => set("jobType", v)} />
          <MultiSelectField
            label="1년 안에 예정된 큰 변화가 있다면요?"
            options={FUTURE_EVENT_OPTIONS}
            values={input.futureEvents}
            onChange={(v) => set("futureEvents", v)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">같은 기준의 금액을 입력해 주세요. 부부 공동관리라면 소득과 지출 모두 합산해요. 없는 항목은 0원으로 입력하세요.</p>
          <NumberField label="월 소득(원)" value={input.monthlyIncomeKrw} onChange={(v) => set("monthlyIncomeKrw", v)} />
          <NumberField label="월 고정지출·대출상환액(원)" value={input.monthlyFixedCostKrw} onChange={(v) => set("monthlyFixedCostKrw", v)} />
          <p className="text-xs text-muted-foreground">고정지출에는 월세·보험·정기결제와 대출 원리금 상환을 포함해요. 아래 생활비와 중복해서 넣지 않아요.</p>
          <NumberField label="월 생활비·변동지출(원)" value={input.monthlyLivingCostKrw} onChange={(v) => set("monthlyLivingCostKrw", v)} />
          <NumberField label="월 저축·투자액(원)" value={input.monthlySavingsKrw} onChange={(v) => set("monthlySavingsKrw", v)} />
          <div className="mystic-card p-3.5">
            <p className="text-xs text-muted-foreground">저축까지 배분한 뒤 남는 돈</p>
            <p className="mt-1 text-lg font-semibold text-(--gold)">{step2Complete ? `${surplusKrw(input).toLocaleString("ko-KR")}원` : "네 금액을 입력하면 계산돼요"}</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-3 space-y-4">
          <SingleSelectField
            label="내 지출을 얼마나 정확히 아세요?"
            options={EXPENSE_AWARENESS_OPTIONS}
            value={input.expenseAwareness}
            onChange={(v) => set("expenseAwareness", v)}
          />
          <SingleSelectField
            label="바로 꺼낼 현금으로 고정지출·생활비를 몇 개월 낼 수 있나요?"
            options={EMERGENCY_FUND_OPTIONS}
            value={input.emergencyFund}
            onChange={(v) => set("emergencyFund", v)}
          />

          <div className="rounded-xl border border-border p-3.5">
            <p className="text-sm font-medium">대출이나 빚이 있으세요?</p>
            <div className="mt-2.5 flex gap-2">
              <TapOption selected={input.hasDebt === false} onClick={() => set("hasDebt", false)} label="없음" />
              <TapOption selected={input.hasDebt === true} onClick={() => set("hasDebt", true)} label="있음" />
            </div>
          </div>
          {input.hasDebt && (
            <>
              <SingleSelectField label="금리는 어느 정도예요?" options={DEBT_INTEREST_OPTIONS} value={input.debtInterestRate} onChange={(v) => set("debtInterestRate", v)} />
              <SingleSelectField label="월 상환액은요?" options={DEBT_PAYMENT_OPTIONS} value={input.debtMonthlyPayment} onChange={(v) => set("debtMonthlyPayment", v)} />
              <SingleSelectField label="만기는 언제예요?" options={DEBT_MATURITY_OPTIONS} value={input.debtMaturity} onChange={(v) => set("debtMaturity", v)} />
              <SingleSelectField label="상환 방식은요?" options={REPAYMENT_TYPE_OPTIONS} value={input.debtRepaymentType} onChange={(v) => set("debtRepaymentType", v)} />
            </>
          )}

          {hasFutureEvent && (
            <>
              <SingleSelectField label="가장 가까운 변화는 언제쯤이에요?" options={FUTURE_EVENT_TIMING_OPTIONS} value={input.futureEventTiming} onChange={(v) => set("futureEventTiming", v)} />
              <SingleSelectField label="대략 얼마나 필요할까요?" options={FUTURE_EVENT_AMOUNT_OPTIONS} value={input.futureEventAmount} onChange={(v) => set("futureEventAmount", v)} />
              <SingleSelectField label="지금 준비된 돈은 어느 정도예요?" options={FUTURE_EVENT_PREPARED_OPTIONS} value={input.futureEventPrepared} onChange={(v) => set("futureEventPrepared", v)} />
            </>
          )}

          {isBusinessOwner && (
            <div className="rounded-xl border border-border p-3.5">
              <p className="text-sm font-medium">사업자금과 생활비를 분리해서 관리하세요?</p>
              <div className="mt-2.5 flex gap-2">
                <TapOption selected={input.businessSeparatesFinance === true} onClick={() => set("businessSeparatesFinance", true)} label="예" />
                <TapOption selected={input.businessSeparatesFinance === false} onClick={() => set("businessSeparatesFinance", false)} label="아니오" />
              </div>
            </div>
          )}

          {isFreelancer && (
            <div className="rounded-xl border border-border p-3.5">
              <p className="text-sm font-medium">월 소득이 들쭉날쭉하다면, 낮은 달/평균/높은 달은요?</p>
              <div className="mt-2.5 space-y-2">
                <input
                  value={input.freelancerIncomeLow ?? ""}
                  onChange={(e) => set("freelancerIncomeLow", e.target.value)}
                  placeholder="낮은 달(만원)"
                  className="w-full rounded-lg border border-border p-2 text-sm outline-none"
                />
                <input
                  value={input.freelancerIncomeAvg ?? ""}
                  onChange={(e) => set("freelancerIncomeAvg", e.target.value)}
                  placeholder="평균 달(만원)"
                  className="w-full rounded-lg border border-border p-2 text-sm outline-none"
                />
                <input
                  value={input.freelancerIncomeHigh ?? ""}
                  onChange={(e) => set("freelancerIncomeHigh", e.target.value)}
                  placeholder="높은 달(만원)"
                  className="w-full rounded-lg border border-border p-2 text-sm outline-none"
                />
              </div>
            </div>
          )}

          <SingleSelectField
            label="돈 관리는 어떤 단위로 하세요?"
            options={MONEY_MANAGEMENT_UNIT_OPTIONS}
            value={input.moneyManagementUnit}
            onChange={(v) => set("moneyManagementUnit", v)}
          />
          <MultiSelectField
            label="평소 돈 쓰는 패턴에 해당하는 게 있다면요?"
            options={SPENDING_PATTERN_OPTIONS}
            values={input.spendingPatterns}
            onChange={(v) => set("spendingPatterns", v)}
          />
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-8">
        {step > 1 && (
          <Button variant="outline" size="lg" onClick={() => setStep((s) => s - 1)} className="h-13 rounded-full">
            이전
          </Button>
        )}
        <Button
          size="lg"
          disabled={(step === 1 && !step1Complete) || (step === 2 && !step2Complete) || (step === 3 && !step3Complete)}
          onClick={() => { if (step < 3) { setStep((s) => s + 1); document.getElementById("conversion-funnel")?.scrollIntoView({ block: "start" }); } else onComplete(input); }}
          className="h-13 flex-1 rounded-full text-base"
        >
          {step < 3 ? "다음" : "분석 결과 보기"}
        </Button>
      </div>
    </div>
  );
}
