import type {
  PersonComparePurpose,
  PersonCompareResult,
  PersonCompareSection,
} from "@/lib/person-compare";

export interface RelationshipSharePayload {
  v: 1;
  shareId: string;
  purpose: PersonComparePurpose;
  purposeLabel: string;
  meName: string;
  otherName: string;
  headline: string;
  intro: string;
  strength: PersonCompareSection | null;
  friction: PersonCompareSection | null;
  role: PersonCompareSection | null;
  timing: PersonCompareSection | null;
  followUps: Array<{ question: string; answer: string }>;
}

function clip(value: string, max = 420): string {
  const text = value.trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function clipSection(section: PersonCompareSection | undefined): PersonCompareSection | null {
  return section ? { title: clip(section.title, 80), text: clip(section.text) } : null;
}
function shareId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildRelationshipSharePayload(result: PersonCompareResult): RelationshipSharePayload {
  return {
    v: 1,
    shareId: shareId(),
    purpose: result.purpose,
    purposeLabel: clip(result.purposeLabel, 40),
    meName: clip(result.meName, 24),
    otherName: clip(result.otherName, 24),
    headline: clip(result.headline, 180),
    intro: clip(result.intro),
    strength: clipSection(result.strengths[0]),
    friction: clipSection(result.friction[0]),
    role: clipSection(result.roles[0]),
    timing: clipSection(result.timing[0]),
    followUps: result.followUps.slice(0, 3).map((item) => ({
      question: clip(item.question, 120),
      answer: clip(item.answer, 420),
    })),
  };
}

function bytesToBinary(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 1) output += String.fromCharCode(bytes[i]);
  return output;
}
export function encodeRelationshipShare(payload: RelationshipSharePayload): string {
  const binary = bytesToBinary(new TextEncoder().encode(JSON.stringify(payload)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeRelationshipShare(token: string): RelationshipSharePayload | null {
  try {
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes)) as RelationshipSharePayload;
    if (
      value.v !== 1 ||
      !value.shareId ||
      !value.headline ||
      !Array.isArray(value.followUps)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function buildRelationshipShareUrl(
  result: PersonCompareResult,
  origin: string,
): { shareId: string; url: string } {
  const payload = buildRelationshipSharePayload(result);
  const token = encodeRelationshipShare(payload);
  return {
    shareId: payload.shareId,
    url: `${origin}/share/relationship#r=${encodeURIComponent(token)}`,
  };
}
