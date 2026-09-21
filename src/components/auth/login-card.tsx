"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/config";

export function LoginCard({ nextPath = "/management" }: { nextPath?: string }) {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [providers, setProviders] = useState({ email: true, kakao: false, google: false });

  useEffect(() => {
    if (!configured) return;
    const { url, key } = getSupabasePublicConfig();
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((response) => response.ok ? response.json() : null)
      .then((settings) => {
        if (!settings?.external) return;
        setProviders({
          email: Boolean(settings.external.email),
          kakao: Boolean(settings.external.kakao),
          google: Boolean(settings.external.google),
        });
      })
      .catch(() => {
        // 공급자 상태 확인 실패 시 이메일 기본 경로만 유지한다.
      });
  }, [configured]);

  function callbackUrl() {
    const next = encodeURIComponent(nextPath.startsWith("/") ? nextPath : "/management");
    return `${window.location.origin}/auth/callback?next=${next}`;
  }

  async function social(provider: "kakao" | "google") {
    if (!configured) {
      setMessage("로그인 연결을 위한 Supabase 설정이 아직 필요합니다.");
      return;
    }

    setBusy(provider);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });

    if (error) {
      setMessage("로그인을 시작하지 못했습니다. 설정을 다시 확인해주세요.");
      setBusy(null);
    }
  }

  async function emailLogin() {
    if (!configured) {
      setMessage("로그인 연결을 위한 Supabase 설정이 아직 필요합니다.");
      return;
    }
    if (!email.trim()) {
      setMessage("이메일 주소를 입력해주세요.");
      return;
    }

    setBusy("email");
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });

    if (error) {
      setMessage("인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.");
    } else {
      setMessage("인증 메일을 보냈습니다. 메일의 링크를 누르면 관리페이지로 이어집니다.");
    }
    setBusy(null);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="section-eyebrow">결과와 변화를 저장할게요</p>
      <h1 className="mt-3 text-2xl leading-snug font-semibold">
        로그인하면 오늘의 재무 방향과
        <br />
        30일 후 변화까지 이어서 볼 수 있어요
      </h1>

      {(providers.kakao || providers.google) && (
        <div className="mt-6 space-y-3">
          {providers.kakao && (
            <Button
              size="lg"
              disabled={busy !== null}
              onClick={() => social("kakao")}
              className="h-14 w-full rounded-full text-base"
            >
              {busy === "kakao" ? "연결 중..." : "카카오로 계속하기"}
            </Button>
          )}

          {providers.google && (
            <Button
              size="lg"
              variant="outline"
              disabled={busy !== null}
              onClick={() => social("google")}
              className="h-14 w-full rounded-full text-base"
            >
              {busy === "google" ? "연결 중..." : "Google로 계속하기"}
            </Button>
          )}
        </div>
      )}

      {(providers.kakao || providers.google) && providers.email && (
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          또는
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {providers.email && (
        <>
          <label className={providers.kakao || providers.google ? "block" : "mt-6 block"}>
            <span className="text-sm font-medium">이메일로 계속하기</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@email.com"
              className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none"
            />
          </label>

          <Button
            size="lg"
            variant="outline"
            disabled={busy !== null}
            onClick={emailLogin}
            className="mt-3 h-13 w-full rounded-full text-base"
          >
            {busy === "email" ? "보내는 중..." : "인증 링크 받기"}
          </Button>
        </>
      )}

      {!providers.kakao && !providers.google && configured && (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          카카오·Google 간편로그인은 연결 준비 중이며, 현재는 이메일로 이용할 수 있습니다.
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-xl bg-accent p-3 text-sm leading-6">{message}</p>
      )}

      {!configured && (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          현재 로그인 화면과 인증 구조는 준비됐고, Supabase 프로젝트 키를 연결하면 활성화됩니다.
        </p>
      )}
    </div>
  );
}
