import type {ProductReport} from './catalog';
import type {AccessReceipt} from './report-access';
const KEY='undon-r37-readings';
export type SavedReading={report:ProductReport;requestKey:string;unlocked:boolean;access?:AccessReceipt};
export function savedReadings():SavedReading[]{try{const a=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(a)?a.filter(x=>typeof x?.report?.edition==='string'&&Array.isArray(x.report.manuscript?.paragraphs)&&typeof x.requestKey==='string'):[];}catch{return[];}}
export function saveReading(value:SavedReading){const a=savedReadings().filter(x=>x.report.id!==value.report.id);localStorage.setItem(KEY,JSON.stringify([value,...a]));window.dispatchEvent(new Event('undon-readings-changed'));}
export async function browserKey(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({edition:'r37',value})));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
