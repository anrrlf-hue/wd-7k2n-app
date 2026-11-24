import {NextResponse} from 'next/server';
import {drawThree} from '@/lib/r37/tarot-selection';
import {previewOnly} from '@/lib/r37/preview-restoration';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!previewOnly())return new Response(null,{status:404});
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return new Response(null,{status:403});
 try {return NextResponse.json(drawThree(),{headers:{'Cache-Control':'no-store'}});}
 catch {return NextResponse.json({error:'카드를 준비하지 못했습니다.'},{status:503});}
}
