import type {ProductId} from './catalog';
export type IntakeResult={name:string;gender:string;birth:string;calendar:string;hour:string;issue:string;partnerChoice:string;partnerName:string;partnerBirth:string;partnerGender:string;partnerCalendar:string;partnerHour:string;year:string;leftPalm:string;rightPalm:string;tarotQuestion:string;tarotCard:number|null;tarotDraw?:{drawId:string;cards:{id:number;reversed:boolean;position:string}[];signature:string}};
function birth(date:string,gender:string,calendar:string,hour:string){
 if(!date||!gender)throw Error('생년월일과 성별을 확인해 주세요.');
 const index=['자시','축시','인시','묘시','진시','사시','오시','미시','신시','유시','술시','해시'].findIndex(x=>hour.startsWith(x));
 return{date,gender:gender==='남성'?'남':gender==='여성'?'여':'unknown',calendar:calendar.startsWith('음력')?'lunar':'solar',leap:calendar==='음력 윤달',hour:index<0?null:index*2,minute:index<0?null:0,timePrecision:index<0?'unknown':'two-hour'};
}
export function intakeRequest(product:ProductId,r:IntakeResult,consultation=false){
 if(product==='tarot'){if(!r.tarotDraw||r.tarotCard===null||!r.tarotQuestion.trim())throw Error('질문과 카드를 선택해 주세요.');return {product,question:r.tarotQuestion,tarot:{...r.tarotDraw,selected:r.tarotCard}};}
 if(product==='palm'||product==='fusion')return {product,question:''};
 const paired=['compatibility','spouse','friend','partner','coworker','family'].includes(product);
 return {product,birth:birth(r.birth,r.gender,r.calendar,r.hour),...((paired||(product==='love'&&r.partnerChoice==='있어요'))&&r.partnerBirth?{partner:birth(r.partnerBirth,r.partnerGender,r.partnerCalendar,r.partnerHour)}:{}),question:r.issue??'',...(consultation?{consultation:true,tarotQuestion:r.tarotQuestion,tarotCard:r.tarotCard,tarotDraw:r.tarotDraw}:{}),targetDate:`${r.year||new Date().getFullYear()}-01-01`};
}
