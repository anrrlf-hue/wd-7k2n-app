"use client";

import { useState, type ReactNode } from "react";

type AdviceInput = {
  title?: string;
  text?: string;
  evidence?: string;
};

const ELEMENT_ADVICE: Record<string, string> = {
  목: "초록 식물이나 나무 소재를 가까이 두고, 공원이나 산책길처럼 자연이 있는 곳에서 시간을 보내보세요. 무언가를 배우고 조금씩 키워가는 사람과 대화를 나누는 것도 잘 맞습니다.",
  화: "낮에는 햇빛을 자주 보고, 따뜻한 조명이나 빨강·주황 계열 소품을 조금 두어보세요. 밝고 적극적인 사람과 대화하거나 만나고, 걷기·운동·글쓰기처럼 밖으로 표현하는 활동도 좋습니다.",
  토: "베이지·브라운 계열이나 도자기·흙·돌처럼 안정감을 주는 물건을 가까이 두어보세요. 자주 쓰는 공간부터 정리하고, 약속을 잘 지키고 차분한 사람과 시간을 보내는 것도 좋습니다.",
  금: "흰색·회색 계열이나 금속 소재처럼 선명하고 정돈된 느낌의 물건을 가까이 두어보세요. 작은 공간 하나를 정리하고, 기준이 분명하고 솔직하게 말해주는 사람과 대화해보세요.",
  수: "파랑·남색 계열이나 물을 떠올리게 하는 소품을 가까이 두고, 물가나 조용한 공간에서 생각을 정리해보세요. 차분히 들어주고 생각을 나눌 수 있는 사람과 대화하는 것도 좋습니다.",
};

function findMissingElements(evidence = ""): string[] {
  const m = evidence.match(/없는 오행\s*([목화토금수,· ]+)/);
  if (!m) return [];
  return [...new Set((m[1].match(/[목화토금수]/g) ?? []))];
}

function findElement(evidence = ""): string | null {
  const direct = evidence.match(/\((목|화|토|금|수)\)/)?.[1];
  if (direct) return direct;
  const dominant = evidence.match(/오행 최다\s*(목|화|토|금|수)/)?.[1];
  return dominant ?? null;
}

function buildAdvice({ title = "", text = "", evidence = "" }: AdviceInput): string {
  const missing = findMissingElements(evidence);
  if (missing.length > 0) {
    return missing
      .slice(0, 2)
      .map((el) => ELEMENT_ADVICE[el])
      .join(" ");
  }

  const element = findElement(evidence);
  const source = `${title} ${text}`;

  if (/재물운|돈|재물|모이|지키는/.test(source)) {
    return "이번 달에 지킬 기준 하나를 먼저 정해보세요. 지출이나 큰 결정을 할 때는 바로 결론 내리기보다 하루 정도 시간을 두고, 현실적으로 숫자를 잘 보는 사람과 한 번 이야기해보는 것도 좋습니다.";
  }
  if (/직장|사업|일하는|조직|독립/.test(source)) {
    return "지금 있는 자리에서 내가 힘을 잘 쓰는 환경부터 살펴보세요. 혼자 결정이 잘 되는지, 사람과 아이디어를 주고받을 때 힘이 붙는지 비교해보고, 나와 다른 방식으로 일하는 사람과 짧게라도 대화를 나눠보는 것이 좋습니다.";
  }
  if (/결정|선택|판단|두뇌/.test(source)) {
    return "중요한 선택은 머릿속에서 오래 돌리기보다 기준을 2~3개만 적어보세요. 내가 평소 빠르게 결정하는 편이라면 차분한 사람에게 한 번 물어보고, 오래 고민하는 편이라면 작은 것부터 먼저 실행해보는 방식이 잘 맞습니다.";
  }
  if (/관계|감정|사람/.test(source)) {
    return "가까운 사람에게 마음을 알아서 이해해주길 기다리기보다, 짧게라도 직접 표현해보세요. 편안하게 말을 주고받을 수 있는 사람과 시간을 늘리고, 너무 지치는 관계에서는 잠깐 거리를 두는 것도 좋습니다.";
  }
  if (/기회|변화|운의 흐름/.test(source)) {
    return "새로운 기회가 보이면 바로 잡거나 바로 포기하기보다, 나에게 남는 것이 무엇인지 한 번 적어보세요. 새로운 사람을 만나거나 평소 가지 않던 공간에 가보는 것도 흐름을 바꾸는 데 도움이 될 수 있습니다.";
  }
  if (/생활|생명선|에너지|리듬/.test(source)) {
    return "생활 리듬을 크게 바꾸기보다 자주 무너지는 한 가지부터 고쳐보세요. 햇빛을 보고 걷는 시간, 잠드는 시간, 혼자 쉬는 시간을 일정하게 만드는 것만으로도 내 리듬을 확인하기 쉬워집니다.";
  }
  if (/타고난 성향|성향/.test(source) && element) {
    return `${ELEMENT_ADVICE[element]} 내 성향을 억지로 바꾸기보다, 부족한 쪽을 생활에서 조금씩 보완하는 정도가 좋습니다.`;
  }

  return "이 풀이가 내 이야기와 비슷하다면, 당장 크게 바꾸기보다 생활에서 하나만 시험해보세요. 가까이 두는 물건이나 공간을 조금 바꾸고, 평소 나와 다른 성향의 사람과 대화를 나누면서 어떤 변화가 편한지 살펴보는 정도면 충분합니다.";
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
}: {
  evidence: string;
  title?: string;
  text?: string;
}) {
  const [open, setOpen] = useState(false);
  const advice = buildAdvice({ title, text, evidence });

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-sm text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        어떻게 할까요?
      </button>
      {open && (
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
}: {
  title: string;
  step?: string;
  paragraph: { text: string; evidence: string };
  boxed?: boolean;
}) {
  return (
    <ReportSection title={title} step={step}>
      {boxed ? (
        <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{paragraph.text}</p>
      ) : (
        <p>{paragraph.text}</p>
      )}
      <EvidenceToggle evidence={paragraph.evidence} title={title} text={paragraph.text} />
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
      <EvidenceToggle evidence={evidence} title={title} text={detail} />
    </div>
  );
}
