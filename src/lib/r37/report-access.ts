export type Envelope={version:1;iv:string;tag:string;data:string};
export type AccessReceipt={sealed:Envelope;grant?:string;previewOnly?:boolean;remainingHeadings?:string[];bodyDigest?:string};
