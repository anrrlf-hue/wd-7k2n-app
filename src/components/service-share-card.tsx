"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildServiceShare } from "@/lib/relationship-share";
import { track } from "@/lib/analytics";
import { ensureReferralSession } from "@/lib/referral-client";

const defaultShareData = buildServiceShare();
const INVITE_STORAGE_KEY = "saju-app:referral-invite:v1";
class ReferralUnavailableError extends Error {}
function readStoredInviteUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(INVITE_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) as { url?: string } : null;
    return typeof parsed?.url === "string" && parsed.url.includes("?") ? parsed.url : null;
  } catch {
    return null;
  }
}
const subscribe = () => () => {};
const serverSnapshot = () => false;
function supportsNativeShare() {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    return typeof navigator.canShare !== "function" || navigator.canShare(defaultShareData);
  } catch {
    return false;
  }
}

export function ServiceShareCard({ trial = false, onCompleted }: { trial?: boolean; onCompleted?: () => Promise<void> }) {
  const nativeShare = useSyncExternalStore(subscribe, supportsNativeShare, serverSnapshot);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [shareData, setShareData] = useState(() => {
    const url = readStoredInviteUrl();
    return url ? { ...defaultShareData, url } : defaultShareData;
  });
  const [shared, setShared] = useState(false);
  const [shareDataReady, setShareDataReady] = useState(() => !trial || Boolean(readStoredInviteUrl()));
  const [preparing, setPreparing] = useState(false);
  const preparation = useRef<Promise<typeof defaultShareData> | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);

  function selectLink() {
    linkInput.current?.focus();
    linkInput.current?.select();
    linkInput.current?.setSelectionRange(0, shareData.url.length);
  }

  async function prepareShareData() {
    if (!trial) return shareData;
    await ensureReferralSession();
    if (shareDataReady) return shareData;
    if (!preparation.current) {
      setPreparing(true);
      preparation.current = (async () => {
        const response = await fetch("/api/referrals", { method: "POST", headers: { "Cache-Control": "no-store" } });
        const data = await response.json().catch(() => null) as { url?: string } | null;
        if (!response.ok || !data?.url) throw new ReferralUnavailableError("Referral store unavailable");
        const next = { ...defaultShareData, url: data.url };
        setShareData(next);
        setShareDataReady(true);
        try { sessionStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify({ url: next.url })); } catch { /* Optional presentation state. */ }
        return next;
      })().finally(() => setPreparing(false));
    }
    return preparation.current;
  }

  async function prepareCachedOrPrepare() {
    const cachedUrl = readStoredInviteUrl();
    if (cachedUrl) {
      let token: string | null = null;
      try { token = new URL(cachedUrl).searchParams.get("ref"); } catch { /* Treat malformed cached state as stale. */ }
      if (token) {
        await ensureReferralSession();
        const response = await fetch(`/api/referrals?ref=${encodeURIComponent(token)}`, { headers: { "Cache-Control": "no-store" } });
        const data = await response.json().catch(() => null) as { status?: string } | null;
        if (response.status === 503 || data?.status === "unavailable") throw new ReferralUnavailableError("Referral store unavailable");
        if (response.ok && data?.status === "valid") {
          const cachedShareData = { ...defaultShareData, url: cachedUrl };
          setShareData(cachedShareData);
          setShareDataReady(true);
          return cachedShareData;
        }
      }
      try { sessionStorage.removeItem(INVITE_STORAGE_KEY); } catch { /* Optional presentation state. */ }
    }
    return prepareShareData();
  }

  useEffect(() => {
    if (!trial || shareDataReady) return;
    // The async preparation synchronizes external session/storage state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void prepareCachedOrPrepare().catch(() => {
      preparation.current = null;
      setNotice({ text: "공유 이벤트 저장소를 사용할 수 없어 무료 체험 공유를 준비하지 못했어요. 잠시 후 다시 시도해주세요.", error: true });
    });
    // prepareShareData is intentionally stable through the promise ref; adding
    // it here would restart preparation on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial, shareDataReady]);

  async function completeParticipation() {
    if (!onCompleted) return;
    try { await onCompleted(); }
    catch (error) {
      if (typeof error === "object" && error && "status" in error && (error as { status?: string }).status === "unavailable") {
        setNotice({ text: "공유 이벤트 저장소를 사용할 수 없어 확인하지 못했어요. 잠시 후 다시 시도해주세요.", error: true });
      } else {
        setNotice({ text: "공유는 끝났지만 아직 상대방의 무료 풀이 완료를 확인하지 못했어요. 완료 후 다시 확인해주세요.", error: true });
      }
    }
  }

  async function share() {
    track("share_intent");
    setBusy(true);
    setNotice(null);
    try {
      const nextShareData = await prepareShareData();
      if (!navigator.share) throw new Error("Native share unavailable");
      await navigator.share(nextShareData);
      track("share_sheet_resolved");
      setShared(true);
      setNotice({ text: "공유창 처리가 끝났어요. 상대방이 링크에서 무료 풀이를 완료하면 무료 체험을 확인할 수 있어요." });
      await completeParticipation();
    } catch (error) {
      if (error instanceof ReferralUnavailableError) {
        setNotice({ text: "공유 이벤트 저장소를 사용할 수 없어 무료 체험 공유를 준비하지 못했어요. 잠시 후 다시 시도해주세요.", error: true });
        return;
      }
      if (typeof error === "object" && error && "status" in error && (error as { status?: string }).status === "unavailable") {
        setNotice({ text: "공유 이벤트 저장소를 사용할 수 없어 확인하지 못했어요. 잠시 후 다시 시도해주세요.", error: true });
        return;
      }
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
      const nextShareData = await prepareShareData();
      if (!navigator.clipboard?.writeText) {
        setShared(true);
        selectLink();
        setNotice({ text: "자동 복사를 사용할 수 없어요. 아래 준비된 주소를 직접 복사해주세요." });
        return;
      }
      await navigator.clipboard.writeText(nextShareData.url);
      track("link_copied");
      setShared(true);
      setNotice({ text: "무료 사주 링크를 복사했어요. 보내려는 앱에 붙여넣어주세요." });
      await completeParticipation();
    } catch (error) {
      if (error instanceof ReferralUnavailableError) {
        setNotice({ text: "공유 이벤트 저장소를 사용할 수 없어 무료 체험 공유를 준비하지 못했어요. 잠시 후 다시 시도해주세요.", error: true });
        return;
      }
      if (typeof error === "object" && error && "status" in error && (error as { status?: string }).status === "unavailable") {
        setNotice({ text: "공유 이벤트 저장소를 사용할 수 없어 확인하지 못했어요. 잠시 후 다시 시도해주세요.", error: true });
        return;
      }
      if (typeof error === "object" && error && "status" in error && (error as { status?: string }).status === "pending") {
        setNotice({ text: "아직 상대방의 무료 풀이 완료가 확인되지 않았어요. 완료 후 다시 확인해주세요.", error: true });
        return;
      }
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
      {trial && <p className="mt-2 text-sm leading-6">공유창 완료·복사만으로는 열리지 않습니다. 이 링크를 연 다른 익명 세션이 서버에서 무료 풀이를 실제 완료하면 확인할 수 있어요. 쿠키 삭제·다른 기기 자기추천은 같은 사람인지 판별하지 못합니다.</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {nativeShare && <Button type="button" onClick={() => void share()} disabled={busy || preparing || (trial && !shareDataReady)} className="h-12 rounded-full"><Share2 className="size-4" />{preparing ? "공유 준비 중..." : busy ? "처리 중..." : trial ? "링크 공유하고 무료 체험" : "공유하기"}</Button>}
        <Button type="button" variant="outline" onClick={() => void copyLink()} disabled={busy || preparing || (trial && !shareDataReady)} className="h-12 rounded-full"><Copy className="size-4" />{preparing ? "공유 준비 중..." : trial ? "링크 복사하고 무료 체험" : "링크 복사"}</Button>
      </div>
      {trial && !shareDataReady && !preparing && <Button type="button" variant="outline" onClick={() => void prepareShareData().catch(() => { preparation.current = null; setNotice({ text: "공유 이벤트 저장소를 사용할 수 없어 무료 체험 공유를 준비하지 못했어요. 잠시 후 다시 시도해주세요.", error: true }); })} className="mt-2 h-11 w-full">공유 이벤트 다시 준비</Button>}
      {trial && onCompleted && <Button type="button" variant="outline" onClick={() => void completeParticipation()} disabled={busy} className="mt-2 h-11 w-full">{shared ? "상대방 무료 풀이 완료 확인" : "무료 풀이 완료 여부 확인"}</Button>}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{nativeShare ? "기기 공유창에서 카카오톡 등 사용할 앱을 선택해주세요." : "이 브라우저에서는 링크를 복사해 카카오톡 등 원하는 앱에 붙여넣어주세요."}</p>
      {(!trial || shareDataReady) && <label className="mt-3 block text-xs text-muted-foreground">공유할 주소
        <input ref={linkInput} readOnly value={shareData.url} onFocus={event => event.currentTarget.select()} className="mt-1 h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
      </label>}
      {notice && <p role={notice.error ? "alert" : "status"} className="mt-3 text-sm leading-6">{notice.text}</p>}
    </section>
  );
}
