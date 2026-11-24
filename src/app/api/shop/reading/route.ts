import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {isReadingPayload,composeReading,previewOnly,redactForPreview,sealReading} from '@/lib/r37/preview-restoration';
export const runtime='nodejs';
export const maxDuration=300;
const recent=new Map<string,{time:number;count:number}>();
export async function GET(){
 if(!previewOnly())return new Response(null,{status:404});
 return NextResponse.json({edition:'r37',configured:!!process.env.OPENAI_API_KEY,model:'gpt-6-luna',payments:false}, {headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:Request){
 if(!previewOnly())return new Response(null,{status:404});
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return new Response(null,{status:403});
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'anonymous';
 const timestamp=Date.now(),hit=recent.get(ip);
 if(hit&&timestamp-hit.time<900000&&hit.count>=3)return NextResponse.json({error:'요청이 많습니다. 잠시 후 다시 시도해 주세요.'},{status:429});
 recent.set(ip,!hit||timestamp-hit.time>=900000?{time:timestamp,count:1}:{time:hit.time,count:hit.count+1});
 try{
  const body=await req.text();
  if(body.length>16000)return NextResponse.json({error:'입력 내용이 너무 깁니다.'},{status:413});
  const data=JSON.parse(body) as unknown;
  if(!isReadingPayload(data))return NextResponse.json({error:'출생정보와 상품을 확인해 주세요.'},{status:400});
  const ownerMatch=req.headers.get('cookie')?.match(/(?:^|;\s*)undon_r37_guest=([a-f0-9-]{36})(?:;|$)/);
  const owner=ownerMatch?.[1]||randomUUID();
  const full=await composeReading(data);
  const sealed=sealReading(full,owner);
  const response=NextResponse.json({report:redactForPreview(full),access:{sealed,previewOnly:true},edition:'r37',payments:false},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set('undon_r37_guest',owner,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:31536000});
  return response;
 }catch(error){
  const message=error instanceof Error?error.message:'UNKNOWN_ERROR';
  console.error('[undon-r42-reading] '+message);
  const invalid=message.startsWith('BIRTH_');
  return NextResponse.json({error:invalid?'생년월일 또는 출생시간을 확인해 주세요.':message==='OPENAI_NOT_CONFIGURED'?'풀이 API 연결 설정이 없습니다.':'원고 작성에 문제가 발생했습니다. 다시 시도해 주세요.'},{status:invalid?400:503,headers:{'Cache-Control':'no-store'}});
 }
}
