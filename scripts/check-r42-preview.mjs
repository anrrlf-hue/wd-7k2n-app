import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const routes=read("src/app/explore/[section]/page.tsx");
const app=read("src/components/study-app.tsx");
const chat=read("src/components/study-chat.tsx");
const reader=read("src/components/study-reader.tsx");
const required=["popular","new","freeHub","scenario","all","input","detail","my","relations"];
const missing=required.filter(k=>!routes.includes("'"+k+"'")&&!routes.includes('"'+k+'"'));
for(const path of ["public/images/r42-home-original.webp","public/images/r42-chat-original.webp","public/images/r42-reader-original.webp","src/app/study.css","src/app/study-final.css"])if(!fs.existsSync(path))missing.push("file "+path);
if(!app.includes("StudyChat")||!app.includes("StudyReader"))missing.push("interactive chat/reader");
if(!chat.includes("overflow")&&!chat.includes("onConversationScroll"))missing.push("scrolling chat");
if(!reader.includes("ud-reader-nav"))missing.push("fixed reading navigation");
if(missing.length){console.error("R42 Preview check FAIL:",missing.join(", "));process.exit(1)}
console.log("R42 Preview contract OK (static check only; visual/mobile/API require separate verification)");
