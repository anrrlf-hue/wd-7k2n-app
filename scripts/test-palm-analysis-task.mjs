import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
const { requestPalmReport, runWithDeadline, PalmTaskSlot } = await import("../src/lib/palm-analysis-task.ts");
const nativeFetch = globalThis.fetch;
const closed = new Set();
const server = http.createServer((req, res) => {
  const path = req.url;
  res.on("close", () => closed.add(path));
  if (path === "/headers-hang") { res.writeHead(200, { "content-type": "application/json" }); res.write('{"usable":'); return; }
  if (path === "/hang") return;
  if (path === "/invalid") { res.end("invalid JSON"); return; }
  if (path === "/error") { res.writeHead(503); res.end('{"error":"try again"}'); return; }
  setTimeout(() => res.end('{"usable":true}'), 10);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let mode = "/ok";
let headers = 0;
globalThis.fetch = (_, init) => nativeFetch(origin + mode, init);
const signal = () => new AbortController().signal;
try {
  // Reproduce the old defect against a real streaming response: its headers-only
  // race settles, but the body stays pending beyond the advertised deadline.
  const baselineController = new AbortController();
  const baselineResponse = await nativeFetch(origin + "/headers-hang", { signal: baselineController.signal });
  let oldBodySettled = false;
  const oldBody = baselineResponse.json().finally(() => { oldBodySettled = true; }).catch(() => {});
  await delay(70);
  assert.equal(oldBodySettled, false);
  baselineController.abort(); await oldBody;
  console.log("PASS old headers-only deadline reproduction: body still pending after deadline");

  assert.deepEqual(await requestPalmReport({}, signal(), () => headers++, 250), { usable: true });
  assert.equal(headers, 1);
  for (mode of ["/hang", "/headers-hang"]) {
    headers = 0;
    const start = performance.now();
    await assert.rejects(requestPalmReport({}, signal(), () => headers++, 60), /30초/);
    assert.ok(performance.now() - start < 500);
    assert.equal(headers, mode === "/hang" ? 0 : 1);
    await delay(20);
    assert.ok(closed.has(mode), `${mode}: network connection must abort`);
    console.log(`PASS ${mode}: deadline includes body and aborts connection`);
  }
  mode = "/headers-hang";
  const parent = new AbortController();
  const pending = requestPalmReport({}, parent.signal, () => {}, 2000);
  setTimeout(() => parent.abort(new DOMException("cancel", "AbortError")), 20);
  await assert.rejects(pending, { name: "AbortError" });
  console.log("PASS cancellation during body read");
  for (mode of ["/invalid", "/error"]) await assert.rejects(requestPalmReport({}, signal(), () => {}, 250));
  mode = "/ok";
  assert.equal((await requestPalmReport({}, signal(), () => {}, 250)).usable, true);
  console.log("PASS malformed JSON / HTTP failure / retry success");

  let stopped = false;
  await assert.rejects(runWithDeadline(signal(), 20, "local timeout", async local => {
    local.addEventListener("abort", () => { stopped = true; });
    await delay(60); return "late";
  }), /local timeout/);
  assert.equal(stopped, true);
  const slot = new PalmTaskSlot();
  const first = slot.begin();
  const second = slot.begin();
  assert.equal(first.signal.aborted, true);
  assert.equal(slot.isCurrent(first), false);
  slot.finish(first);
  assert.equal(slot.isCurrent(second), true);
  slot.cancel();
  assert.equal(second.signal.aborted, true);
  assert.equal(slot.isCurrent(second), false);
  console.log("PASS local timeout abort + superseded / finished / unmounted result guards");
} finally {
  globalThis.fetch = nativeFetch;
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
