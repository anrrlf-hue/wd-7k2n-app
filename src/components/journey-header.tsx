const CHAPTERS = ["타고난 성향", "손에서 발견", "나의 흐름", "내 질문", "현실답변"];

export function JourneyHeader({ chapter }: { chapter: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <header className="journey-header">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold tracking-widest">운돈 · 사주풀이</span>
        <p className="text-xs text-muted-foreground"><span className="tabular-nums">0{chapter}</span> · {CHAPTERS[chapter - 1]}</p>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {CHAPTERS.map((name, index) => <span key={name} className={`h-0.5 flex-1 rounded-full ${index < chapter ? "bg-(--gold)" : "bg-border"}`} />)}
      </div>
    </header>
  );
}
