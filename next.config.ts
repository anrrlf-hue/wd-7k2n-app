import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /api/saju가 자식 프로세스로 vendor/oh-my-saju/oh-my-saju.mjs를 spawn한다
  // (import/require가 아니라 경로 문자열로 참조하므로 output file tracing이
  // 자동으로 못 잡을 수 있어 명시).
  outputFileTracingIncludes: {
    "/api/saju": ["./vendor/oh-my-saju/**/*"],
  },
};

export default nextConfig;
