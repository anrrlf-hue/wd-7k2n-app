/**
 * Restores the missing Preview-only reading endpoint for the R42 Git deployment.
 * It does not replace the legacy /api/saju engine or alter production deployments.
 * Requests are initiated by the customer from the existing chat UI.
 */
import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {lunarToSolar} from '@fullstackfamily/manseryeok';
import {computeSajuFacts} from '@/lib/saju-facts';
import type {ProductReport,ProductId} from './catalog';
import type {Envelope} from './report-access';
import {validatedCard,type Draw} from './tarot-selection';

const IDS=new Set<string>(['life','year','wealth','love','marriage','reunion','job','business','compatibility','spouse','friend','partner','coworker','family','today','tomorrow','tarot']);
type Birth={date:string;gender:string;calendar?:string;leap?:boolean;hour?:number|null;minute?:number|null};
export type ReadingPayload={product:ProductId;birth?:Birth;partner?:Birth;question?:string;targetDate?:string;consultation?:boolean;tarotQuestion?:string;tarotCard?:number|null;tarotDraw?:Draw;tarot?:Draw&{selected?:number}};
export function isReadingPayload(value:unknown):value is ReadingPayload{
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<ReadingPayload>;
 return typeof v.product==='string'&&IDS.has(v.product)&&typeof(v.question??'')==='string'&&(
   v.product==='tarot'||!!v.birth&&typeof v.birth.date==='string'&&['남','여'].includes(v.birth.gender)
  );
}
export function checkedBirth(b:Birth){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(b.date);
 if(!m)throw Error('BIRTH_DATE_INVALID');
 let year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 const date=new Date(Date.UTC(year,month-1,day));
 if(year<1901||year>2035||date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day)throw Error('BIRTH_DATE_INVALID');
 if((b.calendar??'solar')==='lunar'){
  const converted=lunarToSolar(year,month,day,b.leap===true);
  year=converted.solar.year;month=converted.solar.month;day=converted.solar.day;
 }
 const hour=b.hour==null?null:Number(b.hour);
 if(hour!==null&&(!Number.isInteger(hour)||hour<0||hour>23))throw Error('BIRTH_HOUR_INVALID');
 return {year,month,day,gender:b.gender as '남'|'여',hour,minute:hour===null?null:Number(b.minute??0)};
}
export function previewOnly(){return process.env.VERCEL_ENV==='preview'||process.env.NODE_ENV==='development';}
const model='gpt-6-luna';
function unwrapResponse(data:unknown):string{
 const d=data as {output_text?:unknown;output?:{content?:{type?:string;text?:unknown}[]}[]};
 if(typeof d?.output_text==='string')return d.output_text.trim();
 return (d?.output??[]).flatMap(o=>o.content??[]).filter(x=>x.type==='output_text'&&typeof x.text==='string').map(x=>String(x.text)).join('\n\n').trim();
}
export async function composeReading(input:ReadingPayload):Promise<ProductReport>{
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw Error('OPENAI_NOT_CONFIGURED');
 const isTarotOnly=input.product==='tarot';
 const integrated=input.consultation===true;
 const allowed=new Set(['love','reunion','wealth','job','business','year','marriage','compatibility']);
 if(integrated&&!allowed.has(input.product))throw Error('CONSULTATION_PRODUCT_INVALID');
 const oneQuestion=integrated?input.tarotQuestion:input.question;
 if((integrated||isTarotOnly)&&(!oneQuestion||oneQuestion.trim().length<4||oneQuestion.length>300))throw Error('TAROT_QUESTION_INVALID');
 const selectedCard=integrated||isTarotOnly?validatedCard(input.tarotDraw??input.tarot,integrated?input.tarotCard:input.tarot?.selected):null;
 const facts=isTarotOnly?null:computeSajuFacts(checkedBirth(input.birth!));
 let partner:unknown=null;
 if(input.partner){
  const p=input.partner;
  if(p.gender==='남'||p.gender==='여')partner=computeSajuFacts(checkedBirth(p));
  else partner={birthday:p.date,calendar:p.calendar,gender:'미상'};
 }
 const prompt=[
  isTarotOnly?'고객이 선택한 타로 카드 한 장으로 현실 질문 한 가지에 대해 실제 타로 상담 원고를 작성해 주세요.':'고객이 선택한 운세 상품에 대한 전통 사주풀이 원고를 작성해 주세요.',
  '상품: '+input.product,
  facts?'고객의 만세력 계산 사실: '+JSON.stringify(facts):'',
  partner?'상대방 관련 정보: '+JSON.stringify(partner):'',
  !integrated&&!isTarotOnly&&input.question?'고객의 질문: '+input.question:'',
  input.targetDate?'기준 날짜: '+input.targetDate:'',
  selectedCard?'선택한 타로 카드: '+selectedCard.card+(selectedCard.reversed?' (역방향)':' (정방향)'):'',
  selectedCard?'타로 질문 한 가지: '+oneQuestion:'',
  integrated?'먼저 선택 상품의 풍부한 사주풀이를 작성하고, 정확히 다음 구분선을 원문에 한 번 넣은 뒤 그 아래에 선택한 타로 카드로 현실 질문 한 가지의 의미, 현실적인 조언, 방향과 실행할 행동을 충분히 작성하세요. 구분선: [[타로 상담풀이]]':'',
  isTarotOnly?'선택된 카드만 사용하며 다른 카드나 사주 명식을 지어내지 마세요. 현실적으로 적용할 조언을 포함하세요.':'계산 자료에 없는 명식은 임의로 만들지 마세요.',
  '고객이 읽을 수 있는 풍부하고 자연스러운 완성 원고를 작성하세요. 이야기 구성과 문장은 직접 결정하세요.'
 ].filter(Boolean).join('\n\n');
 const response=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({model,input:prompt,store:false,max_output_tokens:8500}),
  signal:AbortSignal.timeout(240000),
  cache:'no-store'
 });
 if(!response.ok){console.error('[undon-preview-reading] model request failed',response.status);throw Error('READING_MODEL_UNAVAILABLE');}
 const text=unwrapResponse(await response.json());
 if(text.length<150)throw Error('READING_TEXT_TOO_SHORT');
 let paras=text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
 if(paras.length<3){
  const sliced=text.replace(/([.!?。！？])\s+(?=[가-힣A-Za-z"'“])/g,'$1\n').split(/\n/).map(s=>s.trim()).filter(Boolean);
  if(sliced.length>=3)paras=sliced;
 }
 let cut=Math.max(1,Math.min(paras.length-1,Math.ceil(paras.length*.35)));
 if(integrated){
  const pieces=text.split('[[타로 상담풀이]]');
  if(pieces.length!==2||pieces.some(x=>x.trim().length<80))throw Error('MISSING_TAROT_SECTION');
  const saju=pieces[0].split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  cut=saju.length;
  if(cut<1)throw Error('MISSING_SAJU_SECTION');
  paras=[...saju,{heading:'타로로 풀어보는 현실 고민',text:pieces[1].trim()}] as unknown as string[];
 }
 return {
  id:randomUUID(),edition:'r37',product:input.product,
  manuscript:{title:integrated?'사주 + 타로 고민 상담풀이':isTarotOnly?'타로 상담풀이':'나의 사주 이야기',paragraphs:paras,previewEnd:cut}
 };
}
function keyForPreview(){
 const api=process.env.OPENAI_API_KEY;
 if(!api)throw Error('OPENAI_NOT_CONFIGURED');
 return createHash('sha256').update('undon-preview-r42-artifact-v1:').update(api).digest();
}
export function sealReading(report:ProductReport,owner:string):Envelope{
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyForPreview(),iv);
 const plain=Buffer.from(JSON.stringify({owner,report,issued:Date.now()}),'utf8');
 const data=Buffer.concat([cipher.update(plain),cipher.final()]);
 return{version:1,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),data:data.toString('base64url')};
}
export function openReading(sealed:Envelope,owner:string):ProductReport{
 if(sealed.version!==1||typeof sealed.iv!=='string'||typeof sealed.tag!=='string'||typeof sealed.data!=='string'||sealed.data.length>3500000)throw Error('READING_ACCESS_DENIED');
 const dec=createDecipheriv('aes-256-gcm',keyForPreview(),Buffer.from(sealed.iv,'base64url'));
 dec.setAuthTag(Buffer.from(sealed.tag,'base64url'));
 const decoded=JSON.parse(Buffer.concat([dec.update(Buffer.from(sealed.data,'base64url')),dec.final()]).toString('utf8')) as {owner:string;report:ProductReport;issued:number};
 if(decoded.owner!==owner||Date.now()-decoded.issued>365*24*3600*1000)throw Error('READING_ACCESS_DENIED');
 return decoded.report;
}
export function redactForPreview(report:ProductReport):ProductReport{
 const m=report.manuscript,cut=m.previewEnd??1;
 return{...report,manuscript:{...m,paragraphs:m.paragraphs.map((p,i)=>i<cut?p:{heading:'본편 이어 읽기',text:'열람 시 이어지는 원고'})}};
}
