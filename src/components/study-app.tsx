'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,Compass,Gift,Grid2X2,Heart,Home,Menu,Search,Star,TrendingUp,UserRound,X} from 'lucide-react';
import type {ProductId,ProductReport} from '@/lib/r37/catalog';
import type {IntakeResult} from '@/lib/r37/intake';
import type {AccessReceipt} from '@/lib/r37/report-access';
import {browserKey,savedReadings,saveReading,type SavedReading} from '@/lib/r37/browser-store';
import {intakeRequest} from '@/lib/r37/intake';
import StudyChat from './study-chat';
import StudyReader from './study-reader';
import {offerings,halls,relationOfferings,labelOf,validProduct,type ShopProduct} from './study-products';

type Mode='home'|'list'|'detail'|'chat'|'reader'|'my';
const curated=['life','year','love','wealth','compatibility','reunion','job','business'] as const;
const latest=['year','love','job','business','reunion','compatibility','wealth','life'] as const;
const questions=[{q:'지금 내 삶의 방향이 궁금할 때',ids:['life','year']},{q:'인연과 마음이 복잡할 때',ids:['love','reunion','compatibility']},{q:'돈과 일의 선택 앞에 섰을 때',ids:['wealth','job','business']},{q:'가까운 사람과의 관계가 궁금할 때',ids:['compatibility','marriage']}];
const findProducts=(ids:readonly string[])=>ids.map(id=>offerings.find(o=>o.id===id)).filter((o):o is ShopProduct=>Boolean(o));
function Header({reading=false,chat=false}:{reading?:boolean;chat?:boolean}){
 const [opened,setOpened]=useState(false);
 const links=[['/explore/popular','인기차트'],['/explore/new','신상'],['/explore/freeHub','무료 운세'],['/explore/scenario','고민별 탐색'],['/explore/all','전체 상품'],['/explore/relations','궁합'],['/explore/my','내 서재']];
 return <header className="ud-header">
 {chat||reading?<Link className="ud-header-back" aria-label="홈으로 돌아가기" href="/"><ArrowLeft size={23}/></Link>:<button type="button" className="ud-menu-toggle" onClick={()=>setOpened(v=>!v)} aria-label="메뉴" aria-expanded={opened}>{opened?<X size={23}/>:<Menu size={23}/>}</button>}
 {chat||reading?<span className="ud-context">{chat?'운·돈 상담':'운세 풀이'}</span>:<Link href="/" className="ud-brand" aria-label="운·돈 홈페이지">운·돈</Link>}
 {chat||reading?<button type="button" className="ud-menu-toggle" aria-label="메뉴 열기" aria-expanded={opened} onClick={()=>setOpened(v=>!v)}><Menu size={22}/></button>:<Link className="ud-header-profile" href="/explore/my" aria-label="나의 서재"><UserRound size={20}/></Link>}
 {opened&&<nav className="ud-menu-pop" aria-label="전체 메뉴"><Link href="/" onClick={()=>setOpened(false)}>홈</Link>{links.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpened(false)}>{label}</Link>)}</nav>}
 </header>;
}
function Footer(){return <nav className="ud-footer" aria-label="하단 서비스 메뉴"><Link href="/"><Home size={21}/>홈</Link><Link href="/explore/popular"><TrendingUp size={21}/>인기</Link><Link href="/explore/all"><Compass size={21}/>탐색</Link><Link href="/explore/my"><UserRound size={21}/>내 서재</Link></nav>}
function Tile({item,index}:{item:ShopProduct;index?:number}){return <Link href={`/explore/detail?item=${item.id}`} className="ud-offer">{index!==undefined&&<b className="ud-rank-index">{index+1}</b>}<span className={`ud-offer-figure ud-cover-${item.art}`}/><span>{item.name}</span><small>{item.intro}</small></Link>}
function ExploreNav(){return <nav className="ud-explore-links" aria-label="운세 탐색"><Link href="/explore/popular"><TrendingUp size={18}/>인기차트</Link><Link href="/explore/new"><Star size={18}/>새로운 이야기</Link><Link href="/explore/freeHub"><CalendarDays size={18}/>무료 운세</Link><Link href="/explore/scenario"><Search size={18}/>고민별 찾기</Link></nav>}
function HomeScreen(){return <><Header/><div className="ud-home"><section className="ud-home-hero"><div className="ud-home-illustration"/><div className="ud-home-shadow"/><div className="ud-home-title"><span>운과 돈, 삶의 흐름을 읽는<br/>프리미엄 운세 상담</span><h1>운·돈</h1><p>지금, 당신의 운과 재물을<br/>함께 짚어드립니다.</p><Link href="/explore/input?item=life" className="ud-hero-btn">상담 시작하기 <ArrowRight size={18}/></Link></div></section>
 <nav className="ud-hero-shortcuts" aria-label="빠른 탐색"><Link href="/explore/popular"><TrendingUp size={22}/><span>인기차트</span></Link><Link href="/explore/freeHub"><Gift size={22}/><span>무료 운세</span></Link><Link href="/explore/new"><Star size={22}/><span>신상</span></Link><Link href="/explore/scenario"><Compass size={22}/><span>고민별 탐색</span></Link><Link href="/explore/all"><Grid2X2 size={22}/><span>전체 상품</span></Link></nav>
 <section className="ud-featured"><div className="ud-section-title"><span>운·돈이 고른 첫 이야기</span><h2>지금 가장 많이 찾는 상담</h2></div><div className="ud-tiles">{findProducts(['life','year','love','wealth']).map(o=><Tile key={o.id} item={o}/>)}</div><Link className="ud-section-more" href="/explore/popular">인기차트 살펴보기 <ArrowRight size={16}/></Link></section>
 <section className="ud-home-evening"><div><span>하루의 끝, 오늘의 한 장</span><h2>오늘의 운세를 읽어보세요</h2><p>오늘과 내일의 흐름을 가볍게 살펴보는 무료 운세입니다.</p><Link href="/explore/freeHub">무료 운세 보러 가기 <ArrowRight size={16}/></Link></div></section>
 <section className="ud-all-halls"><div className="ud-section-title"><span>관심 있는 주제부터</span><h2>다섯 가지 이야기 공간</h2></div><div className="ud-halls">{halls.map(h=><Link key={h.id} href={`/explore/${h.id}`}><b>{h.icon}</b><span>{h.name}</span><small>{h.intro}</small></Link>)}</div></section>
 <Link className="ud-intro-banner" href="/explore/scenario"><span>어떤 상담부터 시작할지 고민되시나요?<br/><strong>내 고민에 맞는 이야기 찾기</strong></span><ArrowRight size={24}/></Link>
 <section className="ud-home-bottom"><div><span>오래 읽을수록 남는 이야기</span><h2>말 한마디가 아니라,<br/>나의 삶을 한 권의 이야기로.</h2><p>처음엔 무료로 펼쳐보고, 원하신다면 같은 원고의 다음 장을 이어 읽으세요.</p></div><Link href="/explore/all">모든 상담 보기 <ArrowRight size={18}/></Link></section>
 </div><Footer/></>}
const navMap:Record<string,{title:string;intro:string}>={
 all:{title:'모든 상담',intro:'운·돈의 사주·타로·궁합 이야기를 살펴보세요.'},
 popular:{title:'인기차트',intro:'많이 찾을 법한 관심 주제를 둘러보세요. 실제 이용 통계가 아닌 운영 추천 순서입니다.'},
 new:{title:'새로운 이야기',intro:'최근에 관심을 가질 만한 주제별 상담을 모았습니다. 신상품 출시·판매 통계는 아닙니다.'},
 freeHub:{title:'무료 운세',intro:'부담 없이 오늘을 읽고, 나만의 이야기를 시작해 보세요.'},
 scenario:{title:'고민별 이야기 찾기',intro:'현재 마음에 있는 질문에서 시작해 보세요.'},
 relations:{title:'사랑과 관계',intro:'연인·부부·친구·가족 등 관계에 따라 다른 풀이를 만나보세요.'},
 bundles:{title:'묶음 이야기',intro:'여러 상품의 흐름을 한눈에 살펴보세요. 현재는 실제 묶음 결제를 제공하지 않습니다.'},
 gift:{title:'운세 선물하기',intro:'선물 서비스는 기획 중입니다. 실제 결제와 발송은 제공하지 않습니다.'},
 reviews:{title:'이야기 후기',intro:'실제 고객 후기가 아직 확인되지 않아 임의의 후기는 표시하지 않습니다.'},
};
function CatalogScreen({section}:{section:string}){
 const normalized=section==='loveHub'||section==='paired'?'relations':section==='money'?'career':section==='special'?'palm':section==='tarotHub'?'tarot':section==='today'?'freeHub':section==='freeHub'||section==='popular'||section==='new'||section==='scenario'||section==='gift'||section==='bundles'||section==='bundle'||section==='reviews'?section:section;
 const hall=halls.find(h=>h.id===normalized);const intro=navMap[normalized]??{title:hall?.name??'모든 상담',intro:hall?.intro??'운·돈의 이야기에서 원하는 상담을 찾아보세요.'};
 const [term,setTerm]=useState('');
 const displayed=normalized==='popular'?findProducts(curated):normalized==='new'?findProducts(latest):normalized==='freeHub'?findProducts(['life','year']):normalized==='all'||normalized==='reviews'||normalized==='gift'||normalized==='scenario'||normalized==='bundles'||normalized==='bundle'?offerings:offerings.filter(o=>o.hall===normalized);
 const filtered=displayed.filter(o=>(o.name+' '+o.intro+' '+o.tag).includes(term.trim()));
 return <><Header/><main className="ud-catalog ud-browser"><div className="ud-browser-head"><Link href="/" className="ud-go-back"><ArrowLeft size={16}/> 홈</Link><span className="ud-quiet-kicker">운·돈 · 사주 이야기 서재</span><h1>{intro.title}</h1><p>{intro.intro}</p></div><ExploreNav/>
 {normalized==='freeHub'&&<div className="ud-free-actions"><Link href="/explore/input?item=today"><span>☀ 오늘</span><b>오늘의 운세</b><small>오늘의 흐름 읽기</small><ArrowRight size={18}/></Link><Link href="/explore/input?item=tomorrow"><span>☾ 내일</span><b>내일의 운세</b><small>내일의 이야기 미리보기</small><ArrowRight size={18}/></Link><Link href="/explore/input?item=life"><span>卷 사주</span><b>전통사주 무료 미리보기</b><small>평생 심층 원고의 앞부분</small><ArrowRight size={18}/></Link></div>}
 {normalized==='scenario'&&<div className="ud-questions">{questions.map(({q,ids})=><section key={q}><h2>{q}</h2><div className="ud-question-products">{findProducts(ids).map(o=><Link href={`/explore/detail?item=${o.id}`} key={o.id}>{o.name} <ArrowRight size={15}/></Link>)}</div></section>)}</div>}
 {normalized==='relations'&&<section className="ud-relation-list"><h2>관계별 궁합, 여섯 가지</h2><div className="ud-relationship-grid">{relationOfferings.map(r=><Link href={`/explore/detail?item=${r.id}`} key={r.id}><b>{r.name}</b><small>{r.intro}</small><ArrowRight size={18}/></Link>)}</div></section>}
 {(normalized==='gift'||normalized==='reviews'||normalized==='bundles'||normalized==='bundle')&&<div className="ud-development-hint">이 기능은 아직 실제 구매·후기·선물 이력과 연결되지 않았습니다. 기존 개별 상담은 아래에서 계속 이용하실 수 있습니다.</div>}
 {normalized==='all'&&<label className="ud-search"><Search size={18}/><input placeholder="운세, 사랑, 재물, 궁합 검색" aria-label="상품 검색" value={term} onChange={e=>setTerm(e.target.value)}/></label>}
 {normalized!=='scenario'&&<section className="ud-browser-products"><h2>{normalized==='popular'?'추천 주제 목록':normalized==='new'?'새롭게 살펴볼 이야기':'상담 상품'}</h2><div className="ud-add-grid">{filtered.map((o,i)=><Tile key={o.id} item={o} index={normalized==='popular'?i:undefined}/>)}</div>{filtered.length===0&&<p>검색 결과가 없습니다.</p>}</section>}
 </main><Footer/></>;
}
function DetailScreen({product}:{product:ProductId}){const tile=offerings.find(o=>o.id===product);return <><Header/><main className="ud-detail"><Link href="/explore/all" className="ud-go-back"><ArrowLeft size={16}/> 모든 상품</Link><div className={`ud-detail-art ud-detail-${tile?.art??'year'}`}/><div className="ud-detail-details"><span className="ud-quiet-kicker">운·돈 · 서재 상담</span><h1>{labelOf(product)}</h1><p>{tile?.intro??'두 사람의 마음과 관계를 함께 살펴봅니다.'}. 안내인과 대화를 나눈 뒤, 해당 주제로 작성된 사주 원고를 만나보세요.</p><Link className="ud-gold-btn" href={`/explore/input?item=${product}`}>안내인과 상담 시작하기 <ArrowRight size={18}/></Link></div></main><Footer/></>}
export default function StudyApp({section='home',item='life'}:{section?:string;item?:string}){
 const router=useRouter();const product:ProductId=validProduct(item)?item:'life';
 const [mode,setMode]=useState<Mode>(section==='home'?'home':section==='input'?'chat':section==='detail'?'detail':section==='my'?'my':section==='free'||section==='full'?'reader':'list');
 const [report,setReport]=useState<ProductReport|null>(null),[receipt,setReceipt]=useState<AccessReceipt|undefined>(undefined),[savedKey,setSavedKey]=useState(''),[unlocked,setUnlocked]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[unlockBusy,setUnlockBusy]=useState(false),[unlockError,setUnlockError]=useState('');
 const [saved,setSaved]=useState<SavedReading[]>([]);
 useEffect(()=>{const records=savedReadings();setSaved(records);if(section==='free'||section==='full'){const match=records.find(x=>x.report.product===product);if(match){setReport(match.report);setReceipt(match.access);setSavedKey(match.requestKey);setUnlocked(Boolean(match.unlocked));}}},[section,product]);
 const exit=()=>{router.push(`/explore/detail?item=${product}`)};
 const complete=async(form:IntakeResult)=>{setMode('reader');setBusy(true);setError('');setReport(null);setUnlocked(false);try{
  const req=intakeRequest(product,form);const key=await browserKey(req);setSavedKey(key);
  const existing=savedReadings().find(x=>x.requestKey===key);if(existing){setReport(existing.report);setReceipt(existing.access);setUnlocked(Boolean(existing.unlocked));return;}
  const result=await fetch('/api/shop/reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(req)});
  const payload=await result.json();if(!result.ok)throw new Error(payload.error??'풀이 작성 요청에 실패했습니다.');
  const r=(payload.report??payload.result?.report) as ProductReport|undefined;
  if(!r||!Array.isArray(r.manuscript?.paragraphs))throw new Error('받은 원고를 확인할 수 없습니다.');
  const access=(payload.access??payload.receipt??payload.result?.access) as AccessReceipt|undefined;
  setReport(r);setReceipt(access);saveReading({report:r,requestKey:key,unlocked:false,access});setSaved(savedReadings());
 }catch(e){setError(e instanceof Error?e.message:'풀이를 준비하지 못했습니다.')}finally{setBusy(false)}};
 const unlock=async()=>{if(!report||!receipt?.sealed)return;setUnlockBusy(true);setUnlockError('');try{
  const response=await fetch('/api/shop/reading/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test-unlock',sealed:receipt.sealed})});
  const data=await response.json();if(!response.ok||!data.report||!data.grant)throw new Error(data.error??'열람 권한 확인에 실패했습니다.');
  const access={...receipt,grant:data.grant};setReport(data.report);setReceipt(access);setUnlocked(true);
  saveReading({report:data.report,requestKey:savedKey,unlocked:true,access});setSaved(savedReadings());
 }catch(e){setUnlockError(e instanceof Error?e.message:'본편 열람에 실패했습니다.')}finally{setUnlockBusy(false)}};
 if(mode==='home')return <div className="ud-shell"><HomeScreen/></div>;
 if(mode==='list')return <div className="ud-shell"><CatalogScreen section={section}/></div>;
 if(mode==='detail')return <div className="ud-shell"><DetailScreen product={product}/></div>;
 if(mode==='chat')return <div className="ud-shell"><Header chat/><StudyChat product={product} onClose={exit} onComplete={complete}/></div>;
 if(mode==='my')return <div className="ud-shell"><Header/><main className="ud-my"><h1>내 서재</h1><p>이 브라우저에 저장된 사주 원고를 이어 읽을 수 있습니다.</p>{saved.length?saved.map(x=><button key={x.report.id} type="button" onClick={()=>{setReport(x.report);setReceipt(x.access);setSavedKey(x.requestKey);setUnlocked(Boolean(x.unlocked));setMode('reader')}}><BookOpen size={19}/>{labelOf(x.report.product as ProductId)}<ArrowRight size={16}/></button>):<p>아직 저장된 원고가 없습니다.</p>}</main><Footer/></div>;
 return <div className="ud-shell">{busy?<><Header reading/><main className="ud-state"><div>✧</div><h1>서재에서 이야기를 준비하고 있습니다</h1><p>명식 계산과 원고 작성을 진행 중입니다.</p></main></>:error?<><Header reading/><main className="ud-state"><h1>이야기를 준비하지 못했습니다</h1><p role="alert">{error}</p><button type="button" onClick={()=>setMode('chat')}>입력 화면으로 돌아가기</button></main></>:report?<><Header reading/><StudyReader key={report.id} report={report} receipt={receipt} unlocked={unlocked} onUnlock={unlock} onExit={exit} busy={unlockBusy} error={unlockError}/></>:<><Header reading/><main className="ud-state"><h1>저장된 풀이가 없습니다</h1><Link href={`/explore/input?item=${product}`}>안내인과 상담 시작하기</Link></main></>}</div>;
}
