"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildServiceShare } from "@/lib/relationship-share";
import { track } from "@/lib/analytics";

const shareData = buildServiceShare();
const subscribe = () => () => {};
const serverSnapshot = () => false;
function supportsNativeShare() {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    return typeof navigator.canShare !== "function" || navigator.canShare(shareData);
  } catch {
    return false;
  }
}

export function ServiceShareCard({ trial = false, onCompleted }: { trial?: boolean; onCompleted?: (participation: "native_share" | "clipboard") => Promise<void> }) {
  const nativeShare = useSyncExternalStore(subscribe, supportsNativeShare, serverSnapshot);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);

  function selectLink() {
    linkInput.current?.focus();
    linkInput.current?.select();
    linkInput.current?.setSelectionRange(0, shareData.url.length);
  }

  async function completeParticipation(participation: "native_share" | "clipboard") {
    if (!onCompleted) return;
    try { await onCompleted(participation); }
    catch {
      setNotice({ text: `${participation === "clipboard" ? "링크 복사는" : "공유창 처리는"} 끝났지만 무료 체험 참여를 확인하지 못했어요. 다시 시도해주세요.`, error: true });
    }
  }

  async function share() {
    track("share_intent");
    setBusy(true);
    setNotice(null);
    try {
      await navigator.share(shareData);
      track("share_sheet_resolved");
      setNotice({ text: "공유창 처리가 끝났어요. 실제 전달 여부는 선택한 앱에서 확인해주세요." });
      await completeParticipation("native_share");
    } catch (error) {
      track(error instanceof Error && error.name === "AbortError" ? "share_cancelled" : "share_failed");
      setNotice(error instanceof Error && error.name === "AbortError"
        ? { text: "공유를 취소했어요. 다시 공유하거나 링크를 복사할 수 있어요." }
        : { text: "공유창을 열지 못했어요. 링크 복사를 이용해주세요.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    setBusy(true);
    setNotice(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareData.url);
      track("link_copied");
      setNotice({ text: "무료 사주 링크를 복사했어요. 보내려는 앱에 붙여넣어주세요." });
      await completeParticipation("clipboard");
    } catch {
      track("copy_failed");
      selectLink();
      setNotice({ text: "자동 복사를 하지 못했어요. 아래 주소를 길게 누르거나 선택해 직접 복사해주세요.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="무료 사주 링크 공유" className="mt-6 rounded-2xl border border-border bg-card p-4">
      <h3 className="font-semibold">{trial ? "링크 공유하고 프리미엄 무료 체험" : "운·돈 무료 사주 알려주기"}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{shareData.text}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">이름·생년월일·태어난 시각·손 사진·개인 풀이를 보내지 않습니다. 받는 사람은 자신의 무료 사주를 시작합니다.</p>
      {trial && <p className="mt-2 text-sm leading-6">이번 이벤트는 기기 공유창의 정상 완료 또는 링크 복사 성공으로 참여합니다. 공유 취소·오류는 참여로 처리하지 않으며, 복사가 실제 전달이나 신규 방문을 뜻하지는 않습니다.</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {nativeShare && <Button type="button" onClick={() => void share()} disabled={busy} className="h-12 rounded-full"><Share2 className="size-4" />{busy ? "처리 중..." : trial ? "링크 공유하고 무료 체험" : "공유하기"}</Button>}
        <Button type="button" variant="outline" onClick={() => void copyLink()} disabled={busy} className="h-12 rounded-full"><Copy className="size-4" />{trial ? "링크 복사하고 무료 체험" : "링크 복사"}</Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{nativeShare ? "기기 공유창에서 카카오톡 등 사용할 앱을 선택해주세요." : "이 브라우저에서는 링크를 복사해 카카오톡 등 원하는 앱에 붙여넣어주세요."}</p>
      <label className="mt-3 block text-xs text-muted-foreground">공유할 주소
        <input ref={linkInput} readOnly value={shareData.url} onFocus={event => event.currentTarget.select()} className="mt-1 h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
      </label>
      {notice && <p role={notice.error ? "alert" : "status"} className="mt-3 text-sm leading-6">{notice.text}</p>}
    </section>
  );
}
