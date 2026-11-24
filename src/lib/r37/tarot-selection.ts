import {createHmac,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
export type Draw={drawId:string;cards:{id:number;reversed:boolean;position:string}[];signature:string};
export const majorArcana=[
 '바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴',
 '정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'
] as const;
const secret=()=>process.env.OPENAI_API_KEY;
function signatureOf(drawId:string,cards:Draw['cards']){
 const key=secret();
 if(!key)throw Error('TAROT_NOT_CONFIGURED');
 return createHmac('sha256',key).update('undon-r43-tarot-card-v1:').update(JSON.stringify({drawId,cards})).digest('hex');
}
export function drawThree():Draw{
 const picked=new Set<number>();
 while(picked.size<3)picked.add(randomInt(majorArcana.length));
 const drawId=randomUUID();
 const cards=[...picked].map((id,i)=>({id,reversed:randomInt(2)===1,position:String(i+1)}));
 return {drawId,cards,signature:signatureOf(drawId,cards)};
}
export function validatedCard(draw:unknown,index:unknown){
 if(!draw||typeof draw!=='object'||!Number.isInteger(index)||Number(index)<0||Number(index)>2)throw Error('TAROT_SELECTION_INVALID');
 const d=draw as Draw;
 if(!d.drawId||!Array.isArray(d.cards)||d.cards.length!==3||typeof d.signature!=='string'||!d.cards.every((c,i)=>Number.isInteger(c.id)&&c.id>=0&&c.id<majorArcana.length&&typeof c.reversed==='boolean'&&c.position===String(i+1)))throw Error('TAROT_SELECTION_INVALID');
 const expected=signatureOf(d.drawId,d.cards),given=d.signature;
 if(given.length!==expected.length||!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))throw Error('TAROT_SELECTION_INVALID');
 const selected=d.cards[Number(index)];
 return {card:majorArcana[selected.id],reversed:selected.reversed};
}
