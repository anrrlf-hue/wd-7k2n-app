import { Sparkle } from "lucide-react";

/** 무료 구간과 잠금 구간 사이의 명시적 경계. 사용자가 "여기부터는 다르다"를
 * 인지하게 만드는 용도 — paywall을 갑자기 들이밀지 않고 구간을 예고한다. */
export function FreeBoundaryMarker() {
  return (
    <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span className="flex items-center gap-1 whitespace-nowrap">
        <Sparkle className="size-3 text-(--gold)" />
        여기까지는 무료예요
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
