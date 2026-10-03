"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  decodeRelationshipShare,
  type RelationshipSharePayload,
} from "@/lib/relationship-share";

function SharedSection({
  eyebrow,
  section,
}: {
  eyebrow: string;
  section: { title: string; text: string } | null;
}) {
  if (!section) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-lg font-semibold">{section.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.text}</p>
    </section>
  );
}

export default function RelationshipSharePage() {
  const [payload, setPayload] = useState<RelationshipSharePayload | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const raw = window.location.hash.startsWith("#r=")
      ? window.location.hash.slice(3)
      : "";
    const decoded = raw ? decodeRelationshipShare(decodeURIComponent(raw)) : null;
    if (!decoded) {
      setInvalid(true);
      return;
    }
    setPayload(decoded);
    track("relationship_share_opened", {
      shareId: decoded.shareId,
      purpose: decoded.purpose,
    });
  }, []);

  if (invalid) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
        <h1 className="text-2xl font-semibold">공유 결과를 열 수 없어요</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          링크가 일부 잘렸거나 오래된 형식일 수 있습니다. 새로 공유받은 링크로 다시 열어주세요.
        </p>
        <Button asChild className="mt-6 h-12 rounded-full">
          <Link href="/">운·돈 처음으로</Link>
        </Button>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">두 사람의 결과를 불러오고 있어요...</p>
      </main>
    );
  }

  const selectedAnswer = payload.followUps.find((item) => item.question === selected)?.answer;
  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-8">
      <div className="flex items-center gap-2 text-(--gold)">
        <UsersRound className="size-4" />
        <p className="section-eyebrow">운·돈 · 나와 이 사람</p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {payload.meName} × {payload.otherName} · {payload.purposeLabel}
      </p>
      <h1 className="mt-2 text-2xl leading-9 font-semibold">{payload.headline}</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">{payload.intro}</p>

      <div className="mt-6 grid gap-3">
        <SharedSection eyebrow="잘 맞는 부분" section={payload.strength} />
        <SharedSection eyebrow="부딪힐 수 있는 부분" section={payload.friction} />
        <SharedSection eyebrow="같이할 때 역할" section={payload.role} />
        <SharedSection eyebrow="지금의 두 사람" section={payload.timing} />
      </div>

      {payload.followUps.length > 0 && (
        <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">이 관계에서 더 궁금한 것</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            공유한 사람이 본 관계 맥락 그대로 이어서 볼 수 있습니다.
          </p>
          <div className="mt-3 grid gap-2">
            {payload.followUps.map((item) => (
              <button
                key={item.question}
                type="button"
                onClick={() => {
                  setSelected(item.question);
                  track("relationship_shared_followup_opened", {
                    shareId: payload.shareId,
                    purpose: payload.purpose,
                  });
                }}
                className="min-h-11 rounded-xl border border-border bg-accent px-3 py-2 text-left text-sm font-medium"
              >
                {item.question}
              </button>
            ))}
          </div>
          {selected && selectedAnswer && (
            <div className="mt-3 rounded-xl bg-accent p-4">
              <p className="text-sm font-semibold">{selected}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedAnswer}</p>
            </div>
          )}
        </section>
      )}

      <section className="mt-7 rounded-3xl border border-(--gold-soft) bg-card p-5">
        <p className="section-eyebrow">내 관계도 보고 싶다면</p>
        <h2 className="mt-2 text-xl leading-8 font-semibold">
          내 사주를 본 뒤 가까운 사람과 이어서 볼 수 있어요
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          이 공유 링크에는 두 사람의 생년월일이나 손 사진이 들어 있지 않습니다.
        </p>
        <Button asChild size="lg" className="mt-4 h-13 w-full rounded-full text-base">
          <Link
            href="/diagnosis?mode=free&focus=overall&start=free"
            onClick={() =>
              track("relationship_recipient_cta_clicked", {
                shareId: payload.shareId,
                purpose: payload.purpose,
              })
            }
          >
            나도 내 사주로 관계 보기
          </Link>
        </Button>
      </section>
    </main>
  );
}
