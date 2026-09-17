"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getExperienceScenes, computeExperienceOutcome } from "@/lib/indirect-experience";
import { PALM_FLAVOR_LINE } from "@/lib/indirect-experience-data";
import { track } from "@/lib/analytics";
import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import type { PalmKeyword } from "@/lib/palm-keyword";
import type { ExperienceChoice } from "@/lib/indirect-experience-data";

type Stage = "intro" | number | "outcome";

/** 같은 세 장면의 선택을 사주 해석과 비교한다. 점수나 정답은 만들지 않는다.
 * 손 모양은 도입부에만 쓰고, 화면 전환에는 exit 애니메이션을 쓰지 않는다. */
export function IndirectExperience({
  wealthTypeCode,
  palmKeyword,
  onComplete,
}: {
  wealthTypeCode: WealthTypeCode;
  palmKeyword: PalmKeyword;
  onComplete: (summary: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [choices, setChoices] = useState<ExperienceChoice["tendency"][]>([]);

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (stage !== "intro") panelRef.current?.scrollIntoView({ block: "start" }); }, [stage]);

  const scenes = getExperienceScenes();
  const flavorLine = PALM_FLAVOR_LINE[palmKeyword];

  function choose(tendency: ExperienceChoice["tendency"], sceneIndex: number) {
    const next = [...choices, tendency];
    setChoices(next);
    setStage(sceneIndex + 1 >= scenes.length ? "outcome" : sceneIndex + 1);
  }

  return (
    <div ref={panelRef} className="transition-panel mt-8 scroll-mt-6">
      {stage === "intro" && (
        <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-sm font-medium">나는 실제로 어떤 선택을 할까요?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            세 가지 일상 장면에서 더 마음이 가는 쪽을 골라보세요. 정답도 점수도 없습니다.
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
            내 선택 알아보기
          </Button>
        </motion.div>
      )}

      {typeof stage === "number" && scenes[stage] && (
        <motion.div key={scenes[stage].id} initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-xs text-muted-foreground">
            {stage + 1} / {scenes.length}
          </p>
          <p className="mt-1.5 text-xl leading-relaxed font-semibold">{scenes[stage].situation}</p>
          <div className="mt-3 flex flex-col gap-2">
            {scenes[stage].choices.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => choose(opt.tendency, stage)}
                className="choice-card min-h-16 p-4 text-left text-base transition-colors hover:border-(--gold-soft)"
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
            {computeExperienceOutcome(wealthTypeCode, choices)}
          </p>
          <p className="mt-6 text-lg font-semibold leading-relaxed">이제, 타고난 운세를 현실과 연결해 볼까요?</p>
          <Button size="lg" onClick={() => onComplete(computeExperienceOutcome(wealthTypeCode, choices))} className="mt-4 h-13 w-full rounded-full text-base">
            내 현실 재무상태 연결하기
          </Button>
        </motion.div>
      )}
    </div>
  );
}
