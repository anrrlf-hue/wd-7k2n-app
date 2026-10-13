import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OldPalmLinkPage() {
  return <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10 text-center">
    <h1 className="text-xl font-semibold">이전 손금 링크예요</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">
      이 주소에서는 입력을 이어갈 수 없어요. 사주 진단에서 다시 입력해 주세요. 이 탭의 다른 저장 기록은 그대로 유지됩니다.
    </p>
    <Button asChild size="lg" className="mt-6 h-13 w-full rounded-full text-base">
      <Link href="/diagnosis?mode=free&focus=overall&from=palm-return">사주 진단에서 다시 입력</Link>
    </Button>
  </div>;
}
