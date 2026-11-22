"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Copy, Gift, Heart, LockKeyhole, Menu, MessageCircle, Moon, Search, ShieldCheck, ShoppingBag, Sparkles, Star, TrendingUp, UserRound, Wallet, X } from "lucide-react";
import styles from "./fortune-shop.module.css";
import ShopArt from "./shop-art";
import FortuneIntakeWizard from "./fortune-intake-wizard";

type Product = {id:string; name:string; type:string; desc:string; hook:string; price:number; art:string; icon:string; chapters:string[]; quick:string[]; tag?:string};
const P: Product[] = [
{id:"life",name:"평생 심층사주",type:"인생",desc:"타고난 성향부터 앞으로의 인생 전환점까지",hook:"인생의 큰 흐름이 바뀌는 때는 언제일까요?",price:29800,art:"violet",icon:"📜",tag:"대표 상품",chapters:["인생 에너지 그래프","타고난 재능과 삶의 방향","내 재물 그릇","천직과 성공의 시기","대운이 바뀌는 10년","앞으로의 5년","내 인생의 귀인","인연과 배우자의 특징","미래 인연 상상 이미지","가까워지는 기회와 주의할 때","나를 위한 심층 조언"],quick:["나를 알아보는 전통사주","인생의 전환점","미래 인연"]},
{id:"compatibility",name:"연인 궁합",type:"궁합",desc:"둘의 끌림과 갈등, 오래 가는 관계의 비밀",hook:"우리는 얼마나 잘 맞는 사이일까요?",price:16800,art:"rose",icon:"💞",tag:"관계 인기",chapters:["우리 둘의 케미 점수","첫 끌림의 이유","겉과 속의 서로 다른 성향","갈등이 생기는 진짜 이유","오래 함께하는 방법","시기별 관계 흐름","추가 질문 3회"],quick:["두 사람의 케미","성향 차이","관계의 방향"]},
{id:"year",name:"신년운세",type:"인생",desc:"다가올 한 해, 중요한 시기와 달별 흐름",hook:"새해에 내게 다가올 가장 큰 변화는?",price:14800,art:"amber",icon:"🌅",chapters:["1년 전체 흐름","1~3월의 기회","4~6월의 변화","7~9월의 결정","10~12월의 결실","재물과 사람의 시기","나에게 맞는 월별 달력"],quick:["올해의 큰 흐름","월별 운세","중요한 시기"]},
{id:"wealth",name:"금전·재물운",type:"돈·일",desc:"돈을 다루는 방식과 재물의 흐름",hook:"내 돈 그릇은 어떤 타입이고, 언제 좋아질까요?",price:16800,art:"gold",icon:"💰",chapters:["나의 재물 성향 유형","돈 그릇 진단","재물 에너지 그래프","10년의 재물 흐름","수입과 지출의 패턴","돈이 들어올 기회의 시기","재물을 지키는 선택"],quick:["나의 돈 성향","재물 유형 카드","시기별 그래프"]},
{id:"love",name:"연애운",type:"사랑",desc:"나에게 잘 맞는 인연과 사랑의 가능성",hook:"내게 잘 맞는 사람은 어떤 모습일까요?",price:14800,art:"pink",icon:"💕",chapters:["나의 연애 성향","끌리는 사람의 특징","잘 맞는 인연의 유형","연애 기회가 찾아오는 시기","연애에서 반복하는 실수","미래 인연 상상 이미지"],quick:["연애 성향","인연의 특징","연애 시기"]},
{id:"marriage",name:"결혼운",type:"사랑",desc:"결혼 시기와 함께 살아갈 사람의 성향",hook:"나에게 잘 맞는 결혼 상대와 시기는?",price:14800,art:"rose",icon:"💍",chapters:["나의 결혼 성향","배우자에게 기대하는 것","결혼 생활의 강점","시기별 결혼운","함께 생활하는 방식","배우자 인연 이미지"],quick:["결혼 시기","배우자 성향","함께하는 삶"]},
{id:"reunion",name:"이별·재회운",type:"사랑",desc:"헤어진 인연과 마음의 흐름",hook:"그 사람과 다시 만날 가능성이 있을까요?",price:14800,art:"night",icon:"💌",chapters:["지금의 관계 흐름","서로 달라진 마음","헤어짐의 패턴","연락하기 좋은 시기","관계를 회복하는 조건","내가 선택할 다음 인연"],quick:["이별 이후","상대와 나의 차이","재회 시기"]},
{id:"job",name:"취업·이직운",type:"돈·일",desc:"나에게 맞는 직업과 움직여야 할 시기",hook:"이직이 나을까요, 지금 자리에서 성장할까요?",price:14800,art:"blue",icon:"💼",chapters:["타고난 업무 기질","맞는 직무의 특징","직장 갈등과 해결","이직과 취업의 흐름","기회가 열리는 시기","앞으로의 성장 경로"],quick:["직업 성향","이직 시기","직장 속 강점"]},
{id:"business",name:"사업·창업운",type:"돈·일",desc:"사업 성향과 도약·협력의 시기",hook:"나는 사업이 더 잘 맞는 사람일까요?",price:16800,art:"teal",icon:"📈",chapters:["내 사업가 기질","혼자와 동업의 차이","기회가 생기는 시장","사업을 키우는 흐름","실행 시기와 신중할 때","돈과 사람을 운영하는 법"],quick:["사업가 기질","협력의 방식","사업 시기"]},
{id:"palm",name:"정통 손금",type:"특별",desc:"오른손·왼손 사진으로 보는 손금",hook:"두 손바닥에 어떤 차이가 있을까요?",price:16800,art:"cream",icon:"🖐️",chapters:["왼손과 오른손 비교","감정과 관계의 특징","생활 리듬과 성향","손금선의 형태 분석","특징별 해석","나만의 손금 결과 카드"],quick:["양손 사진","손의 특징","손금 심층"]},
{id:"tarot",name:"타로",type:"특별",desc:"지금 가장 궁금한 질문 하나",hook:"지금 내 마음에 필요한 답은 무엇일까요?",price:9800,art:"navy",icon:"🃏",chapters:["고른 카드의 의미","현재 마음의 흐름","선택에 영향을 주는 감정","조심할 상황","가능한 다음 선택","마무리 질문"],quick:["카드 선택","오늘의 질문","카드 풀이"]},
{id:"fusion",name:"사주·손금 인생종합",type:"특별",desc:"사주명식과 실제 양손을 함께 분석하는 종합 심층",hook:"태어난 사주와 손에 새겨진 특징은 어떻게 다를까요?",price:39800,art:"violet",icon:"✨",tag:"프리미엄",chapters:["사주와 손금의 첫인상","두 손 사진에서 읽힌 특징","사주와 손금의 공통점","상반된 해석","인생의 흐름과 전환점","재물·일·인연 종합","앞으로의 시기별 해석","나만의 인생종합 결과"],quick:["명식과 양손","통합 분석","인생 전체"]},
{id:"spouse",name:"부부·결혼 궁합",type:"궁합",desc:"함께 살아갈 때의 강점과 부딪힘",hook:"함께 살면 무엇이 달라질까요?",price:16800,art:"rose",icon:"💍",chapters:["결혼 생활의 케미","돈과 생활 방식","갈등의 원인","가족과 책임의 균형","함께 성장하는 시기"],quick:["부부의 성향","생활 속 케미","갈등 해결"]},
{id:"friend",name:"친구 궁합",type:"궁합",desc:"친구 사이의 믿음과 오래 가는 우정",hook:"우리는 왜 잘 통하고, 어디서 어긋날까요?",price:12800,art:"blue",icon:"🤝",chapters:["우정 케미 점수","관계에서 맡는 역할","서로 잘 통하는 이유","실망이 쌓이는 패턴","오래 유지하는 방법"],quick:["우정 점수","친구의 차이","관계의 강점"]},
{id:"partner",name:"사업 파트너 궁합",type:"궁합",desc:"사업 결정·돈·역할 분담에서의 조합",hook:"동업하면 서로에게 득이 될까요?",price:16800,art:"teal",icon:"🤝",chapters:["동업 케미 점수","결정 속도와 성향","돈을 다루는 차이","리더와 실행의 균형","위기가 닥쳤을 때","협력의 시기"],quick:["동업 점수","역할 분담","돈의 조합"]},
{id:"coworker",name:"직장 동료 궁합",type:"궁합",desc:"함께 일하는 방식과 협업의 특징",hook:"함께 일하면 시너지가 날까요?",price:12800,art:"blue",icon:"🧑‍💻",chapters:["협업 케미 점수","업무 스타일의 차이","갈등이 나는 상황","보고와 소통","함께 성과 내는 방법"],quick:["협업 점수","일하는 방식","소통 팁"]},
{id:"family",name:"가족 궁합",type:"궁합",desc:"가족 사이의 기대와 대화 방식",hook:"우리 가족은 왜 같은 말에도 다르게 느낄까요?",price:14800,art:"amber",icon:"🏡",chapters:["가족 케미 점수","서로의 기질","말로 표현하지 않는 기대","오해의 시작","관계가 좋아지는 대화"],quick:["가족 케미","소통 방식","서로의 역할"]}
];
const FEATURED = ["life","compatibility","year"];
const POPULAR = ["life","compatibility","wealth","love","year"];
const RELATIONS = ["compatibility","spouse","friend","partner","coworker","family"];
const FINDINGS = ["태어난 성향과 내 안의 두 모습","남들이 보는 나와 진짜 속마음","이미 지나온 시기에서 찾는 나의 선택"];
const faq = [
["정말 맞나요?","사주명식·손 사진 등 실제 입력을 바탕으로 해석하도록 설계하고 있습니다. 운세의 점수와 미래 이미지는 즐기는 콘텐츠이며, 무료 체험을 통해 자신에게 맞는지 판단할 수 있습니다."],
["무료로 어디까지 볼 수 있나요?","각 상품의 전체 원고를 먼저 만든 뒤 핵심적인 무료 미리보기를 제공합니다. 지금은 디자인·풀이 구조를 시연하는 테스트 화면입니다."],
["결제 후 바로 볼 수 있나요?","현재는 결제 테스트 기간이므로 결제 정보 입력 없이 '테스트로 본편 열기'를 누르면 즉시 열람합니다. 실제 결제는 차후 연결합니다."],
["환불은 어떻게 되나요?","현재 실제 결제가 없으므로 환불할 금액도 없습니다. 실제 결제를 연결하기 전에 환불 기준과 이용 기간을 정확하게 공개합니다."],
["생년월일과 손 사진은 안전한가요?","현재 이 시연 화면의 생년월일·이름은 외부 전송하거나 저장하지 않습니다. 실서비스 사진 저장·삭제 정책은 개발 단계에서 별도로 검증합니다."],
["기존에 사주나 손금을 봤으면 할인이 되나요?","평생 심층사주 또는 정통 손금을 이미 구매한 고객은 사주·손금 인생종합 업그레이드 가격을 적용하는 것이 기획 원칙입니다. 이 화면에서는 테스트용으로 계산됩니다."]
];
type Page = "home"|"detail"|"input"|"free"|"paywall"|"full"|"my"|"gift"|"today"|"bundle"|"popular"|"paired"|"relations"|"all"|"freeHub"|"classic"|"loveHub"|"money"|"special"|"scenario"|"bundles"|"reviews";
const won=(n:number)=> n.toLocaleString("ko-KR")+"원";
export default function FortuneShop({ initialView="home", initialProductId="life" }: { initialView?: string; initialProductId?: string }){
 const [page,setPage]=useState<Page>(initialView as Page);
 const [heroIndex,setHeroIndex]=useState(0);
 const [bundleSize,setBundleSize]=useState<3|5>(3);
 const [selectedRelation,setSelectedRelation]=useState("compatibility");
 const [pairedTopic,setPairedTopic]=useState("wealth");
 const [pid,setPid]=useState(P.some(p=>p.id===initialProductId)?initialProductId:"life");
 const [chapter,setChapter]=useState(0);
 const [owned,setOwned]=useState<string[]>([]);
 const [reviewText,setReviewText]=useState("");
 const [reviews,setReviews]=useState<string[]>([]);
 const [searchText,setSearchText]=useState("");
 const [mobileNav,setMobileNav]=useState(false);
 const [myTab,setMyTab]=useState<"results"|"tickets"|"gifts"|"reviews">("results");
 const [orderNumber,setOrderNumber]=useState("");
 const [tarotCard,setTarotCard]=useState<number|null>(null);
 const [tarotQuestion,setTarotQuestion]=useState("");
 const [giftMessage,setGiftMessage]=useState("");
 const [giftPreview,setGiftPreview]=useState(false);
 const [todaySign,setTodaySign]=useState("용");
 const [fortuneDay,setFortuneDay]=useState<"today"|"tomorrow">("today");
 const [toast,setToast]=useState("");
 const [giftText,setGiftText]=useState("");
 const product=P.find(p=>p.id===pid)||P[0];
 const pairedIdeas=[
 {id:"wealth",name:"금전·재물운",icon:"💰",saju:"wealth",summary:"재물 성향과 시기별 흐름은 사주로 살펴보고, 이번 달의 현실적인 돈 고민을 타로로 질문합니다.",questions:["지금 돈을 모으는 데 무엇이 걸림돌일까?","새 수입 기회를 선택해도 될까?","이번 달 지출을 어떻게 관리할까?"]},
 {id:"love",name:"연애운",icon:"💕",saju:"love",summary:"인연의 성향과 시기를 사주로 살펴보고, 지금 마음에 걸리는 관계를 타로로 질문합니다.",questions:["그 사람에게 먼저 연락하는 게 좋을까?","새로운 인연을 만날 준비가 되었을까?","이 관계에서 내가 놓치고 있는 건 뭘까?"]},
 {id:"job",name:"취업·이직운",icon:"💼",saju:"job",summary:"나에게 맞는 일과 이동의 흐름은 사주로 보고, 당장의 이직·면접 선택은 타로로 살펴봅니다.",questions:["지금 이직 준비를 시작해도 될까?","이번 면접에서 무엇을 준비할까?","지금 직장에서 먼저 바꿔야 할 것은?"]},
 {id:"business",name:"사업·창업운",icon:"📈",saju:"business",summary:"사업 기질과 변화의 시기는 사주로 보고, 현재 고민인 동업·계약·시작 순서는 타로로 질문합니다.",questions:["이 사업을 시작할 때 무엇부터 확인할까?","현재 동업 제안을 어떻게 판단할까?","이번 달 사업에서 우선할 일은?"]},
 {id:"reunion",name:"이별·재회운",icon:"💌",saju:"reunion",summary:"관계의 반복 패턴은 사주로 읽고, 지금 연락할지 기다릴지를 타로로 살펴봅니다.",questions:["지금 먼저 연락한다면 어떤 대화를 준비할까?","이 관계에 미련이 남은 이유는 뭘까?","지금 나에게 필요한 선택은?"]}
 ];
 const paired=pairedIdeas.find(t=>t.id===pairedTopic)||pairedIdeas[0];
 function startTarotOnly(){setTarotQuestion("");setTarotCard(null);productOpen("tarot");}
 const heroSlides=[{id:"life",eyebrow:"대표 운세 · 전통사주 무료체험",title:"내 사주는 어디로 향하고 있을까?",sub:"평생 심층사주에서 타고난 기질부터 인생의 큰 변화까지 확인해 보세요."},{id:"year",eyebrow:"2027 신년운세",title:"내년엔 어떤 일이 기다리고 있을까?",sub:"12개월의 흐름, 돈과 인연의 시기까지. 먼저 무료로 확인하세요."},{id:"compatibility",eyebrow:"궁합 전문 · 관계의 모든 것",title:"우리 둘은 얼마나 잘 맞을까?",sub:"연인부터 가족과 동업까지, 관계마다 다른 궁합 풀이를 만나보세요."}];
 const hero=heroSlides[heroIndex];
 const bundleIds=bundleSize===3?["life","wealth","year"]:["life","wealth","year","compatibility","love"];
 const discount=pid==="fusion" ? (owned.includes("life")?5000:0)+(owned.includes("palm")?5000:0):0;
 const currentPrice=Math.max(9800,product.price-discount);
 const previewLabel=product.id==="life"?"전통사주 미리보기":product.name+" 미리보기";
 const readingLabel=product.name+" 보기";
 const previewPages=product.id==="tarot"||product.id==="palm"||product.type==="궁합"?2:3;
 useEffect(()=>{
   try {const saved=JSON.parse(localStorage.getItem("undon-demo-access")||"[]");setOwned(Array.isArray(saved)?saved.filter((id:unknown)=>typeof id==="string"&&P.some(p=>p.id===id)):[]);}catch{setOwned([]);}
   try {const saved=JSON.parse(localStorage.getItem("undon-demo-reviews")||"[]");setReviews(Array.isArray(saved)?saved.filter((v:unknown)=>typeof v==="string").slice(0,20):[]);}catch{setReviews([]);}
 },[]);
 useEffect(()=>{
 const onBack=()=>{const u=new URL(window.location.href), p=u.pathname.split("/").filter(Boolean); const v=p[0]==="explore"&&p[1]?p[1]:"home";setPage(v as Page);const item=u.searchParams.get("item");if(item&&P.some(p=>p.id===item))setPid(item);};
 onBack();window.addEventListener("popstate",onBack);return()=>window.removeEventListener("popstate",onBack);
 },[]);
 function nav(to:Page,id?:string){const path=to==="home"?"/":"/explore/"+to;const query=id||(["detail","input","free","paywall","full"].includes(to)?pid:"");window.history.pushState({view:to},"",path+(query?"?item="+encodeURIComponent(query):""));setPage(to);setMobileNav(false);window.scrollTo(0,0);}
 function productOpen(id:string){setPid(id);setChapter(0);nav("detail",id);}
 function section(id:string){const routes:Record<string,Page>={popular:"popular",paired:"paired",new:"paired",relations:"relations",all:"all",free:"freeHub",classic:"classic",love:"loveHub",scenario:"scenario",bundle:"bundles",social:"reviews",featured:"classic",money:"money",special:"special"};nav(routes[id]||"all");}
 function unlockBundle(){const next=Array.from(new Set([...owned,...bundleIds]));setOwned(next);try{localStorage.setItem("undon-demo-access",JSON.stringify(next));}catch{say("이 브라우저에서 임시 저장을 사용할 수 없습니다.");}nav("my");}
 function unlock(){const next=Array.from(new Set([...owned,pid]));setOwned(next);try{localStorage.setItem("undon-demo-access",JSON.stringify(next));}catch{say("임시 저장이 꺼져 있습니다. 이번 화면에서는 계속 보실 수 있습니다.");}setChapter(0);nav("full");}
 function say(t:string){setToast(t);setTimeout(()=>setToast(""),3000);}
 function submitReview(){if(!reviewText.trim())return;const next=[reviewText.trim().slice(0,1000),...reviews].slice(0,20);setReviews(next);try{localStorage.setItem("undon-demo-reviews",JSON.stringify(next));say("이 기기의 시연 후기에 추가했습니다");}catch{say("현재 브라우저에서 임시 후기 저장이 제한되었습니다.");}setReviewText("");}
 function share(){const s="운·돈 사주 쇼핑 테스트 시안";if(navigator.share){navigator.share({title:s,url:location.origin}).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(location.origin).then(()=>say("사이트 링크가 복사되었습니다")).catch(()=>say("주소창에서 링크를 복사해 주세요"));}}
 function productTiles(ids:string[]){return <div className={styles.catalogGrid}>{ids.map(id=>{const p=P.find(x=>x.id===id);if(!p)return null;return <button key={id} className={styles.catalogCard} onClick={()=>productOpen(id)}><div className={styles.catalogArt}><ShopArt id={id}/></div><div className={styles.catalogDetails}><div className={styles.catalogMeta}>{p.tag||p.type+" 운세"} · 미리보기 제공</div><h3>{p.name}</h3><p>{p.hook}</p><span>{p.name} 알아보기 <ArrowRight size={14}/></span></div></button>})}</div>}

 function chapterSymbol(topic:string){
   if(/그래프|흐름|에너지|전환/.test(topic))return "📈";
   if(/시기|월|달력|5년|10년|연간/.test(topic))return "🗓️";
   if(/재물|수입|지출|돈|금전/.test(topic))return "💰";
   if(/연인|인연|배우자|연애|사랑|결혼|관계/.test(topic))return "💞";
   if(/궁합|케미|갈등|협력|동업|가족|소통/.test(topic))return "🤝";
   if(/직장|사업|창업|직무|성공|취업|이직/.test(topic))return "💼";
   if(/손|손금|선의|좌우/.test(topic))return "🖐️";
   if(/카드|질문|선택/.test(topic))return "🃏";
   if(/상상 이미지|미래/.test(topic))return "✨";
   return "📜";
 }
 function chapterTeaser(topic:string){
   if(/그래프/.test(topic))return "중요한 시기별 변화를 그래프로 한눈에 비교하는 본편 주제입니다.";
   if(/월|달력|5년|10년|시기/.test(topic))return "시간의 흐름을 따라 기회와 변화가 어떻게 달라지는지 살펴봅니다.";
   if(/재물|수입|지출|돈|금전/.test(topic))return "재물을 다루는 성향과 관련된 세부 해석을 볼 수 있습니다.";
   if(/인연|배우자|연애|사랑|결혼|관계/.test(topic))return "인연에서 반복되는 행동과 서로 다른 마음을 더 깊이 읽는 내용입니다.";
   if(/궁합|케미|갈등|협력|동업|가족|소통/.test(topic))return "두 사람 사이에서 나타나는 강점과 차이를 구체적으로 비교합니다.";
   if(/직장|사업|창업|직무|성공|취업|이직/.test(topic))return "일과 선택의 성향 및 나에게 중요한 변화의 순간을 살펴봅니다.";
   if(/손|손금|선/.test(topic))return "양손의 실제 특징을 바탕으로 해석하는 본편 주제입니다.";
   if(/카드|질문|선택/.test(topic))return "내가 선택한 카드와 질문을 연결해 해석하는 내용을 다룹니다.";
   if(/이미지/.test(topic))return "풀이를 바탕으로 상상한 시각 이미지를 함께 즐기는 장입니다.";
   return "‘"+topic+"’ 주제에 담긴 더 자세한 풀이를 읽을 수 있습니다.";
 }
 function intro():string[]{
   if(product.id==="life") return [
     "이름이 같아도 생년월일과 태어난 시각에 따라 사주 원국이 달라집니다. 시연 화면에서는 어떤 요소가 인생 풀이에 사용되는지 소개합니다.",
     "바깥에서 보여주는 내 모습과 혼자 있을 때의 마음을 비교해 보는 내용입니다. 고객별 실제 해석은 명식 계산 이후 연결됩니다.",
     "지난 선택과 앞으로의 흐름을 살펴볼 차례입니다. 평생 심층사주 유료 본편에서는 10년 대운, 재물, 인연과 중요한 시기를 다룹니다."
   ];
   if(product.id==="tarot") return [
     "선택한 카드를 중심으로 지금 질문과 연결되는 상징을 먼저 읽습니다. 실제 서비스에서는 고객이 뽑은 카드의 종류와 위치를 기반으로 풀이합니다.",
     "두 번째 미리보기에서는 현재의 마음과 선택 사이에서 어떤 질문을 던질 수 있을지 살펴봅니다. 고객별 카드 해석은 아직 연결되지 않았습니다.",
     "마지막 미리보기에서는 카드가 보여주는 상황의 관점을 정리합니다. 타로 본편에서는 지금 고민을 더 구체적으로 다루는 내용을 볼 수 있습니다."
   ];
   if(product.id==="palm"||product.id==="fusion") return [
     "왼손과 오른손을 함께 살펴보는 이유부터 시작합니다. 실제 손바닥 사진 판독은 추후 본 기능에 연결됩니다.",
     "양손에서 관찰한 서로 다른 선의 형태와 특징이 풀이에서 어떻게 해석되는지 보여주는 시연 예시입니다.",
     "정통 손금 또는 종합심층 본편에서는 분석된 손의 특징을 중심으로 자세한 내용을 확인하도록 구성했습니다."
   ];
   if(product.type==="궁합") return [
     product.hook+" 첫 번째 미리보기에서는 두 사람의 관계 유형과 어떤 영역을 분석하는지 소개합니다.",
     "다음 내용은 두 사람의 성향과 대화 방식에서 나타날 수 있는 차이를 살펴보는 예시입니다. 실제 궁합 점수는 아직 계산하지 않습니다.",
     "마지막 미리보기에서는 이 관계를 깊이 있게 살펴볼 항목을 안내합니다. 결제 후에는 선택한 궁합 상품의 본편을 열람하는 구조입니다."
   ];
   return [
     product.hook+" 먼저 이 운세에서 무엇을 살펴볼 수 있는지 소개합니다.",
     product.name+"은 인생의 이 영역에 관한 성향과 흐름을 자세히 다루는 상품입니다. 고객별 실제 사주 해석은 별도로 연결됩니다.",
     "이 미리보기 이후 "+product.name+"의 유료 본편에서 중요한 시기와 관련 내용을 자세히 확인할 수 있습니다."
   ];
 }
 return <div className={styles.site}>
 <header className={styles.header}><div className={styles.headerInner}>
 <button className={styles.hamburger} aria-label="메뉴" onClick={()=>setMobileNav(!mobileNav)}>{mobileNav?<X/>:<Menu/>}</button>
 <button className={styles.logo} onClick={()=>nav("home")} aria-label="운돈 홈"><span className={styles.logoDisc}>운</span><strong>운·돈</strong><small>사주·운세 전문</small></button>
 <nav className={mobileNav?styles.mainNav+" "+styles.open:styles.mainNav} aria-label="상단 메뉴">
 <button onClick={()=>nav("today")}>투데이</button><button onClick={()=>section("popular")}>인기차트</button><button onClick={()=>productOpen("tarot")}>타로</button><button onClick={()=>section("relations")}>연애·궁합</button><button onClick={()=>section("free")}>무료</button><button onClick={()=>section("all")}>전체 상품</button>
 </nav><div className={styles.headerTools}><button aria-label="선물" onClick={()=>nav("gift")}><Gift size={20}/></button><button aria-label="내 결과" onClick={()=>nav("my")}><UserRound size={20}/></button></div>
 </div></header>
 {page!=="home"&&<div className={styles.backline}><button onClick={()=>nav("home")}><ArrowLeft size={16}/> 운·돈 홈</button><span className={styles.testTag}>테스트 화면 · 실제 결제 없음</span></div>}
 {page==="home"&&<main className={styles.homePage}>
 <section className={styles.hero}>
  <div className={styles.heroInner}>
   <div className={styles.heroText}><span className={styles.kicker}>{hero.eyebrow}</span><h1>{hero.title}</h1><p>{hero.sub}</p><div className={styles.heroButtons}><button className={styles.goldButton} onClick={()=>{setPid(hero.id);nav("input",hero.id);}}>{hero.id==="life"?"전통사주 미리보기":(P.find(p=>p.id===hero.id)?.name||"운세")+" 미리보기"} <ArrowRight size={18}/></button><button className={styles.lightLink} onClick={()=>productOpen(hero.id)}>상품 자세히 보기</button></div>
   <div className={styles.heroControls}><button aria-label="이전 대표 상품" onClick={()=>setHeroIndex((heroIndex+2)%3)}>‹</button>{heroSlides.map((s,i)=><button key={s.id} aria-label={s.id+" 배너"} className={heroIndex===i?styles.activeDot:""} onClick={()=>setHeroIndex(i)}/>) }<button aria-label="다음 대표 상품" onClick={()=>setHeroIndex((heroIndex+1)%3)}>›</button></div></div>
   <div className={styles.heroVisual}><div className={styles.heroArt}><ShopArt id={hero.id}/></div><Image src="/images/undon-guide.svg" alt="운·돈 안내자" className={styles.heroGuide} width={420} height={450} priority/></div>
  </div>
 </section>
 <section className={styles.quickRow} aria-label="빠른 서비스"><button onClick={()=>section("popular")}><TrendingUp/> 인기차트</button><button onClick={startTarotOnly}><Sparkles/> 타로</button><button onClick={()=>section("free")}><Moon/> 무료운세</button><button onClick={()=>nav("gift")}><Gift/> 선물하기</button><button onClick={()=>nav("my")}><BookOpen/> 내 운세</button></section>
 <section className={styles.section} id="featured"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>대표 서비스</span><h2>지금 나에게 필요한 사주는?</h2></div><p>전통·평생사주 · 궁합 · 신년운세</p></div><div className={styles.featuredGrid}>{FEATURED.map(id=>{const p=P.find(v=>v.id===id)!;return <button key={id} className={styles.featuredCard} onClick={()=>productOpen(id)}><span className={styles.cardLabel}>{p.tag||"신년 운세"}</span><div className={styles.featuredIllustration}><ShopArt id={id}/></div><div className={styles.featuredCopy}><h3>{p.name}</h3><p>{p.hook}</p><span className={styles.cardMore}>{p.id==="life"?"전통사주":p.name} 미리보기 <ChevronRight size={16}/></span></div></button>})}</div></section>
 <section className={styles.homeDirectory}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>운·돈 탐색</span><h2>관심 있는 운세부터 골라보세요</h2></div></div>
 <div className={styles.directoryGrid}>{[
 ["인기차트 TOP 5","popular","많이 주목받는 운세"],["타로","tarot","현재 고민과 카드 풀이"],
 ["전통·평생사주","classic","인생의 전체 흐름"],["재물·취업·사업","money","돈과 일의 시기"],
 ["연애·결혼·재회","loveHub","사랑과 인연"],["궁합 전문관","relations","연인·부부·친구·동업·가족"],
 ["손금·타로","special","양손과 카드풀이"],["무료 운세","freeHub","오늘과 무료 미리보기"],
 ["패키지·선물","bundles","묶음 구매·선물"],["후기·FAQ","reviews","구매 전 궁금증"]
 ].map(([label,id,desc])=><button key={id} onClick={()=>id==="tarot"?startTarotOnly():nav(id as Page)}><strong>{label}</strong><small>{desc}</small><ChevronRight size={17}/></button>)}</div></section>
 <section className={styles.homeTeaser}><div><span className={styles.eyebrow}>SUGGESTED FOR YOU</span><h2>함께 보면 좋은 운세</h2><p>재물운·연애운·취업운과 타로는 각각 따로 볼 수 있습니다. 궁금한 상품만 골라보세요.</p></div><button onClick={()=>section("paired")}>추천 운세 보기 <ArrowRight size={16}/></button></section>
 </main>}
 {page==="popular"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>POPULAR</span><h1>인기차트 TOP 5</h1><p>인기 운세를 비교해 보세요. 현재는 실제 판매 순위가 아닌 시연 추천 목록입니다.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section+" "+styles.topSection} id="popular"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>RANKING · TOP 5</span><h2>요즘 가장 주목받는 운세</h2><p>무엇부터 볼지 고민될 때</p></div><span className={styles.sampleNote}>현재는 추천 순서 · 실제 판매 순위 아님</span></div><div className={styles.ranks}>{POPULAR.map((id,i)=>{const p=P.find(v=>v.id===id)!;return <button key={id} onClick={()=>productOpen(id)}><b>{i+1}</b><span className={styles.rankSymbol}><ShopArt id={id} mini/></span><span><strong>{p.name}</strong><small>{p.hook}</small></span><ChevronRight size={19}/></button>})}</div></section><section className={styles.section}><div className={styles.sectionHead}><div><h2>상품을 골라보세요</h2></div></div>{productTiles(["life","year","love","wealth","compatibility"])}</section>
 </main>}
 {page==="paired"&&<main className={styles.explorePage+" "+styles.pairedPage}>
 <div className={styles.exploreHeader}><span className={styles.eyebrow}>RELATED FORTUNES</span><h1>함께 보면 좋은 운세</h1><p>사주와 타로는 서로 다른 상품입니다. 원하는 것부터 하나씩 선택해 볼 수 있어요.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>CHOOSE YOUR FORTUNE</span><h2>어떤 고민이 궁금하세요?</h2></div></div>
 <div className={styles.pairedTopics}>{pairedIdeas.map(t=><button key={t.id} className={pairedTopic===t.id?styles.pairedTopicActive:""} onClick={()=>setPairedTopic(t.id)}><span>{t.icon}</span><strong>{t.name}</strong></button>)}</div>
 <div className={styles.pairedExplanation}><h3>{paired.icon} {paired.name}</h3><p>{paired.summary}</p></div>
 <div className={styles.pairedSteps}>
  <div className={styles.pairedStep}><div className={styles.pairedStepTop}><span>사주 상품</span><span>독립 체험</span></div><div className={styles.pairedVisual}><ShopArt id={paired.saju}/></div><h3>{P.find(p=>p.id===paired.saju)?.name}</h3><p>생년월일을 바탕으로 이 분야의 성향과 시기를 살펴보는 독립 상품입니다.</p><button className={styles.goldButton} onClick={()=>productOpen(paired.saju)}>{P.find(p=>p.id===paired.saju)?.name} 미리보기 <ArrowRight size={16}/></button></div>
  <div className={styles.pairedStep}><div className={styles.pairedStepTop}><span>타로 상품</span><span>독립 체험</span></div><div className={styles.pairedVisual}><ShopArt id="tarot"/></div><h3>타로</h3><p>생년월일 입력 없이 현재 궁금한 질문을 정하고 카드를 골라보는 독립 상품입니다.</p><button className={styles.outlineButton} onClick={startTarotOnly}>타로 미리보기 <ArrowRight size={16}/></button></div>
 </div>
 <div className={styles.pairedFooter}><strong>각각 따로 이용할 수 있습니다.</strong><p>사주를 구매하지 않아도 타로를 바로 이용할 수 있고, 타로를 보지 않아도 사주 본편을 볼 수 있습니다. 다른 상품 추천은 선택 사항입니다.</p><div className={styles.pairedQuestions}><span>타로에서 이런 질문을 골라볼 수 있어요</span>{paired.questions.map(q=><span key={q}>“{q}”</span>)}</div><p className={styles.demoNote}>현재는 개별 상품의 화면 시연입니다. 실제 AI 해석과 실결제는 연결되지 않았습니다.</p></div>
 </section></main>}
 {page==="classic"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>SAJU</span><h1>전통사주·평생 심층사주</h1><p>나의 성향부터 10년 대운과 인생의 전환점까지.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section} id="classic"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>S A J U</span><h2>정통 사주 · 인생 운세</h2><p>한 해의 흐름부터 평생의 전환점까지</p></div></div>{productTiles(["life","year","wealth","job"])}</section>
 </main>}
 {page==="money"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>WEALTH & CAREER</span><h1>돈·직장·사업 운세</h1><p>돈과 일의 고민에 맞춰 운세를 선택하세요.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div><section className={styles.section}><div className={styles.sectionHead}><div><h2>상품을 골라보세요</h2></div></div>{productTiles(["wealth","job","business","life"])}</section>
 </main>}
 {page==="loveHub"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>LOVE & RELATIONSHIPS</span><h1>연애·결혼·이별·재회</h1><p>인연에 대한 고민마다 다른 운세를 준비했습니다.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section} id="love"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>LOVE & RELATIONSHIPS</span><h2>사랑과 인연이 궁금할 때</h2><p>설레는 시작, 오래가는 관계, 다시 만날 인연</p></div></div>{productTiles(["love","marriage","reunion","compatibility"])}</section><section className={styles.section}><div className={styles.sectionHead}><div><h2>상품을 골라보세요</h2></div></div>{productTiles(["spouse","compatibility","reunion","marriage"])}</section>
 </main>}
 {page==="relations"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>COMPATIBILITY</span><h1>관계별 궁합 6종</h1><p>연인·부부·친구·동업·직장 동료·가족의 궁합을 각각 살펴보세요.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section} id="relations"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>MATCH · SIX TYPES</span><h2>우리 둘의 궁합은?</h2><p>연인만 보는 궁합은 아니니까</p></div></div><div className={styles.relationTabs}>{RELATIONS.map(id=>{const p=P.find(x=>x.id===id)!;return <button key={id} className={selectedRelation===id?styles.tabSelected:""} onClick={()=>setSelectedRelation(id)}>{p.icon} {p.name}</button>})}</div><div className={styles.relationSpot}><div className={styles.relationImage}><ShopArt id={selectedRelation}/></div><div><span className={styles.eyebrow}>관계 맞춤 궁합</span><h3>{P.find(p=>p.id===selectedRelation)?.hook}</h3><p>두 사람의 관계 유형에 따라 달라지는 케미 점수, 서로의 성향과 앞으로의 흐름을 살펴봅니다.</p><button className={styles.goldButton} onClick={()=>productOpen(selectedRelation)}>이 궁합 무료로 보기 <ArrowRight size={16}/></button></div></div></section><section className={styles.section}><div className={styles.sectionHead}><div><h2>관계별 궁합을 비교해 보세요</h2></div></div>{productTiles(RELATIONS)}</section>
 </main>}
 {page==="special"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>PALM & TAROT</span><h1>정통 손금·타로·인생종합</h1><p>실제 손바닥 사진과 타로 선택 등 상품마다 다른 체험.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div><section className={styles.section}><div className={styles.sectionHead}><div><h2>상품을 골라보세요</h2></div></div>{productTiles(["palm","tarot","fusion"])}</section>
 </main>}
 {page==="scenario"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>FIND MY FORTUNE</span><h1>이럴 땐 이 운세</h1><p>일상의 고민에서 시작하는 운세 선택.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section} id="scenario"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>이럴 땐 이거</span><h2>요즘 무슨 고민이 있나요?</h2><p>상황에 맞춰 골라보는 사주</p></div></div><div className={styles.scenarios}>{[["이직을 고민한다면","job"],["헤어진 그 사람은?","reunion"],["동업할 사람과 잘 맞을까?","partner"],["돈이 들어올 시기가 궁금하다면","wealth"],["결혼을 앞두고 있다면","spouse"],["가족이 나를 이해하지 못한다면","family"],["나에게 맞는 인연은?","love"],["앞으로 10년이 궁금하다면","life"]].map(([t,id])=><button key={id} onClick={()=>productOpen(id)}><span>{P.find(p=>p.id===id)?.icon} {t}</span><ChevronRight size={17}/></button>)}</div></section>
 </main>}
 {page==="all"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>ALL FORTUNES</span><h1>전체 운세 상품</h1><p>사주·궁합·재물·연애·손금·타로를 모두 찾아보세요.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section} id="all"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>ALL FORTUNES</span><h2>운·돈 전체 운세</h2><p>재물·연애·손금·타로까지 한눈에</p></div><span>전체 {P.length}종</span></div><div className={styles.filterBox}><Search size={18}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="재물운, 연애운, 궁합 검색" aria-label="운세 검색"/>{searchText&&<button onClick={()=>setSearchText("")}><X size={16}/></button>}</div><div className={styles.productGrid}>{P.filter(p=>p.name.includes(searchText)||p.desc.includes(searchText)||p.type.includes(searchText)).map(p=><button key={p.id} className={styles.productCard} onClick={()=>productOpen(p.id)}><span className={styles.productArt}><ShopArt id={p.id}/></span><span className={styles.productInfo}><strong>{p.name}</strong><small>{p.desc}</small><em>{p.name} 미리보기 <ArrowRight size={14}/></em></span></button>)}</div></section>
 </main>}
 {page==="freeHub"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>FREE</span><h1>무료 운세 모아보기</h1><p>오늘의 무료 운세와 각 상품의 무료 체험.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.freeBox} id="free"><div><span className={styles.eyebrow}>TODAY'S FREE</span><h2>오늘의 무료 운세</h2><p>오늘 하루의 기분, 인연과 돈의 흐름이 궁금하다면</p><button className={styles.goldButton} onClick={()=>nav("today")}>오늘 운세 확인하기 <ArrowRight size={16}/></button></div><span className={styles.freeMoon}>☯</span></section><section className={styles.section}><div className={styles.sectionHead}><div><h2>상품을 골라보세요</h2></div></div>{productTiles(["life","compatibility","wealth","love","palm","tarot"])}</section>
 </main>}
 {page==="bundles"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>BUNDLE & GIFT</span><h1>패키지·선물하기</h1><p>함께 보기 좋은 운세 상품과 선물 이용 방법.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section} id="bundle"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>FORTUNE BUNDLE</span><h2>함께 보면 더 좋은 운세</h2><p>여러 고민을 한 번에 보고 싶을 때</p></div></div><div className={styles.bundleCards}><button onClick={()=>{setBundleSize(3);nav("bundle");}}><span>선택 패키지 · BIG 3</span><h3>인생·재물·신년운세</h3><p>3가지 풀이를 한 번에</p><strong>묶음 상품 보기 <ArrowRight size={18}/></strong></button><button onClick={()=>{setBundleSize(5);nav("bundle");}}><span>스페셜 패키지 · BIG 5</span><h3>인생·재물·신년·궁합·연애</h3><p>5가지 풀이를 한 번에</p><strong>묶음 상품 보기 <ArrowRight size={18}/></strong></button></div></section>
 <section className={styles.giftRibbon}><div><span className={styles.eyebrow}>GIFT A FORTUNE</span><h2>좋은 일이 있는 사람에게, 운세 선물하기</h2><p>상대가 직접 출생 정보를 입력하는 선물 구성입니다.</p></div><button className={styles.goldButton} onClick={()=>nav("gift")}>선물 상품 둘러보기 <Gift size={17}/></button></section>
 </main>}
 {page==="reviews"&&<main className={styles.explorePage}><div className={styles.exploreHeader}><span className={styles.eyebrow}>REVIEWS & FAQ</span><h1>후기·자주 묻는 질문</h1><p>풀이 방식·환불·결제·개인정보를 확인하세요.</p><button onClick={()=>nav("home")}><ArrowLeft size={15}/> 운·돈 홈</button></div>
 <section className={styles.section} id="social"><div className={styles.sectionHead}><div><span className={styles.eyebrow}>REAL REVIEWS & FAQ</span><h2>구매 후기 · 자주 묻는 질문</h2></div></div><div className={styles.trustGrid}><div className={styles.trustCard}><Star size={30}/><h3>한 사람 한 사람의 후기를 모으는 곳</h3><p>테스트 단계로 실제 구매자 평점은 표시하지 않습니다. 상품별 실제 후기가 쌓이면 이곳과 상세 페이지에 연결합니다.</p><button onClick={()=>nav("my")}>내 테스트 후기 남기기 <ArrowRight size={16}/></button></div><div className={styles.faq}>{faq.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={16}/></summary><p>{a}</p></details>)}</div></div></section>
 </main>}
 {page==="detail"&&<main className={styles.content}><div className={styles.detailGrid}><div className={styles.detailArt+" "+styles[product.art]}><ShopArt id={product.id}/><small>{product.type} · 운·돈</small></div><div className={styles.detailInfo}><span className={styles.eyebrow}>FORTUNE COLLECTION</span><h1>{product.name}</h1><h2>{product.hook}</h2><p>{product.desc}</p><div className={styles.benefits}><span><Check/> 풍부한 무료 미리보기</span><span><Check/> 결제하면 볼 내용 미리 확인</span><span><Check/> 결과 저장·공유</span></div><div className={styles.priceLine}><small>본편 시안 가격 · 미확정</small><strong>{won(currentPrice)}</strong>{discount>0&&<em>기존 구매 할인 {won(discount)}</em>}</div><div className={styles.buttons}><button className={styles.goldButton} onClick={()=>nav("input")}>{previewLabel} <ArrowRight size={17}/></button><button className={styles.outlineButton} onClick={()=>nav("paywall")}>{readingLabel} 내용 먼저 보기</button></div></div></div><div className={styles.detailBelow}><h2>{product.name} 본편에서 무엇을 더 볼 수 있을까요?</h2><div className={styles.chapterGrid}>{product.chapters.slice(0,6).map((c,i)=><button key={c} onClick={()=>nav("paywall")}><span>{i+1<10?"0"+(i+1):i+1}</span><strong>{c}</strong><LockKeyhole size={16}/></button>)}</div><button className={styles.outlineButton} onClick={()=>nav("paywall")}>{product.name} 유료 내용 자세히 보기 <ArrowRight size={15}/></button>{product.id!=="tarot"&&<div className={styles.linkTarotHint}><span>🔮 타로는 별도 상품으로 이용할 수 있습니다.</span><button onClick={startTarotOnly}>타로 미리보기 <ArrowRight size={15}/></button></div>}</div></main>}
 {page==="input"&&<FortuneIntakeWizard key={product.id} id={product.id} name={product.name}
   onCancel={()=>nav("detail",product.id)}
   onComplete={result=>{setTarotCard(result.tarotCard);if(result.tarotQuestion)setTarotQuestion(result.tarotQuestion);setChapter(0);nav("free",product.id);}}
 />}
 {page==="free"&&<main className={styles.reader}>
 <div className={styles.readerTop}><span>{previewLabel} · 테스트 예시</span><span>{chapter+1} / {previewPages}</span></div><div className={styles.progress}><span style={{width:((chapter+1)/previewPages)*100+"%"}}/></div>
 <div className={styles.paper}><span className={styles.eyebrow}>{product.name} · PREVIEW 0{chapter+1}</span><h1>{product.id==="life"?FINDINGS[chapter]:product.quick[chapter]}</h1>
 <div className={styles.chapterMedallion}><ShopArt id={product.id} mini/></div>
 <h2>{chapter===0?product.hook:product.quick[chapter]}</h2>
 <p>{intro()[chapter]}</p><p>현재는 <b>{product.name} 화면 확인용 예시</b>입니다. 실제 고객별 풀이와 분석 내용은 이후 연결합니다.</p></div>
 {product.id==="tarot"&&<div className={styles.tarotResultNotice}><strong>선택한 카드: {tarotCard===null?"선택 전":(tarotCard+1)+"번 카드"}</strong><p>내 질문: {tarotQuestion||"지금 궁금한 상황"}</p><small>카드별 실제 AI 해석이 아닌 테스트 예시입니다.</small></div>}
 <div className={styles.readerBottom}><button className={styles.outlineButton} onClick={()=>chapter===0?nav("detail"):setChapter(chapter-1)}>{chapter===0?"상품 소개":"이전 장"}</button>
 <button className={styles.goldButton} onClick={()=>chapter===previewPages-1?nav("paywall"):setChapter(chapter+1)}>{chapter===previewPages-1?product.name+" 유료 본편 소개 보기":"다음 미리보기"} <ArrowRight size={17}/></button></div>
 </main>}
 {page==="paywall"&&<main className={styles.content+" "+styles.paywall}><div className={styles.paywallTop}><div className={styles.paywallGuide}><Image src="/images/undon-guide.svg" width={200} height={210} alt="운돈 안내자"/></div><p className={styles.demoProof}>{previewLabel} 이후 결제하면 확인할 수 있는 {product.name}의 내용을 살펴보세요.</p><span className={styles.eyebrow}>PREMIUM READING</span><h1>{product.name}<br/><em>결제 후 무엇을 더 볼 수 있을까요?</em></h1><p>{product.name} 미리보기에서 이어지는 본편의 구성과 내용을 확인해 보세요.</p><div className={styles.progressBig}><span>{previewLabel} · 테스트 {previewPages}장</span><div><i style={{width:(previewPages/(previewPages+product.chapters.length)*100)+"%"}}/></div><span>남은 본편 {product.chapters.length}개 주제</span></div></div><div className={styles.sectionHead}><div><span className={styles.eyebrow}>LOCKED PREVIEW</span><h2>{product.name} 본편에서 볼 수 있는 내용</h2></div><p>상품마다 다른 본편 구성</p></div><div className={styles.premiumGrid}>{product.chapters.map((c,i)=><div key={c} className={styles.premiumItem}><span className={styles.premiumIllustration} aria-hidden="true">{chapterSymbol(c)}</span><div><small>본편 {String(i+1).padStart(2,"0")}</small><h3>{c}</h3><p>{chapterTeaser(c)}</p></div><LockKeyhole size={20}/></div>)}</div><div className={styles.premiumBonus}><div><MessageCircle size={27}/><strong>추가 질문 3회</strong><span>본편을 다 본 뒤 궁금한 내용 더 묻기 · 설계 시안</span></div><div><BookOpen size={27}/><strong>다시 읽기</strong><span>결과 보관함에서 다시 보기 · 시연 기능</span></div><div><Gift size={27}/><strong>선물·공유</strong><span>친구에게 상품 추천, 결과 일부 공유</span></div></div><div className={styles.checkoutBox}><div><span className={styles.eyebrow}>TEST PAYMENT MODE</span><h2>{readingLabel} · 테스트 이용</h2><p>지금은 테스트 기간이므로 카드 입력과 실제 결제 없이 바로 열람합니다.</p></div><div><small>시안 기준 정가 · 최종 미확정</small><strong>{won(currentPrice)}</strong>{discount>0&&<em>기존 구매자 {won(discount)} 할인 반영</em>}<button className={styles.goldButton} onClick={unlock}><LockKeyhole size={18}/> 결제 없이 {readingLabel} (테스트) <ArrowRight size={18}/></button><p><ShieldCheck size={14}/> 실제 청구 없음 · 결제 API 미연결</p></div></div><div className={styles.sectionHead}><h2>결제 전 자주 묻는 질문</h2></div><div className={styles.faq}>{faq.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={16}/></summary><p>{a}</p></details>)}</div></main>}
 {page==="full"&&<main className={styles.reader}><div className={styles.readerTop}><span>{readingLabel} · 테스트 열람</span><span><Check size={15}/> 테스트 열림</span></div><div className={styles.paper}><span className={styles.eyebrow}>PREMIUM CONTENT DEMO</span><h1>{product.chapters[chapter]}</h1><div className={styles.chapterMedallion}><ShopArt id={product.id} mini/></div><h2>{product.hook}</h2><p>이 화면은 {product.name} 본편의 디자인을 확인하기 위한 예시입니다. 실제 개인별 원고는 다음 풀이 작업에서 이 자리에 연결합니다.</p><p>상품별 본문, 그래프, 카드형 분석과 다음 내용으로의 이동을 함께 보여주는 테스트 화면입니다.</p>{chapter%2===0&&<div className={styles.miniChart}><div style={{height:"30%"}}/><div style={{height:"48%"}}/><div style={{height:"40%"}}/><div style={{height:"70%"}}/><div style={{height:"58%"}}/><div style={{height:"85%"}}/><div style={{height:"65%"}}/></div>}<div className={styles.demoNote}>실제 분석 결과가 아닌 구성 예시입니다.</div></div><div className={styles.readerBottom}><button className={styles.outlineButton} onClick={()=>chapter===0?nav("my"):setChapter(chapter-1)}>이전</button><button className={styles.goldButton} onClick={()=>chapter===product.chapters.length-1?nav("my"):setChapter(chapter+1)}>{chapter===product.chapters.length-1?"내 결과 보관함":"다음 장 보기"} <ArrowRight size={17}/></button></div><div className={styles.shareLine}><button onClick={share}><Copy size={16}/> 사이트 공유하기</button><button onClick={()=>nav("my")}><BookOpen size={16}/> 내 결과</button></div>{product.id!=="tarot"&&<div className={styles.followupTarot}><h3>다른 운세도 궁금하신가요?</h3><p>타로는 별도 상품입니다. 사주 구매 없이 타로만 볼 수도 있습니다.</p><button className={styles.outlineButton} onClick={startTarotOnly}>타로 미리보기 <ArrowRight size={16}/></button></div>}</main>}
 {page==="today"&&<main className={styles.content}>
 <section className={styles.todayHero}><span className={styles.eyebrow}>TODAY & TOMORROW · FREE</span><h1>오늘·내일 무료 운세</h1><p>오늘과 내일을 선택하고, 궁금한 띠의 운세를 확인해 보세요.</p>
 <div className={styles.fortuneDayTabs} aria-label="운세 날짜 선택"><button className={fortuneDay==="today"?styles.daySelected:""} onClick={()=>setFortuneDay("today")}>오늘의 운세</button><button className={fortuneDay==="tomorrow"?styles.daySelected:""} onClick={()=>setFortuneDay("tomorrow")}>내일의 운세</button></div>
 <div className={styles.zodiacGrid}>{["쥐","소","호랑이","토끼","용","뱀","말","양","원숭이","닭","개","돼지"].map((t,i)=><button key={t} className={todaySign===t?styles.zodiacSelected:""} onClick={()=>setTodaySign(t)}><span>{["🐭","🐮","🐯","🐰","🐲","🐍","🐴","🐑","🐵","🐔","🐶","🐷"][i]}</span><strong>{t}띠</strong></button>)}</div></section>
 <section className={styles.todayReading}><span className={styles.eyebrow}>{fortuneDay==="today"?"TODAY":"TOMORROW"} · FREE</span><h2>{todaySign}띠 · {fortuneDay==="today"?"오늘":"내일"}의 운세</h2><p>{fortuneDay==="today"?"오늘은 한 가지 일에 집중하고 주변 사람과 대화할 여유를 만들어보세요.":"내일은 중요한 선택을 서두르기보다 필요한 정보를 먼저 확인하는 하루로 만들어보세요."} 이 문구는 화면 흐름을 위한 공통 시연 예시입니다.</p>
 <div className={styles.todayCards}><div><Heart/>인연운 <strong>{fortuneDay==="today"?"말을 차분히 건네기":"먼저 상대의 이야기를 듣기"}</strong><small>5점 만점 중 4점 · 예시</small></div><div><Wallet/>재물운 <strong>{fortuneDay==="today"?"지출 계획을 확인하기":"내일 필요한 비용을 정리하기"}</strong><small>5점 만점 중 3점 · 예시</small></div><div><CalendarDays/>일상운 <strong>{fortuneDay==="today"?"미뤘던 일 하나 끝내기":"중요한 약속을 미리 살피기"}</strong><small>5점 만점 중 4점 · 예시</small></div></div>
 <p className={styles.demoNote}>오늘·내일 및 띠별 결과는 화면 검토용 예시이며, 실제 날짜·명식 기반 개인화 풀이와 점수 계산은 아직 연결하지 않았습니다.</p>
 <div className={styles.todayActions}><button className={styles.goldButton} onClick={()=>productOpen("year")}>신년운세 살펴보기 <ArrowRight size={17}/></button><button className={styles.outlineButton} onClick={()=>{setPid("life");nav("input","life")}}>전통사주 미리보기 <ArrowRight size={17}/></button></div>
 </section></main>}
 {page==="my"&&<main className={styles.myPage}>
 <section className={styles.myHeader}><span className={styles.eyebrow}>MY FORTUNE</span><h1>마이페이지</h1><p>내 풀이 · 이용권 · 선물함 · 구매 내역</p>
 <div className={styles.signinBar}><div><UserRound size={28}/><div><strong>풀이를 저장하고 다시 보고 싶다면</strong><small>로그인 후 내 사주와 이용 내역을 관리할 수 있습니다.</small></div></div><a className={styles.loginLink} href="/login?next=/explore/my">로그인하기 <ArrowRight size={15}/></a></div></section>
 <section className={styles.orderLookup}><div><span className={styles.eyebrow}>ORDER LOOKUP</span><h2>주문번호로 결과 찾기</h2><p>비회원 주문 결과 조회를 위한 공간입니다. 결제 테스트 중이므로 실제 주문 조회는 아직 제공하지 않습니다.</p></div><div><input value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="주문번호 입력" aria-label="주문번호"/><button onClick={()=>say("테스트 기간에는 실제 주문번호 조회를 제공하지 않습니다.")}>결과 찾기</button></div></section>
 <nav className={styles.myTabs} aria-label="마이페이지 이용 메뉴">
 <button className={myTab==="results"?styles.tabSelected:""} onClick={()=>setMyTab("results")}>내 풀이</button>
 <button className={myTab==="tickets"?styles.tabSelected:""} onClick={()=>setMyTab("tickets")}>이용권·구매내역</button>
 <button className={myTab==="gifts"?styles.tabSelected:""} onClick={()=>setMyTab("gifts")}>선물함</button>
 <button className={myTab==="reviews"?styles.tabSelected:""} onClick={()=>setMyTab("reviews")}>내 후기</button></nav>
 {myTab==="results"&&<section className={styles.myContent}><h2>내 운세 결과</h2>{owned.length?<div className={styles.myResultGrid}>{owned.map(id=>{const p=P.find(x=>x.id===id);return p&&<button key={id} onClick={()=>{setPid(id);setChapter(0);nav("full",id)}}><div className={styles.myResultArt}><ShopArt id={id}/></div><div><strong>{p.name}</strong><small>결제 없이 열어본 테스트 본편</small><span>다시 보기 <ArrowRight size={14}/></span></div></button>})}</div>:<div className={styles.myEmpty}><BookOpen size={35}/><h3>아직 저장된 테스트 풀이가 없습니다.</h3><p>관심 있는 상품에서 무료 체험을 시작해 보세요.</p><button className={styles.outlineButton} onClick={()=>section("all")}>운세 둘러보기 <ArrowRight size={15}/></button></div>}</section>}
 {myTab==="tickets"&&<section className={styles.myContent}><h2>내 이용권·구매내역</h2><p className={styles.demoNote}>이 화면은 테스트 모드입니다. 실제 결제나 구매 내역은 발생하지 않습니다.</p>{owned.length?<div className={styles.myResultGrid}>{owned.map(id=>{const p=P.find(x=>x.id===id);return p&&<div key={id} className={styles.ticket}><Check size={19}/><div><strong>{p.name}</strong><small>테스트 이용권 · 결제 0원 · 언제든 다시 열람</small></div></div>})}</div>:<div className={styles.myEmpty}><ShoppingBag size={35}/><h3>테스트 이용권이 없습니다.</h3><p>상품 상세 화면의 ‘무료로 먼저 보기’에서 시작할 수 있습니다.</p></div>}<button className={styles.outlineButton} onClick={()=>{setBundleSize(3);nav("bundles")}}>패키지 상품 구경하기</button></section>}
 {myTab==="gifts"&&<section className={styles.myContent}><h2>선물함</h2><div className={styles.myEmpty}><Gift size={34}/><h3>아직 선물 내역이 없습니다.</h3><p>선물하기에서는 상대가 직접 사주 정보를 입력하는 상품을 고를 수 있습니다.</p><button className={styles.goldButton} onClick={()=>nav("gift")}>선물하기 화면 열기 <ArrowRight size={15}/></button></div></section>}
 {myTab==="reviews"&&<section className={styles.myContent}><h2>내 후기</h2><div className={styles.reviewEditor}><p>이 기기에만 남는 시연용 후기입니다. 공개되거나 실제 구매자 평점에 반영되지 않습니다.</p><textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder="어떤 점이 재미있었나요?"/><button className={styles.outlineButton} onClick={submitReview}>테스트 후기 남기기</button>{reviews.map((t,i)=><blockquote key={i}>“{t}” <small>이 기기에만 저장된 후기</small></blockquote>)}</div></section>}
 <section className={styles.myHelp}><h2>이용 안내</h2><div className={styles.faq}>{faq.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={16}/></summary><p>{a}</p></details>)}</div></section>
 </main>}
 {page==="bundle"&&<main className={styles.content}><div className={styles.bundleHero}><span className={styles.eyebrow}>FORTUNE PACKAGE</span><h1>운·돈 BIG {bundleSize}</h1><p>다양한 운세를 한 번에 보고 싶을 때</p><div className={styles.bundleChoice}><button className={bundleSize===3?styles.tabSelected:""} onClick={()=>setBundleSize(3)}>BIG 3</button><button className={bundleSize===5?styles.tabSelected:""} onClick={()=>setBundleSize(5)}>BIG 5</button></div></div><div className={styles.bundleContents}>{bundleIds.map(id=>{const p=P.find(x=>x.id===id)!;return <div key={id}><div className={styles.bundleThumb}><ShopArt id={id}/></div><h3>{p.name}</h3><p>{p.desc}</p></div>})}</div><div className={styles.checkoutBox}><div><span className={styles.eyebrow}>BUNDLE TEST</span><h2>{bundleSize}개 상품 본편 열기</h2><p>현재는 실제 결제 없이 시연용 상품 이용권만 이 기기에 등록합니다.</p></div><div><small>시안 가격 · 판매가 미확정</small><strong>{won(bundleSize===3?49800:74800)}</strong><button className={styles.goldButton} onClick={unlockBundle}>테스트 패키지 열람 <ArrowRight size={16}/></button><p>실제 카드결제 없음</p></div></div></main>}
 {page==="gift"&&<main className={styles.content}><div className={styles.giftHero}><Gift size={52}/><span className={styles.eyebrow}>FORTUNE GIFT</span><h1>좋은 이야기를 선물하세요</h1><p>상품을 고르고 마음을 담은 메시지를 작성해 보세요. 실제 결제나 메시지 발송은 하지 않습니다.</p></div>
 <div className={styles.giftStepper}><span>1 상품 선택</span><span>2 메시지 작성</span><span>3 선물 내용 확인</span></div>
 <div className={styles.giftDesign}><div className={styles.giftForm}>
 <label>선물할 상품<select value={giftText} onChange={e=>{setGiftText(e.target.value);setGiftPreview(false)}}><option value="">상품을 골라주세요</option>{P.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
 <label>받는 분에게 전할 한마디<textarea value={giftMessage} onChange={e=>{setGiftMessage(e.target.value);setGiftPreview(false)}} placeholder="생일 축하해! 네가 궁금해하던 운세를 선물할게."/></label>
 <button className={styles.goldButton} onClick={()=>giftText?setGiftPreview(true):say("선물할 상품을 먼저 선택해 주세요")}>선물 미리보기 <ArrowRight size={16}/></button></div>
 <div className={styles.giftPreview}><div className={styles.giftPreviewArt}>{giftText?<ShopArt id={giftText}/>:<Gift size={64}/>}</div><span className={styles.eyebrow}>GIFT FOR YOU</span><h2>{giftText?P.find(p=>p.id===giftText)?.name:"선물할 운세를 선택해 주세요"}</h2><p>{giftMessage||"소중한 마음을 전하는 메시지가 표시됩니다."}</p>
 {giftPreview&&<div className={styles.demoNote}>선물 미리보기 완료 · 실제 구매 및 전달은 연결되지 않았습니다.</div>}
 <button className={styles.outlineButton} onClick={()=>giftText?productOpen(giftText):say("상품을 선택해 주세요")}>상품 내용 살펴보기 <ArrowRight size={15}/></button></div></div>
 </main>}
 <footer className={styles.footer}><div><strong>운·돈</strong><p>사주 · 궁합 · 손금 · 타로 · 오늘의 운세</p><small>상품 구성·유료 열람 테스트용 시안입니다. 실결제·AI 원고 생성·실제 구매자 리뷰는 연결되지 않았습니다.</small></div><div><button onClick={()=>section("all")}>전체 상품</button><button onClick={()=>section("reviews")}>후기·FAQ</button><button onClick={()=>section("bundles")}>패키지</button><button onClick={()=>nav("gift")}>선물하기</button><button onClick={()=>nav("my")}>내 결과</button><a href="/diagnosis">기존 사주 서비스</a><a href="/management">기존 이용자 관리</a></div></footer>
 <nav className={styles.mobileBottom} aria-label="모바일 빠른 메뉴"><button onClick={()=>nav("home")}><BookOpen/> 홈</button><button onClick={()=>section("popular")}><TrendingUp/> 인기</button><button onClick={()=>section("all")}><ShoppingBag/> 상품</button><button onClick={()=>nav("today")}><Moon/> 무료</button><button onClick={()=>nav("my")}><UserRound/> 마이</button></nav>
 {toast&&<div className={styles.toast} role="status">{toast}</div>}
 </div>;
}