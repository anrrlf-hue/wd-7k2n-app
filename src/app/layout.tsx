import type {Metadata} from 'next';
import './globals.css';
import './study.css';
import './study-final.css';
export const metadata: Metadata = { title:'운·돈 | 사주와 인연의 서재', description:'서재에서 나누는 사주 이야기와 나의 운세' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
