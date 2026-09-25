import type { SecondaryPalmLineSignal } from "@/lib/palm-facts";

export interface FateModelObservation {
  confidence: number;
  verticalSpan: number;
  horizontalSpan: number;
}

export function fuseFateSignal(
  base: SecondaryPalmLineSignal,
  model: FateModelObservation | null,
): SecondaryPalmLineSignal {
  const modelConfidence = model?.confidence ?? 0;
  const modelVerticalSpan = model?.verticalSpan ?? 0;
  const modelHorizontalSpan = model?.horizontalSpan ?? 0;

  const modelLineLike =
    Boolean(model) &&
    modelVerticalSpan >= 0.18 &&
    modelVerticalSpan >= Math.max(0.12, modelHorizontalSpan * 2);

  const heuristicSupports = base.status === "faint" || base.status === "clear";
  const strongModel = modelLineLike && modelConfidence >= 0.25;
  const mediumModel = modelLineLike && modelConfidence >= 0.12;
  const corroborated = heuristicSupports && mediumModel;

  let status: SecondaryPalmLineSignal["status"] = "not_seen";
  if ((base.status === "clear" && mediumModel) || (base.status === "faint" && strongModel)) {
    status = "clear";
  } else if (corroborated || strongModel || base.status === "clear") {
    status = "faint";
  }

  const strength = Math.max(base.strength, strongModel ? modelConfidence : modelConfidence * 0.7);
  const span = Math.max(base.span, modelLineLike ? modelVerticalSpan : 0);

  return {
    status,
    strength: Math.min(1, strength),
    span,
    modelConfidence: model ? modelConfidence : null,
    modelVerticalSpan: model ? modelVerticalSpan : null,
    corroborated,
    note:
      status === "clear"
        ? "운명선 후보가 영상 주름 신호와 별도 4선 모델에서 함께 확인됩니다."
        : status === "faint"
          ? model
            ? "운명선 후보가 일부 보이지만 두 검출 경로의 일치가 충분하지 않아 아직 선명 판정으로 올리지 않았습니다."
            : base.note
          : "운명선 후보가 두 검출 경로에서 충분히 확인되지 않았습니다.",
  };
}
