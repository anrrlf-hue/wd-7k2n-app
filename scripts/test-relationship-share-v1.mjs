import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
const share = await import("../src/lib/relationship-share.ts");
const data = share.buildServiceShare();
assert.deepEqual(data, {
  title: "운·돈 · 무료 사주",
  text: "운·돈에서 내 사주를 무료로 살펴보세요. 성향·관계·일·재물의 흐름을 참고할 수 있어요.",
  url: "https://saju-app-rouge.vercel.app/diagnosis?mode=free&focus=overall&start=free&from=share",
});
const personal = { meName: "PRIVATE_NAME", year: 2001, month: 2, day: 3, hour: 10, minute: 0, palm: "data:image/png;base64,PRIVATE_PHOTO", headline: "PRIVATE_REPORT" };
assert.deepEqual(share.buildServiceShare(personal, "https://untrusted.invalid/?birth=1990"), data, "share must not accept personal inputs or current-page origins");
assert.deepEqual(Object.keys(data).sort(), ["text", "title", "url"]);
assert.equal(new URL(data.url).hash, "");
assert.deepEqual([...new URL(data.url).searchParams.keys()], ["mode", "focus", "start", "from"]);
assert.equal(share.encodeRelationshipShare, undefined, "private report URL encoder must be removed");
const legacy = fs.readFileSync("src/app/share/relationship/page.tsx", "utf8");
assert.ok(!legacy.includes("decodeRelationshipShare") && !legacy.includes("decodeURIComponent"));
assert.ok(legacy.includes("replaceState") && legacy.includes("location.replace(FREE_SHARE_ENTRY_PATH)"));
const card = fs.readFileSync("src/components/diagnosis/person-compare-card.tsx", "utf8");
assert.ok(card.includes("<ServiceShareCard") && card.includes("이 사람 저장하기"));
assert.ok(!card.includes("result.shareText") && !card.includes("relationship_share_created"));
const sharedCard = fs.readFileSync("src/components/service-share-card.tsx", "utf8");
assert.ok(sharedCard.includes("기기 공유창에서") || sharedCard.includes("링크를 복사해"));
assert.ok(!sharedCard.includes("공유 성공") && !sharedCard.includes("카카오톡으로 보내기"));
console.log("PASS service invitation: fixed public URL/title, no personal payload, free recipient entry, legacy private decoder removed, no false delivery claim");

