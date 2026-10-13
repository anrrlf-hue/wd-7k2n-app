import { TEN_GOD_GROUP, type SajuFacts } from "@/lib/saju-facts";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import { validateReadingPlan, type ReadingEvidence, type ReadingPlan } from "@/lib/reading-plan";
import { buildPremiumEditorialPlan, type PremiumEditorialPlan } from "@/lib/premium-editorial-plan";

type Area = "overall" | "love_relationship" | "money" | "work";
type LineKey = "headLine" | "heartLine";
const NAMES = { headLine: "두뇌선", heartLine: "감정선" } as const;
const HANDS = { left: "왼손", right: "오른손" } as const;
const COUNT_FIELDS = ["peerStarCount", "outputStarCount", "wealthStarCount", "officerStarCount", "resourceStarCount"] as const;

export interface IntegratedPassage {
  plan: ReadingPlan;
  scene: string | null;
  /** Exposed at the relevant passage, not as a repeated report-wide warning. */
  observationNote: string | null;
}
export type IntegratedPalmReading = Partial<Record<Area, IntegratedPassage>>;

/** A structured, inspectable composition boundary. It receives the whole natal
 * calculation and both hands. Only the fields actually used by an authored
 * relation appear in its evidence; unhandled calculations are never claimed as
 * interpreted. No model call, photo transfer or new history is introduced here. */
export function buildIntegratedPalmReading(facts: SajuFacts, left: PalmFacts, right: PalmFacts, dominant: DominantHand, selectedPlan?: PremiumEditorialPlan): IntegratedPalmReading {
  const editorial = selectedPlan ?? buildPremiumEditorialPlan(facts);
  const hands = { left, right };
  const other: DominantHand = dominant === "left" ? "right" : "left";
  const evidence: ReadingEvidence[] = COUNT_FIELDS.map(field => ({ id: `saju.${field}`, kind: "calculated", source: `facts.${field}`, value: facts[field] }));
  evidence.push({ id: "saju.editorialArc", kind: "calculated", source: "buildPersonalReading(facts).rule", value: editorial.id });
  evidence.push({ id: "saju.strength", kind: "calculated", source: "facts.dayStrength / dayStrengthReliable", value: facts.dayStrengthReliable ? facts.dayStrength : null });
  const close = facts.pillars.find(p => p.pillar === "day");
  const workplace = facts.pillars.find(p => p.pillar === "month");
  evidence.push({ id: "saju.close", kind: "calculated", source: "facts.pillars.day.branchTenGod", value: close?.branchTenGod ?? null });
  evidence.push({ id: "saju.workplace", kind: "calculated", source: "facts.pillars.month", value: workplace ? `${workplace.stemTenGod}/${workplace.branchTenGod}` : null });
  evidence.push({ id: "dominant", kind: "observed", source: "user.dominantHand", value: dominant });
  const counts = COUNT_FIELDS.map(field => `saju.${field}`);
  const curved = (line: OnnxLineDetail | undefined) => line?.curve === "완만한 곡선";
  const readable = (line: OnnxLineDetail | undefined) => Boolean(line?.detected && line.curve && line.depthStrength !== "약함");
  function pair(key: LineKey) {
    const refs: string[] = [];
    for (const hand of ["left", "right"] as const) {
      const line = hands[hand].onnxLines?.[key];
      for (const field of ["detected", "length", "curve", "depthStrength"] as const) {
        const id = `${hand}.${key}.${field}`;
        refs.push(id);
        evidence.push({ id, kind: "observed", source: `${hand}PalmFacts.onnxLines.${key}.${field}`, value: line?.detected ? line[field] : field === "detected" ? false : null });
      }
    }
    const a = hands[dominant].onnxLines?.[key], b = hands[other].onnxLines?.[key];
    const l = left.onnxLines?.[key], r = right.onnxLines?.[key];
    const describe = (line: OnnxLineDetail | undefined) => !line?.detected ? "판독하지 못함" : [line.length && `길이 ${line.length}`, line.curve, line.depthStrength === "약함" && "사진에서 흐림"].filter(Boolean).join(" · ") || "세부 모양 미확인";
    const summary = describe(l) === describe(r) ? `양손 ${NAMES[key]}은 ${describe(l)}으로 읽혔습니다.` : `${NAMES[key]}은 왼손에서 ${describe(l)}, 오른손에서 ${describe(r)}으로 읽혔습니다.`;
    const note = ["left", "right"].flatMap(hand => {
      const line = hands[hand as DominantHand].onnxLines?.[key];
      return !readable(line) ? [`${HANDS[hand as DominantHand]} ${NAMES[key]}${line?.detected ? "의 세부 모양이 흐리거나 확인되지 않아" : "을 읽지 못해"} 이 부분은 연결 해석에서 제외했습니다.`] : [];
    }).join(" ") || null;
    return { a, b, refs, summary, note, usable: readable(a), both: readable(a) && readable(b), different: readable(a) && readable(b) && a!.curve !== b!.curve };
  }
  const head = pair("headLine"), heart = pair("heartLine");
  const result: IntegratedPalmReading = {};
  function add(area: Area, headline: string, text: string, scene: string | null, refs: string[], note: string | null = null) {
    const ids = [...new Set(["saju.editorialArc", ...refs])];
    const plan: ReadingPlan = {
      headline,
      passages: [{ id: `${area}-connection`, kind: "traditional", text, evidenceIds: ids },
        ...(scene ? [{ id: `${area}-scene`, kind: "reflection" as const, text: scene, evidenceIds: ids }] : [])],
      evidence: evidence.filter(e => ids.includes(e.id)), limits: note ? [note] : [],
    };
    validateReadingPlan(plan);
    result[area] = { plan, scene, observationNote: note };
  }
  if (head.usable && heart.usable) {
    const contrast = head.different || heart.different;
    const interaction = curved(head.a) ? editorial.overallConnection
      : `사주의 중심 질문은 ‘${editorial.question}’입니다. ${HANDS[dominant]} 두뇌선의 직선에 가까운 형태는 방법을 고를 때 기준을 정리하는 관점으로, 감정선은 그 기준을 사람에게 전하는 방식의 참고로만 읽습니다.`;
    const bilateral = contrast
      ? `반대 손에는 ${head.different && heart.different ? "두뇌선과 감정선 모두" : head.different ? "두뇌선에" : "감정선에"} 다른 곡선 형태가 보입니다. 여기서는 주로 쓰는 ${HANDS[dominant]}의 조합을 중심으로 읽고, 다른 손의 표현 방식도 아래 각 장면에서 함께 살펴봅니다.`
      : head.both && heart.both ? "두 손에서 같은 곡선 조합이 관찰됩니다." : "이 조합은 주로 쓰는 손에서 확인한 범위입니다.";
    add("overall", editorial.question, `${head.summary} ${heart.summary} ${interaction} ${bilateral}`, null, [...counts, "dominant", ...head.refs, ...heart.refs], [head.note, heart.note].filter(Boolean).join(" ") || null);
  }
  if (heart.usable) {
    const expression = heart.different
      ? "주손의 감정선과 반대 손의 곡선 형태가 달라, 말로 반응하는 표현과 꾸준한 행동으로 보여주는 표현을 나란히 놓고 읽습니다. 내가 익숙하게 전한 표현과 상대가 받아들인 표현이 만나는지를 살펴보는 관점입니다."
      : curved(heart.a) ? "감정선의 곡선을 표정과 말에 마음을 실어 보내는 모습에 연결하면, 다정한 반응을 주고받는 일이 그 기준을 확인하는 통로가 될 수 있습니다."
        : "직선에 가까운 감정선을 꾸준한 행동에 마음을 담는 모습에 연결하면, 먼저 챙기고 약속을 지키는 일이 그 기준을 보여주는 통로가 될 수 있습니다.";
    add("love_relationship", "마음을 표현한 방식과 상대에게 닿은 방식", `${editorial.loveConnection} ${heart.summary} ${expression}`, editorial.loveScene, ["saju.close", "dominant", ...heart.refs], heart.note);
  }
  if (head.usable) {
    const workGroups = workplace ? [TEN_GOD_GROUP[workplace.stemTenGod], TEN_GOD_GROUP[workplace.branchTenGod]] : [];
    const place = workGroups.includes("관성") ? "사회생활의 자리에서도 맡을 역할과 기대를 맞추는 주제가 보입니다."
      : workGroups.includes("식상") ? "사회생활의 자리에서는 생각을 실제 결과물로 꺼내는 주제가 보입니다."
      : workGroups.includes("인성") ? "사회생활의 자리에서는 배우고 이해한 내용을 자기 방식으로 정리하는 주제가 보입니다."
      : workGroups.includes("재성") ? "사회생활의 자리에서는 결과의 쓰임과 주고받을 조건을 살피는 주제가 보입니다."
      : workGroups.includes("비겁") ? "사회생활의 자리에서는 자신의 판단과 맡을 몫을 분명히 하는 주제가 보입니다." : "";
    const way = head.different
      ? "두 손의 두뇌선 방향이 달라, 여러 방법을 펼쳐보는 과정과 일정한 기준으로 정리하는 과정을 나누어 읽을 수 있습니다. 아이디어를 낼 때부터 결론의 기준까지 계속 바꾸기보다, 먼저 비교할 기준을 정하고 방법을 바꿔보는 장면에 두 관점을 함께 쓸 수 있습니다."
      : curved(head.a) ? "두뇌선의 곡선은 한 방법에 바로 고정되기보다 대안을 비교하는 모습으로 읽습니다. 일의 목적은 유지하면서 구현 방법을 바꾸는 여지가 있을 때, 사주에서 읽은 장점을 구체적으로 써볼 수 있습니다."
        : "직선에 가까운 두뇌선은 판단의 이유를 정리하며 한 방향으로 묶는 모습으로 읽습니다. 사주에서 읽은 장점을 쓰려면, 무엇을 완료로 볼지와 중간에 바꿔도 되는 조건을 먼저 맞추는 장면이 어울립니다.";
    add("work", "일을 받아들이는 기준을 실제 진행 방식으로 잇기", `${place} ${editorial.workConnection} ${head.summary} ${way}`, editorial.workScene, [...counts, "saju.workplace", "saju.strength", "dominant", ...head.refs], head.note);
  }
  const secondary: Array<{ hand: DominantHand; key: "fate" | "sun" | "wealth"; name: string; ref: string }> = [];
  for (const hand of ["left", "right"] as const) for (const [key, name] of [["fate", "운명선"], ["sun", "태양선"], ["wealth", "재물선"]] as const) {
    const signal = hands[hand].secondaryLines?.[key];
    if (signal?.status !== "clear" || (key === "fate" && !signal.corroborated)) continue;
    const ref = `${hand}.secondary.${key}`;
    evidence.push({ id: ref, kind: "observed", source: `${hand}PalmFacts.secondaryLines.${key}`, value: `${signal.status};corroborated=${signal.corroborated ?? false}` });
    secondary.push({ hand, key, name, ref });
  }
  if (secondary.length) {
    const has = (key: string) => secondary.some(s => s.key === key);
    const names = (["fate", "sun", "wealth"] as const).flatMap(key => {
      const entries = secondary.filter(s => s.key === key);
      return entries.length ? [`${entries.length === 2 ? "양손" : HANDS[entries[0].hand]}의 ${entries[0].name} 후보`] : [];
    }).join(", ");
    const meaning = has("sun") && has("wealth") ? "결과를 보여주는 일과 그 결과의 조건을 이야기하는 일을 함께 놓는 조합으로 읽어볼 수 있습니다. 좋은 반응을 얻었다는 사실만으로 다음 일의 범위와 대가까지 합의됐다고 여기지 않는 것이 연결점입니다."
      : has("sun") ? "태양선 후보를 성과가 드러나는 방식으로 읽으면, 스스로 만족한 부분을 상대도 알아볼 수 있게 설명하는 과정이 연결점이 됩니다."
      : has("wealth") ? "재물선 후보를 주고받는 조건을 살피는 관점으로 읽으면, 자신의 기여와 상대가 기대한 몫이 같은지 대화하는 과정이 연결점이 됩니다."
      : "운명선 후보를 맡은 일의 방향을 이어가는 관점으로 읽으면, 오래 관여할 일일수록 자신의 책임과 선택권이 어떤 조건으로 묶이는지가 연결점이 됩니다.";
    add("money", "해낸 일의 가치와 주고받을 조건", `${editorial.moneyConnection} 사진에서는 ${names}가 확인됩니다. ${meaning}`, editorial.moneyScene, [...counts, ...secondary.map(s => s.ref)]);
  }
  // Missing or faint lines stay visible as observation-specific notes; they do
  // not acquire a generic personality interpretation through the other hand.
  for (const [area, info] of [["work", head], ["love_relationship", heart]] as const) {
    if (!result[area] && info.note) {
      const plan: ReadingPlan = { headline: "사진에서 확인한 범위", passages: [{ id: `${area}-observation`, kind: "observation", text: info.summary, evidenceIds: info.refs }], evidence: evidence.filter(e => info.refs.includes(e.id)), limits: [info.note] };
      validateReadingPlan(plan);
      result[area] = { plan, scene: null, observationNote: info.note };
    }
  }
  return result;
}
