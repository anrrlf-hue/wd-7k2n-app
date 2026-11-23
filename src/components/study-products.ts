import type {ProductId} from '@/lib/r37/catalog';
export type ShopProduct={id:ProductId;name:string;tag:string;intro:string;hall:string;art:string};
export const offerings:ShopProduct[]=[
 {id:'life',name:'평생 심층사주',tag:'인생',intro:'인생의 결을 깊이 읽는 이야기',hall:'classic',art:'year'},
 {id:'year',name:'신년운세',tag:'새해',intro:'다가오는 한 해의 중요한 순간',hall:'classic',art:'year'},
 {id:'love',name:'연애운',tag:'인연',intro:'사랑의 시작과 마음의 흐름',hall:'relations',art:'love'},
 {id:'marriage',name:'결혼운',tag:'결혼',intro:'함께 살아갈 두 사람의 방향',hall:'relations',art:'compat'},
 {id:'reunion',name:'이별·재회운',tag:'재회',intro:'지나간 인연과 다음 선택',hall:'relations',art:'love'},
 {id:'compatibility',name:'궁합',tag:'궁합',intro:'관계마다 다른 서로의 이야기',hall:'relations',art:'compat'},
 {id:'wealth',name:'재물운',tag:'재물',intro:'돈을 만들고 지키는 나의 방식',hall:'career',art:'wealth'},
 {id:'job',name:'취업·이직운',tag:'일',intro:'내 능력과 맞는 새로운 자리',hall:'career',art:'year'},
 {id:'business',name:'사업·창업운',tag:'사업',intro:'결정과 실행의 흐름을 살피다',hall:'career',art:'wealth'},
 {id:'tarot',name:'타로',tag:'카드',intro:'지금 마음에 걸리는 한 가지 질문',hall:'tarot',art:'love'},
 {id:'palm',name:'정통 손금',tag:'손금',intro:'두 손이 들려주는 삶의 흔적',hall:'palm',art:'year'},
 {id:'fusion',name:'사주+손금 종합',tag:'종합',intro:'명식과 두 손을 함께 살펴보기',hall:'palm',art:'compat'}
];
export const relationOfferings:{id:ProductId;name:string;intro:string}[]=[
 {id:'compatibility',name:'연인 궁합',intro:'마음이 가까워지는 방법'},
 {id:'spouse',name:'부부 궁합',intro:'함께 살아가는 생활의 조화'},
 {id:'friend',name:'친구 궁합',intro:'서로를 이해하는 우정'},
 {id:'partner',name:'사업 파트너 궁합',intro:'돈과 결정에서 만나는 두 사람'},
 {id:'coworker',name:'직장 동료 궁합',intro:'협업과 소통의 리듬'},
 {id:'family',name:'가족 궁합',intro:'가까워서 놓치기 쉬운 마음'}
];
export const halls=[
 {id:'classic',name:'평생·신년',icon:'卷',intro:'시간을 따라 읽는 인생'},
 {id:'relations',name:'사랑·관계',icon:'♡',intro:'두 사람, 마음의 이야기'},
 {id:'career',name:'돈·직업',icon:'財',intro:'현실의 선택과 기회'},
 {id:'tarot',name:'타로',icon:'✧',intro:'지금 이 순간의 질문'},
 {id:'palm',name:'손금·종합',icon:'掌',intro:'손과 명식이 만나는 해석'}
] as const;
export const labelOf=(id:ProductId)=>id==='today'?'오늘의 운세':id==='tomorrow'?'내일의 운세':relationOfferings.find(x=>x.id===id)?.name??offerings.find(x=>x.id===id)?.name??String(id);
export const validProduct=(s:string):s is ProductId=>s==='today'||s==='tomorrow'||offerings.some(x=>x.id===s)||relationOfferings.some(x=>x.id===s);
