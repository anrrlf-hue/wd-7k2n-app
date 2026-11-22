// Lightweight, no-dependency UX contract gate. Runs before Next.js builds.
// This does not replace real browser E2E tests or certify AI reading quality.
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const shop = fs.readFileSync(path.join(root, "src/components/fortune-shop.tsx"), "utf8");
const wizard = fs.readFileSync(path.join(root, "src/components/fortune-intake-wizard.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "src/app/explore/[section]/page.tsx"), "utf8");
const guideStyle = fs.readFileSync(path.join(root, "src/components/fortune-intake-wizard.module.css"), "utf8");
const fail = [];
function check(test, message) { if (!test) fail.push(message); }
const def = shop.split("const P: Product[] = [")[1]?.split("\n];")[0] || "";
const ids = [...def.matchAll(/\{id:"([a-z]+)"/g)].map(m => m[1]);
const expected = ["life","compatibility","year","wealth","love","marriage","reunion","job","business","palm","tarot","fusion","spouse","friend","partner","coworker","family"];
check(new Set(ids).size === 17, "Must expose 17 distinct storefront products.");
for (const id of expected) check(ids.includes(id), "Missing product: " + id);
check(shop.includes('const previewLabel=') && shop.includes('product.name+" 미리보기"'), "Missing product-specific preview title.");
check(shop.includes('const readingLabel=') && shop.includes('product.name+" 보기"'), "Missing product-specific paid reading title.");
check(shop.includes("결제 없이 {readingLabel}"), "Missing explicit no-charge preview unlock.");
check(shop.includes('product.id==="tarot"') && shop.includes("타로 미리보기"), "Tarot product must have its own flow.");
check(shop.includes("startTarotOnly") && !shop.includes("beginPaired"), "Tarot must not require completing saju first.");
check(shop.includes('page==="paired"') && !shop.includes('page==="new"'), "Repurposed new arrivals must not return.");
check(shop.includes("오늘의 운세") && shop.includes("내일의 운세") && shop.includes("fortuneDay"), "Today and tomorrow must both exist as independent free tabs.");
check(shop.includes("previewPages") && shop.includes("chapter===previewPages-1") && !shop.includes("chapter===2?nav(\"paywall\")"), "Preview length must depend on product instead of a fixed 3-chapter funnel.");
check(!shop.includes("무료 사주풀이 시작"), "Generic saju CTA leaked into other product screens.");
check(!shop.includes("activeLinkedTopic") && !shop.includes("openLinkedTarot"), "Old forced saju -> tarot path remains.");
check(!shop.includes('type:"돈과일"'), "Invalid customer-facing money-work category.");
check(!shop.includes("i%3===0?") && shop.includes("chapterTeaser(c)") && shop.includes("chapterSymbol(c)"), "Repeated generic premium teaser or duplicated cover artwork detected.");
check(shop.includes("Array.isArray(saved)") && shop.includes("catch{setOwned([]);}"), "Corrupted local demo storage could break user flow.");
for (const part of ["detail","input","free","paywall","full","my","today","gift","popular","relations","all"]) {
  check(shop.includes('page==="'+part+'"'), "Missing page: " + part);
}
for (const part of ["popular","paired","relations","all","freeHub","classic","loveHub","money","special","scenario","bundles","reviews","detail","input","free","paywall","full","my","gift","today"]) {
  check(route.includes('"'+part+'"'), "Missing direct route: " + part);
}
check(route.includes("initialProductId={initialProductId}"), "Direct URL must open correct product, not the lifetime default.");
check(wizard.includes("getSteps(id,name,draft)") && wizard.includes("step.question"), "Guide must ask one question at a time.");
check(!wizard.includes("반가워요! {name}을"), "Korean guide particles must be natural.");
check(wizard.includes('if(id==="love")') && wizard.includes('"partnerChoice"') && wizard.includes('"건너뛰기"'), "Love fortune requires optional partner with skip.");
check(wizard.includes('if(id==="tarot")') && wizard.includes('"tarotCard"') && wizard.includes('"tarotQuestion"'), "Tarot must ask card and question rather than birth details.");
check(wizard.includes('id==="palm"||id==="fusion"'), "Palm/fusion require independent two-hand photo steps.");
check(guideStyle.includes(".askBubble") && guideStyle.includes(".yourReply"), "Chat-like guide message styling missing.");
check(!/TossPayments|new Stripe\(|\/api\/checkout/.test(shop), "Real charge integration must remain disabled for beta.");
check(shop.includes("실제 청구 없음") && shop.includes("실제 결제"), "Beta mock-payment disclosure missing.");
if (fail.length) {
  console.error("Fortune UX contract FAIL:\n - "+fail.join("\n - "));
  process.exit(1);
}
console.log("Fortune UX static contract PASS: 17 SKU names, independent journeys, dialogue, routes, demo checkout.");
