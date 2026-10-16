import assert from "node:assert/strict";
import fs from "node:fs";

const root = "C:/Users/PC/AppData/Local/RDC-Remote/wd-7k2n-app-preview";
const diagnosis = fs.readFileSync(`${root}/src/app/diagnosis/page.tsx`, "utf8");
const birthDate = fs.readFileSync(`${root}/src/components/diagnosis/birth-date-step.tsx`, "utf8");
const shareCard = fs.readFileSync(`${root}/src/components/service-share-card.tsx`, "utf8");
const palmReading = fs.readFileSync(`${root}/src/lib/palm-customer-reading.ts`, "utf8");

assert.match(diagnosis, /setStep\("date"\);/);
assert.match(diagnosis, /setBirthDate\(""\);/);
assert.match(birthDate, /type="text"/);
assert.match(birthDate, /inputMode="numeric"/);
assert.match(birthDate, /isValidBirthDate/);
assert.match(birthDate, /formatBirthDateInput/);
assert.match(shareCard, /친구가 링크를 열고 자신의 무료 풀이를 끝내야 합니다/);
assert.match(shareCard, /공유 후 완료 확인/);
assert.match(palmReading, /쉽게 말하면/);

console.log("PASS share entry, reward explanation, and readable palm copy contract");
