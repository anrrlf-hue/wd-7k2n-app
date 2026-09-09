"use client";

// 오행(五行)을 형상화한 궤도 모티프 + 은은한 빛 입자.
// 텍스트만 있는 랜딩을 피하기 위한 장식용 비주얼이며, 실제 사주 계산과는 무관하다.

const ELEMENTS = [
  { label: "목", angle: -90, color: "oklch(0.72 0.14 145)" },
  { label: "화", angle: -18, color: "oklch(0.72 0.16 35)" },
  { label: "토", angle: 54, color: "oklch(0.78 0.1 85)" },
  { label: "금", angle: 126, color: "oklch(0.85 0.03 90)" },
  { label: "수", angle: 198, color: "oklch(0.68 0.12 250)" },
];

export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto mb-2 h-56 w-56 select-none"
    >
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, var(--gold-soft) 0%, transparent 70%)",
        }}
      />

      <div className="animate-orbit-spin absolute inset-6 rounded-full border border-(--border)">
        {ELEMENTS.map((el) => (
          <span
            key={el.label}
            className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-medium text-background"
            style={{
              transform: `rotate(${el.angle}deg) translate(4.6rem) rotate(${-el.angle}deg) translate(-50%, -50%)`,
              backgroundColor: el.color,
            }}
          >
            {el.label}
          </span>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-card ring-1 ring-(--gold-soft)">
          <span className="shimmer-text text-2xl font-semibold">財</span>
        </div>
      </div>

      <span className="animate-float-soft absolute top-2 right-6 size-1.5 rounded-full bg-(--gold)" />
      <span
        className="animate-float-soft absolute bottom-6 left-3 size-1 rounded-full bg-(--gold)"
        style={{ animationDelay: "1.2s" }}
      />
      <span
        className="animate-float-soft absolute top-10 left-0 size-1 rounded-full bg-(--gold)"
        style={{ animationDelay: "2.4s" }}
      />
    </div>
  );
}
