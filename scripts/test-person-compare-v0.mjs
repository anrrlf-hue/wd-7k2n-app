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

const factsMod = await import(pathToFileURL(path.join(root, "src/lib/saju-facts.ts")).href);
const compareMod = await import(pathToFileURL(path.join(root, "src/lib/person-compare.ts")).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const meFacts = factsMod.computeSajuFacts({
  year: 1980,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: "남",
});
const otherFacts = factsMod.computeSajuFacts({
  year: 1985,
  month: 6,
  day: 15,
  hour: 9,
  minute: 30,
  gender: "여",
});

for (const purpose of compareMod.PERSON_COMPARE_PURPOSES) {
  const result = compareMod.buildPersonCompareResult(
    { name: "나", facts: meFacts },
    { name: "상대", facts: otherFacts },
    purpose,
  );

  assert(result.purpose === purpose, `${purpose}: purpose mismatch`);
  assert(result.headline.length > 20, `${purpose}: headline too short`);
  assert(result.strengths.length >= 2, `${purpose}: strengths missing`);
  assert(result.friction.length >= 1, `${purpose}: friction missing`);
  assert(result.roles.length >= 1, `${purpose}: role guidance missing`);
  assert(result.timing.length >= 1, `${purpose}: timing section missing`);
  assert(result.nextQuestions.length === 3, `${purpose}: next questions must be exactly 3`);
  assert(result.shareText.includes("나와 이 사람"), `${purpose}: share text missing product context`);

  const allText = [
    result.headline,
    result.intro,
    ...result.strengths.map((x) => x.text),
    ...result.friction.map((x) => x.text),
    ...result.roles.map((x) => x.text),
    ...result.timing.map((x) => x.text),
    result.note,
  ].join("\n");

  assert(!/(궁합\s*\d+점|\d+\s*점짜리|100\s*점|최고의 궁합|최악의 궁합)/.test(allText), `${purpose}: score/ranking leaked`);
  assert(!/(반드시|무조건|틀림없이|헤어져|손절)/.test(allText), `${purpose}: deterministic or exclusionary claim leaked`);
}

const business = compareMod.buildPersonCompareResult(
  { name: "나", facts: meFacts },
  { name: "동업자", facts: otherFacts },
  "business_partner",
);
const businessText = [...business.roles, ...business.friction].map((x) => `${x.title} ${x.text}`).join("\n");
assert(/역할/.test(businessText), "B01: business comparison must include role split");
assert(/지분|돈 관리|의사결정권/.test(businessText), "B02: business comparison must include real-world partnership checks");
assert(!/나님/.test([business.headline, businessText].join("\n")), "B03: unnatural '나님' copy leaked");

const identicalA = compareMod.buildPersonCompareResult(
  { name: "나", facts: meFacts },
  { name: "동일생일B", facts: meFacts },
  "business_partner",
);
const identicalB = compareMod.buildPersonCompareResult(
  { name: "동일생일B", facts: meFacts },
  { name: "나", facts: meFacts },
  "business_partner",
);
const identicalRolesA = identicalA.roles.map((x) => x.text).join("\n");
const identicalRolesB = identicalB.roles.map((x) => x.text).join("\n");
assert(
  identicalRolesA.includes("두 사람 모두") &&
    identicalRolesA.includes("사주만으로 서로 다른 직책을 지정하지 않습니다"),
  "B04: identical Saju still receives fabricated complementary roles",
);
assert(identicalRolesA === identicalRolesB, "B05: identical Saju role reading changes with input order");
assert(identicalA.followUps.length === 3, "B06: comparison follow-up answers missing");

const love = compareMod.buildPersonCompareResult(
  { name: "나", facts: meFacts },
  { name: "상대", facts: otherFacts },
  "love_marriage",
);
const loveText = [...love.roles, ...love.friction].map((x) => x.text).join("\n");
assert(/표현|생활|관계/.test(loveText), "L01: love comparison lost relationship-specific language");
assert(!/지분/.test(loveText), "L02: business language leaked into love comparison");

const unknownTimeFacts = factsMod.computeSajuFacts({
  year: 1988,
  month: 3,
  day: 7,
  hour: null,
  minute: null,
  gender: "남",
});
const unknownTiming = compareMod.buildPersonCompareResult(
  { name: "나", facts: meFacts },
  { name: "상대", facts: unknownTimeFacts },
  "friend_family",
);
assert(
  unknownTiming.timing.some((x) => /출생시간/.test(x.text) && /억지로/.test(x.text)),
  "T01: unknown birth time must not invent current Daeun comparison",
);

const resultSource = fs.readFileSync(path.join(root, "src/components/diagnosis/result-step.tsx"), "utf8");
const compareCardSource = fs.readFileSync(path.join(root, "src/components/diagnosis/person-compare-card.tsx"), "utf8");
const apiSource = fs.readFileSync(path.join(root, "src/app/api/person-compare/route.ts"), "utf8");

assert(resultSource.includes("PersonCompareCard"), "UI01: result page does not include person comparison");
assert(resultSource.includes("사주를 더 이어서 보면"), "UI02: person comparison is not placed in the Saju continuation area");
assert(
  resultSource.indexOf("사주를 더 이어서 보면") < resultSource.indexOf("<PersonCompareCard"),
  "UI03: person comparison should come after the Saju continuation bridge",
);
assert(
  resultSource.indexOf("<PersonCompareCard") < resultSource.indexOf("원하면 손금까지 더해볼 수 있어요"),
  "UI04: person comparison should appear before optional palm expansion",
);
for (const phrase of ["나와 이 사람", "이 사람과 나 보기", "두 사람 함께 보기", "다른 사람과 비교해보기"]) {
  assert(compareCardSource.includes(phrase), `UI05: missing natural compare copy: ${phrase}`);
}
assert(compareCardSource.includes("공유 문구에는 두 사람의 생년월일을 넣지 않습니다"), "UI06: share privacy copy missing");
assert(compareCardSource.includes("setSelectedFollowUp"), "UI07: comparison follow-ups are still static text");
assert(compareCardSource.includes("result.followUps.map"), "UI08: comparison follow-up buttons are not rendered");
assert(apiSource.includes("buildPersonCompareResult"), "API01: person compare route is not using deterministic engine");
assert(!apiSource.includes("ANTHROPIC") && !apiSource.includes("OPENAI"), "API02: person compare V0 should not call an external model");

console.log("PASS PERSON COMPARE V0: 4 modes + identical-profile symmetry + interactive follow-ups + timing guard + safe sharing");
hooks.deregister?.();
