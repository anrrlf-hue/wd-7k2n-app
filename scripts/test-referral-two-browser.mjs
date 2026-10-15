// Real Next production-build browser flow with only the Supabase HTTP boundary
// replaced by an isolated adapter. The app routes, React UI, cookies, and free
// result generation are not mocked.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { createRequire } from "node:module";
import { birthFixture } from "./fixtures/palm-analysis.mjs";
import { PALM_ENTRY_KEY, palmEntry } from "./fixtures/palm-entry.mjs";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const nextPort = Number(process.env.TEST_NEXT_PORT || 3197);
const nextBase = `http://127.0.0.1:${nextPort}`;
const adapterState = { invites: [], rewards: [], events: [], nextId: 0 };
function query(url, key) { const value = url.searchParams.get(key); return value?.startsWith("eq.") ? value.slice(3) : value; }
function json(res, status, body) { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); }
const supabase = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "POST" && url.pathname === "/rest/v1/referral_invites") {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const row = JSON.parse(Buffer.concat(chunks).toString());
    adapterState.invites.push({ ...row, id: `invite-${++adapterState.nextId}` });
    adapterState.events.push("invite:stored"); return json(res, 201, []);
  }
  if (req.method === "GET" && url.pathname === "/rest/v1/referral_invites") {
    const row = adapterState.invites.find(candidate => candidate.realm === query(url, "realm") && candidate.campaign_key === query(url, "campaign_key") && candidate.token_hash === query(url, "token_hash") && candidate.inviter_session_hash === query(url, "inviter_session_hash") && candidate.revoked_at == null && new Date(candidate.expires_at).getTime() > Date.now());
    return json(res, 200, row ? [{ id: row.id }] : []);
  }
  if (req.method === "GET" && url.pathname === "/rest/v1/referral_rewards") {
    const row = adapterState.rewards.find(candidate => candidate.realm === query(url, "realm") && candidate.campaign_key === query(url, "campaign_key") && candidate.inviter_session_hash === query(url, "inviter_session_hash"));
    return json(res, 200, row ? [{ id: row.id }] : []);
  }
  if (req.method === "POST" && url.pathname === "/rest/v1/rpc/claim_referral_reward") {
    adapterState.events.push("rpc:received");
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const invite = adapterState.invites.find(candidate => candidate.realm === body.p_realm && candidate.campaign_key === body.p_campaign_key && candidate.token_hash === body.p_token_hash);
    if (!invite || invite.revoked_at) { adapterState.events.push(`rpc:not_found:${JSON.stringify(body)}`); return json(res, 200, { status: "not_found" }); }
    if (new Date(invite.expires_at).getTime() <= Date.now()) return json(res, 200, { status: "expired" });
    if (invite.inviter_session_hash === body.p_recipient_session_hash) return json(res, 200, { status: "self_referral" });
    if (adapterState.rewards.some(row => row.recipient_session_hash === body.p_recipient_session_hash)) return json(res, 200, { status: "duplicate_recipient" });
    if (adapterState.rewards.some(row => row.inviter_session_hash === invite.inviter_session_hash)) return json(res, 200, { status: "campaign_exhausted" });
    await new Promise(resolve => setTimeout(resolve, 160));
    const reward = { id: `reward-${++adapterState.nextId}`, realm: body.p_realm, campaign_key: body.p_campaign_key, invite_id: invite.id, inviter_session_hash: invite.inviter_session_hash, recipient_session_hash: body.p_recipient_session_hash };
    adapterState.rewards.push(reward); adapterState.events.push("reward:stored");
    return json(res, 200, { status: "claimed", reward_id: reward.id });
  }
  res.writeHead(404); res.end();
});
await new Promise(resolve => supabase.listen(0, "127.0.0.1", resolve));
const supabaseUrl = `http://127.0.0.1:${supabase.address().port}`;
const nextCommand = process.platform === "win32" ? process.execPath : "./node_modules/.bin/next";
const nextArgs = process.platform === "win32" ? [`${process.cwd()}/node_modules/next/dist/bin/next`, "start", "-H", "127.0.0.1", "-p", String(nextPort)] : ["start", "-p", String(nextPort)];
const next = spawn(nextCommand, nextArgs, {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key", SAJU_REFERRAL_ENABLED: "true", SAJU_REFERRAL_REALM: "test", SAJU_REFERRAL_PUBLIC_ORIGIN: nextBase },
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});
let nextOutput = "";
next.stdout.on("data", chunk => { nextOutput += chunk.toString(); }); next.stderr.on("data", chunk => { nextOutput += chunk.toString(); });
async function waitForNext() { for (let i = 0; i < 60; i++) { try { if ((await fetch(nextBase)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 500)); } throw new Error(`Next production server did not start:\n${nextOutput}`); }
await waitForNext();
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const inviterContext = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const recipientContext = await browser.newContext();
  await inviterContext.addInitScript(({ key, entry }) => sessionStorage.setItem(key, entry), { key: PALM_ENTRY_KEY, entry: palmEntry(birthFixture) });
  const inviter = await inviterContext.newPage(); const recipient = await recipientContext.newPage();
  const sajuRequests = [];
  let sajuResponseSummary = null;
  recipient.on("request", request => { if (request.url().endsWith("/api/saju") && request.method() === "POST") sajuRequests.push(request.postDataJSON()); });
  recipient.on("response", async response => { if (response.url().endsWith("/api/saju")) { const body = await response.json().catch(() => null); const { validateFreeSajuReport } = await import("../src/lib/free-report-schema.ts"); const validation = body?.freeReport?.report ? validateFreeSajuReport(body.freeReport.report) : null; sajuResponseSummary = { status: response.status(), hasFreeReport: Boolean(body?.freeReport?.report), freeKeys: body?.freeReport?.report ? Object.keys(body.freeReport.report) : [], validFreeReport: validation?.ok ?? false, violations: validation?.violations ?? [] }; } });
  await inviter.goto(`${nextBase}/diagnosis/palm`);
  await inviter.evaluate(({ key, entry }) => sessionStorage.setItem(key, entry), { key: PALM_ENTRY_KEY, entry: palmEntry(birthFixture) });
  await inviter.reload();
  await inviter.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).click();
  const share = inviter.getByRole("region", { name: "무료 사주 링크 공유" });
  await share.getByRole("button", { name: "링크 복사하고 무료 체험", exact: true }).waitFor();
  await share.getByRole("button", { name: "링크 복사하고 무료 체험", exact: true }).click();
  const link = await share.locator("input[readonly]").inputValue();
  assert.match(link, /[?&]ref=[A-Za-z0-9_-]{43}$/); assert.ok(adapterState.events.includes("invite:stored"));
  await recipient.goto(link);
  await recipient.locator("#birthDate").fill("1990-01-01");
  await recipient.getByRole("button", { name: "날짜 확정", exact: true }).click();
  await recipient.getByText("출생정보를 서버에서 계산하고 기기에 저장하는 데 동의합니다.").click();
  await recipient.getByRole("button", { name: "다음", exact: true }).click();
  await recipient.getByRole("button", { name: "태어난 시간을 모르겠어요", exact: true }).click();
  await recipient.getByRole("button", { name: "다음", exact: true }).click();
  await inviter.getByRole("button", { name: /무료 풀이 완료 확인/ }).click();
  await inviter.getByRole("alert").filter({ hasText: "아직" }).waitFor();
  try { await recipient.getByText("내 사주표", { exact: true }).waitFor({ timeout: 30000 }); }
  catch (error) { console.error("recipient result wait failed", await recipient.locator("body").innerText(), JSON.stringify({ adapterState, sajuRequests }), error); throw error; }
  assert.ok(adapterState.events.includes("reward:stored"), JSON.stringify({ adapterState, sajuRequests, sajuResponseSummary, nextOutput }));
  await inviter.getByRole("button", { name: /무료 풀이 완료 확인/ }).click();
  try { await inviter.getByRole("heading", { name: "프리미엄 통합 연간 리포트", exact: true }).waitFor({ timeout: 30000 }); }
  catch (error) { console.error("inviter eligibility failed", await inviter.locator("body").innerText(), JSON.stringify(adapterState), error); throw error; }
  assert.equal(adapterState.rewards.length, 1);
  adapterState.invites[0].expires_at = new Date(Date.now() - 1).toISOString();
  const cachedContext = await browser.newContext();
  await cachedContext.addInitScript(({ palmKey, entry, inviteKey, cachedUrl }) => {
    sessionStorage.setItem(palmKey, entry);
    sessionStorage.setItem(inviteKey, JSON.stringify({ url: cachedUrl }));
  }, { palmKey: PALM_ENTRY_KEY, entry: palmEntry(birthFixture), inviteKey: "saju-app:referral-invite:v1", cachedUrl: link });
  const cachedPage = await cachedContext.newPage();
  const cachedRequests = [];
  cachedPage.on("request", request => { if (request.url().includes("/api/referrals")) cachedRequests.push(`${request.method()} ${request.url()}`); });
  await cachedPage.goto(`${nextBase}/diagnosis/palm`);
  await cachedPage.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).click();
  await cachedPage.getByRole("region", { name: "무료 사주 링크 공유" }).locator("input[readonly]").waitFor({ timeout: 15000 });
  assert.ok(cachedRequests.some(request => request.startsWith("GET ") && request.includes("/api/referrals?ref=")), JSON.stringify(cachedRequests));
  assert.ok(cachedRequests.some(request => request.startsWith("POST ") && request.endsWith("/api/referrals")), JSON.stringify(cachedRequests));
  await cachedContext.close();
  console.log("PASS real Next production UI/routes: two isolated browser sessions, adapter-backed Supabase invite/RPC, free-result claim, pending-to-eligible response ordering");
  await inviterContext.close(); await recipientContext.close();
} finally { await browser.close(); supabase.closeAllConnections(); await new Promise(resolve => supabase.close(resolve)); next.kill("SIGTERM"); }
