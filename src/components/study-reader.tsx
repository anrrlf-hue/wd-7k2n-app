'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,ChevronLeft,ChevronRight,LockKeyhole} from 'lucide-react';
import type {ProductReport} from '@/lib/r37/catalog';
import type {AccessReceipt} from '@/lib/r37/report-access';
import {labelOf,validProduct} from './study-products';

type Loose={manuscript?:{title?:unknown;paragraphs?:unknown;previewEnd?:unknown};product?:string};
type Section={title:string;passages:string[]};
function sectionize(report:ProductReport,unlocked:boolean):{sections:Section[];total:number;visible:number}{
 const m=(report as unknown as Loose).manuscript;
 const raw=Array.isArray(m?.paragraphs)?m.paragraphs:[];
 const total=raw.length;
 const cut=typeof m?.previewEnd==='number'&&m.previewEnd>0?Math.min(total,m.previewEnd):Math.min(total,Math.max(3,Math.ceil(total*.23)));
 const visible=unlocked?total:cut;
 const list:Section[]=[];let part:Section={title:'나의 이야기가 시작되는 곳',passages:[]};
 const push=()=>{if(part.passages.length)list.push(part)};
 for(const e of raw.slice(0,visible)){
  const obj=(e!==null&&typeof e==='object'?e:{}) as Record<string,unknown>;
  const heading=typeof obj.heading==='string'?obj.heading:typeof obj.title==='string'?obj.title:'';
  const text=typeof e==='string'?e:typeof obj.text==='string'?obj.text:typeof obj.body==='string'?obj.body:typeof obj.content==='string'?obj.content:'';
  if(heading.trim()&&part.passages.length){push();part={title:heading.trim(),passages:[]};}
  else if(heading.trim()&&part.passages.length===0){part.title=heading.trim();}
  if(text.trim())part.passages.push(text.trim());
  if(!heading.trim()&&part.passages.length>=5){push();part={title:`이야기 ${list.length+1}`,passages:[]};}
 }
 push();return{sections:list,total,visible};
}
function Scene({section,index}:{section:Section;index:number}){
 const appear=index===0||index>1&&index%4===0;
 const scene=index===0?'prologue':index%4===1?'essay':index%4===2?'turn':index%4===3?'dialogue':'insight';
 return <div className={`ud-story-scene ud-scene-${scene}`}>
  {appear&&<section className="ud-scene-interpreter"><div className="ud-interpreter-screen" role="img" aria-label="안경을 쓴 중후한 남성 풀이인"/><div className="ud-interpreter-headline"><span>제 {index+1}장 · 운의 흐름</span><h2>{section.title}</h2></div></section>}
  <div className="ud-scene-body">
   <div className="ud-scene-ornament" aria-hidden="true">✦ · ✦</div>
   <span className="ud-chapter-label">{index===0?'PROLOGUE':`CHAPTER ${String(index+1).padStart(2,'0')}`}</span>
   <h1>{section.title}</h1>
   {scene==='turn'&&<div className="ud-scene-divider" aria-hidden="true">運</div>}
   {section.passages.map((text,i)=>{
    const isEmphasis=(scene==='dialogue'&&i===0)||(scene==='turn'&&i===Math.min(1,section.passages.length-1))||(scene==='essay'&&i===section.passages.length-1);
    const isQuote=(scene==='prologue'&&i===0)||(scene==='insight'&&i===0);
    return <p key={`${i}-${text.slice(0,12)}`} className={isQuote?'ud-scene-quote':isEmphasis?'ud-scene-emphasis':'ud-scene-paragraph'}>{text}</p>;
   })}
   {(index===0||index>0&&index%5===0)&&<div className="ud-scene-closer">{index===0?'이야기를 시작합니다.':'다음 장에서 이야기를 이어갑니다.'}</div>}
  </div>
 </div>;
}
export default function StudyReader({report,receipt,unlocked,onUnlock,onExit,busy,error}:{report:ProductReport;receipt?:AccessReceipt;unlocked:boolean;onUnlock:()=>void;onExit:()=>void;busy:boolean;error:string}){
 const [page,setPage]=useState(0),[menu,setMenu]=useState(false);
 const {sections,total,visible}=useMemo(()=>sectionize(report,unlocked),[report,unlocked]);
 const idx=Math.max(0,Math.min(page,Math.max(0,sections.length-1)));const section=sections[idx];
 const product=(report as unknown as Loose).product??'life';
 const productLabel=validProduct(product)?labelOf(product):'나의 풀이';
 const go=(index:number)=>{setPage(index);setMenu(false);window.scrollTo({top:0,behavior:'smooth'});};
 return <div className="ud-reading"><div className="ud-reading-top"><button type="button" onClick={onExit}><ArrowLeft size={18}/> 뒤로</button><span>{productLabel}</span><span>나의 사주 이야기</span></div>
 <div className="ud-reader-container">
 {section?<Scene key={`${idx}-${unlocked}`} section={section} index={idx}/>:<div className="ud-story-empty">표시할 풀이 원고가 없습니다.</div>}
 {!unlocked&&idx===sections.length-1&&visible<total&&<section className="ud-unlock"><LockKeyhole size={23}/><h2>아직 남은 이야기가 있습니다</h2><p>앞서 읽으신 원고의 다음 장이 준비되어 있습니다. 다시 생성하지 않고 같은 이야기로 이어집니다.</p><button type="button" disabled={busy||!receipt?.sealed} onClick={onUnlock}>{busy?'권한 확인 중…':'Preview에서 본편 이어 읽기'}<ArrowRight size={18}/></button>{error&&<p role="alert">{error}</p>}{!receipt?.sealed&&<small>서버 열람 정보가 없어 본편을 열 수 없습니다.</small>}</section>}
 </div>
 <nav className="ud-reader-nav" aria-label="풀이 장 이동"><button type="button" onClick={()=>setMenu(!menu)} aria-expanded={menu}><BookOpen size={18}/> 목차</button><button type="button" aria-label="이전 장" disabled={idx===0} onClick={()=>go(idx-1)}><ChevronLeft size={20}/><span className="ud-reader-prev-label">이전</span></button><span className="ud-reader-meter">{sections.length?idx+1:0} / {sections.length}<i><b style={{width:`${(idx+1)/Math.max(1,sections.length)*100}%`}}/></i></span><button type="button" aria-label="다음 장" disabled={idx>=sections.length-1} onClick={()=>go(idx+1)}><span className="ud-reader-next-label">다음</span><ChevronRight size={20}/></button>{menu&&<div className="ud-toc" role="dialog" aria-label="풀이 목차"><div className="ud-toc-title">내 풀이의 목차 <button type="button" onClick={()=>setMenu(false)}>닫기</button></div>{sections.map((s,i)=><button type="button" key={`${i}-${s.title}`} aria-current={i===idx?'page':undefined} onClick={()=>go(i)}><span>{String(i+1).padStart(2,'0')}</span>{s.title}</button>)}</div>}</nav>
 </div>;
}
