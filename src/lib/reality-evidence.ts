import type {
  RealityAnswerDomain,
  RealityEvidence,
} from "@/lib/reality-answer-contract";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import type { PersonalityInput } from "@/lib/personality-check";
import type { SajuFacts } from "@/lib/saju-facts";

function add(
  items: RealityEvidence[],
  source: RealityEvidence["source"],
  label: string,
  detail: string | null | undefined,
) {
  if (!detail?.trim()) return;
  items.push({ source, label, detail: detail.trim() });
}

function currentFlowEvidence(facts: SajuFacts, items: RealityEvidence[]) {
  if (facts.currentDaeun) {
    add(
      items,
      "daeun",
      "현재 대운",
      `${facts.currentDaeun.ageRange}세 · ${facts.currentDaeun.ganzhi} · 천간 ${facts.currentDaeun.stemTenGod} / 지지 ${facts.currentDaeun.branchTenGod}`,
    );
  }
  if (facts.nextDaeun) {
    add(
      items,
      "daeun",
      "다음 대운",
      `${facts.nextDaeun.ageRange}세 · ${facts.nextDaeun.ganzhi} · 천간 ${facts.nextDaeun.stemTenGod} / 지지 ${facts.nextDaeun.branchTenGod}`,
    );
  }
}

function personalityEvidence(
  personality: PersonalityInput | null | undefined,
  items: RealityEvidence[],
  keys: string[],
) {
  const levels = personality?.check?.levels;
  if (!levels) return;

  for (const key of keys) {
    const level = levels[key];
    if (!level || level === "미확인") continue;
    add(items, "self_report", `자가응답 ${key}`, level);
  }
}

function palmLineDetail(line: OnnxPalmLines["heartLine"]): string {
  const parts: string[] = [];
  if (line.curve) parts.push(line.curve);
  if (line.length) parts.push(`길이 ${line.length}`);
  if (line.depthStrength) parts.push(`선명도 ${line.depthStrength}`);
  return parts.length > 0 ? parts.join(" · ") : "선 위치만 확인";
}

function addPalmLine(
  items: RealityEvidence[],
  line: OnnxPalmLines["heartLine"],
  label: string,
) {
  if (!line.detected) return;
  add(items, "palm", label, palmLineDetail(line));
}

function palmEvidence(
  palm: OnnxPalmLines | null | undefined,
  domain: RealityAnswerDomain,
  items: RealityEvidence[],
) {
  if (!palm) return;

  if (domain === "love" || domain === "relationship") {
    addPalmLine(items, palm.heartLine, "현재 관계·감정 표현을 보완해 보는 감정선 관찰");
    return;
  }

  if (domain === "career" || domain === "work_business") {
    addPalmLine(items, palm.headLine, "현재 판단·일 처리 방식을 보완해 보는 두뇌선 관찰");
    return;
  }

  if (domain === "money") {
    addPalmLine(items, palm.headLine, "현재 돈 관련 판단 방식을 보완해 보는 두뇌선 관찰");
    addPalmLine(items, palm.lifeLine, "현재 생활 흐름의 지속 방식을 보완해 보는 생명선 관찰");
    return;
  }

  if (domain === "wellbeing") {
    // 생명선은 건강 상태나 수명을 판단하는 근거로 쓰지 않는다.
    addPalmLine(items, palm.lifeLine, "생활 리듬 참고용 생명선 관찰 · 건강 판단 아님");
    return;
  }

  if (domain === "overall") {
    addPalmLine(items, palm.headLine, "현재 판단 방식의 두뇌선 관찰");
    addPalmLine(items, palm.heartLine, "현재 관계·감정 표현의 감정선 관찰");
    addPalmLine(items, palm.lifeLine, "현재 생활 흐름의 생명선 관찰");
  }
}

export function selectRealityEvidence(
  facts: SajuFacts,
  domain: RealityAnswerDomain,
  options: {
    palm?: OnnxPalmLines | null;
    personality?: PersonalityInput | null;
  } = {},
): RealityEvidence[] {
  const items: RealityEvidence[] = [];

  add(items, "saju", "일간", `${facts.dayStemKo} · ${facts.dayElement}`);
  add(items, "saju", "격국", facts.geukguk || null);
  currentFlowEvidence(facts, items);

  if (domain === "career" || domain === "work_business") {
    add(
      items,
      "saju",
      "일 관련 십성",
      `관성 ${facts.officerStarCount} · 식상 ${facts.outputStarCount} · 비겁 ${facts.peerStarCount} · 인성 ${facts.resourceStarCount}`,
    );
    if (facts.officerStarPillars.length > 0) {
      add(items, "saju", "관성 위치", facts.officerStarPillars.join(", "));
    }
    personalityEvidence(options.personality, items, ["speed", "plan", "autonomy", "change"]);
    palmEvidence(options.palm, domain, items);
  }

  if (domain === "money") {
    add(
      items,
      "saju",
      "재물 관련 십성",
      `재성 ${facts.wealthStarCount} · 식상 ${facts.outputStarCount} · 비겁 ${facts.peerStarCount}`,
    );
    if (facts.wealthStarPillars.length > 0) {
      add(items, "saju", "재성 위치", facts.wealthStarPillars.join(", "));
    }
    add(
      items,
      "saju",
      "재성 대운 출현",
      `전체 대운에서 재성 신호 ${facts.wealthOpportunityDaeunCount}회`,
    );
    personalityEvidence(options.personality, items, ["change", "plan", "speed"]);
  }

  if (domain === "love" || domain === "relationship") {
    add(
      items,
      "saju",
      "관계 관련 십성",
      `비겁 ${facts.peerStarCount} · 관성 ${facts.officerStarCount} · 인성 ${facts.resourceStarCount}`,
    );
    if (facts.keyRelations.length > 0) {
      add(items, "saju", "원국 관계", facts.keyRelations.slice(0, 4).join(" · "));
    }
    personalityEvidence(options.personality, items, ["autonomy", "emotionExpression", "socialEnergy", "speed"]);
    palmEvidence(options.palm, domain, items);
  }

  if (domain === "wellbeing") {
    add(
      items,
      "saju",
      "오행 분포",
      Object.entries(facts.fiveElements)
        .map(([element, count]) => `${element} ${count}`)
        .join(" · "),
    );
    personalityEvidence(options.personality, items, ["speed", "plan"]);
  }

  if (domain === "overall") {
    add(
      items,
      "saju",
      "십성 구성",
      `비겁 ${facts.peerStarCount} · 식상 ${facts.outputStarCount} · 재성 ${facts.wealthStarCount} · 관성 ${facts.officerStarCount} · 인성 ${facts.resourceStarCount}`,
    );
    if (facts.keyRelations.length > 0) {
      add(items, "saju", "원국 관계", facts.keyRelations.slice(0, 4).join(" · "));
    }
    if (facts.peakStagePillars.length > 0) {
      add(items, "saju", "12운성 정점 자리", facts.peakStagePillars.join(", "));
    }
    personalityEvidence(options.personality, items, ["speed", "plan", "autonomy", "change"]);
  }

  return items;
}
