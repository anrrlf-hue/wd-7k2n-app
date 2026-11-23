export type ProductId='life'|'year'|'wealth'|'love'|'marriage'|'reunion'|'job'|'business'|'compatibility'|'spouse'|'friend'|'partner'|'coworker'|'family'|'palm'|'fusion'|'tarot'|'today'|'tomorrow';
export type ProductReport={id:string;edition?:string;product:ProductId;manuscript:{title?:string;paragraphs:(string|{heading?:string;title?:string;text?:string;body?:string;content?:string})[];previewEnd?:number}};
export const EDITION='r37';
