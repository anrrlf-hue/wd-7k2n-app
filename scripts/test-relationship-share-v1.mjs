import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { registerHooks } from "node:module";

const root = process.cwd();
const hooks = registerHooks({
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const mod = await import(pathToFileURL(path.join(root, "src/lib/relationship-share.ts")).href);
const result = {
  purpose: "business_partner",
  purposeLabel: "동업·사업",
  meName: "나",
  otherName: "상대",
  headline: "둘이 같이 움직일 때 역할을 나누는 게 중요합니다.",
  intro: "두 사람의 공통점과 차이를 같이 봅니다.",
  strengths: [{ title: "잘 맞는 부분", text: "서로 다른 방식으로 보완할 수 있습니다." }],
  friction: [{ title: "부딪힐 부분", text: "결정권이 겹치면 충돌할 수 있습니다." }],
  roles: [{ title: "역할", text: "실제 역할은 경험과 선호도 함께 확인합니다." }],
  timing: [{ title: "시기", text: "같이 움직일 시기를 봅니다." }],
  nextQuestions: [],
  followUps: [
    { question: "돈 관리는?", answer: "돈 관리는 역할을 분리해 보는 편이 좋습니다." },
    { question: "언제 시작?", answer: "두 사람의 시기를 함께 확인합니다." },
  ],
  shareText: "공유용",
  note: "참고",
};

const shared = mod.buildRelationshipShareUrl(result, "https://example.com");
assert(shared.url.includes("/share/relationship#r="), "SHARE01: re-entry URL missing");
assert(!shared.url.includes("1990") && !shared.url.includes("birth"), "SHARE02: birth data leaked");
const token = decodeURIComponent(shared.url.split("#r=")[1]);
const decoded = mod.decodeRelationshipShare(token);
assert(decoded?.headline === result.headline, "SHARE03: headline did not round-trip");
assert(decoded?.followUps.length === 2, "SHARE04: follow-ups did not round-trip");
const cardSource = fs.readFileSync(
  path.join(root, "src/components/diagnosis/person-compare-card.tsx"),
  "utf8",
);
assert(cardSource.includes("url: shared.url"), "SHARE05: native share URL not attached");
assert(cardSource.includes("relationship_share_created"), "SHARE06: share creation not measured");

const pageSource = fs.readFileSync(
  path.join(root, "src/app/share/relationship/page.tsx"),
  "utf8",
);
assert(pageSource.includes("relationship_share_opened"), "SHARE07: recipient open not measured");
assert(!pageSource.includes("relationship_shared_followup_opened"), "SHARE08: shared page must not reopen the removed follow-up question flow");
assert(pageSource.includes("생년월일이나 손 사진이 들어 있지 않습니다"), "SHARE09: privacy notice missing");
assert(cardSource.includes("카카오톡으로 보내기"), "SHARE10: Kakao-oriented share CTA missing");
assert(cardSource.includes("결과와 링크 복사"), "SHARE11: copy-link share CTA missing");
assert(cardSource.includes("이 사람 저장하기"), "SHARE12: reusable person save CTA missing");

const analyticsRoute = fs.readFileSync(
  path.join(root, "src/app/api/analytics/route.ts"),
  "utf8",
);
assert(analyticsRoute.includes("[product-event]"), "SHARE13: server-side event log missing");

console.log("PASS RELATIONSHIP SHARE V2: private re-entry link + Kakao share + reusable people + no question follow-up");
hooks.deregister?.();
