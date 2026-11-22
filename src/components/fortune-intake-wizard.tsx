"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./fortune-intake-wizard.module.css";

type Key = "name"|"gender"|"birth"|"calendar"|"hour"|"issue"|"partnerChoice"|"partnerName"|"partnerBirth"|"partnerGender"|"partnerHour"|"leftPalm"|"rightPalm"|"tarotQuestion"|"tarotCard";
type Draft = Record<Exclude<Key,"tarotCard">,string> & {tarotCard:number|null};
type Step = {key:Key; question:string; hint?:string; kind:"text"|"date"|"options"|"time"|"file"|"card"; options?:string[]; optional?:boolean; placeholder?:string};
export type IntakeResult = {tarotCard:number|null;tarotQuestion:string;name:string;birth:string;gender:string;calendar:string;hour:string;partnerChoice:string;partnerBirth:string};
const empty:Draft={name:"",gender:"",birth:"",calendar:"양력",hour:"",issue:"",partnerChoice:"",partnerName:"",partnerBirth:"",partnerGender:"",partnerHour:"",leftPalm:"",rightPalm:"",tarotQuestion:"",tarotCard:null};
const timeOptions=["태어난 시간 모름","자시 23~01시","축시 01~03시","인시 03~05시","묘시 05~07시","진시 07~09시","사시 09~11시","오시 11~13시","미시 13~15시","신시 15~17시","유시 17~19시","술시 19~21시","해시 21~23시"];
const option=(key:Key,question:string,options:string[],hint?:string):Step=>({key,question,kind:"options",options,hint});
function getSteps(id:string,name:string,d:Draft):Step[]{
  const n=name==="평생 심층사주"?"사주":name;
  if(id==="tarot")return [
    {key:"tarotQuestion",question:"지금 어떤 게 가장 궁금하세요?",hint:"마음에 걸리는 선택이나 관계를 자유롭게 적어주세요.",kind:"text",placeholder:"예: 이직을 준비해도 괜찮을까요?"},
    {key:"tarotCard",question:"마음이 가는 카드를 한 장 골라보세요.",hint:"선택한 카드로 "+n+" 미리보기를 시작합니다.",kind:"card"}
  ];
  const steps:Step[]=[
    {key:"name",question:"어떻게 불러드릴까요?",hint:"이름 대신 편한 별명을 써도 좋습니다.",kind:"text",placeholder:"이름 또는 별명",optional:true},
    option("gender","성별을 알려주시겠어요?",["여성","남성"]),
    {key:"birth",question:"생년월일은 언제인가요?",hint:"태어난 날짜를 선택해 주세요.",kind:"date"},
    option("calendar","생일은 양력인가요, 음력인가요?",["양력","음력","음력 윤달"]),
    {key:"hour",question:"태어난 시간도 알고 계세요?",hint:"정확한 분까지 몰라도 괜찮아요. 대략적인 시간대를 골라주세요.",kind:"time",optional:true}
  ];
  if(id==="love"){
    steps.push({key:"issue",question:"요즘 어떤 연애 고민이 가장 궁금하세요?",kind:"text",placeholder:"예: 새로운 인연이 언제 찾아올까요?",optional:true});
    steps.push(option("partnerChoice","지금 마음에 두고 있는 사람이 있나요?",["있어요","없어요","건너뛰기"],"상대방 정보는 선택 사항입니다. 혼자 보는 연애운도 가능합니다."));
    if(d.partnerChoice==="있어요"){
      steps.push({key:"partnerName",question:"그분을 뭐라고 부를까요?",kind:"text",placeholder:"별명만 입력하셔도 됩니다",optional:true});
      steps.push({key:"partnerBirth",question:"그분의 생일도 알고 계세요?",kind:"date",optional:true,hint:"모르면 건너뛰셔도 됩니다."});
    }
  } else if(id==="reunion"){
    steps.push({key:"issue",question:"지금 어떤 관계가 가장 마음에 걸리나요?",kind:"text",placeholder:"예: 헤어진 뒤 연락을 해야 할까요?",optional:true});
  } else if(["wealth","job","business"].includes(id)){
    steps.push({key:"issue",question:id==="wealth"?"돈 문제 중 가장 궁금한 점은 무엇인가요?":id==="job"?"직장이나 이직에서 무엇이 가장 고민되세요?":"사업에서 어떤 선택이 가장 궁금하세요?",kind:"text",placeholder:"궁금한 점을 한 문장으로 적어주세요",optional:true});
  }
  if(["compatibility","spouse","friend","partner","coworker","family"].includes(id)){
    steps.push({key:"partnerName",question:"함께 궁합을 볼 상대를 어떻게 부를까요?",kind:"text",placeholder:"상대방 이름 또는 별명",optional:true});
    steps.push({key:"partnerBirth",question:"그분은 언제 태어나셨나요?",kind:"date"});
    steps.push(option("partnerGender","상대방의 성별은 무엇인가요?",["여성","남성","모름"]));
    steps.push({key:"partnerHour",question:"그분의 태어난 시간도 아시나요?",hint:"모르면 건너뛸 수 있습니다.",kind:"time",optional:true});
  }
  if(id==="palm"||id==="fusion"){
    steps.push({key:"leftPalm",question:"왼손 손바닥 사진을 선택해 주세요.",hint:"지금은 화면 테스트이므로 사진을 서버로 업로드하지 않습니다.",kind:"file",optional:true});
    steps.push({key:"rightPalm",question:"이제 오른손 손바닥 사진도 선택해 주세요.",hint:"사진은 이 화면에서 이름만 표시하며 저장하지 않습니다.",kind:"file",optional:true});
  }
  return steps;
}
function readable(step:Step,d:Draft):string{
  if(step.key==="tarotCard")return d.tarotCard===null?"":`카드 ${d.tarotCard+1}번`;
  const v=d[step.key];return v||"건너뛰었어요";
}
export default function FortuneIntakeWizard({id,name,onComplete,onCancel}:{
 id:string;name:string;onComplete:(result:IntakeResult)=>void;onCancel:()=>void;
}){
 const [draft,setDraft]=useState<Draft>(empty);
 const [index,setIndex]=useState(0);
 const steps=useMemo(()=>getSteps(id,name,draft),[id,name,draft]);
 const step=steps[Math.min(index,steps.length-1)];
 const value=step.key==="tarotCard"?draft.tarotCard:draft[step.key];
 const canNext=step.optional|| (step.key==="tarotCard"?draft.tarotCard!==null : !!value);
 function setValue(k:Key,v:string|number|null){setDraft(prev=>({...prev,[k]:v}));}
 function advance(){
  if(!canNext)return;
  if(index>=steps.length-1){onComplete({tarotCard:draft.tarotCard,tarotQuestion:draft.tarotQuestion,name:draft.name,birth:draft.birth,gender:draft.gender,calendar:draft.calendar,hour:draft.hour,partnerChoice:draft.partnerChoice,partnerBirth:draft.partnerBirth});return;}
  setIndex(i=>i+1);
 }
 const recent=steps.slice(Math.max(0,index-2),index);
 return <main className={styles.scene} aria-label={name+" 대화형 입력"}>
  <div className={styles.top}>
    <button onClick={onCancel} className={styles.backHome}><ArrowLeft size={17}/> 상품으로</button>
    <div className={styles.progressText}><strong>{name} 미리보기</strong><span>{Math.min(index+1,steps.length)} / {steps.length}</span></div>
    <div className={styles.progress}><div style={{width:((index+1)/steps.length*100)+"%"}}/></div>
  </div>
  <div className={styles.chat}>
   <div className={styles.intro}><span><Sparkles size={16}/> 운·돈 안내자</span><p>반가워요! {name}을 살펴볼게요. 제가 하나씩 여쭤볼 테니 편하게 대답해 주세요.</p></div>
   {recent.map((s,i)=><div key={s.key+"-"+i} className={styles.exchange}>
      <div className={styles.guideMini}><Image src="/images/undon-guide.svg" width={46} height={48} alt="운돈 안내자"/> <span>{s.question}</span></div>
      <div className={styles.yourReply}>{readable(s,draft)}</div>
   </div>)}
   <div className={styles.ask}><div className={styles.avatar}><Image src="/images/undon-guide.svg" width={102} height={110} alt="친절하게 질문하는 운돈 안내자"/></div><div className={styles.askBubble}><span className={styles.guideName}><MessageCircle size={14}/> 운·돈 안내자</span><h1>{step.question}</h1>{step.hint&&<p>{step.hint}</p>}</div></div>
   <div className={styles.answer} key={step.key}>
    {step.kind==="text"&&<input aria-label={step.question} value={value as string} autoFocus placeholder={step.placeholder} onChange={e=>setValue(step.key,e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&canNext){e.preventDefault();advance();}}}/>}
    {step.kind==="date"&&<input type="date" aria-label={step.question} value={value as string} onChange={e=>setValue(step.key,e.target.value)}/>}
    {step.kind==="options"&&<div className={styles.optionGrid}>{step.options?.map(o=><button key={o} type="button" className={value===o?styles.selected:""} onClick={()=>{setValue(step.key,o);}}>{value===o&&<Check size={15}/>} {o}</button>)}</div>}
    {step.kind==="time"&&<div className={styles.timeGrid}>{timeOptions.map(o=><button key={o} type="button" className={value===o?styles.selected:""} onClick={()=>setValue(step.key,o)}>{o}</button>)}</div>}
    {step.kind==="card"&&<div className={styles.cardGrid}>{[0,1,2].map(n=><button key={n} type="button" aria-label={n+1+"번 타로 카드 선택"} className={draft.tarotCard===n?styles.chosenCard:""} onClick={()=>setValue("tarotCard",n)}><span>✦</span><small>{n+1}번 카드</small></button>)}</div>}
    {step.kind==="file"&&<div className={styles.filePick}><label>{value?"선택됨: "+value:"여기를 눌러 사진 선택하기"}<input type="file" accept="image/*" onChange={e=>setValue(step.key,e.target.files?.[0]?.name||"")}/></label><small>현재 시연에서는 서버 업로드가 없으며 사진을 고르지 않아도 진행할 수 있습니다.</small></div>}
   </div>
   <div className={styles.actions}><button type="button" className={styles.prev} disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}><ChevronLeft size={16}/> 이전 질문</button><button type="button" disabled={!canNext} className={styles.next} onClick={advance}>{index===steps.length-1?name+" 미리보기 보기":step.optional&&!value?"건너뛰고 다음":"답변하고 다음"} <ArrowRight size={16}/></button></div>
   <button type="button" className={styles.demo} onClick={()=>onComplete({tarotCard:draft.tarotCard,tarotQuestion:draft.tarotQuestion,name:draft.name,birth:draft.birth,gender:draft.gender,calendar:draft.calendar,hour:draft.hour,partnerChoice:draft.partnerChoice,partnerBirth:draft.partnerBirth})}>입력 없이 테스트용 예시 결과 보기</button>
  </div>
  <p className={styles.privacy}><ShieldCheck size={15}/> 현재는 UI 시연 중입니다. 입력한 정보는 별도 저장하거나 사주 API로 전송하지 않습니다.</p>
 </main>;
}
