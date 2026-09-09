import { calculateSaju } from "ssaju";

const r = calculateSaju({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" });

console.log("fiveElements:", r.fiveElements);
console.log("dayStem:", r.dayStem, "dayBranch:", r.dayBranch);
console.log("tenGods:", JSON.stringify(r.tenGods, null, 2));
console.log("pillarDetails.day:", JSON.stringify(r.pillarDetails.day, null, 2));
console.log("stemRelations:", r.stemRelations);
console.log("branchRelations:", r.branchRelations);
console.log("advanced:", r.advanced);
console.log("daeun.current:", r.daeun.current);
console.log("gongmang:", r.gongmang);
console.log("---toCompact---");
console.log(r.toCompact());
