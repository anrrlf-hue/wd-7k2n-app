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
import type { RealityPalmContext } from "@/lib/reality-palm-context";
import { realityDomainForSajuFocus, type SajuFocus } from "@/lib/saju-focus";
import { buildSajuTimingOutlook } from "@/lib/saju-timing";

const RealityAnswerDraftSchema = z.object({
  headline: z.string().min(10),
  report: z.object({
    questionReading: z.string().min(80),
    currentFlow: z.string().min(80),
    solutionReading: z.string().min(80),
    timingReading: z.string().min(20).optional(),
  }),
  whyNow: z.string().min(20),
  repeatingPattern: z.string().min(20),
  avoid: z.string().min(10),
  choose: z.string().min(10),
  realityChecks: z.array(z.string().min(2)).min(1),
  uncertainty: z.array(z.string().min(2)),
  safetyNote: z.string().min(5).optional(),
});

export interface RealityAnswerEngineOptions {
  timeoutMs?: number;
  personality?: PersonalityInput | null;
  palm?: OnnxPalmLines | null;
  palmContext?: RealityPalmContext | null;
  /** 사용자에게 보이는 5개 사주 선택. 내부 세부분류는 질문 내용으로 자동 결정한다. */
  focusHint?: SajuFocus | null;
  /** 질문 엔진이 짧은 후속질문의 문맥까지 해석한 내부 세부분류. */
  domainHint?: RealityAnswerDomain | null;
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
        max_tokens: 2200,
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

function hasUnsupportedTimingMention(
  text: string,
  timing: RealityAnswer["timing"],
): boolean {
  if (!timing.windows || timing.windows.length === 0) return false;

  const allowedYears = new Set<string>();
  const allowedYearMonths = new Set<string>();
  const allowedMonths = new Set<string>();
  for (const window of timing.windows) {
    const match = window.label.match(/(20\d{2})년(?:\s*(\d{1,2})월)?/);
    if (!match) continue;
    allowedYears.add(match[1]);
    if (match[2]) {
      allowedYearMonths.add(match[1] + "-" + String(Number(match[2])));
      allowedMonths.add(String(Number(match[2])));
    }
  }

  for (const match of text.matchAll(/(20\d{2})년(?:\s*(\d{1,2})월)?/g)) {
    const year = match[1];
    const month = match[2] ? String(Number(match[2])) : null;
    if (month) {
      if (!allowedYearMonths.has(year + "-" + month)) return true;
    } else if (!allowedYears.has(year)) {
      return true;
    }
  }

  for (const match of text.matchAll(/(?<!\d)(\d{1,2})월/g)) {
    const month = String(Number(match[1]));
    if (!allowedMonths.has(month)) return true;
  }

  return false;
}

function toQuestion(
  parse: RealityQuestionParseResult,
  focusHint?: SajuFocus | null,
  domainHint?: RealityAnswerDomain | null,
): RealityQuestion | null {
  const domain = domainHint ?? (
    focusHint
      ? realityDomainForSajuFocus(focusHint, parse.domain)
      : parse.domain
  );
  if (!domain) return null;

  const decisionPoint = decisionPointFor(parse.raw, domain);
  if (!decisionPoint) return null;

  return {
    raw: parse.raw,
    domain,
    intent: parse.intent,
    decisionPoint,
    timeScope: parse.timeScope,
  };
}

export async function getRealityAnswer(
  rawQuestion: string,
  facts: SajuFacts,
  options: RealityAnswerEngineOptions = {},
): Promise<RealityAnswerEngineResult> {
  const parse = parseRealityQuestion(rawQuestion);
  const question = toQuestion(parse, options.focusHint, options.domainHint);

  if (!question) {
    return {
      status: "needs_clarification",
      parse,
      reason: "질문의 분야를 특정하기 어렵습니다. 처음 선택한 5개 사주 분야 중 가까운 주제를 기준으로 질문해 주세요.",
    };
  }

  const evidence = selectRealityEvidence(facts, question.domain, {
    palm: options.palm,
    palmContext: options.palmContext,
    personality: options.personality,
  });
  const timingOutlook = buildSajuTimingOutlook(facts, question.domain, undefined, question.timeScope);

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
      buildRealityAnswerUserPrompt(question, evidence, timingOutlook),
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
      const draftNarrative = [
        draft.data.headline,
        draft.data.report.questionReading,
        draft.data.report.currentFlow,
        draft.data.report.solutionReading,
        draft.data.report.timingReading ?? "",
      ].join("\n");

      if (
        hasUnsupportedTimingMention(draftNarrative, fallback.timing)
      ) {
        fallbackReason = "timing-drift: model introduced a year/month outside calculated windows";
      } else {
      const candidate: RealityAnswer = {
        question,
        ...draft.data,
        report: {
          ...draft.data.report,
          timingReading: fallback.report?.timingReading,
        },
        timing: fallback.timing,
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
      }
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
