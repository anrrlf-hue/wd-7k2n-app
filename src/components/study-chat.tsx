'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CalendarDays,CheckCircle2,Clock,MessageCircle} from 'lucide-react';
import type {IntakeResult} from '@/lib/r37/intake';
import type {ProductId} from '@/lib/r37/catalog';
import {labelOf} from './study-products';

type InputKey=Exclude<keyof IntakeResult,'tarotDraw'>;
type Step={key:InputKey;question:string;kind:'text'|'date'|'pick'|'hour'|'note'|'card'|'unsupported';choices?:string[];optional?:boolean;hint?:string};
const empty:IntakeResult={name:'',gender:'',birth:'',calendar:'양력',hour:'',issue:'',partnerChoice:'',partnerName:'',partnerBirth:'',partnerGender:'모름',partnerCalendar:'양력',year:'2027',partnerHour:'',leftPalm:'',rightPalm:'',tarotQuestion:'',tarotCard:null};
const hours=['태어난 시간 모름','자시 23~01시','축시 01~03시','인시 03~05시','묘시 05~07시','진시 07~09시','사시 09~11시','오시 11~13시','미시 13~15시','신시 15~17시','유시 17~19시','술시 19~21시','해시 21~23시'];
const paired=new Set<ProductId>(['compatibility','spouse','friend','partner','coworker','family']);
const pick=(key:InputKey,question:string,choices:string[],optional=false):Step=>({key,question,choices,kind:'pick',optional});
function buildSteps(id:ProductId,v:IntakeResult):Step[]{
 if(id==='palm'||id==='fusion')return [{key:'leftPalm',question:'두 손의 모습을 먼저 살펴볼까요?',kind:'unsupported',hint:'정통 손금의 실제 양손 판독은 검증 중입니다. 현재 새로운 결과 생성은 제공하지 않습니다.'}];
 if(id==='tarot')return [{key:'tarotQuestion',question:'어떤 이야기가 가장 궁금하세요?',kind:'text'},{key:'tarotCard',question:'마음이 끌리는 카드를 한 장 골라주세요.',kind:'card'}];
 const steps:Step[]=[
 {key:'name',question:'어서 오세요. 어떻게 불러드릴까요?',kind:'text'},
 pick('gender','어떤 성별로 명식을 살펴볼까요?',['여성','남성']),
 {key:'birth',question:'이야기가 시작된 날, 생일을 알려주세요.',kind:'date'},
 pick('calendar','알려주신 생일은 양력인가요, 음력인가요?',['양력','음력','음력 윤달']),
 {key:'hour',question:'태어나신 시간도 알고 계세요?',kind:'hour',hint:'모르셔도 괜찮습니다. 모름을 선택하세요.'}
 ];
 if(id==='year')steps.push(pick('year','어느 해의 신년운세가 궁금하신가요?',['2026','2027','2028','2029','2030']));
 if(id==='love')steps.push(pick('partnerChoice','마음에 두신 분이 있으신가요?',['있어요','없어요','건너뛰기'],true));
 if(paired.has(id)||id==='love'&&v.partnerChoice==='있어요'){
  steps.push({key:'partnerName',question:'그분은 어떻게 불러드릴까요?',kind:'text',optional:true});
  steps.push({key:'partnerBirth',question:'그분의 생일을 알려주세요.',kind:'date',optional:!paired.has(id)});
  if(paired.has(id)||v.partnerBirth){
   steps.push(pick('partnerGender','그분의 성별은 어떻게 되나요?',['여성','남성','모름'],id==='love'));
   steps.push(pick('partnerCalendar','그분의 생일은 양력인가요?',['양력','음력','음력 윤달'],id==='love'));
   steps.push({key:'partnerHour',question:'그분의 출생 시간도 아시나요?',kind:'hour',optional:true});
  }
 }
 steps.push({key:'issue',question:'마지막으로, 지금 가장 궁금한 이야기를 들려주세요.',kind:'note',optional:true,hint:'특별한 고민이 없다면 전반적인 흐름을 보셔도 됩니다.'});
 return steps;
}
/** Accept YYYYMMDD, YYYY-MM-DD, YYYY.MM.DD, or YYYY/MM/DD, then send strict ISO dates to the existing calculation API. */
function normalizedBirth(raw:string):string|null {
 const digits=raw.replace(/\D/g,'');
 if(!/^\d{8}$/.test(digits))return null;
 const year=Number(digits.slice(0,4)),month=Number(digits.slice(4,6)),day=Number(digits.slice(6,8));
 if(year<1901||year>2048||month<1||month>12||day<1||day>31)return null;
 const dt=new Date(Date.UTC(year,month-1,day));
 if(dt.getUTCFullYear()!==year||dt.getUTCMonth()+1!==month||dt.getUTCDate()!==day)return null;
 return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
}
type Draw={drawId:string;cards:{id:number;reversed:boolean;position:string}[];signature:string};
export default function StudyChat({product,onClose,onComplete}:{product:ProductId;onClose:()=>void;onComplete:(v:IntakeResult)=>void}){
 const [draft,setDraft]=useState<IntakeResult>(empty),[step,setStep]=useState(0),[draw,setDraw]=useState<Draw|null>(null),[error,setError]=useState('');
 const messages=useRef<HTMLDivElement>(null);
 const nearBottom=useRef(true);
 const [showLatest,setShowLatest]=useState(false);
 const onConversationScroll=()=>{const el=messages.current;if(!el)return;nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<68;setShowLatest(!nearBottom.current);};
 const jumpLatest=()=>{const el=messages.current;if(!el)return;nearBottom.current=true;el.scrollTo({top:el.scrollHeight,behavior:'smooth'});setShowLatest(false);};
 const stages=useMemo(()=>buildSteps(product,draft),[product,draft.partnerBirth,draft.partnerChoice]);
 const active=stages[Math.min(step,stages.length-1)];
 const value=draft[active.key];
 const disabledProduct=active.kind==='unsupported';
 const isValid=active.kind==='card'?draft.tarotCard!==null&&!!draw:active.kind==='date'?(active.optional&&!String(value??'').trim()||Boolean(normalizedBirth(String(value??'')))):!disabledProduct&&(active.optional||String(value??'').trim()!=='');
 const put=(key:InputKey,v:string|number|null)=>setDraft(p=>({...p,[key]:v}));
 const back=()=>step===0?onClose():setStep(x=>x-1);
 const next=()=>{
  if(!isValid)return;
  const typedDate=active.kind==='date'&&String(value??'').trim()?normalizedBirth(String(value)):null;
  const updated=typedDate?{...draft,[active.key]:typedDate}:draft;
  if(typedDate)setDraft(updated);
  if(step+1===stages.length){onComplete({...updated,tarotDraw:draw??undefined});}
  else setStep(x=>x+1);
 };
 useEffect(()=>{if(!messages.current||!nearBottom.current)return;messages.current.scrollTo({top:messages.current.scrollHeight,behavior:'smooth'});},[step]);
 useEffect(()=>{if(product!=='tarot')return;let alive=true;fetch('/api/shop/tarot',{method:'POST',headers:{'content-type':'application/json'}}).then(r=>r.json()).then(x=>{if(!x.drawId||!Array.isArray(x.cards)||x.cards.length!==3||!x.signature)throw Error('DRAW_FAILED');if(alive)setDraw(x);}).catch(()=>{if(alive)setError('카드를 준비하지 못했습니다. 다시 시도해 주세요.');});return()=>{alive=false;};},[product]);
 const answered=(s:Step)=>{const val=draft[s.key];return val===null||val===''?'건너뛰었어요':s.key==='tarotCard'?`${Number(val)+1}번 카드`:String(val);};
 return <main className="ud-chat" aria-label={`${labelOf(product)} 안내 대화`}>
  <div className="ud-chat-background" role="img" aria-label="중후한 서재에서 마주 앉은 여성 안내인"/>
  <div className="ud-chat-overlay"/>
  <div className="ud-chat-progress"><button type="button" onClick={back} aria-label="이전 질문"><ArrowLeft size={22}/></button><div className="ud-progress-line" aria-label={`${step+1} / ${stages.length} 단계`}>{stages.map((item,i)=><span key={item.key} className={i<=step?'active':''}/>)}</div></div>
  <div className="ud-chat-space"><div className="ud-chat-history" ref={messages} onScroll={onConversationScroll} role="log" aria-live="polite">
   {step===0&&<div className="ud-chat-exchange ud-chat-welcome"><p className="ud-guide-message">안녕하세요. 운·돈의 상담가입니다. 편하게 말씀 나눠요.</p><p className="ud-guide-message">오늘은 어떤 이야기가 궁금하세요?</p></div>}
   {stages.slice(0,step).map((s,i)=><div className="ud-chat-exchange" key={s.key+'-'+i}><p className="ud-guide-message">{s.question}</p><p className="ud-customer-message">{answered(s)}</p></div>)}
   <div className="ud-chat-exchange"><p className="ud-guide-message ud-current-message" key={active.key}>{draft.name&&active.key!=='name'?`${draft.name}님, ${active.question}`:active.question}</p></div>
  </div>
  {showLatest&&<button type="button" className="ud-chat-jump" onClick={jumpLatest}>최근 대화로 ↓</button>}
  <div className="ud-answer-panel">{active.hint&&<p className="ud-hint">{active.hint}</p>}
   {active.kind==='text'&&<input autoFocus aria-label={active.question} placeholder="답변을 입력해 주세요" value={String(value??'')} onChange={e=>put(active.key,e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();next();}}}/>}
   {active.kind==='date'&&<label className="ud-date-field"><CalendarDays size={18}/><input aria-label={active.question} type="text" inputMode="numeric" autoComplete="off" placeholder="예: 19800510 (8자리 직접 입력)" maxLength={10} value={String(value??'')} onChange={e=>put(active.key,e.target.value.replace(/[^\d.\/-]/g,''))} onBlur={()=>{const iso=normalizedBirth(String(value??''));if(iso)put(active.key,iso)}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();next();}}}/></label>}
   {active.kind==='pick'&&<div className="ud-answer-choices">{active.choices?.map(o=><button type="button" aria-pressed={value===o} key={o} className={value===o?'selected':''} onClick={()=>put(active.key,o)}>{o}</button>)}</div>}
   {active.kind==='hour'&&<div className="ud-time-choices">{hours.map(o=><button type="button" aria-pressed={value===o} key={o} className={value===o?'selected':''} onClick={()=>put(active.key,o)}><Clock size={13}/>{o}</button>)}</div>}
   {active.kind==='note'&&<><textarea rows={3} maxLength={2000} aria-label={active.question} placeholder="예: 요즘 앞으로의 진로가 궁금합니다." value={String(value??'')} onChange={e=>put(active.key,e.target.value)}/><button type="button" className="ud-general-choice" onClick={()=>put('issue','전반적인 사주를 읽어주세요')}>전반적인 흐름을 살펴봐 주세요</button></>}
   {active.kind==='card'&&<div className="ud-answer-choices">{[0,1,2].map(i=><button type="button" key={i} disabled={!draw} className={draft.tarotCard===i?'selected':''} onClick={()=>put('tarotCard',i)}>✧ {i+1}번 카드</button>)}{error&&<p role="alert">{error}</p>}</div>}
   {active.kind==='unsupported'&&<p className="ud-unavailable">실제 사진 관측이 검증된 후 제공할 예정입니다.</p>}
   <button type="button" className="ud-next" disabled={!isValid} onClick={next}>{disabledProduct?'검증 중인 상품입니다':step===stages.length-1?'나의 풀이 시작하기':'다음 이야기로'}<ArrowRight size={18}/></button>
  </div></div>
 </main>;
}
