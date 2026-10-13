/** Server-side opt-in. A configured credential alone never enables a call.
 * Only the literal value "true" opts in; absence and other values stay off. */
export function isExternalInterpretationEnabled(): boolean {
  return process.env.SAJU_EXTERNAL_MODEL_ENABLED === "true";
}

export function externalInterpretationSkipReason(): string {
  return isExternalInterpretationEnabled() ? "no-api-key" : "external-model-disabled";
}
