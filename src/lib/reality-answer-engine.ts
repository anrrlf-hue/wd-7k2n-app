import { z } from "zod";
import {
  validateRealityAnswer,
  type RealityAnswer,
  type RealityAnswerDomain,
  type RealityQuestion,
} from "@/lib/reality-answer-contract";
import { buildRealityAnswerFallback } from "@/lib/reality-answer-builder";
import { selectRealityEvidence } from "@/lib/reality-evidence";
import {
  REALITY_ANSWER_SYSTEM_PROMPT,
  buildRealityAnswerUserPrompt,
} from "@/lib/reality-answer-prompt";
import { decisionPointFor, parseRealityQuestion, type RealityQuestionParseResult } from "@/lib/reality-question";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import type { PersonalityInput } from "@/lib/personality-check";
import type { SajuFacts } from "@/lib/saju-facts";

const RealityAnswerDraftSchema = z.object({
  headline: z.string().min(10),
  whyNow: z.string().min(20),
  repeatingPattern: z.string().min(20),
  avoid: z.string().min(10),
  choose: z.string().min(10),
  actions: z.tuple([
    z.object({ title: z.string().min(2), detail: z.string().min(10), doneWhen: z.string().min(5) }),
    z.object({ title: z.string().min(2), detail: z.string().min(10), doneWhen: z.string().min(5) }),
    z.object({ title: z.string().min(2), detail: z.string().min(10), doneWhen: z.string().min(5) }),
  ]),
  timing: z.object({
    now: z.string().min(10),
    nextCheckpoint: z.string().min(10),
    precision: z.literal("daeun_only"),
  }),
  realityChecks: z.array(z.string().min(2)).min(1),
  uncertainty: z.array(z.string().min(2)),
  safetyNote: z.string().min(5).optional(),
});

export interface RealityAnswerEngineOptions {
  timeoutMs?: number;
  personality?: PersonalityInput | null;
  palm?: OnnxPalmLines | null;
  domainOverride?: RealityAnswerDomain | null;
}

export type RealityAnswerEngineResult =
  | {
      status: "ready";
      source: "llm" | "fallback";
      answer: RealityAnswer;
      parse: RealityQuestionParseResult;
      fallbackReason?: string;
    }
  | {
      status: "needs_clarification";
      parse: RealityQuestionParseResult;
      reason: string;
    };

const DEFAULT_TIMEOUT_MS = 9000;

async function callClaude(systemPrompt: string, userPrompt: string, timeoutMs: number): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);

    const data = await res.json();
    const text: string = Array.isArray(data?.content)
      ? data.content
          .filter((block: { type?: string; text?: string }) => block?.type === "text" && typeof block.text === "string")
          .map((block: { text: string }) => block.text)
          .join("\n")
      : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾지 못했습니다.");
    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timer);
  }
}

function toQuestion(
  parse: RealityQuestionParseResult,
  domainOverride?: RealityAnswerDomain | null,
): RealityQuestion | null {
  const domain = domainOverride ?? parse.domain;
  if (!domain) return null;
  const decisionPoint = domainOverride
    ? decisionPointFor(parse.raw, domainOverride)
    : parse.decisionPoint;
  if (!decisionPoint) return null;
  return {
    raw: parse.raw,
    domain,
    intent: parse.intent,
    decisionPoint,
  };
}

export async function getRealityAnswer(
  rawQuestion: string,
  facts: SajuFacts,
  options: RealityAnswerEngineOptions = {},
): Promise<RealityAnswerEngineResult> {
  const parse = parseRealityQuestion(rawQuestion);
  const question = toQuestion(parse, options.domainOverride);

  if (!question) {
    return {
      status: "needs_clarification",
      parse,
      reason: "질문의 분야나 실제 결정점을 아직 특정하기 어렵습니다. 연애·취업/이직·직장/사업·돈·인간관계·생활/건강·전체 흐름 중 가까운 주제를 하나 고르면 이어갈 수 있습니다.",
    };
  }

  const evidence = selectRealityEvidence(facts, question.domain, {
    palm: options.palm,
    personality: options.personality,
  });

  const fallback = buildRealityAnswerFallback({
    question,
    facts,
    evidence,
    personality: options.personality,
  });

  let raw: unknown = null;
  let fallbackReason: string | undefined;

  try {
    raw = await callClaude(
      REALITY_ANSWER_SYSTEM_PROMPT,
      buildRealityAnswerUserPrompt(question, evidence),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    if (!raw) fallbackReason = "no-api-key";
  } catch (error) {
    fallbackReason = error instanceof Error ? error.message : String(error);
    raw = null;
  }

  if (raw) {
    const draft = RealityAnswerDraftSchema.safeParse(raw);
    if (draft.success) {
      const candidate: RealityAnswer = {
        question,
        ...draft.data,
        // LLM이 evidence를 새로 만들지 못하게 실제 selector 결과만 붙인다.
        evidence,
      };

      if (question.domain === "wellbeing" && !candidate.safetyNote) {
        candidate.safetyNote = "이 답변은 질병 진단이나 치료를 대신하지 않습니다.";
      }

      const validation = validateRealityAnswer(candidate);
      if (validation.ok) {
        return { status: "ready", source: "llm", answer: candidate, parse };
      }
      fallbackReason = `validation-failed: ${validation.errors.join("; ")}`;
    } else {
      fallbackReason = `schema-failed: ${draft.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`;
    }
  }

  const fallbackValidation = validateRealityAnswer(fallback);
  if (!fallbackValidation.ok) {
    throw new Error(`Reality Answer fallback invariant failed: ${fallbackValidation.errors.join("; ")}`);
  }

  return {
    status: "ready",
    source: "fallback",
    answer: fallback,
    parse,
    fallbackReason,
  };
}
