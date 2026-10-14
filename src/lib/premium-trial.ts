import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type TrialParticipation = "native_share" | "clipboard";
const CAMPAIGN = "premium-share-trial-v1";
type Receipt = { campaign: string; scope: string; participation: TrialParticipation; completedAt: number };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** Hash only the parsed reading input. Receipt never contains birth/palm facts. */
export function premiumTrialScope(input: unknown): string {
  return createHash("sha256").update(canonical(input)).digest("hex");
}

function signingKey(): Buffer {
  // Reuse the framework's existing server-only build key with domain separation.
  // No new credential, database, login or environment setting is introduced.
  try {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), ".next/server/server-reference-manifest.json"), "utf8"));
    const key = Buffer.from(manifest.encryptionKey, "base64");
    if (key.length !== 32) throw new Error("Invalid build key");
    return createHmac("sha256", key).update("saju:premium-share-trial:receipt-key:v1").digest();
  } catch { throw new Error("Premium trial signing key unavailable"); }
}

export function issuePremiumTrial(input: unknown, participation: TrialParticipation): string {
  if (participation !== "native_share" && participation !== "clipboard") throw new Error("Invalid participation");
  const receipt: Receipt = { campaign: CAMPAIGN, scope: premiumTrialScope(input), participation, completedAt: Date.now() };
  const body = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${body}.${createHmac("sha256", signingKey()).update(body).digest("base64url")}`;
}

/** Browser success is the campaign condition, not proof of delivery/acquisition.
 * A signed receipt proves registration and binds that participation to one input.
 * It stays in this browser session; campaign/key changes invalidate old receipts. */
export function verifyPremiumTrial(input: unknown, token: unknown): Receipt | null {
  if (typeof token !== "string" || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const expected = createHmac("sha256", signingKey()).update(parts[0]).digest();
  const supplied = Buffer.from(parts[1], "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const receipt = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as Receipt;
    return receipt.campaign === CAMPAIGN && receipt.scope === premiumTrialScope(input)
      && ["native_share", "clipboard"].includes(receipt.participation)
      && Number.isSafeInteger(receipt.completedAt) && receipt.completedAt <= Date.now()
      ? receipt : null;
  } catch { return null; }
}
