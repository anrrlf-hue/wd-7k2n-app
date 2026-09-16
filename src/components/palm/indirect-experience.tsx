"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getExperienceScenes, computeExperienceOutcome } from "@/lib/indirect-experience";
import { PALM_FLAVOR_LINE } from "@/lib/indirect-experience-data";
import { track } from "@/lib/analytics";
import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import type { PalmKeyword } from "@/lib/palm-keyword";
import type { ExperienceChoice } from "@/lib/indirect-experience-data";

type Stage = "intro" | number | "outcome";

/** 재물유형(4종)이 상황·선택지를 정하는 간접체험 — "당신 사주에서 나온
 * 문제 -> 선택하면 결과가 달라지는 걸 직접 확인"하는 체험. 손금 손 모양은
 * 도입부 성향 묘사 한 줄에만 쓴다. step-shell.tsx에서 찾은 교훈대로 exit
 * 애니메이션 없이 구현 — 탭이 백그라운드로 가도 장면 전환이 멈추지 않는다. */
export function IndirectExperience({
  wealthTypeCode,
  palmKeyword,
  onComplete,
}: {
  wealthTypeCode: WealthTypeCode;
  palmKeyword: PalmKeyword;
  onComplete: () => void;
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [tones, setTones] = useState<ExperienceChoice["tone"][]>([]);

  const scenes = getExperienceScenes(wealthTypeCode);
  const flavorLine = PALM_FLAVOR_LINE[palmKeyword];

  function choose(tone: ExperienceChoice["tone"], sceneIndex: number) {
    const next = [...tones, tone];
    setTones(next);
    setStage(sceneIndex + 1 >= scenes.length ? "outcome" : sceneIndex + 1);
  }

  return (
    <div className="mt-8">
      {stage === "intro" && (
        <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-sm font-medium">지금까지는 당신이 어떤 사람인지 봤습니다.</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            이제 그 사람이 어떤 선택을 하면 무엇이 달라지는지, 직접 겪어볼 차례입니다.
          </p>
          {flavorLine && <p className="mt-3 text-xs text-muted-foreground">{flavorLine}</p>}
          <Button
            size="lg"
            onClick={() => {
              track("indirect_experience_started");
              setStage(0);
            }}
            className="mt-4 h-13 w-full rounded-full text-base"
          >
            간접체험 시작하기
          </Button>
        </motion.div>
      )}

      {typeof stage === "number" && scenes[stage] && (
        <motion.div key={scenes[stage].id} initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-xs text-muted-foreground">
            {stage + 1} / {scenes.length}
          </p>
          <p className="mt-1.5 text-sm font-medium">{scenes[stage].situation}</p>
          <div className="mt-3 flex flex-col gap-2">
            {scenes[stage].choices.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => choose(opt.tone, stage)}
                className="mystic-card p-3 text-left text-sm transition-colors hover:border-(--gold-soft)"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {stage === "outcome" && (
        <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
            {computeExperienceOutcome(wealthTypeCode, tones)}
          </p>
          <Button size="lg" onClick={onComplete} className="mt-4 h-13 w-full rounded-full text-base">
            다음
          </Button>
        </motion.div>
      )}
    </div>
  );
}
