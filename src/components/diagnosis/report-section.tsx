"use client";

import { useState, type ReactNode } from "react";

type AdviceInput = {
  title?: string;
  text?: string;
  evidence?: string;
};

const ELEMENT_ADVICE: Record<string, string> = {
  목: "초록 식물이나 나무 소재를 가까이 두고, 공원이나 산책길처럼 자연이 있는 곳에서 시간을 보내보세요. 새로운 것을 배우거나 조금씩 키워가는 사람과 대화를 나누는 것도 잘 맞습니다.",
  화: "낮에는 햇빛을 자주 보고, 따뜻한 조명이나 빨강·주황 계열 소품을 조금 두어보세요. 밝고 적극적인 사람과 대화하거나 만나고, 걷기·운동·글쓰기처럼 밖으로 표현하는 활동도 좋습니다.",
  토: "베이지·브라운 계열이나 도자기·흙·돌처럼 안정감을 주는 물건을 가까이 두어보세요. 자주 쓰는 공간부터 정리하고, 약속을 잘 지키고 차분한 사람과 시간을 보내는 것도 좋습니다.",
  금: "흰색·회색 계열이나 금속 소재처럼 선명하고 정돈된 느낌의 물건을 가까이 두어보세요. 작은 공간 하나를 정리하고, 기준이 분명하고 솔직하게 말해주는 사람과 대화해보세요.",
  수: "파랑·남색 계열이나 물을 떠올리게 하는 소품을 가까이 두고, 물가나 조용한 공간에서 생각을 정리해보세요. 차분히 들어주고 생각을 나눌 수 있는 사람과 대화하는 것도 좋습니다.",
};

function findMissingElements(evidence = ""): string[] {
  const m = evidence.match(/없는 오행\s*([목화토금수,· ]+)/);
  if (!m) return [];
  return [...new Set(m[1].match(/[목화토금수]/g) ?? [])];
}

function findElement(evidence = ""): string | null {
  const direct = evidence.match(/\((목|화|토|금|수)\)/)?.[1];
  if (direct) return direct;
  return evidence.match(/오행 최다\s*(목|화|토|금|수)/)?.[1] ?? null;
}

function buildAdvice({ title = "", text = "", evidence = "" }: AdviceInput): string {
  const missing = findMissingElements(evidence);
  if (missing.length > 0) {
    return missing.slice(0, 2).map((el) => ELEMENT_ADVICE[el]).join(" ");
  }

  const source = `${title} ${text}`;
  const element = findElement(evidence);

  if (/돈이 모이|재물이 모이|모이는/.test(title)) {
    return "이번 달 들어온 돈이 어디로 빠져나갔는지 세 가지만 적어보세요. 생활비·고정비·저축처럼 큰 묶음으로만 나눠도 흐름이 보입니다. 돈을 잘 모으는 사람과 금액 이야기가 아니라 관리 습관을 비교해보는 것도 좋습니다.";
  }

  if (/돈을 지키|지키는 방식|재물을 지키/.test(title)) {
    return "큰 지출이나 약속을 정할 때는 금액·기간·중간에 바꿀 수 있는지 세 가지를 먼저 확인해보세요. 결정을 서두르게 만드는 사람보다 조건을 차분히 짚어주는 사람과 상의하는 편이 잘 맞습니다.";
  }

  if (/돈을 놓치|반복 패턴|새는/.test(title)) {
    return "최근 아쉬웠던 지출이나 선택 세 번만 떠올려보세요. 급해서, 사람 때문에, 준비가 부족해서처럼 반복되는 이유가 하나 보이면 그 상황에서만 쓸 작은 규칙을 하나 정해두는 게 좋습니다.";
  }

  if (/기회|큰돈/.test(title)) {
    return "새 제안이나 기회가 들어오면 좋은 점만 보기보다 내가 실제로 써야 하는 시간·돈·책임을 같이 적어보세요. 혼자 판단이 빨라질 때는 현실 조건을 잘 보는 사람에게 한 번 설명해보는 것도 좋습니다.";
  }

  if (/직장|사업|조직|독립/.test(source)) {
    return "내가 힘이 붙는 장면을 하나 골라보세요. 혼자 정리할 때인지, 사람과 이야기할 때인지, 결과를 직접 만들 때인지 확인하고 그 장면이 많은 환경을 가까이 두는 게 좋습니다. 나와 일하는 방식이 다른 사람과 짧게 대화해보는 것도 도움이 됩니다.";
  }

  if (/결정|선택|판단|두뇌/.test(source)) {
    return "중요한 선택은 기준을 두세 개만 적어보세요. 평소 빨리 정하는 편이면 차분한 사람에게 한 번 물어보고, 오래 고민하는 편이면 작은 부분부터 먼저 실행해보는 방식이 좋습니다.";
  }

  if (/관계|감정|사람/.test(source)) {
    return "가까운 사람에게 알아서 이해해주길 기다리기보다 짧게라도 직접 표현해보세요. 편안하게 말을 주고받을 수 있는 사람과 시간을 늘리고, 너무 지치는 관계에서는 잠시 거리를 두는 것도 좋습니다.";
  }

  if (/생활|생명선|에너지|리듬/.test(source)) {
    return "햇빛을 보고 걷는 시간, 잠드는 시간, 혼자 쉬는 시간 중 하나만 일정하게 만들어보세요. 몸과 생활 리듬이 안정되면 내가 언제 힘이 붙고 언제 지치는지도 더 잘 보입니다.";
  }

  if (/타고난 성향|성향/.test(source) && element) {
    return `${ELEMENT_ADVICE[element]} 내 성향을 억지로 바꾸기보다 부족한 쪽을 생활에서 조금씩 보완하는 정도가 좋습니다.`;
  }

  return "이 풀이와 비슷했던 실제 장면 하나를 떠올려보세요. 그때 도움이 됐던 사람·공간·습관을 한 가지 더 가까이 두고, 반대로 반복해서 지치게 했던 상황은 조금 줄여보는 정도면 충분합니다.";
}

export function ReportSection({
  title,
  step,
  children,
}: {
  title: string;
  step?: string;
  children: ReactNode;
}) {
  return (
    <section className="report-section">
      <h3 className="flex items-baseline gap-1.5">
        {step && <span className="text-sm font-semibold text-(--gold)">{step}</span>}
        <span className="text-lg font-semibold tracking-tight">{title}</span>
      </h3>
      <div className="mt-2 text-base leading-7 text-foreground/90">{children}</div>
    </section>
  );
}

export function EvidenceToggle({
  evidence,
  title,
  text,
  adviceOverride,
}: {
  evidence: string;
  title?: string;
  text?: string;
  adviceOverride?: string;
}) {
  const [open, setOpen] = useState<"why" | "how" | null>(null);
  const advice = adviceOverride ?? buildAdvice({ title, text, evidence });

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setOpen((value) => (value === "why" ? null : "why"))}
          aria-expanded={open === "why"}
          className="text-sm text-muted-foreground underline decoration-dotted underline-offset-2"
        >
          왜 이렇게 봤나요?
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => (value === "how" ? null : "how"))}
          aria-expanded={open === "how"}
          className="text-sm text-muted-foreground underline decoration-dotted underline-offset-2"
        >
          어떻게 할까요?
        </button>
      </div>
      {open === "why" && (
        <p className="mt-2 rounded-xl bg-muted p-3.5 text-[15px] leading-7 text-muted-foreground">
          {evidence}
        </p>
      )}
      {open === "how" && (
        <p className="mt-2 rounded-xl bg-accent p-3.5 text-[15px] leading-7 text-accent-foreground">
          {advice}
        </p>
      )}
    </div>
  );
}

export function ParagraphSection({
  title,
  step,
  paragraph,
  boxed,
  showGuidance = false,
}: {
  title: string;
  step?: string;
  paragraph: { text: string; evidence: string };
  boxed?: boolean;
  showGuidance?: boolean;
}) {
  return (
    <ReportSection title={title} step={step}>
      {boxed ? (
        <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{paragraph.text}</p>
      ) : (
        <p>{paragraph.text}</p>
      )}
      {showGuidance && (
        <EvidenceToggle evidence={paragraph.evidence} title={title} text={paragraph.text} />
      )}
    </ReportSection>
  );
}

export function EvidenceItemCard({
  index,
  title,
  detail,
  evidence,
}: {
  index: number;
  title: string;
  detail: string;
  evidence: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-base font-semibold">
        {index}. {title}
      </p>
      <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">{detail}</p>
    </div>
  );
}
