import type {NextConfig} from 'next';
const nextConfig:NextConfig={
 outputFileTracingIncludes:{'/api/saju':['./vendor/oh-my-saju/**/*']},
 async rewrites(){return [
  {source:'/api/shop/reading',destination:'https://saju-h207zl9c4-anrrlf-6100.vercel.app/api/shop/reading'},
  {source:'/api/shop/reading/access',destination:'https://saju-h207zl9c4-anrrlf-6100.vercel.app/api/shop/reading/access'},
  {source:'/api/shop/tarot',destination:'https://saju-h207zl9c4-anrrlf-6100.vercel.app/api/shop/tarot'}
 ];}
};
export default nextConfig;
