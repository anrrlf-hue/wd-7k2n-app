// Deterministic two-browser referral flow. This is an isolated test adapter,
// not a production-store test: it exercises browser cookies, response ordering,
// invite validation, free-result completion, and one-time reward claiming.
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const adapter = { invites: new Map(), rewards: new Set(), next: 0, events: [] };
const sessions = new Map();

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}
function cookie(req) {
  const value = /(?:^|;\s*)saju_referral_session=([^;]+)/.exec(req.headers.cookie || "");
  return value?.[1] || null;
}
function page() {
  return `<!doctype html><meta charset="utf-8"><button id="prepare">공유 링크 준비</button><button id="complete">무료 풀이 완료</button><button id="claim">프리미엄 열기</button><pre id="out"></pre><script>
  const out = (x) => document.querySelector('#out').textContent = JSON.stringify(x);
  let link;
  async function session() { return fetch('/api/referrals/session', {method:'POST'}); }
  prepare.onclick = async () => { await session(); const r = await fetch('/api/referrals', {method:'POST'}); link = await r.json(); out(link); };
  complete.onclick = async () => { await session(); const r = await fetch('/api/saju', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({referralToken:new URL(link?.url || location.href).searchParams.get('ref')})}); out(await r.json()); };
  claim.onclick = async () => { const r = await fetch('/api/premium-report', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({trialAction:'verify'})}); out({status:r.status, ...(await r.json())}); };
</script>`;
}
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  const current = cookie(req);
  if (path === "/") return res.end(page());
  if (path === "/api/referrals/session") {
    adapter.events.push("session:start");
    // The inviter and recipient use independent browser contexts. Delaying
    // this response makes a premature invite request observable.
    await new Promise(resolve => setTimeout(resolve, 60));
    const session = current || `session-${sessions.size + 1}`;
    sessions.set(session, true); adapter.events.push(`session:ready:${session}`);
    return json(res, 200, { ready: true }, { "set-cookie": `saju_referral_session=${session}; HttpOnly; SameSite=Lax; Path=/` });
  }
  if (path === "/api/referrals" && req.method === "POST") {
    assert.ok(current, "invite requires an anonymous session cookie");
    const token = `opaque-${++adapter.next}`;
    adapter.invites.set(token, { inviter: current, expiresAt: Date.now() + 60_000 });
    adapter.events.push(`invite:${current}`);
    return json(res, 200, { url: `${new URL("/", `http://${req.headers.host}`).origin}/?ref=${token}` });
  }
  if (path === "/api/saju" && req.method === "POST") {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const token = JSON.parse(Buffer.concat(chunks).toString()).referralToken;
    const invite = adapter.invites.get(token);
    assert.ok(invite && invite.expiresAt > Date.now(), "server validates the opaque token");
    assert.ok(current && current !== invite.inviter, "recipient must be a different session");
    const rewardKey = `${invite.inviter}:${current}`;
    adapter.rewards.add(rewardKey); adapter.events.push(`free-result:${rewardKey}`);
    return json(res, 200, { freeReport: { generated: true }, referralReward: "claimed" });
  }
  if (path === "/api/premium-report" && req.method === "POST") {
    const eligible = [...adapter.rewards].some(key => key.startsWith(`${current}:`));
    adapter.events.push(`claim:${current}:${eligible}`);
    if (!eligible) return json(res, 403, { status: "pending" });
    return json(res, 200, { status: "eligible", trialReceipt: `receipt-${current}` });
  }
  res.writeHead(404); res.end();
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const inviterContext = await browser.newContext();
  const recipientContext = await browser.newContext();
  const inviter = await inviterContext.newPage();
  const recipient = await recipientContext.newPage();
  await inviter.goto(base); await recipient.goto(base);
  await inviter.getByRole("button", { name: "공유 링크 준비" }).click();
  await inviter.locator("#out").waitFor({ state: "visible" });
  await inviter.waitForFunction(() => document.querySelector("#out").textContent.includes("opaque-"));
  await inviter.getByRole("button", { name: "무료 풀이 완료" }).count();
  const invite = JSON.parse(await inviter.locator("#out").innerText());
  assert.match(invite.url, /opaque-1$/);
  assert.deepEqual(adapter.events.slice(0, 3), ["session:start", "session:ready:session-1", "invite:session-1"]);

  await recipient.goto(invite.url);
  await recipient.getByRole("button", { name: "무료 풀이 완료" }).click();
  await recipient.waitForFunction(() => document.querySelector("#out").textContent.length > 0);
  const freeResult = JSON.parse(await recipient.locator("#out").innerText());
  assert.equal(freeResult.freeReport?.generated, true, JSON.stringify(freeResult));

  await inviter.getByRole("button", { name: "프리미엄 열기" }).click();
  const claimed = JSON.parse(await inviter.locator("#out").innerText());
  assert.equal(claimed.status, "eligible");
  assert.match(claimed.trialReceipt, /^receipt-session-1$/);

  // A second completion from the same recipient does not create another reward.
  await recipient.getByRole("button", { name: "무료 풀이 완료" }).click();
  assert.equal(adapter.rewards.size, 1);
  assert.ok(adapter.events.includes("free-result:session-1:session-2"));
  console.log("PASS two-browser referral adapter: isolated sessions, delayed bootstrap, opaque token, server free-result, one-time reward");
  await inviterContext.close(); await recipientContext.close();
} finally {
  await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
