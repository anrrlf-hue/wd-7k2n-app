import {notFound} from 'next/navigation';
import StudyApp from '@/components/study-app';
const sections=new Set(['all','classic','relations','loveHub','money','career','palm','special','tarot','tarotHub','input','detail','free','full','my','today','popular','freeHub','new','paired','bundle','bundles','reviews','gift','scenario']);
export default async function Page({params,searchParams}:PageProps<'/explore/[section]'>){
 const {section}=await params;const search=await searchParams;
 if(!sections.has(section))notFound();
 const item=typeof search.item==='string'?search.item:'life';
 return <StudyApp section={section} item={item}/>;
}
