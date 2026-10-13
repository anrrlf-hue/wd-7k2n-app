"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Only runs after the user's explicit action in this browser. No server call. */
export function ReadingStorageControls() {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  function clearRecords() {
    let failed = false;
    for (const name of ["sessionStorage", "localStorage"] as const) {
      try {
        const storage = window[name];
        const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
        for (const key of keys) if (key?.startsWith("saju-app:")) storage.removeItem(key);
      } catch { failed = true; }
    }
    setConfirming(false);
    setMessage(failed ? "일부 저장공간에 접근하지 못했어요. 브라우저 설정에서 이 사이트의 저장공간을 삭제해주세요." : "이 탭에서 접근 가능한 사주 저장소 기록을 지웠어요. 방문 기록과 다른 탭의 기록은 별도입니다.");
  }
  return <div className="mt-4">
    {confirming ? <>
      <p className="text-sm">저장된 생년월일, 비교할 사람, 손금 특징과 풀이·관리 기록을 지울까요? 이 브라우저에서는 되돌릴 수 없습니다.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setConfirming(false)}>취소</Button>
        <Button onClick={clearRecords}>사주 기록 삭제 확인</Button>
      </div>
    </> : <Button variant="outline" onClick={() => { setMessage(null); setConfirming(true); }}>이 브라우저의 사주 기록 지우기</Button>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </div>;
}
