// 딥 인디고 배경 위에 은은하게 반짝이는 별빛 레이어.
// 순수 CSS 애니메이션(무거운 캔버스/파티클 라이브러리 없이)으로 구현해
// 모든 화면 뒤에 고정 배치하는 용도.

interface Star {
  top: string;
  left: string;
  size: number;
  duration: string;
  delay: string;
  opacity: number;
}

function seededStars(count: number): Star[] {
  // 고정 시드로 매 렌더마다 동일한 배치를 만든다 (하이드레이션 불일치 방지).
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  return Array.from({ length: count }, () => {
    const size = rand() < 0.15 ? 2 : 1;
    return {
      top: `${(rand() * 100).toFixed(2)}%`,
      left: `${(rand() * 100).toFixed(2)}%`,
      size,
      duration: `${(2.5 + rand() * 3.5).toFixed(2)}s`,
      delay: `${(rand() * 5).toFixed(2)}s`,
      opacity: 0.4 + rand() * 0.5,
    };
  });
}

const STARS = seededStars(70);

export function Starfield() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.33 0.06 290 / 55%), transparent 60%)",
        }}
      />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full bg-(--gold)"
          style={
            {
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              "--twinkle-min": 0.1,
              "--twinkle-max": s.opacity,
              "--twinkle-duration": s.duration,
              animationDelay: s.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
