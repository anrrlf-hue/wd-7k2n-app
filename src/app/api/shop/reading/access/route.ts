import {NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {openReading,previewOnly} from '@/lib/r37/preview-restoration';
import type {Envelope} from '@/lib/r37/report-access';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!previewOnly())return new Response(null,{status:404});
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return new Response(null,{status:403});
 const owner=req.headers.get('cookie')?.match(/(?:^|;\s*)undon_r37_guest=([a-f0-9-]{36})(?:;|$)/)?.[1];
 if(!owner)return NextResponse.json({error:'열람 정보를 확인할 수 없습니다.'},{status:403});
 try{
  const body=await req.text();
  if(body.length>3500000)return new Response(null,{status:413});
  const data=JSON.parse(body) as {action?:string;sealed?:Envelope};
  if(data.action!=='test-unlock'||!data.sealed)return NextResponse.json({error:'열람 요청이 올바르지 않습니다.'},{status:403});
  const report=openReading(data.sealed,owner);
  const grant=createHmac('sha256',process.env.OPENAI_API_KEY??'')
   .update('undon-preview-test-unlock:'+owner+':'+report.id).digest('hex');
  return NextResponse.json({report,grant,edition:'r37',payments:false},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'저장된 원고 열람 정보를 확인하지 못했습니다.'},{status:403});
 }
}
