import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { registerHooks } from "node:module";

const root = process.cwd();
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let target = path.join(root, "src", specifier.slice(2));
      if (fs.existsSync(target + ".ts")) target += ".ts";
      else if (fs.existsSync(target + ".tsx")) target += ".tsx";
      return nextResolve(pathToFileURL(target).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      const file = fileURLToPath(url);
      if (file.startsWith(root)) {
        return {
          format: "module",
          source: ts.transpileModule(fs.readFileSync(file, "utf8"), {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ES2022,
              jsx: ts.JsxEmit.ReactJSX,
            },
          }).outputText,
          shortCircuit: true,
        };
      }
    }
    return nextLoad(url, context);
  },
});

const analysis = await import(pathToFileURL(path.join(root, "src/lib/analysis-result.ts")).href);
const paid = await import(pathToFileURL(path.join(root, "src/lib/paid-finance-engine.ts")).href);
const recheck = await import(pathToFileURL(path.join(root, "src/lib/finance-recheck.ts")).href);
const counseling = await import(pathToFileURL(path.join(root, "src/lib/counseling-evidence.ts")).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const results = [];
function pass(id, detail) {
  results.push({ id, pass: true, detail });
}
const base = {
  biggestConcern: "",
  financeQuestionIds: ["status"],
  jobType: "employee_fixed",
  futureEvents: ["none"],
  monthlyIncomeKrw: 4_000_000,
  monthlyFixedCostKrw: 1_000_000,
  monthlyLivingCostKrw: 1_500_000,
  monthlySavingsKrw: 1_000_000,
  expenseAwareness: "precise",
  emergencyFund: "3_6m",
  hasDebt: false,
  moneyManagementUnit: "individual",
  spendingPatterns: ["auto_savings"],
};

const maturity = {
  ...base,
  hasDebt: true,
  debtInterestRate: "under_10",
  debtMonthlyPayment: "under_30",
  debtMaturity: "under_3m",
  debtRepaymentType: "interest_only",
  debtMaturityDate: "2026-10-22",
  debtRemainingKrw: 50_000_000,
  debtPreparedKrw: 0,
};
const maturityResult = analysis.buildAnalysisResult(maturity);
assert(maturityResult.bottleneck === "maturity_preparation", "B1: imminent maturity was missed");
const maturityNeedsExact = {
  ...maturity,
  debtMaturityDate: undefined,
  debtRemainingKrw: undefined,
  debtPreparedKrw: undefined,
};
const maturityNeedsExactResult = analysis.buildAnalysisResult(maturityNeedsExact);
const maturityQuestions = paid.buildPaidExtraQuestions("status", maturityNeedsExact);
assert(
  maturityQuestions.some((q) => q.id === "debtBalanceManwon") &&
  maturityQuestions.some((q) => q.id === "debtPreparedManwon") &&
  maturityQuestions.some((q) => q.id === "debtMaturityDate"),
  "B1: paid maturity follow-up is incomplete",
);
const maturityPaid = paid.buildPaidFinanceResult(
  "status",
  maturityNeedsExact,
  maturityNeedsExactResult,
  { debtBalanceManwon: 5000, debtPreparedManwon: 1000, debtMaturityDate: "2026-10-22" },
  ["status"],
);
assert(maturityPaid.conclusion.includes("4,000만원"), "B1: maturity funding gap was not calculated");
pass("B1_maturity_priority", maturityPaid.conclusion);

const highDebt = {
  ...base,
  hasDebt: true,
  debtInterestRate: "over_15",
  debtMonthlyPayment: "30_100",
  debtMaturity: "over_1y",
  debtRepaymentType: "principal_interest",
};
const highDebtFree = analysis.buildAnalysisResult(highDebt);
const highDebtPaid = paid.buildPaidFinanceResult(
  "status",
  highDebt,
  highDebtFree,
  { debtBalanceManwon: 5000, debtRate: 20 },
  ["status"],
);
assert(highDebtPaid.conclusion.includes("부채") || highDebtPaid.conclusion.includes("금리"), "B2: paid conclusion ignored debt");
assert(highDebtPaid.firstAction.includes("대출"), "B2: paid first action contradicted debt conclusion");
assert(!highDebtPaid.reasons.some((x) => x.includes("먼저 고쳐야 할 문제가 없습니다")), "B2: contradictory safe reason remained");
pass("B2_paid_consistency", highDebtPaid.firstAction);

const goal = {
  ...base,
  financeQuestionIds: ["goal"],
  futureEvents: ["marriage"],
  primaryFutureEvent: "marriage",
  futureEventTiming: "over_1y",
  futureEventAmount: "over_2000",
  futureEventPrepared: "none",
  goalRequiredKrw: 24_000_000,
  goalPreparedKrw: 0,
  goalMonthlyAllocationKrw: 100_000,
  goalDeadline: "2028-09-22",
  monthlyIncomeKrw: 6_000_000,
  monthlySavingsKrw: 2_000_000,
};
const goalFree = analysis.buildAnalysisResult(goal);
const goalPaid = paid.buildPaidFinanceResult("goal", goal, goalFree, {}, ["goal"]);
assert(goalPaid.conclusion.includes("목표 전용 배정액"), "B3: goal-specific allocation was ignored");
assert(goalPaid.reasons.some((x) => x.includes("10만원")), "B3: goal allocation amount missing from reasons");
const goalMissingAllocation = { ...goal, goalMonthlyAllocationKrw: undefined };
assert(
  paid.buildPaidExtraQuestions("goal", goalMissingAllocation).some((q) => q.id === "goalMonthlyAllocationManwon"),
  "B3: user cannot enter goal-specific monthly allocation",
);
pass("B3_goal_allocation", goalPaid.conclusion);
const multi = { ...highDebt, financeQuestionIds: ["status", "goal", "priority"] };
const multiPaid = paid.buildPaidFinanceResult("status", multi, analysis.buildAnalysisResult(multi), { debtBalanceManwon: 5000, debtRate: 20 }, multi.financeQuestionIds);
assert((multiPaid.concernSummary?.length ?? 0) === 2, "B4: other selected concerns were not summarized");
pass("B4_multi_concern", multiPaid.concernSummary.map((x) => x.title).join(" | "));

const goalMissing = { ...base, financeQuestionIds: ["goal"] };
const goalQs = paid.buildPaidExtraQuestions("goal", goalMissing);
const pastAccepted = paid.paidQuestionsComplete(goalQs, {
  goalAmountManwon: 2400,
  goalPreparedManwon: 0,
  goalMonthlyAllocationManwon: 100,
  goalDeadline: "2000-01-01",
});
assert(!pastAccepted, "B5: past goal deadline was accepted");
pass("B5_past_date_rejected", "past date rejected");

const paidBase = paid.buildPaidFinanceResult("status", base, analysis.buildAnalysisResult(base), {}, ["status"]);
const snapshot = {
  id: "regression-snapshot",
  createdAt: "2026-08-22T00:00:00Z",
  checkDueAt: "2026-09-21T00:00:00Z",
  birthInput: { year: 1990, month: 1, day: 1, hour: null, minute: null, gender: "남" },
  sajuSummary: "가상 회귀검증",
  concerns: ["status"],
  focusedQuestion: "status",
  financeInput: base,
  paidResult: paidBase,
  status: "active",
  checks: [],
};

const savingsCut = recheck.buildFinanceRecheckResult(snapshot, {
  ...base,
  executionStatus: "done",
  monthlySavingsKrw: 500_000,
});
assert(savingsCut.headline.includes("개선이라고 보기는 어렵습니다"), "B6: savings cut was still treated as improvement");
pass("B6_savings_tradeoff", savingsCut.headline);

const incomeDrop = recheck.buildFinanceRecheckResult(snapshot, {
  ...base,
  executionStatus: "done",
  monthlyIncomeKrw: 2_000_000,
});
assert(incomeDrop.headline.includes("나빠진 원인"), "B7: severe income drop did not trigger deterioration");
assert(incomeDrop.nextAction.includes("월소득"), "B7: next action did not adapt to income drop");
pass("B7_income_deterioration", incomeDrop.nextAction);

const blockedIncome = recheck.buildFinanceRecheckResult(snapshot, {
  ...base,
  executionStatus: "not_done",
  difficulty: "실직해서 월급이 없어졌어요",
});
const blockedComplex = recheck.buildFinanceRecheckResult(snapshot, {
  ...base,
  executionStatus: "not_done",
  difficulty: "설명이 어려워 시작을 못했어요",
});
assert(blockedIncome.nextAction !== blockedComplex.nextAction, "B8: blocker-specific next action was not adapted");
pass("B8_blocker_adaptation", blockedIncome.nextAction + " / " + blockedComplex.nextAction);

assert(counseling.COUNSELING_PATTERNS.length >= 4, "B9: counseling evidence patterns are empty");
assert((highDebtFree.evidencePatternIds?.length ?? 0) > 0, "B9: diagnosis is not linked to counseling evidence");
pass("B9_counseling_evidence", highDebtFree.evidencePatternIds.join(","));
const memory = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

let auditUser = { id: "user-A", email: "a@example.invalid" };
const db = { finance_snapshots: [], finance_rechecks: [] };
globalThis.__financeAuditClient = {
  auth: { getUser: async () => ({ data: { user: auditUser }, error: null }) },
  from(table) {
    let payload = null;
    const filters = [];
    const query = {
      upsert(value) {
        payload = structuredClone(value);
        const key = table === "finance_snapshots" ? "client_snapshot_id" : "client_recheck_id";
        const found = db[table].find((row) => row.user_id === value.user_id && row[key] === value[key]);
        if (found) Object.assign(found, payload);
        else db[table].push({ id: `row-${table}-${db[table].length + 1}`, ...payload });
        return query;
      },
      select() { return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      order() { return query; },
      limit() { return query; },
      async single() {
        const row = db[table].find((item) =>
          item.user_id === payload.user_id &&
          item.client_snapshot_id === payload.client_snapshot_id
        );
        return { data: row ? { id: row.id } : null, error: null };
      },
      then(resolve, reject) {
        const data = db[table].filter((row) => filters.every((fn) => fn(row))).map((row) => structuredClone(row));
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return query;
  },
};

const stubs = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/client") {
      return { url: "data:text/javascript,export function createSupabaseBrowserClient(){return globalThis.__financeAuditClient}", shortCircuit: true };
    }
    if (specifier === "@/lib/supabase/config") {
      return { url: "data:text/javascript,export function isSupabaseConfigured(){return true}", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const management = await import(pathToFileURL(path.join(root, "src/lib/finance-management.ts")).href);
const sync = await import(pathToFileURL(path.join(root, "src/lib/finance-account-sync.ts")).href);
management.saveFinanceManagementState({ version: 1, ownerUserId: null, snapshots: [snapshot] });
await sync.syncFinanceManagementWithAccount();

auditUser = { id: "user-B", email: "b@example.invalid" };
const bState = await sync.syncFinanceManagementWithAccount();
assert(!bState.state.snapshots.some((x) => x.id === snapshot.id), "B10: account B received account A local record");
assert(!db.finance_snapshots.some((x) => x.user_id === "user-B" && x.client_snapshot_id === snapshot.id), "B10: account A record was uploaded into account B");
pass("B10_account_isolation", "A record not copied to B");

auditUser = { id: "user-A", email: "a@example.invalid" };
const remoteA = db.finance_snapshots.find((x) => x.user_id === "user-A" && x.client_snapshot_id === snapshot.id);
assert(remoteA, "B11: test remote A row missing");
remoteA.check_due_at = "2026-11-30T00:00:00Z";
remoteA.status = "checked";
remoteA.payload = { ...remoteA.payload, checkDueAt: remoteA.check_due_at, status: "checked" };

management.saveFinanceManagementState({
  version: 1,
  ownerUserId: "user-A",
  snapshots: [snapshot],
});
await sync.syncFinanceManagementWithAccount();
const remoteAfter = db.finance_snapshots.find((x) => x.user_id === "user-A" && x.client_snapshot_id === snapshot.id);
assert(remoteAfter.check_due_at === "2026-11-30T00:00:00Z", "B11: stale local due date overwrote newer server state");
assert(remoteAfter.status === "checked", "B11: stale local status overwrote newer server state");
pass("B11_server_first_sync", remoteAfter.check_due_at + " / " + remoteAfter.status);

auditUser = null;
const signedOutState = await sync.syncFinanceManagementWithAccount();
assert(
  signedOutState.state.snapshots.length === 0,
  "B12: account-owned local records were visible while unauthenticated",
);
assert(
  management.loadFinanceManagement().snapshots.length === 1,
  "B12: privacy guard should hide, not destroy, the saved account record",
);
pass("B12_signed_out_privacy", "owned local record hidden while signed out");


// Astra 2026-09-24 regressions: same facts must not produce a safer paid conclusion.
const astraGoal = {
  ...base,
  financeQuestionIds: ["goal"],
  futureEvents: ["marriage"],
  primaryFutureEvent: "marriage",
  futureEventTiming: "under_3m",
  futureEventAmount: "under_500",
  futureEventPrepared: "none",
  goalRequiredKrw: 2_000_000,
  goalPreparedKrw: 0,
  goalMonthlyAllocationKrw: 1_000_000,
  goalDeadline: "2026-10-25",
  monthlyIncomeKrw: 3_000_000,
  monthlyFixedCostKrw: 1_000_000,
  monthlyLivingCostKrw: 1_000_000,
  monthlySavingsKrw: 500_000,
};
const astraGoalFree = analysis.buildAnalysisResult(astraGoal);
const astraGoalPaid = paid.buildPaidFinanceResult("goal", astraGoal, astraGoalFree, {}, ["goal"]);
assert(
  astraGoalPaid.conclusion.includes("부족"),
  "B13/F01: paid goal conclusion contradicted common shortfall decision",
);
pass("B13_astra_goal_consistency", astraGoalPaid.conclusion);

const astraOverAllocated = {
  ...astraGoal,
  monthlyIncomeKrw: 2_500_000,
  monthlyFixedCostKrw: 1_000_000,
  monthlyLivingCostKrw: 1_000_000,
  goalMonthlyAllocationKrw: 1_000_000,
};
const astraOverFree = analysis.buildAnalysisResult(astraOverAllocated);
const astraOverPaid = paid.buildPaidFinanceResult("goal", astraOverAllocated, astraOverFree, {}, ["goal"]);
assert(
  astraOverPaid.conclusion.includes("확정하기 어렵") && !astraOverPaid.conclusion.includes("준비할 수 있는 범위"),
  "B14/F02: unaffordable allocation was promoted to an on-plan paid conclusion",
);
pass("B14_astra_allocation_guard", astraOverPaid.conclusion);

const astraDeficit = {
  ...astraGoal,
  monthlyIncomeKrw: 1_500_000,
  monthlyFixedCostKrw: 1_000_000,
  monthlyLivingCostKrw: 1_000_000,
  monthlySavingsKrw: 1_000_000,
  goalMonthlyAllocationKrw: 100_000,
};
const astraDeficitFree = analysis.buildAnalysisResult(astraDeficit);
const astraDeficitPaid = paid.buildPaidFinanceResult("goal", astraDeficit, astraDeficitFree, {}, ["goal"]);
assert(
  astraDeficitFree.bottleneck === "cash_flow_deficit" &&
  astraDeficitPaid.conclusion.includes("재무 위험"),
  "B15/F03: selected goal question hid a more urgent cash-flow deficit",
);
pass("B15_astra_priority_guard", astraDeficitPaid.conclusion);

const latestAction = "이번 주 10분만 써서 새 행동을 확인한다.";
const adaptiveSnapshot = {
  ...snapshot,
  checks: [{
    id: "previous-check",
    checkedAt: "2026-09-20T00:00:00Z",
    input: {
      executionStatus: "not_done",
      monthlyIncomeKrw: 4_000_000,
      monthlyFixedCostKrw: 1_000_000,
      monthlyLivingCostKrw: 1_500_000,
      monthlySavingsKrw: 1_000_000,
      emergencyFund: "3_6m",
      difficulty: "시간이 없었음",
    },
    result: {
      headline: "previous",
      summary: "previous",
      changed: [],
      keep: "previous",
      nextAction: latestAction,
      nextCheckpoints: [],
    },
  }],
};
const adaptiveCurrent = {
  executionStatus: "done",
  monthlyIncomeKrw: 4_000_000,
  monthlyFixedCostKrw: 1_000_000,
  monthlyLivingCostKrw: 1_500_000,
  monthlySavingsKrw: 1_000_000,
  emergencyFund: "3_6m",
};
const adaptiveNext = recheck.buildFinanceRecheckResult(adaptiveSnapshot, adaptiveCurrent);
assert(
  adaptiveNext.nextAction === latestAction,
  "B16/R02: recheck reset to the original action instead of continuing the latest active action",
);
pass("B16_latest_action_continuity", adaptiveNext.nextAction);

hooks.deregister?.();
stubs.deregister?.();

console.log("\nFINANCE REGRESSION RESULTS");
for (const item of results) console.log(`PASS ${item.id} :: ${item.detail}`);
console.log(`\nPASS ${results.length}/${results.length}`);
