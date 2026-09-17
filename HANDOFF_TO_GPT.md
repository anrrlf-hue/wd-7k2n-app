# 사주 재무 프로젝트 (saju-app) — 인수인계 지침 문서

> 2026-09-18 현재 기준: 아래 과거 기록보다 current main을 우선합니다.
> 사주·손금을 “재미”로 낮추는 카피를 사용하지 않습니다. 핵심 정체성은 “타고난 운세로 끝내지 않고, 현실로 연결합니다.”입니다.
> 미래 일정은 복수 선택 시 사용자가 우선 일정을 지정합니다. 목적자금 질문과 소득 변화 질문은 분리되며, 선택한 일정의 응답만 해당 미래 일정 진단에 사용합니다.
> 캐릭터·모션은 카피·재무 질문 개선과 별도 커밋으로 관리합니다.

이 문서는 Claude Code(Claude Sonnet 5)가 지금까지 진행한 모든 작업을 다른 AI(ChatGPT 등)가
이어받아 작업할 수 있도록 만든 지침 문서입니다. 프로젝트 배경, 의사결정 이유, 알려진 버그와
해결 패턴, 전체 소스코드를 포함합니다. 이 문서 하나만 읽으면 코드베이스 전체를 다시 탐색하지
않고도 작업을 이어갈 수 있도록 작성했습니다.

---

## 0. 프로젝트 한 줄 요약

생년월일시(사주/四柱) + 손금 사진 한 장으로 "재물운"을 분석해주는 모바일 우선 웹 서비스.
무료 리포트로 재미와 신뢰를 주고, 유료 결제(4,900원)로 "병목 진단 + 30일 실행계획 + 90일
돈관리 시스템"을 제공하는 구조. 운영자는 실제 독립 재무상담사(통장나누기·소액장기투자
원칙, 서민금융진흥원 찾아가는 재무상담 서비스 연계)이며, 사주/손금은 "재미와 자기이해"
용도이고 실제 재무 판단(병목 진단)은 사주 요소를 전혀 쓰지 않는 순수 설문 기반 로직입니다.

- **목표**: 사주로 흥미를 끌고 → 설문으로 실제 재무 상황을 받고 → 코드로 병목을 판정해서
  → 결제 전환시키는 MVP. 아직 실제 결제 게이트웨이는 연동 안 됨(전부 "준비 중" 상태).
- **원칙(전체 세션에서 반복 강조됨)**: 사주·손금은 재무 판단의 근거로 쓰지 않는다. 특정
  금융상품/보험사/펀드/ETF/대출상품을 언급하지 않는다. 수익률 보장 표현 금지. 결제 압박
  표현 금지. 재무 숫자는 전부 코드로 계산하고 AI가 추측한 숫자를 쓰지 않는다.

## 1. 저장소 / 배포 정보

- **GitHub**: `anrrlf-hue/wd-7k2n-app` (main 브랜치)
- **로컬 작업 경로(Windows)**: `C:\Users\PC\Desktop\사주 재무\사주 재무 프로젝트\saju-app`
- **Production URL**: https://saju-app-rouge.vercel.app
- **배포 방식**: Vercel CLI로 수동 배포 (Git 연동 자동배포 아님 — push만으로는 배포 안 됨,
  반드시 아래 명령을 직접 실행해야 production이 갱신됨)
  ```
  pnpm dlx --allow-build=esbuild vercel@latest deploy --prod --yes --token="<VERCEL_TOKEN>"
  ```
  토큰은 보안상 이 문서에 포함하지 않음 — 운영자(사용자)가 보유. 이 문서를 다른 사람/AI에게
  전달할 때 토큰을 별도로 안전하게 전달해야 함.
- **작업 완료 기준**: 이 프로젝트에서 "완료"는 GitHub push만으로 끝나지 않는다. 반드시
  Vercel production 재배포까지 실행해서 `saju-app-rouge.vercel.app`이 최신 커밋과
  일치해야 완료로 간주한다 (매번, 묻지 않고 자동 재배포).

## 2. 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **스타일**: Tailwind CSS v4, shadcn/ui, framer-motion
- **검증**: Zod
- **패키지 매니저**: pnpm (Windows에서 개발, Linux 포터블 목표)
- **사주 계산 엔진**: `ssaju` npm 패키지(MIT 라이선스) — `PillarDetail.stemKo/branchKo`
  (한글 표기)와 `.stem/.branch`(한자)를 그대로 재사용. 명식(사주팔자)은 절대 LLM이
  암산하지 않고 반드시 이 엔진으로 계산.
- **oh-my-saju**: 격국/신강신약/대운 등 심화 판정에 사용하는 보조 로직(어댑터 패턴,
  `oh-my-saju-adapter.ts`). 실패 시 폴백 로깅.
- **손금 인식**: MediaPipe(`@mediapipe/tasks-vision`) + 커스텀 ONNX 모델(`onnxruntime-web`,
  `palm-line-onnx.ts`, `vendor/palm-line-reader/`)로 손금 특징 추출.

## 3. 사용자 퍼널 전체 구조 (2026-09 기준 최신 상태)

```
1. 랜딩 페이지 (/) 
   ↓
2. 생년월일/시각/성별 입력 (/diagnosis, birth-date-step → birth-time-step)
   ↓
3. 성격 체크(선택, personality-step) — 스킵 가능
   ↓
4. 무료 사주 리포트 (result-step) — 명식 공개, 강점, 재물유형, 종합판정
   ↓
5. 손금 업로드 유도 (palm-entry-card) — "손금 없이 사주 결과만 볼게요"로 스킵 가능
   ↓
6. (손금 업로드 시) /diagnosis/palm — 손금 분석 후 사주+손금 통합 결과
   ↓
7. 간접체험 (IndirectExperience) — 재물유형(4종) × 손금 키워드 기반 3장면 체험,
   선택에 따라 good/mixed/bad 결과 텍스트
   ↓
8. 재무 설문 (SurveyForm) — 3스텝, 직장형태/미래이벤트/소득·고정지출·저축(숫자)/
   지출인지도/비상자금/부채/자금관리단위/소비패턴. 스텝1 상단에 개인정보 안내 문구.
   ↓
9. 병목 진단 (BottleneckEngine, 순수 클라이언트 함수, 사주 요소 미개입) — 11단계
   우선순위 체인으로 1개 병목 판정
   ↓
10. 분석 결과 화면 (AnalysisResultCard) — 결제 버튼 없음. 헤드라인/왜/생활의미/
    지금 안해도 되는 것(이유 포함)/격차 한 방(gapStatement, 숫자 근거)/
    리포트 구성 목록/가격·결제수단 노출 → "결제하기" 버튼으로 다음 화면 이동
    ↓
11. 결제 화면 (PaymentScreen) — PaywallOffer 재사용 + TrustBadges(신뢰 신호) +
    결제소요시간 안내 + 환불정책 안내 → CTA 클릭 시 "결제 연결은 아직 준비 중이에요"
    (실제 결제 게이트웨이 미연동, 범위 밖으로 명시됨)
```

퍼널 오케스트레이션은 `src/components/palm/palm-page-client.tsx`의 `ConversionFunnel`
컴포넌트가 담당 (`FunnelStage = "experience" | "survey" | "analysis" | "payment"`,
로컬 `useState` 기반 서브퍼널 패턴).

## 4. 작업 이력 (라운드별, 최신순 커밋 로그와 대응)

아래는 이 세션에서 진행된 모든 라운드입니다. 각 커밋 해시는 `git log`로 확인 가능합니다.

| 커밋 | 라운드 내용 |
|---|---|
| `2d6e0d5` | §8-3~8-7 전환율 개선: 신뢰신호(TrustBadges 신규 컴포넌트), 개인정보 안내, 결제소요시간/환불정책 안내, 결제 트래킹(payment_cta_clicked 등), 리포트 구성 목록 문구 최종화 |
| `c088d36` | §8-1/8-2: 분석결과 화면에 가격·결제수단 노출(env 설정 분리), 리포트 구성 항목 리스트 |
| `c2ec71f` | §5: 분석 결과 화면에 "지금 안 해도 되는 것"의 이유(notUrgentReason), 격차 한 방 문구(gapStatement, 코드 계산 숫자) 추가 |
| `463b911` | 무료→유료 전환 구조 재설계: 기존 "한달 살아보기+현실정보7문항+연결진단+신뢰설명" 플로우를 통째로 삭제하고, 간접체험(IndirectExperience)/설문(SurveyForm)/병목진단(BottleneckEngine)/분석결과(AnalysisResultCard)/결제(PaymentScreen)로 재설계 |
| `3f50ccb` | **가장 중요한 버그 수정**: "결과 화면 전환 안 됨" 근본 원인 수정 (아래 6-1 참고) + P1~P3 버그 정리(시간 미상 시 오행/관계 오염, 음력 카피, 세션 저장, 에러 스텝, 타임아웃 30초) |
| `d54c615` | 무료 결과에 명식(사주팔자) 공개, 재물유형 판정 로직, "한달 살아보기" 시뮬레이션 추가 (이 라운드의 한달살아보기는 이후 463b911에서 완전히 삭제됨) |
| `2e3ebcd` 이전 | 결제 브릿지(RealityInputForm/ConnectionDiagnosisCard/TrustSection), oh-my-saju 격국/신강신약/대운 심화, MBTI+6문항+손금 통합 서사, 톤 전면 교정 등 초기 라운드들 (모두 이후 라운드에서 구조 재설계됨) |

**중요**: `d54c615`와 `2e3ebcd` 이전 라운드에서 만든 컴포넌트 중 다음은 **이후 완전히
삭제됨** — 코드베이스에 없으니 참고만 하고 되살리지 말 것:
`month-simulation.tsx`, `month-simulation.ts`, `month-simulation-data.ts`,
`reality-input-form.tsx`, `connection-diagnosis-card.tsx`, `trust-section.tsx`,
`reality-input.ts`, `connection-diagnosis.ts`, `api/reality/diagnose/route.ts`.

## 5. 핵심 아키텍처 원칙 / 컨벤션

1. **명식은 절대 암산하지 않는다.** `ssaju`(`saju.ts`, `saju-facts.ts`)로 계산한 데이터에
   근거해서만 해석. oh-my-saju는 격국/신강신약/대운 등 보조 판정에만 사용, 실패 시
   `oh-my-saju-adapter.ts`가 폴백 로깅 후 계속 진행.
2. **데이터/로직 분리 패턴**: `*-copy.ts`/`*-data.ts` 파일은 순수 데이터(로직 임포트 없음)
   — 운영자가 카피만 통째로 교체 가능. 로직 파일(`*.ts`)이 데이터를 가져와 계산된 사실과
   조합. 예: `wealth-type-copy.ts`+`wealth-type.ts`, `analysis-result-copy.ts`+
   `analysis-result.ts`, `trust-badges-copy.ts`+`trust-badges.tsx`.
3. **미확정 값은 env/config로 분리**: `pricing.ts`의 `priceFromEnv()`가
   `NEXT_PUBLIC_PAYMENT_PRICE_KRW`, `PAYMENT_METHODS`가 `NEXT_PUBLIC_PAYMENT_METHODS`를
   읽음(콤마 구분). `NEXT_PUBLIC_` 접두어 필수(Next.js가 클라이언트 번들에 인라인).
   미설정 시 합리적 기본값으로 폴백.
4. **"enabled" 플래그 패턴**: 문구가 아직 확정 안 된 콘텐츠는 배열에 `enabled: false`로
   자리만 만들고, 컴포넌트가 `enabled && text`로 필터링해서 렌더링 — 미완성 문구를 실제
   사용자에게 보여주지 않으면서도 운영자가 나중에 플래그만 뒤집으면 되게.
   (`trust-badges-copy.ts` 4번째 항목 — 재무협회 관련, 명칭 미확정)
5. **BottleneckEngine은 순수 클라이언트 함수**: 서버 API 없음, 사주·손금 요소 전혀 개입
   안 함("사주·손금은 금융판단 근거로 쓰지 않는다" 원칙의 실제 구현). 11단계 우선순위
   체인, 마지막은 항상 매치하는 catch-all이라 결과 없음이 없음. 한 단계
   (`long_term_goal_pace_short`)는 설문에 해당 필드가 없어 영구적으로 스킵 — "정보
   부족시 억지 진단 안 함" 원칙의 실제 사례로 주석에 남김.
6. **구간→금액 중간값 변환 테이블**: 설문은 대부분 버킷(구간)으로 받으므로
   `analysis-result.ts`가 `EMERGENCY_FUND_MONTHS`, `FUTURE_EVENT_AMOUNT_KRW`,
   `FUTURE_EVENT_PREPARED_FRACTION`, `DEBT_PAYMENT_MONTHLY_KRW` 같은 고정 룩업 테이블로
   "격차 한 방"(gapStatement) 숫자를 코드로 계산 — AI가 지어낸 숫자 아님.
7. **PaywallOffer는 공용 컴포넌트**: `diagnosis/paywall-offer.tsx`, title/includedItems/
   ctaText props + 로컬 `requested` state. CTA 클릭은 실제 결제를 완료시키지 않고
   "결제 연결은 아직 준비 중이에요"만 표시. **이 동작은 바꾸지 말 것**(실제 결제
   게이트웨이는 범위 밖).
8. **트래킹**: `src/lib/analytics.ts`의 `track(event, props)` — 지금은 `console.debug`만
   하는 얇은 레이어(실제 PostHog/GA 등 연결 지점은 주석으로 표시해둠). 퍼널 6단계 이벤트:
   `free_report_completed` → `indirect_experience_started/completed` →
   `survey_completed` → `analysis_result_viewed` → `payment_screen_viewed` →
   `payment_cta_clicked` → (미구현) `payment_completed`.

## 6. 알려진 버그 패턴과 해결책 (매우 중요 — 반복해서 겪은 실수들)

### 6-1. AnimatePresence exit 애니메이션 — 화면이 영원히 멈추는 버그
`motion.div`에 `exit` prop을 쓰고 `AnimatePresence`로 감싸면, **브라우저 탭이 백그라운드로
가면 exit 트랜지션이 영원히 안 끝남**(Chrome이 백그라운드 탭의 requestAnimationFrame/CSS
transition을 throttle하기 때문에 exit 콜백이 안 불림). 그러면 이전 스텝의 DOM이 새 스텝의
DOM과 함께 영원히 남아있게 됨 — "결과 화면 전환이 안 됨"이라는 오래된 버그 리포트의 진짜
원인이었음. **해결**: `exit` prop과 `AnimatePresence` 래퍼를 아예 제거(React가 동기적으로
unmount하게). `step-shell.tsx`에 적용됨. **앞으로 새 컴포넌트에서 스텝 전환/화면 전환에
애니메이션을 쓸 때는 절대 `exit` prop을 쓰지 말 것** — `initial`/`animate`만 사용.

### 6-2. PowerShell Get-Content/Set-Content가 한글 텍스트를 깨뜨림
PowerShell 5.1의 `Get-Content`/`Set-Content`(특히 `-replace`와 함께)는 시스템 코드페이지를
써서 한글/다국어 UTF-8 텍스트를 silently mojibake로 만든다. **절대 이 cmdlet들로 한글이
포함된 소스 파일을 편집하지 말 것** — 반드시 Claude Code의 Edit/Write 도구(또는 Node.js의
`fs.readFileSync/writeFileSync`, `utf8` 인코딩 명시)를 쓸 것. 파일을 그대로 복사/연결만
할 때도 `-Encoding utf8`을 read/write 양쪽에 명시해야 안전함.

### 6-3. PowerShell here-string과 큰따옴표
`git commit -m $msg` 전달 시, `@'...'@` here-string 안에 리터럴 큰따옴표(`"..."`)가 있으면
PowerShell/git이 커밋 메시지를 단어 단위로 쪼개서 `pathspec did not match any file(s)`
에러가 남. **커밋 메시지에 큰따옴표를 아예 쓰지 말 것**(인용구는 따옴표 없이 풀어쓰기).

### 6-4. 브라우저 자동화 환경에서 raw `.click()`이 불안정함
`javascript_tool`로 `element.click()`을 직접 호출하면 React의 synthetic event handler가
가끔 트리거 안 됨(에러 없이 조용히 실패). **신뢰할 수 있는 방법**: `find` 도구로 `ref_N`을
얻고, `computer` 도구의 `left_click` + 그 ref로 클릭(신뢰된 합성 클릭). 텍스트 입력은
`setNativeValue` + `dispatchEvent(new Event('input', {bubbles:true}))` 패턴이 안정적.

### 6-5. 한국어 조사(은/는, 이/가, 을/를) 자동 선택
한글 음절(U+AC00~U+D7A3)에 받침(batchim)이 있는지는 `(codepoint - 0xAC00) % 28 !== 0`으로
판정 가능. 동적으로 조합되는 한글 카피 뒤에 조사를 붙일 때는 하드코딩하지 말고
`src/lib/korean-particle.ts`의 `hasBatchim()`/`eunNeun()`/`iGa()`/`eulReul()`을 쓸 것 —
실제로 "추가 소득원을 찾는 것는"(오류) → "…것은"(수정) 버그를 이 방식으로 발견/수정함.

### 6-6. fiveElements/관계(relations) 오염 — 태어난 시각 모름 케이스
`ssaju`는 "시각 모름" 모드가 없어서 시각 미상이어도 내부적으로 정오(12시) 고정 시주를
계산한다. 이 가짜 시주의 십성/기둥은 이미 필터링되어 있었지만, `result.fiveElements`와
`stemRelations`/`branchRelations`는 필터링 없이 원본 그대로 써서 가짜 시각의 영향이 섞여
있었음. **해결**: `saju-facts.ts`에서 `pillars` 배열에 실제로 존재하는 기둥만으로
`fiveElements`를 로컬 재계산하고, `hour === null`일 때 시주를 포함한 관계 레코드를 필터링.

## 7. 결제/가격/트래킹 등 설정값 (env 기반, 코드에 하드코딩 없음)

- `src/lib/pricing.ts` — `NEXT_PUBLIC_PAYMENT_PRICE_KRW`(기본값 있음), `PAYMENT_METHODS`는
  `NEXT_PUBLIC_PAYMENT_METHODS`(콤마 구분, 기본 "카카오페이,토스페이")
- `src/lib/payment-notices.ts` — `PAYMENT_TIMING_NOTICE`/`REFUND_POLICY_NOTICE`, 지금은
  운영자 미확정이라 placeholder 문구("~안내 예정입니다") — 정책 확정 시 이 값만 교체
- `src/lib/trust-badges-copy.ts` — 4개 신뢰 신호 중 3개는 활성, 4번째(재무협회 관련)는
  `enabled: false`로 대기 중 — 운영자가 명칭/표기 확정하면 `text` 채우고 `enabled: true`
- `src/lib/survey-input.ts`의 `PRIVACY_NOTICE` — 개인정보 안내 문구, 상수로 분리

## 8. 미해결 / TODO (다음 작업자가 이어받을 것들)

1. **실제 결제 게이트웨이 연동** — 지금 PaywallOffer/PaymentScreen CTA는 전부 "준비 중"
   placeholder. 카카오페이/토스페이 등 실제 연동은 완전히 새 작업.
2. **재무협회 신뢰 신호 문구 확정** — `trust-badges-copy.ts` 4번째 항목, 운영자 확인 필요.
3. **결제 후 처리 방식(즉시/지연) 및 환불 정책 세부 조건 확정** — `payment-notices.ts`.
4. **결제 후 실제 리포트(ExecutionReport) 콘텐츠/로직** — 아직 스펙도 없고 도달할 방법도
   없음(결제가 실제로 안 되므로). 결제 게이트웨이 연동 이후에나 시작 가능한 작업.
5. **analytics.ts를 실제 프로바이더(PostHog/GA 등)에 연결** — 지금은 `console.debug`만.
6. **production 전체 유료 플로우 재검증** — 이번 라운드는 production에서 `/diagnosis`
   로드만 스모크 테스트했고, 간접체험→설문→분석결과→결제까지의 전체 클릭 흐름은 dev
   서버에서만 검증함(dev와 동일 빌드가 배포됐으므로 위험은 낮지만 재검증 권장).

## 9. 로컬 개발 명령어

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm tsc --noEmit
pnpm lint
pnpm build
```

## 10. 디렉터리 구조 요약

```
src/
  app/                       Next.js App Router 페이지 + API 라우트
    page.tsx                 랜딩
    diagnosis/page.tsx        생년월일~무료결과 전체 스텝 플로우
    diagnosis/palm/page.tsx   손금 업로드~통합결과
    api/saju/route.ts         명식 계산 API
    api/saju/interpret/route.ts  무료 리포트 해석 API
    api/palm/interpret/route.ts  손금+사주 통합 해석 API (wealthType 포함)
  components/
    diagnosis/                무료 진단 플로우 스텝 컴포넌트들
    palm/                     손금~결제 퍼널 컴포넌트들 (간접체험/설문/분석결과/결제)
    landing/                  랜딩 페이지 비주얼
    ui/                       shadcn 기반 공용 UI 프리미티브
  lib/                        순수 로직 + 데이터 파일들 (계산, 카피, 엔진)
    vendor/palm-line-reader/  서드파티 손금 인식 벤더 코드
scripts/                      수동 검증용 스크립트(테스트 러너 아님, npx tsx로 직접 실행)
docs/                         내부 참고 문서, 스킬 노트, 스크린샷
```

---

## 11. 전체 소스코드

아래부터는 `src/`와 `scripts/` 아래 전체 소스 파일의 실제 코드입니다. 각 파일은
`### 파일: <경로>` 헤더로 구분되어 있습니다. 자동 스크립트로 생성되었으며 사람이 손으로
옮겨적지 않았으므로 원본과 100% 동일합니다.

### 파일: scripts/poc-saju.mjs
```mjs
// manseryeok-js 정확도 확인용 PoC. 알려진 만세력 결과와 대조한다.
import { calculateSaju } from '@fullstackfamily/manseryeok';

const cases = [
  { y: 1990, m: 5, d: 15, h: 14, min: 30, note: '기본 케이스 (서울, 시간보정 적용)' },
  { y: 2000, m: 1, d: 1, h: 0, min: 0, note: '밀레니엄 자정' },
  { y: 1984, m: 2, d: 2, h: 2, min: 0, note: '입춘 부근 경계값' },
];

for (const c of cases) {
  const r = calculateSaju(c.y, c.m, c.d, c.h, c.min);
  console.log(`\n[${c.note}] ${c.y}-${c.m}-${c.d} ${c.h}:${c.min}`);
  console.log(`  년주 ${r.yearPillar}(${r.yearPillarHanja}) 월주 ${r.monthPillar}(${r.monthPillarHanja}) 일주 ${r.dayPillar}(${r.dayPillarHanja}) 시주 ${r.hourPillar}(${r.hourPillarHanja})`);
  if (r.isTimeCorrected) {
    console.log(`  진태양시 보정: ${r.correctedTime.hour}시 ${r.correctedTime.minute}분`);
  }
}
```

### 파일: scripts/poc-ssaju.mjs
```mjs
import { calculateSaju } from "ssaju";

const r = calculateSaju({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" });

console.log("fiveElements:", r.fiveElements);
console.log("dayStem:", r.dayStem, "dayBranch:", r.dayBranch);
console.log("tenGods:", JSON.stringify(r.tenGods, null, 2));
console.log("pillarDetails.day:", JSON.stringify(r.pillarDetails.day, null, 2));
console.log("stemRelations:", r.stemRelations);
console.log("branchRelations:", r.branchRelations);
console.log("advanced:", r.advanced);
console.log("daeun.current:", r.daeun.current);
console.log("gongmang:", r.gongmang);
console.log("---toCompact---");
console.log(r.toCompact());
```

### 파일: scripts/test-full-result.mjs
```mjs
// /api/saju(실제 화면이 호출하는 통합 엔드포인트)를 10개 대표 입력으로
// 검증한다: 개인화(서로 다름), 일관성(동일 입력), 근거 연결, 응답 시간,
// 6문항 성향체크+MBTI가 사주 계산(16섹션)은 그대로 두고
// realWorldPersonalization 한 문단에만 반영되는지.

const BASE = "http://localhost:3000";

const CASES = [
  { label: "1", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "2", year: 1985, month: 11, day: 2, hour: 9, minute: 10, gender: "여" },
  { label: "3", year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: "남" },
  { label: "4", year: 1978, month: 7, day: 20, hour: null, minute: null, gender: "여" },
  { label: "5", year: 1995, month: 3, day: 8, hour: 23, minute: 45, gender: "남" },
  { label: "6", year: 1972, month: 9, day: 30, hour: 6, minute: 0, gender: "여" },
  { label: "7", year: 2003, month: 12, day: 25, hour: 12, minute: 0, gender: "남" },
  { label: "8", year: 1988, month: 6, day: 17, hour: null, minute: null, gender: "여" },
  { label: "9", year: 1965, month: 2, day: 14, hour: 18, minute: 20, gender: "남" },
  { label: "10", year: 2010, month: 8, day: 3, hour: 4, minute: 15, gender: "여" },
  { label: "1-repeat", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  {
    label: "1-with-personality",
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    minute: 30,
    gender: "남",
    personalityAnswers: { speed: 1, plan: 2, risk: 1, autonomy: 2, spendAwareness: 4, savingConsistency: 1 },
    mbti: "ENTJ",
  },
];

async function call(input) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/saju`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const ms = Date.now() - t0;
  const json = await res.json();
  return { status: res.status, ms, json };
}

async function main() {
  const results = [];
  for (const c of CASES) {
    const r = await call(c);
    results.push({ label: c.label, ...r });
    console.log(`\n=== ${c.label} (${r.ms}ms) ===`);
    if (r.status !== 200) {
      console.log("FAILED", JSON.stringify(r.json, null, 2));
      continue;
    }
    const { resultSource, deep, freeReport, dayPillar, myeongsik, wealthType } = r.json;
    console.log(`dayPillar=${dayPillar} resultSource=${resultSource} deepSource=${deep?.source ?? "-"} freeReportSource=${freeReport?.source ?? "-"}`);
    if (myeongsik) {
      const hourPillar = myeongsik.pillars.find((p) => p.pillar === "hour");
      console.log(
        `myeongsik: pillars=${myeongsik.pillars.length} hasTimeInput=${myeongsik.hasTimeInput} hourStem=${hourPillar?.stemKo ?? "null"} geukgukSource=${myeongsik.geukgukSource}`,
      );
    } else {
      console.log("myeongsik: 없음(실패)");
    }
    if (wealthType) {
      console.log(
        `wealthType: code=${wealthType.code} earning=${wealthType.earning.level}(${wealthType.earning.grade}) keeping=${wealthType.keeping.level}(${wealthType.keeping.grade})`,
      );
    } else {
      console.log("wealthType: 없음(실패)");
    }
    if (freeReport) {
      const rep = freeReport.report;
      console.log(`snapshot: ${rep.snapshot.text}`);
      console.log(`temperament: ${rep.temperament.text}`);
      console.log(`wealthStructure: ${rep.wealthStructure.text}`);
      console.log(`bigMoneyAffinity: ${rep.bigMoneyAffinity.text}`);
      console.log(`teamStrength: ${rep.teamStrength.text}`);
      console.log(`soloStrength: ${rep.soloStrength.text}`);
      console.log(`opportunityStyle: ${rep.opportunityStyle.text}`);
      console.log(`strengths: ${rep.strengths.map((s) => s.title).join(", ")}`);
      console.log(`cautions: ${rep.cautions.map((c) => c.title).join(", ")}`);
      console.log(`decisionStyle: ${rep.decisionStyle.text}`);
      console.log(`peopleAndMoney: ${rep.peopleAndMoney.text}`);
      console.log(`nextMove: ${rep.nextMove.text}`);
      console.log(`timingShift: ${rep.timingShift.text}`);
    } else {
      console.log("freeReport: 없음(실패)");
    }
  }

  console.log("\n\n=== 검증 ===");
  const distinct = new Set(results.slice(0, 10).map((r) => JSON.stringify(r.json.freeReport?.report)));
  console.log(`서로 다른 10개 입력의 freeReport 고유 결과 개수: ${distinct.size} / 10`);

  const a = results.find((r) => r.label === "1");
  const d = results.find((r) => r.label === "1-repeat");
  const sameFree = JSON.stringify(a.json.freeReport) === JSON.stringify(d.json.freeReport);
  console.log(`1과 1-repeat(동일 입력) freeReport 일관성: ${sameFree ? "일치" : "불일치"}`);

  // MBTI+6문항은 realWorldPersonalization과 nextMove(§9 "지금 무엇을 해야
  // 하는가" — 이번 라운드부터 성향에 따른 행동 문장 한 줄을 얹는다)에만
  // 반영된다. 사주 계산 자체(snapshot 등 순수 사실 섹션)는 그대로 동일해야
  // 한다.
  const withP = results.find((r) => r.label === "1-with-personality");
  const repA = a?.json?.freeReport?.report;
  const repP = withP?.json?.freeReport?.report;
  const coreKeys = Object.keys(repA ?? {}).filter((k) => k !== "realWorldPersonalization" && k !== "nextMove");
  const coreSame = coreKeys.every((k) => JSON.stringify(repA?.[k]) === JSON.stringify(repP?.[k]));
  console.log(`1-with-personality의 순수 사실 섹션이 기본 1과 동일한가 = ${coreSame} (PASS여야 함)`);
  console.log(`1-with-personality의 nextMove가 기본 1과 다른가(성향 반영 확인) = ${JSON.stringify(repA?.nextMove) !== JSON.stringify(repP?.nextMove)} (PASS여야 함)`);
  console.log(`기본 1의 realWorldPersonalization = ${JSON.stringify(repA?.realWorldPersonalization)}`);
  console.log(`1-with-personality의 realWorldPersonalization이 실제로 채워졌는가 = ${repP?.realWorldPersonalization !== null} (PASS여야 함)`);

  // JARGON_IN_TEXT_PATTERNS와 동일한 검사를 mock 출력 10개 전체에 직접
  // 돌려서, LLM 검증 경로를 안 타는 mock도 실제로 전문용어가 안 새는지
  // 확인한다(free-report-schema.ts와 동일 패턴을 수동으로 재현).
  const JARGON_PATTERNS = [
    /재성\s*\d/, /식상\s*\d/, /관성\s*\d/, /비겁\s*\d/, /인성\s*\d/,
    /비겁\+관성/, /재성\+식상/, /건록·제왕/, /격국/, /용신/, /원국/, /검출/, /ONNX/i, /MediaPipe/i,
  ];
  const PARAGRAPH_KEYS = [
    "snapshot", "temperament", "wealthStructure", "earningStyle", "keepingStyle", "leakPattern",
    "bigMoneyAffinity", "jobOrientation", "teamStrength", "soloStrength", "peopleAndMoney",
    "decisionStyle", "opportunityStyle", "nextMove", "timingShift",
  ];
  let jargonLeaks = 0;
  for (const r of results) {
    const rep = r.json?.freeReport?.report;
    if (!rep) continue;
    const texts = [
      ...PARAGRAPH_KEYS.map((k) => rep[k]?.text ?? ""),
      rep.realWorldPersonalization?.text ?? "",
      ...(rep.strengths ?? []).map((s) => s.detail),
      ...(rep.cautions ?? []).map((c) => c.detail),
    ];
    for (const t of texts) {
      for (const re of JARGON_PATTERNS) {
        if (re.test(t)) {
          jargonLeaks++;
          console.log(`  [jargon leak] case=${r.label} pattern=${re.source} text="${t}"`);
        }
      }
    }
  }
  console.log(`전문용어 노출 검사(text 필드, mock 10개): ${jargonLeaks === 0 ? "PASS (누출 없음)" : `FAIL (${jargonLeaks}건 누출)`}`);

  // 작업 A(명식) / 작업 B(재물 유형) 검증. wealthType.code는 4개 값만
  // 가능하므로(ACCUM/LEAK/HOLD/TIGHT), freeReport에 쓴 "10개 입력 10/10
  // 고유" 기준을 여기 적용하지 않는다 — 대신 4개 값 범위 안에 있는지만 본다.
  const VALID_WEALTH_TYPE_CODES = new Set(["ACCUM", "LEAK", "HOLD", "TIGHT"]);
  let myeongsikOk = true;
  let wealthTypeCodeOk = true;
  for (const r of results) {
    const { myeongsik, wealthType } = r.json ?? {};
    if (myeongsik) {
      if (myeongsik.pillars.length !== 4) {
        myeongsikOk = false;
        console.log(`  [myeongsik FAIL] case=${r.label} pillars.length=${myeongsik.pillars.length}`);
      }
      const hourPillar = myeongsik.pillars.find((p) => p.pillar === "hour");
      if (!myeongsik.hasTimeInput && hourPillar?.stemHanja !== null) {
        myeongsikOk = false;
        console.log(`  [myeongsik FAIL] case=${r.label} hasTimeInput=false인데 hour.stemHanja가 null이 아님`);
      }
    }
    if (wealthType && !VALID_WEALTH_TYPE_CODES.has(wealthType.code)) {
      wealthTypeCodeOk = false;
      console.log(`  [wealthType FAIL] case=${r.label} code=${wealthType.code}`);
    }
  }
  console.log(`명식 구조(4-pillar, 시간 미상 시 hour null) 검사: ${myeongsikOk ? "PASS" : "FAIL"}`);
  console.log(`재물 유형 코드가 4개 값 범위 안(ACCUM/LEAK/HOLD/TIGHT): ${wealthTypeCodeOk ? "PASS" : "FAIL"}`);

  const wtA = a?.json?.wealthType;
  const wtRepeat = d?.json?.wealthType;
  console.log(`1과 1-repeat의 wealthType 결정론(순수 ssaju 카운트라 항상 성립해야 함): ${JSON.stringify(wtA) === JSON.stringify(wtRepeat) ? "일치" : "불일치"}`);

  // 재물 유형 4조각에 특정 해법이 지목되지 않는지 회귀 검사(wealth-type.ts의
  // BANNED_SOLUTION_PATTERNS와 동일한 목록을 여기서도 재현 — 이 스크립트가
  // .ts를 직접 import하지 않는 기존 관례를 따른다).
  const BANNED_SOLUTION_PATTERNS = [/통장을?\s*나누/, /가계부를?\s*쓰/, /적금을?\s*(들|가입)/, /예산\s*앱/, /(자동이체|풍차\s*돌리기)/];
  let bannedSolutionLeaks = 0;
  for (const r of results) {
    const pieces = r.json?.wealthType?.pieces;
    if (!pieces) continue;
    const text = [pieces.typeAndDiagnosis, pieces.evidence, pieces.problem, pieces.bridge].join("\n");
    for (const re of BANNED_SOLUTION_PATTERNS) {
      if (re.test(text)) {
        bannedSolutionLeaks++;
        console.log(`  [banned solution leak] case=${r.label} pattern=${re.source}`);
      }
    }
  }
  console.log(`재물 유형 4조각에 특정 해법 미지목 검사: ${bannedSolutionLeaks === 0 ? "PASS (지목 없음)" : `FAIL (${bannedSolutionLeaks}건)`}`);

  const latencies = results.filter((r) => r.status === 200).map((r) => r.ms);
  console.log(`응답 시간: min=${Math.min(...latencies)}ms max=${Math.max(...latencies)}ms avg=${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 파일: scripts/test-interpretation.mjs
```mjs
// 대표 입력 여러 건으로 AI 해석 파이프라인을 검증한다.
// 확인 항목: (1) 서로 다른 입력이 서로 다른 결과를 내는지 (2) 같은 입력은
// 일관적인지 (3) 스키마/금지표현 검증을 통과하는지 (4) evidence가 실제
// facts 필드와 연결되는지. dev 서버(localhost:3000)가 떠 있어야 한다.

const BASE = "http://localhost:3000";

const CASES = [
  { label: "A: 1990-05-15 14:30 남", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "B: 1985-11-02 09:10 여", year: 1985, month: 11, day: 2, hour: 9, minute: 10, gender: "여" },
  { label: "C: 2000-01-01 00:00 남", year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: "남" },
  { label: "D: 1990-05-15 14:30 남 (A와 동일 입력 - 일관성 체크)", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "E: 1978-07-20 시간모름 여", year: 1978, month: 7, day: 20, hour: null, minute: null, gender: "여" },
];

async function callInterpret(input) {
  const res = await fetch(`${BASE}/api/saju/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  return { status: res.status, json };
}

function printResult(label, result) {
  console.log(`\n=== ${label} ===`);
  if (result.status !== 200) {
    console.log("FAILED", result.status, JSON.stringify(result.json, null, 2));
    return;
  }
  const { source, interpretation, facts } = result.json;
  console.log(`source=${source}`);
  console.log(`facts: dayStem=${facts.dayStemKo} strength=${facts.dayStrength} geukguk=${facts.geukguk} wealthStars=${facts.wealthStarCount} peerStars=${facts.peerStarCount} outputStars=${facts.outputStarCount}`);
  console.log(`summary: ${interpretation.summary}`);
  console.log(`money_style: ${interpretation.money_style}`);
  console.log(`earning_style: ${interpretation.earning_style}`);
  console.log(`career_business: ${interpretation.career_business}`);
  console.log(`timing: ${interpretation.timing}`);
  console.log(`action: ${interpretation.action}`);
  console.log(`evidence: ${JSON.stringify(interpretation.evidence)}`);
}

async function main() {
  const results = [];
  for (const c of CASES) {
    const r = await callInterpret(c);
    results.push({ label: c.label, ...r });
    printResult(c.label, r);
  }

  console.log("\n\n=== 검증 ===");

  // 1) 서로 다른 입력(A,B,C,E)이 서로 다른 summary를 내는지
  const distinctSummaries = new Set(
    results.filter((r) => ["A", "B", "C", "E"].some((k) => r.label.startsWith(k))).map((r) => r.json.interpretation?.summary),
  );
  console.log(`서로 다른 입력의 고유 summary 개수: ${distinctSummaries.size} / 4 (4개면 전부 다름)`);

  // 2) 같은 입력(A vs D)이 같은 결과인지
  const a = results.find((r) => r.label.startsWith("A"));
  const d = results.find((r) => r.label.startsWith("D"));
  const consistent = JSON.stringify(a.json.interpretation) === JSON.stringify(d.json.interpretation);
  console.log(`A와 D(동일 입력) 일관성: ${consistent ? "일치 (통과)" : "불일치 (실패)"}`);

  // 3) evidence가 실제 facts 필드값을 포함하는지 (dayStemKo가 evidence 어딘가에 등장하는지)
  for (const r of results) {
    if (r.status !== 200) continue;
    const { facts, interpretation } = r.json;
    const evidenceText = interpretation.evidence.join(" ");
    const linked = evidenceText.includes(facts.dayStemKo) && evidenceText.includes(facts.geukguk);
    console.log(`${r.label}: evidence가 dayStem/geukguk과 연결됨 = ${linked}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 파일: scripts/test-palm-result.mjs
```mjs
// /api/palm/interpret(손금 완료 후 화면이 호출하는 엔드포인트)를 검증한다:
// 종합판정(verdict)이 항상 채워지는지, 추천 흐름(primaryCandidateId)이
// 3개 후보 중 하나이고 동일 입력에서 결정론적인지, 손금 스킵/성향 없음
// 등 데이터가 부분적으로 빠진 경우에도 안전하게 동작하는지.

const BASE = "http://localhost:3000";

const BIRTH = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" };

const SAMPLE_ONNX_LINES = {
  modelExecuted: true,
  heartLine: { detected: true, length: "보통", curve: "직선에 가까움", depthStrength: "보통", start: { x: 1, y: 1 }, end: { x: 2, y: 2 }, branchDetected: null },
  headLine: { detected: true, length: "보통", curve: "직선에 가까움", depthStrength: "보통", start: { x: 1, y: 1 }, end: { x: 2, y: 2 }, branchDetected: null },
  lifeLine: { detected: true, length: "보통", curve: "완만한 곡선", depthStrength: "보통", start: { x: 1, y: 1 }, end: { x: 2, y: 2 }, branchDetected: null },
  fateLine: { presence: "unknown", note: "" },
  mounts: "unknown",
  marks: "unknown",
};

const SAMPLE_PALM_FACTS = {
  handSide: "right",
  imageQuality: "good",
  handShape: "square",
  majorLines: ["생명선", "감정선", "두뇌선"],
  lineFeatures: [
    { name: "생명선", detected: true, length: "보통", direction: "완만한 곡선", confidence: 0.8 },
    { name: "감정선", detected: true, length: "보통", direction: "직선에 가까움", confidence: 0.8 },
    { name: "두뇌선", detected: true, length: "보통", direction: "직선에 가까움", confidence: 0.8 },
  ],
  onnxLines: SAMPLE_ONNX_LINES,
  confidence: 0.8,
  warnings: [],
};

const CASES = [
  {
    label: "손금+성향 있음",
    body: {
      ...BIRTH,
      palmFacts: SAMPLE_PALM_FACTS,
      mbti: "ENTJ",
      personalityAnswers: { speed: 1, plan: 1, risk: 1, autonomy: 1, spendAwareness: 4, savingConsistency: 1 },
    },
  },
  {
    label: "손금 스킵+성향 없음",
    body: { ...BIRTH, palmFacts: null },
  },
  {
    label: "손금 있음+성향 없음",
    body: { ...BIRTH, palmFacts: SAMPLE_PALM_FACTS },
  },
];

const VALID_IDS = new Set(["wealth_timing", "career_business", "change_opportunity"]);
const VALID_WEALTH_TYPE_CODES = new Set(["ACCUM", "LEAK", "HOLD", "TIGHT"]);

async function call(body) {
  const res = await fetch(`${BASE}/api/palm/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  let allPass = true;

  for (const c of CASES) {
    const { status, json } = await call(c.body);
    console.log(`\n=== ${c.label} ===`);
    console.log(`status=${status} usable=${json.usable} palmSkipped=${json.palmSkipped}`);

    if (!json.usable) {
      console.log("FAIL: usable=false", JSON.stringify(json));
      allPass = false;
      continue;
    }

    const verdictOk = typeof json.verdict?.text === "string" && json.verdict.text.length > 10;
    console.log(`verdict 존재: ${verdictOk ? "PASS" : "FAIL"} — "${json.verdict?.text?.slice(0, 60)}..."`);
    if (!verdictOk) allPass = false;

    // 나이 오류 수정 확인: 대운 시작 나이(ageRange)와 실제 현재 나이(currentAge)가
    // 둘 다 명시적으로 구분되어 등장해야 한다 — "지금 만 OO세, XX세부터 이어지는".
    const ageOk = /지금 만 \d+세, \d+세부터 이어지는/.test(json.verdict?.text ?? "");
    console.log(`실제 현재 나이 표기(지금 만 OO세, XX세부터): ${ageOk ? "PASS" : "FAIL"}`);
    if (!ageOk) allPass = false;

    const idOk = VALID_IDS.has(json.primaryCandidateId);
    console.log(`primaryCandidateId(${json.primaryCandidateId}) 유효: ${idOk ? "PASS" : "FAIL"}`);
    if (!idOk) allPass = false;

    const wealthTypeOk = VALID_WEALTH_TYPE_CODES.has(json.wealthType?.code);
    console.log(`wealthType.code(${json.wealthType?.code}) 유효: ${wealthTypeOk ? "PASS" : "FAIL"}`);
    if (!wealthTypeOk) allPass = false;

    const cautionsOk = Array.isArray(json.freeReport?.report?.cautions) && json.freeReport.report.cautions.length >= 1;
    const strengthsOk = Array.isArray(json.freeReport?.report?.strengths) && json.freeReport.report.strengths.length >= 1;
    console.log(`cautions/strengths 존재(미니리딩 티저용): ${cautionsOk && strengthsOk ? "PASS" : "FAIL"}`);
    if (!(cautionsOk && strengthsOk)) allPass = false;

    // 재호출 결정론 확인
    const second = await call(c.body);
    const stable =
      second.json.primaryCandidateId === json.primaryCandidateId &&
      second.json.verdict?.text === json.verdict?.text &&
      second.json.wealthType?.code === json.wealthType?.code;
    console.log(`동일 입력 재호출 결정론: ${stable ? "PASS" : "FAIL"}`);
    if (!stable) allPass = false;
  }

  console.log(`\n\n=== 결과: ${allPass ? "ALL PASS" : "일부 FAIL"} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 파일: scripts/test-wealth-type.mjs
```mjs
// 재물 유형(작업 B) 분포 검증. wealthType.code는 4개 값(ACCUM/LEAK/HOLD/
// TIGHT)만 가능한데, 이 4개가 실제로 다 나오는(=버는힘/지키는힘 공식이
// 한쪽으로 쏠려있지 않은) 생년월일 조합이 있는지 규칙적으로(무작위 아님)
// 순회해서 확인한다.

const BASE = "http://localhost:3000";

function makeCase(i) {
  return {
    year: 1960 + i,
    month: (i % 12) + 1,
    day: (i % 28) + 1,
    hour: i % 2 === 0 ? (i * 3) % 24 : null,
    minute: 0,
    gender: i % 2 === 0 ? "남" : "여",
  };
}

async function call(body) {
  const res = await fetch(`${BASE}/api/saju`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  const N = 40;
  const distribution = { ACCUM: 0, LEAK: 0, HOLD: 0, TIGHT: 0, missing: 0 };

  for (let i = 0; i < N; i++) {
    const { status, json } = await call(makeCase(i));
    if (status !== 200 || !json.wealthType) {
      distribution.missing++;
      continue;
    }
    distribution[json.wealthType.code] = (distribution[json.wealthType.code] ?? 0) + 1;
  }

  console.log(`\n=== 재물 유형 분포 (${N}건 규칙적 순회) ===`);
  console.log(JSON.stringify(distribution, null, 2));

  const allFourAppeared = ["ACCUM", "LEAK", "HOLD", "TIGHT"].every((code) => distribution[code] > 0);
  console.log(`\n4개 유형 전부 최소 1회 이상 등장: ${allFourAppeared ? "PASS" : "FAIL"}`);

  process.exit(allFourAppeared ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 파일: src/app/api/palm/interpret/route.ts
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts, type SajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { getFreeSajuReport } from "@/lib/free-report-engine";
import { isPalmFactsUsable, type PalmFacts } from "@/lib/palm-facts";
import { scorePersonalityCheck } from "@/lib/personality-check";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { buildFortuneCandidates, selectPrimaryCandidate } from "@/lib/fortune-candidates";
import { buildTripleCompare } from "@/lib/triple-compare";
import { buildLifetimeStory, buildComprehensiveVerdict } from "@/lib/real-world-personalization";
import { classifyWealthType } from "@/lib/wealth-type";

// 손금 이미지 자체는 서버로 오지 않는다 — 클라이언트에서 MediaPipe/ONNX로
// 이미 분석해 만든 PalmFacts(구조화 JSON)만 받는다. palmFacts가 없으면
// "손금 없이 계속 보기"(반복 실패 후 또는 처음부터 건너뛴 경우) 요청으로
// 보고 사주만으로 최종 통합 리포트를 만든다 — 실패한 손금을 성공한 것처럼
// 꾸며서 보여주는 fallback은 절대 하지 않는다. palmFacts가 있는데 실제 ONNX
// 기준으로 쓸 수 없는 상태면(isPalmFactsUsable) 해석을 만들지 않고 재촬영
// 사유를 그대로 돌려준다.
//
// 최종 통합 리포트(getFreeSajuReport)가 이 라우트의 유일한 리포트 생성
// 경로다 — 이전에는 별도의 cross-interpretation 파이프라인이 "손금×사주
// 공통점/차이점" 섹션을 따로 만들어 finalReport 앞에 붙였는데, 이는 결국
// 사주/손금/자기보고를 세 덩어리로 이어붙이는 구조였다. 이번에는 그 비교
// 로직을 free-report-mock.ts의 관련 주제별 섹션(재물 구조/의사결정/사람과
// 돈/기회) 안으로 옮겨서, 진짜 하나의 리포트로 만든다.

const onnxLineDetailSchema = z.object({
  detected: z.boolean(),
  length: z.enum(["짧음", "보통", "김"]).nullable(),
  curve: z.enum(["완만한 곡선", "직선에 가까움"]).nullable(),
  depthStrength: z.enum(["약함", "보통", "강함"]).nullable(),
  start: z.object({ x: z.number(), y: z.number() }).nullable(),
  end: z.object({ x: z.number(), y: z.number() }).nullable(),
  branchDetected: z.null(),
});

const onnxPalmLinesSchema = z.object({
  modelExecuted: z.literal(true),
  heartLine: onnxLineDetailSchema,
  headLine: onnxLineDetailSchema,
  lifeLine: onnxLineDetailSchema,
  fateLine: z.object({ presence: z.literal("unknown"), note: z.string() }),
  mounts: z.literal("unknown"),
  marks: z.literal("unknown"),
});

const palmFactsSchema = z.object({
  handSide: z.enum(["left", "right", "unknown"]),
  imageQuality: z.enum(["good", "no_hand_detected", "too_dark", "hand_cropped"]),
  handShape: z.enum(["square", "rectangular", "elongated", "slender", "unknown"]),
  majorLines: z.array(z.enum(["생명선", "감정선", "두뇌선"])),
  lineFeatures: z.array(
    z.object({
      name: z.enum(["생명선", "감정선", "두뇌선"]),
      detected: z.boolean(),
      length: z.enum(["짧음", "보통", "김"]).nullable(),
      direction: z.enum(["완만한 곡선", "직선에 가까움"]).nullable(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  /** 실제 ONNX 모델(samuelwbarber/palm-line-reader) 추론 결과. 클라이언트에서
   * 추론이 실패했으면 null — 서버는 그 값을 그대로 통과시킨다(억지로 채우지 않음). */
  onnxLines: onnxPalmLinesSchema.nullable(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  /** 없으면(null/undefined) "손금 없이 계속 보기" 요청으로 처리한다. */
  palmFacts: palmFactsSchema.nullable().optional(),
  personalityAnswers: z.record(z.string(), z.number().min(1).max(5)).optional(),
  mbti: z.enum(MBTI_TYPES).optional(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const palmFacts = (parsed.data.palmFacts ?? null) as PalmFacts | null;
  const palmSkipped = palmFacts === null;

  if (palmFacts && !isPalmFactsUsable(palmFacts)) {
    return NextResponse.json({
      usable: false,
      palmSkipped: false,
      warnings:
        palmFacts.warnings.length > 0
          ? palmFacts.warnings
          : ["손금선이 충분히 읽히지 않았어요. 손바닥 전체가 보이게 밝은 곳에서 다시 촬영해주세요."],
    });
  }

  try {
    const shallowFacts = computeSajuFacts(parsed.data);
    // 재물 유형은 순수 ssaju 십성 카운트만 쓴다 — oh-my-saju 서브프로세스
    // 성공 여부와 무관해야 하므로 enrichSajuFacts 호출 전에 계산한다
    // (api/saju/route.ts와 같은 패턴).
    const wealthType = classifyWealthType(shallowFacts);
    const deepFacts: SajuFacts = enrichSajuFacts(shallowFacts, parsed.data);

    const personalityCheck = parsed.data.personalityAnswers ? scorePersonalityCheck(parsed.data.personalityAnswers) : null;
    const mbti = parsed.data.mbti ?? null;

    const onnxLines = palmFacts?.onnxLines ?? null;
    const personality = { mbti, check: personalityCheck };
    const freeReportResult = await getFreeSajuReport(deepFacts, {
      timeoutMs: 9000,
      personality,
    });
    const fortuneCandidates = buildFortuneCandidates(deepFacts, onnxLines);
    const tripleCompare = buildTripleCompare(deepFacts, onnxLines, personalityCheck);
    const lifetimeStory = buildLifetimeStory(deepFacts, personality, onnxLines);
    // 종합판정(무료 경험의 클라이맥스)과 추천 흐름 1개 — 새 계산 없이
    // 이미 만들어둔 신호만 재조합한다.
    const verdict = buildComprehensiveVerdict(deepFacts, personality, onnxLines);
    const primaryCandidateId = selectPrimaryCandidate(deepFacts, fortuneCandidates).id;

    return NextResponse.json({
      usable: true,
      palmSkipped,
      palmFacts,
      freeReport: { source: freeReportResult.source, report: freeReportResult.report },
      fortuneCandidates,
      tripleCompare,
      lifetimeStory,
      verdict,
      primaryCandidateId,
      wealthType,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "리포트 생성 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

### 파일: src/app/api/saju/interpret/route.ts
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts } from "@/lib/saju-facts";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "@/lib/interpretation-prompt";
import { getInterpretation } from "@/lib/interpretation-engine";

// 단독 테스트/디버그용 엔드포인트. 실제 화면(/diagnosis)은 이 라우트를
// 호출하지 않고 /api/saju가 같은 엔진을 내부에서 직접 호출한다
// (왕복 1회로 줄이기 위함). 여기서는 프롬프트 원문도 함께 반환해
// scripts/test-interpretation.mjs 등에서 검증할 수 있게 한다.

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const facts = computeSajuFacts(parsed.data);
    const result = await getInterpretation(facts);

    return NextResponse.json({
      source: result.source,
      facts,
      prompt: { system: INTERPRETATION_SYSTEM_PROMPT, user: buildInterpretationUserPrompt(facts) },
      interpretation: result.interpretation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "해석 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
```

### 파일: src/app/api/saju/route.ts
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnoseSaju, type FullSajuDiagnosis } from "@/lib/saju";
import { computeSajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { getInterpretation } from "@/lib/interpretation-engine";
import { getFreeSajuReport } from "@/lib/free-report-engine";
import { scorePersonalityCheck } from "@/lib/personality-check";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { buildLifetimeStory } from "@/lib/real-world-personalization";
import { buildMyeongsikView } from "@/lib/myeongsik-view";
import { classifyWealthType } from "@/lib/wealth-type";

// 실제 진단 화면(/diagnosis)이 호출하는 유일한 엔드포인트.
// 요청 1회로 (1) 얕은 사주팔자+money-tendency(fallback/게이지 근거로 항상 유지)
// 와 (2) 딥 해석(ssaju facts -> Claude 또는 mock -> 검증)을 함께 계산해
// 왕복을 늘리지 않는다. 딥 파이프라인이 어떤 이유로든 실패해도 얕은 결과는
// 항상 반환되므로 화면이 통째로 실패하지 않는다.

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  /** 성향 스텝은 완전히 선택 사항 — 안 보내면 undefined */
  personalityAnswers: z.record(z.string(), z.number().min(1).max(5)).optional(),
  mbti: z.enum(MBTI_TYPES).optional(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let shallow;
  try {
    shallow = diagnoseSaju(parsed.data);
  } catch {
    return NextResponse.json(
      { error: "사주 계산 중 문제가 발생했습니다." },
      { status: 500 },
    );
  }

  // 딥 파이프라인(유료 업셀용 8필드)과 무료 사주 V2(12섹션)는 서로 독립
  // 시도한다 — 하나가 실패해도 다른 하나는 화면에 나갈 수 있어야 한다.
  let deep: FullSajuDiagnosis["deep"] = null;
  let resultSource: FullSajuDiagnosis["resultSource"] = "fallback";
  let freeReport: FullSajuDiagnosis["freeReport"] = null;
  let daeunAnalysis: FullSajuDiagnosis["daeunAnalysis"] = null;
  let lifetimeStory: FullSajuDiagnosis["lifetimeStory"] = null;
  let myeongsik: FullSajuDiagnosis["myeongsik"] = null;
  let wealthType: FullSajuDiagnosis["wealthType"] = null;

  try {
    const shallowFacts = computeSajuFacts(parsed.data);
    // 재물 유형은 순수 ssaju 십성 카운트만 쓴다 — oh-my-saju 서브프로세스
    // 성공 여부와 무관해야 하므로 enrichSajuFacts 호출 전에 계산한다.
    wealthType = classifyWealthType(shallowFacts);
    const facts = enrichSajuFacts(shallowFacts, parsed.data);
    myeongsik = buildMyeongsikView(facts);
    daeunAnalysis = facts.daeunAnalysis;
    const personality = {
      mbti: parsed.data.mbti ?? null,
      check: parsed.data.personalityAnswers ? scorePersonalityCheck(parsed.data.personalityAnswers) : null,
    };
    lifetimeStory = buildLifetimeStory(facts, personality, null);

    const [interpretationResult, freeReportResult] = await Promise.all([
      getInterpretation(facts, { timeoutMs: 9000 }).catch((err) => {
        console.error("deep interpretation pipeline failed:", err);
        return null;
      }),
      getFreeSajuReport(facts, { timeoutMs: 9000, personality }).catch((err) => {
        console.error("free saju report pipeline failed:", err);
        return null;
      }),
    ]);

    if (interpretationResult) {
      deep = {
        source: interpretationResult.source,
        interpretation: interpretationResult.interpretation,
        evidencePreview: interpretationResult.interpretation.evidence.slice(0, 3),
      };
      resultSource = "deep";
    }

    if (freeReportResult) {
      freeReport = { source: freeReportResult.source, report: freeReportResult.report };
    }
  } catch (err) {
    // facts 계산 자체(ssaju 등)가 실패한 경우. 로그만 남기고 fallback으로 응답한다.
    console.error("saju facts computation failed, falling back to shallow result:", err);
  }

  const payload: FullSajuDiagnosis = {
    ...shallow,
    resultSource,
    deep,
    freeReport,
    birthInput: parsed.data,
    personalityInput: {
      personalityAnswers: parsed.data.personalityAnswers ?? null,
      mbti: parsed.data.mbti ?? null,
    },
    daeunAnalysis,
    lifetimeStory,
    myeongsik,
    wealthType,
  };
  return NextResponse.json(payload);
}
```

### 파일: src/app/diagnosis/page.tsx
```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/diagnosis/step-shell";
import { BirthDateStep } from "@/components/diagnosis/birth-date-step";
import { BirthTimeStep } from "@/components/diagnosis/birth-time-step";
import { PersonalityStep } from "@/components/diagnosis/personality-step";
import { LoadingStep } from "@/components/diagnosis/loading-step";
import { ResultStep } from "@/components/diagnosis/result-step";
import type { FullSajuDiagnosis } from "@/lib/saju";
import type { MbtiType } from "@/lib/mbti-facts";

// 확정된 최종 퍼널: 생년월일+성별 -> 출생시간 -> MBTI+6문항 성향체크 -> 1차
// 무료 결과 -> (손금은 별도 라우트 /diagnosis/palm에서 최종 통합 리포트까지
// 이어짐). MBTI는 triple-compare.ts의 결정 방식/관계-감정 축 네 번째
// 신호로 실제로 쓰인다 — 사주 계산값을 바꾸는 용도가 아니다.
// 손금 이후 다시 여기로 돌아와 질문을 더 받는 단계(money-check/summary)는
// 없다 — 결제 뒤/후반에 추가 질문을 만들지 않는다는 원칙에 따라 완전히 제거했다.
type Step = "date" | "time" | "personality" | "loading" | "result" | "error";

const STEP_ORDER: Step[] = ["date", "time", "personality", "loading", "result"];

// 서버 쪽 이론상 최대 처리시간: enrichSajuFacts의 oh-my-saju 서브프로세스
// 타임아웃(6초) + 그 뒤 Promise.all로 동시 실행되는 딥해석/무료리포트 각각의
// 9초 타임아웃(둘은 동시라 합산 아님) = 최대 15초. 여기에 Vercel 서버리스
// 콜드스타트(자식 프로세스 최초 spawn 등) 여유를 더해야 하므로, 클라이언트
// 타임아웃을 15초에 딱 맞추면 콜드스타트 상황에서 실제로는 성공할 요청이
// 그냥 잘려나간다 — 30초로 넉넉히 잡는다.
const CLIENT_TIMEOUT_MS = 30000;

// 새로고침하면 결과가 통째로 날아가고 처음부터 다시 해야 하는 문제 대응 —
// 완료된 진단을 세션 저장소에 남겨 같은 탭에서 새로고침해도 복원한다.
// 서버에 아무것도 저장하지 않고(고유 결과 URL 등은 범위 밖), 브라우저를
// 닫으면 사라지는 가벼운 수준으로만 처리한다.
const STORAGE_KEY = "saju-app:diagnosis-session:v1";

interface StoredSession {
  birthDate: string;
  gender: "남" | "여";
  knowsTime: boolean;
  birthTime: string;
  personalityAnswers: Record<string, number>;
  mbti: MbtiType | "모름";
  diagnosis: FullSajuDiagnosis;
}

export default function DiagnosisPage() {
  const [step, setStep] = useState<Step>("date");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"남" | "여">("남");
  const [knowsTime, setKnowsTime] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, number>>({});
  const [mbti, setMbti] = useState<MbtiType | "모름">("모름");
  const [diagnosis, setDiagnosis] = useState<FullSajuDiagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // sessionStorage(외부 시스템)에서 복원하는 마운트 1회성 동기화라 useEffect가
  // 맞는 자리다(React 공식 가이드의 "외부 시스템과 동기화" 케이스) — 서버
  // 렌더에는 sessionStorage가 없어 useState 지연 초기화로 옮기면 하이드레이션
  // 불일치가 난다. react-hooks/set-state-in-effect는 "다른 state에서 파생되는
  // state"를 잡기 위한 규칙이라 이 케이스엔 해당하지 않는다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: StoredSession = JSON.parse(raw);
      if (!saved?.diagnosis) return;
      /* eslint-disable react-hooks/set-state-in-effect */
      setBirthDate(saved.birthDate);
      setGender(saved.gender);
      setKnowsTime(saved.knowsTime);
      setBirthTime(saved.birthTime);
      setPersonalityAnswers(saved.personalityAnswers);
      setMbti(saved.mbti);
      setDiagnosis(saved.diagnosis);
      setStep("result");
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // 세션 저장소를 못 읽어도(프라이빗 모드 등) 그냥 처음부터 진행한다.
    }
  }, []);

  function restart() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 저장소 접근 불가는 무시 — 어차피 폼 상태는 아래에서 초기화된다.
    }
    setBirthDate("");
    setKnowsTime(false);
    setBirthTime("");
    setPersonalityAnswers({});
    setMbti("모름");
    setDiagnosis(null);
    setStep("date");
  }

  async function handleFetchDiagnosis() {
    setStep("loading");
    setError(null);

    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = knowsTime && birthTime
      ? birthTime.split(":").map(Number)
      : [null, null];

    // 서버가 아예 응답하지 않는 경우까지 대비한 클라이언트 측 안전장치.
    // 인위적으로 로딩을 늘리는 지연은 넣지 않는다 — 실제 계산에 걸리는
    // 시간만큼만 기다린다.
    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const hasPersonality = Object.keys(personalityAnswers).length > 0;
      const res = await fetch("/api/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          day,
          hour,
          minute,
          gender,
          personalityAnswers: hasPersonality ? personalityAnswers : undefined,
          mbti: mbti !== "모름" ? mbti : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("failed");
      const data: FullSajuDiagnosis = await res.json();
      setDiagnosis(data);
      setStep("result");
      try {
        const toStore: StoredSession = { birthDate, gender, knowsTime, birthTime, personalityAnswers, mbti, diagnosis: data };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // 저장 실패(용량 초과, 프라이빗 모드 등)해도 이번 화면 표시엔 지장 없다.
      }
    } catch (err) {
      // 입력값(생년월일)을 다시 그리는 "date" 스텝으로 조용히 되돌리면,
      // 사용자는 자기가 입력한 값이 사라졌다고 오해하고 버튼이 안 먹힌다고
      // 생각하기 쉽다 — 전용 에러 스텝에서 같은 입력값 그대로 재시도할 수
      // 있게 한다. 타임아웃(AbortError)과 그 외 실패를 구분해 안내한다.
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setError(
        isTimeout
          ? "서버 응답이 평소보다 오래 걸리고 있어요. 네트워크 상태를 확인하고 다시 시도해주세요."
          : "진단 계산 중 문제가 생겼어요. 다시 시도해주세요.",
      );
      setStep("error");
    } finally {
      clearTimeout(clientTimeout);
    }
  }

  // "error"는 별도 갈래(재시도용)라 진행바 기준 스텝 순서에는 없다 —
  // 직전까지 진행한 위치(loading 직전, 즉 personality)만큼 채워서 보여준다.
  const progressStep = step === "error" ? "personality" : step;
  const progress = ((STEP_ORDER.indexOf(progressStep) + 1) / STEP_ORDER.length) * 100;

  return (
    <StepShell stepKey={step} progress={progress}>
      {step === "date" && (
        <BirthDateStep
          value={birthDate}
          onChange={setBirthDate}
          gender={gender}
          onGenderChange={setGender}
          onNext={() => setStep("time")}
        />
      )}

      {step === "time" && (
        <BirthTimeStep
          knowsTime={knowsTime}
          time={birthTime}
          onKnowsTimeChange={setKnowsTime}
          onTimeChange={setBirthTime}
          onNext={() => setStep("personality")}
          onBack={() => setStep("date")}
        />
      )}

      {step === "personality" && (
        <PersonalityStep
          personalityAnswers={personalityAnswers}
          onPersonalityChange={(id, value) => setPersonalityAnswers((prev) => ({ ...prev, [id]: value }))}
          mbti={mbti}
          onMbtiChange={setMbti}
          onNext={handleFetchDiagnosis}
          onSkip={() => {
            setPersonalityAnswers({});
            setMbti("모름");
            handleFetchDiagnosis();
          }}
          onBack={() => setStep("time")}
        />
      )}

      {step === "loading" && <LoadingStep />}

      {step === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
          <Button size="lg" onClick={handleFetchDiagnosis} className="h-13 w-full max-w-xs rounded-full text-base">
            다시 시도하기
          </Button>
          <button
            type="button"
            onClick={restart}
            className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
          >
            처음부터 다시 입력할게요
          </button>
        </div>
      )}

      {step === "result" && diagnosis && (
        <>
          <ResultStep diagnosis={diagnosis} />
          <button
            type="button"
            onClick={restart}
            className="mt-6 w-full text-center text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
          >
            다른 생년월일로 다시 보기
          </button>
        </>
      )}
    </StepShell>
  );
}
```

### 파일: src/app/diagnosis/palm/page.tsx
```tsx
import { PalmPageClient } from "@/components/palm/palm-page-client";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti-facts";

function parseBirthInput(sp: Record<string, string | string[] | undefined>): BirthInput | null {
  const get = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hourRaw = get("hour");
  const minuteRaw = get("minute");
  const gender = get("gender");

  if (!year || !month || !day || (gender !== "남" && gender !== "여")) return null;

  return {
    year,
    month,
    day,
    hour: hourRaw ? Number(hourRaw) : null,
    minute: minuteRaw ? Number(minuteRaw) : null,
    gender,
  };
}

/** 무료 사주 단계에서 넘어온 성향정보를 압축 형식(id:value,id:value)에서 복원.
 * 형식이 이상하면 그냥 무시한다(손금 핵심 흐름을 막으면 안 됨). */
function parsePersonalityInput(sp: Record<string, string | string[] | undefined>): PersonalityInputEcho {
  const get = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const pcRaw = get("pc");
  const personalityAnswers: Record<string, number> | null = pcRaw
    ? Object.fromEntries(
        pcRaw
          .split(",")
          .map((pair) => pair.split(":"))
          .filter((pair): pair is [string, string] => pair.length === 2 && !Number.isNaN(Number(pair[1])))
          .map(([id, v]) => [id, Number(v)]),
      )
    : null;

  const mbtiRaw = get("mbti");
  const mbti: MbtiType | null = mbtiRaw && (MBTI_TYPES as readonly string[]).includes(mbtiRaw) ? (mbtiRaw as MbtiType) : null;

  return {
    personalityAnswers: personalityAnswers && Object.keys(personalityAnswers).length > 0 ? personalityAnswers : null,
    mbti,
  };
}

export default async function PalmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const birthInput = parseBirthInput(sp);
  const personalityInput = parsePersonalityInput(sp);

  return <PalmPageClient birthInput={birthInput} personalityInput={personalityInput} />;
}
```

### 파일: src/app/global-error.tsx
```tsx
"use client";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", textAlign: "center", padding: "1.5rem" }}>
        <h2>일시적인 오류가 발생했어요</h2>
        <button onClick={() => retry()} style={{ marginTop: "1rem" }}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
```

### 파일: src/app/globals.css
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "pretendard/dist/web/variable/pretendardvariable.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --font-sans: "Pretendard Variable", Pretendard, -apple-system, "Malgun Gothic", sans-serif;
  /* 현대적 동양미 + 프리미엄 신비감: 딥 틸(청록) 배경에, 포인트는 절제된
   * 채도의 에메랄드 그린("재물/돈"과 직관적으로 연결되는 색). A/B 비교
   * 끝에 5개 후보(기본/에메랄드/버건디/바이올렛/틸) 중 틸을 확정.
   * --gold/--gold-soft 변수명은 하위 호환을 위해 유지하되(수십 개
   * 컴포넌트가 참조 중) 실제 값은 에메랄드 그린이다. */
  --background: oklch(0.28 0.035 200);
  --foreground: oklch(0.95 0.012 85);
  --card: oklch(0.33 0.04 200);
  --card-foreground: oklch(0.95 0.012 85);
  --popover: oklch(0.33 0.04 200);
  --popover-foreground: oklch(0.95 0.012 85);
  --primary: oklch(0.66 0.1 162);
  --primary-foreground: oklch(0.14 0.03 158);
  --secondary: oklch(0.4 0.035 200);
  --secondary-foreground: oklch(0.95 0.012 85);
  --muted: oklch(0.38 0.032 200);
  --muted-foreground: oklch(0.72 0.035 158);
  --accent: oklch(0.46 0.06 200);
  --accent-foreground: oklch(0.92 0.05 150);
  --destructive: oklch(0.62 0.21 25);
  --border: oklch(0.7 0.06 158 / 16%);
  --input: oklch(0.7 0.06 158 / 18%);
  --ring: oklch(0.66 0.1 162);
  --gold: oklch(0.66 0.1 162);
  --gold-soft: oklch(0.66 0.1 162 / 32%);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.17 0.012 280);
  --foreground: oklch(0.94 0.006 80);
  --card: oklch(0.21 0.014 280);
  --card-foreground: oklch(0.94 0.006 80);
  --popover: oklch(0.21 0.014 280);
  --popover-foreground: oklch(0.94 0.006 80);
  --primary: oklch(0.72 0.12 285);
  --primary-foreground: oklch(0.17 0.012 280);
  --secondary: oklch(0.27 0.016 280);
  --secondary-foreground: oklch(0.94 0.006 80);
  --muted: oklch(0.27 0.016 280);
  --muted-foreground: oklch(0.68 0.014 270);
  --accent: oklch(0.3 0.04 285);
  --accent-foreground: oklch(0.9 0.02 285);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.6 0.1 285);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}

/* 은은한 빛/입자 모티프 및 잠금 카드 리빌용 모션 프리미티브 */
@keyframes float-soft {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.55;
  }
  50% {
    transform: translateY(-14px) scale(1.05);
    opacity: 0.85;
  }
}

@keyframes orbit-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer-sweep {
  0% {
    background-position: -150% 0;
  }
  100% {
    background-position: 150% 0;
  }
}

.animate-float-soft {
  animation: float-soft 6.5s ease-in-out infinite;
}

.animate-orbit-spin {
  animation: orbit-spin 40s linear infinite;
}

.blur-teaser {
  filter: blur(3.5px);
  -webkit-user-select: none;
  user-select: none;
}

.shimmer-text {
  background: linear-gradient(
    100deg,
    var(--muted-foreground) 40%,
    var(--gold) 50%,
    var(--muted-foreground) 60%
  );
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer-sweep 2.4s ease-in-out infinite;
}

/* 별빛 배경 및 명식 카드 공용 프리미티브 */
@keyframes twinkle {
  0%,
  100% {
    opacity: var(--twinkle-min, 0.15);
    transform: scale(0.85);
  }
  50% {
    opacity: var(--twinkle-max, 0.9);
    transform: scale(1);
  }
}

.animate-twinkle {
  animation: twinkle var(--twinkle-duration, 3.5s) ease-in-out infinite;
}

.mystic-card {
  position: relative;
  border-radius: var(--radius-2xl);
  border: 1px solid var(--gold-soft);
  background:
    radial-gradient(circle at 15% -10%, var(--gold-soft), transparent 45%),
    var(--card);
}

.mystic-ring {
  box-shadow:
    0 0 0 1px var(--gold-soft),
    0 12px 40px -18px oklch(0.66 0.1 162 / 45%);
}

/* 결과를 3~5분 읽는 화면 전용 밝은 테마. 랜딩/입력 단계의 어두운 신비 테마는
 * 그대로 두고, 이 클래스로 감싼 하위 트리에서만 변수를 덮어써 가독성을
 * 우선한다(카드보다 문단 중심, 아이보리 배경 + 짙은 먹색/네이비 본문,
 * 에메랄드 그린은 포인트로만 — 어두운 테마와 동일한 브랜드 컬러를 유지해
 * 화면이 전환돼도 "재물운=에메랄드" 톤이 이어지게 한다). mystic-card/
 * mystic-ring 등 기존 컴포넌트는 var(--card)/var(--gold) 등을 그대로
 * 참조하므로 별도 리팩터 없이 밝은 톤으로 자연스럽게 전환된다. */
.result-bright {
  --background: oklch(0.975 0.01 85);
  --foreground: oklch(0.26 0.03 265);
  --card: oklch(0.995 0.006 85);
  --card-foreground: oklch(0.26 0.03 265);
  --popover: oklch(0.995 0.006 85);
  --popover-foreground: oklch(0.26 0.03 265);
  --primary: oklch(0.4 0.09 162);
  --primary-foreground: oklch(0.98 0.006 85);
  --secondary: oklch(0.94 0.014 85);
  --secondary-foreground: oklch(0.26 0.03 265);
  --muted: oklch(0.94 0.014 85);
  --muted-foreground: oklch(0.47 0.025 265);
  --accent: oklch(0.92 0.035 155);
  --accent-foreground: oklch(0.32 0.08 160);
  --destructive: oklch(0.55 0.19 25);
  --border: oklch(0.3 0.03 265 / 12%);
  --input: oklch(0.3 0.03 265 / 14%);
  --ring: oklch(0.42 0.1 162);
  --gold: oklch(0.42 0.1 162);
  --gold-soft: oklch(0.42 0.1 162 / 16%);

  background: var(--background);
  color: var(--foreground);
}

.result-bright p,
.result-bright li {
  line-height: 1.7;
}
```

### 파일: src/app/layout.tsx
```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Starfield } from "@/components/ui/starfield";

export const metadata: Metadata = {
  title: "나는 돈을 끌어당기는 사람일까, 놓치는 사람일까?",
  description: "내 사주엔 큰돈이 들어오는 때가 있을까? 생년월일로 알아보는 나의 재물운 무료 진단",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Starfield />
        {children}
      </body>
    </html>
  );
}
```

### 파일: src/app/page.tsx
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { HeroVisual } from "@/components/landing/hero-visual";
import { DestinyCardPreview } from "@/components/landing/destiny-card-preview";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <LandingReveal>
        <HeroVisual />

        <p className="mb-4 text-sm font-medium tracking-wide text-(--gold)">
          1분이면 끝나는 무료 사주 진단
        </p>
        <h1 className="mx-auto max-w-xs text-balance text-4xl leading-snug font-semibold tracking-tight">
          나는 돈을
          <br />
          끌어당기는 사람일까,
          <br />
          놓치는 사람일까?
        </h1>
        <p className="mx-auto mt-5 max-w-xs text-balance text-base leading-relaxed text-muted-foreground">
          사주로 내 돈 습관을 읽고,
          <br />
          바꿀 수 있는 것부터 알려드립니다.
        </p>

        <DestinyCardPreview />

        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="h-13 w-full max-w-xs rounded-full text-base shadow-[0_0_24px_var(--gold-soft)]"
          >
            <Link href="/diagnosis">내 재물운 무료로 확인하기</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>1분 무료 진단</span>
          <span aria-hidden="true">·</span>
          <span>결과 이미지 저장 가능</span>
          <span aria-hidden="true">·</span>
          <span>출생시간 몰라도 진행 가능</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          재미로 보는 콘텐츠예요. 특정 금융상품을 권유하지 않아요.
        </p>
      </LandingReveal>
    </main>
  );
}
```

### 파일: src/components/diagnosis/birth-date-step.tsx
```tsx
"use client";

import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepBadge } from "@/components/diagnosis/step-badge";

export function BirthDateStep({
  value,
  onChange,
  gender,
  onGenderChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  gender: "남" | "여";
  onGenderChange: (v: "남" | "여") => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Moon className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        생년월일을
        <br />
        알려주세요
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        사주는 양력 날짜 기준으로 계산돼요. 음력 생일만 알고 계시다면 양력으로 변환한 날짜를 입력해주세요. 대운 방향 계산에 성별도 함께 써요.
      </p>

      <div className="mystic-card mt-10 flex flex-col gap-2 p-5">
        <Label htmlFor="birthDate" className="text-(--gold)">
          생년월일
        </Label>
        <Input
          id="birthDate"
          type="date"
          value={value}
          min="1930-01-01"
          max="2020-12-31"
          onChange={(e) => onChange(e.target.value)}
          className="h-13 border-none bg-transparent p-0 text-base focus-visible:ring-0"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["남", "여"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGenderChange(g)}
            className={`rounded-xl border p-3 text-sm font-medium transition-colors ${
              gender === g ? "mystic-card border-(--gold-soft)" : "border-border"
            }`}
          >
            {g}성
          </button>
        ))}
      </div>

      <div className="mt-auto pt-10">
        <Button
          size="lg"
          disabled={!value}
          onClick={onNext}
          className="h-13 w-full rounded-full text-base"
        >
          다음
        </Button>
      </div>
    </div>
  );
}
```

### 파일: src/components/diagnosis/birth-time-step.tsx
```tsx
"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepBadge } from "@/components/diagnosis/step-badge";

export function BirthTimeStep({
  knowsTime,
  time,
  onKnowsTimeChange,
  onTimeChange,
  onNext,
  onBack,
}: {
  knowsTime: boolean;
  time: string;
  onKnowsTimeChange: (v: boolean) => void;
  onTimeChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Clock className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        태어난 시간도
        <br />
        알고 있나요?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        시간까지 입력하면 더 정확하게 볼 수 있어요. 몰라도 괜찮아요.
      </p>

      <div className="mt-10 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => onKnowsTimeChange(true)}
          className={`rounded-xl border p-4 text-left transition-colors ${
            knowsTime ? "mystic-card border-(--gold-soft)" : "border-border"
          }`}
        >
          <p className="text-sm font-medium">시간을 알아요</p>
        </button>

        {knowsTime && (
          <div className="mystic-card flex flex-col gap-2 p-5">
            <Label htmlFor="birthTime" className="text-(--gold)">
              출생 시간
            </Label>
            <Input
              id="birthTime"
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="h-13 border-none bg-transparent p-0 text-base focus-visible:ring-0"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => onKnowsTimeChange(false)}
          className={`rounded-xl border p-4 text-left transition-colors ${
            !knowsTime ? "mystic-card border-(--gold-soft)" : "border-border"
          }`}
        >
          <p className="text-sm font-medium">모르겠어요</p>
        </button>
      </div>

      <div className="mt-auto flex gap-2 pt-10">
        <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
          이전
        </Button>
        <Button
          size="lg"
          disabled={knowsTime && !time}
          onClick={onNext}
          className="h-13 flex-1 rounded-full text-base"
        >
          내 재물운 보기
        </Button>
      </div>
    </div>
  );
}
```

### 파일: src/components/diagnosis/daeun-flow-section.tsx
```tsx
"use client";

import { ReportSection } from "@/components/diagnosis/report-section";
import { daeunFlavor } from "@/lib/fortune-candidates";
import type { MyeongsikView } from "@/lib/myeongsik-view";

/** 명식·재물유형 다음, 손금으로 넘어가기 전에 두는 "지금 이 시기" 흐름
 * 섹션. 이미 계산된 대운(currentDaeun/nextDaeun)을 노출만 한다 — 새 계산
 * 없음. 이전에는 명식 섹션 맨 아래 한 줄로만 붙어 있던 걸 별도 섹션으로
 * 승격했다(무료 결과 화면 순서 재배치). */
export function DaeunFlowSection({ view }: { view: MyeongsikView | null }) {
  if (!view || !view.currentDaeun) return null;

  return (
    <ReportSection title="대운 흐름 — 지금 이 시기">
      <p className="text-sm">
        현재 대운 {view.currentDaeun.ageRange}세 <span className="font-semibold">{view.currentDaeun.ganzhi}</span> —{" "}
        {daeunFlavor(view.currentDaeun)} 시기입니다.
      </p>
      {view.nextDaeun && (
        <p className="mt-2 text-sm text-muted-foreground">
          다음 대운 {view.nextDaeun.ageRange}세 <span className="font-semibold">{view.nextDaeun.ganzhi}</span>부터는{" "}
          {daeunFlavor(view.nextDaeun)} 시기로 넘어갑니다.
        </p>
      )}
    </ReportSection>
  );
}
```

### 파일: src/components/diagnosis/expandable-section.tsx
```tsx
"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

// "핵심 -> 펼쳐보기 -> 잠금" 구조에서 두 번째 단계(무료지만 접혀 있는 영역).
// 탭으로 여는 상호작용이라, 배경 tab이 안 보이는 상태에서 mount될 위험이
// 낮지만(사용자가 직접 클릭해야 열림) 초기값은 그래도 0을 피해 안전하게 둔다.
export function ExpandableSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5 rounded-xl border border-border p-3.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
      >
        {title}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0.5 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0.5 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-3 text-sm leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 파일: src/components/diagnosis/loading-step.tsx
```tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SajuFormingVisual } from "@/components/diagnosis/saju-forming-visual";

// 실제 파이프라인 4단계(사주 계산 -> 구조 분석 -> 재물/직업 흐름 분석 ->
// 개인 해석 생성)에 맞춘 문구. 딥 해석 호출이 오래 걸리면 마지막 문구에서
// 자연스럽게 반복된다. 콜드스타트 등으로 서버가 평소보다 오래 걸릴 때
// "멈춘 것 같다"는 인상을 주지 않도록 5번째 문구를 추가해둔다 — 화면
// 자체(SajuFormingVisual)는 계속 움직이지만, 텍스트도 가만히 있지 않게.
const STATUS_MESSAGES = [
  "사주를 계산하는 중이에요",
  "명식 구조를 분석하는 중이에요",
  "재물·직업 흐름을 분석하는 중이에요",
  "나만의 해석을 만드는 중이에요",
  "거의 다 됐어요, 조금만 더 기다려주세요",
];

export function LoadingStep() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // 마지막 문구에 도달하면 거기서 멈춘다. 딥 해석 호출이 오래 걸려도
      // "처음부터 다시" 도는 것처럼 보이지 않게.
      setStatusIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <SajuFormingVisual />
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={statusIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {STATUS_MESSAGES[statusIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
```

### 파일: src/components/diagnosis/myeongsik-section.tsx
```tsx
"use client";

import { ReportSection } from "@/components/diagnosis/report-section";
import { pillarLifeAreaLabel } from "@/lib/saju-labels";
import type { MyeongsikView } from "@/lib/myeongsik-view";

const PILLAR_LABEL_KO: Record<MyeongsikView["pillars"][number]["pillar"], string> = {
  year: "연주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const FIVE_ELEMENT_ORDER = ["목", "화", "토", "금", "수"];

/** 무료 결과의 실제 차별점 — 이미 계산 중인 명식을 화면에 펼친다(새 계산
 * 없음, 노출만). 판정 방식 근거 문장은 geukgukSource가 실제 oh-my-saju
 * 판정에서 왔을 때만 보여준다 — ssaju 원본 폴백이면 없는 근거를 말하지
 * 않는다. 사주 정확도("잘 맞습니다")는 어디서도 주장하지 않는다. */
export function MyeongsikSection({ view }: { view: MyeongsikView | null }) {
  if (!view) return null;

  return (
    <ReportSection title="명식(命式) — 이 사주의 원국">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              {view.pillars.map((p) => (
                <th key={p.pillar} className="pb-1.5 font-medium">
                  {PILLAR_LABEL_KO[p.pillar]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {view.pillars.map((p) => (
                <td key={`${p.pillar}-stem`} className="rounded-t-lg border border-border bg-card py-2 font-semibold">
                  {p.stemKo ? `${p.stemKo}(${p.stemHanja})` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              {view.pillars.map((p) => (
                <td key={`${p.pillar}-branch`} className="rounded-b-lg border border-t-0 border-border bg-card py-2 font-semibold">
                  {p.branchKo ? `${p.branchKo}(${p.branchHanja})` : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {!view.hasTimeInput && (
        <p className="mt-1.5 text-xs text-muted-foreground">시간을 알면 더 정확해집니다.</p>
      )}

      <p className="mt-4 text-sm font-medium">오행 분포</p>
      <div className="mt-1.5 flex gap-3">
        {FIVE_ELEMENT_ORDER.map((el) => (
          <div key={el} className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">{el}</span>
            <span className="text-sm font-semibold">{view.fiveElements[el] ?? 0}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm">
        격국(格局) <span className="font-semibold">{view.geukguk}</span> · 신강신약(身强身弱){" "}
        <span className="font-semibold">{view.dayStrengthGrade}</span>({view.dayStrengthScore}점)
      </p>
      {view.geukgukSource === "ziping_ditianshui" && (
        <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
          <p>자평진전 방식(월지 지장간 사령·천간 투출)으로 판정</p>
          <p>적천수 방식(일간 기준 통근 위치배점)으로 산출</p>
        </div>
      )}

      <p className="mt-4 text-sm">
        재성 궁위 —{" "}
        {view.wealthStarPillars.length > 0
          ? view.wealthStarPillars.map((p) => pillarLifeAreaLabel(p)).join(", ")
          : "원국에 직접 드러나지 않음"}
      </p>
      <p className="mt-1 text-sm">
        관성 궁위 —{" "}
        {view.officerStarPillars.length > 0
          ? view.officerStarPillars.map((p) => pillarLifeAreaLabel(p)).join(", ")
          : "원국에 직접 드러나지 않음"}
      </p>
    </ReportSection>
  );
}
```

### 파일: src/components/diagnosis/palm-entry-card.tsx
```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";

export function PalmEntryCard({
  birthInput,
  personalityInput,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
}) {
  const params = new URLSearchParams({
    year: String(birthInput.year),
    month: String(birthInput.month),
    day: String(birthInput.day),
    hour: birthInput.hour === null ? "" : String(birthInput.hour),
    minute: birthInput.minute === null ? "" : String(birthInput.minute),
    gender: birthInput.gender,
  });

  // 성향정보를 손금 페이지까지 이어가 "사주+손금+성향" 통합 비교를 만든다.
  // 압축 형식(id:value,id:value)으로만 넘기고, 손금 페이지에서 다시 검증해 채점한다.
  if (personalityInput?.personalityAnswers) {
    params.set(
      "pc",
      Object.entries(personalityInput.personalityAnswers)
        .map(([id, v]) => `${id}:${v}`)
        .join(","),
    );
  }
  if (personalityInput?.mbti) {
    params.set("mbti", personalityInput.mbti);
  }

  return (
    <Link
      href={`/diagnosis/palm?${params.toString()}`}
      className="mystic-card flex items-center gap-3 border-dashed p-4 transition-colors hover:border-(--gold-soft)"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-(--gold-soft)">
        <PalmLineIllustration />
      </span>
      <div className="flex-1">
        <p className="text-sm leading-snug font-medium">
          사주에서 짚은 이 재물의 결, 손에도 같은 흐름이 있을까?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          손금 사진 한 장이면 종합판정까지 이어서 볼 수 있어요.
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-(--gold)" />
    </Link>
  );
}
```

### 파일: src/components/diagnosis/palm-line-illustration.tsx
```tsx
"use client";

// 손금(생명선/감정선/두뇌선)을 추상적인 라인 아트로 표현한 장식용 일러스트.
// 실제 손금 인식/분석과는 무관하며, 손금 업로드 유도 카드에만 사용한다.

import { motion } from "framer-motion";

const LINES = [
  "M20 78 C 30 65, 28 45, 42 30", // 생명선
  "M18 55 C 35 52, 55 50, 78 42", // 감정선
  "M18 62 C 40 66, 60 68, 80 60", // 두뇌선
];

export function PalmLineIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="size-12 shrink-0 text-(--gold)"
    >
      <path
        d="M28 90 C 18 90, 14 78, 16 62 C 17 50, 15 40, 20 25 C 22 18, 30 16, 32 24 C 33 30, 32 36, 33 40 C 34 32, 34 20, 38 16 C 41 13, 47 15, 47 22 C 47 30, 45 36, 46 40 C 47 30, 49 20, 54 18 C 58 16, 63 19, 62 26 C 61 33, 58 38, 58 42 C 61 36, 66 30, 71 32 C 76 34, 76 41, 72 47 C 66 56, 60 60, 62 72 C 64 84, 56 92, 44 92 C 38 92, 32 91, 28 90 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.35"
      />
      {LINES.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={{ pathLength: 0.001, opacity: 0.9 }}
          animate={{ pathLength: 1, opacity: [0.9, 1, 0.55, 1] }}
          transition={{
            pathLength: { duration: 1.2, delay: 0.15 + i * 0.25, ease: "easeInOut" },
            opacity: {
              duration: 2.6,
              repeat: Infinity,
              delay: 1.4 + i * 0.5,
              ease: "easeInOut",
            },
          }}
        />
      ))}
    </svg>
  );
}
```

### 파일: src/components/diagnosis/paywall-offer.tsx
```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_PRICE } from "@/lib/pricing";
import { track } from "@/lib/analytics";

/** 첫 유료 결제창은 극도로 단순화한다 — 개인화 제목 -> 이 결제로 알게 될
 * 3~4가지 -> 가격 -> CTA, 그게 전부다. 이전에 있던 Trust Signal Grid(기술
 * 근거·금융상품 미판매·이미지 저장 안내)는 전부 제거했다 — 사용자가 이
 * 화면에서 계속 생각해야 하는 건 자기 재물운뿐이어야 한다. */
export function PaywallOffer({
  title,
  includedItems,
  ctaText,
}: {
  title: string;
  includedItems: string[];
  ctaText: string;
}) {
  const [requested, setRequested] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="mystic-card mystic-ring relative mt-5 overflow-hidden p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gold)" }}
      />

      <p className="relative text-xs text-muted-foreground">지금 물은 질문, 여기서 이어집니다</p>
      <p className="relative mt-1 text-sm leading-snug font-semibold">{title}</p>
      <ul className="relative mt-3 space-y-1.5 text-sm">
        {includedItems.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-5 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-(--gold)">{RECOMMENDED_PRICE.label}</span>
      </div>

      <Button
        size="lg"
        onClick={() => {
          track("payment_cta_clicked");
          setRequested(true);
        }}
        className="relative mt-4 h-13 w-full rounded-full text-base shadow-[0_0_24px_var(--gold-soft)]"
      >
        {ctaText}
      </Button>

      {requested && (
        <motion.p
          initial={{ opacity: 0.6, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="relative mt-2 text-center text-xs text-(--gold)"
        >
          결제 연결은 아직 준비 중이에요.
        </motion.p>
      )}
    </motion.div>
  );
}
```

### 파일: src/components/diagnosis/personality-step.tsx
```tsx
"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { PERSONALITY_CHECK_ITEMS } from "@/lib/personality-check";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti-facts";

const LIKERT = [1, 2, 3, 4, 5];

/** 무료 사주 흐름 안에 있는 정식 스텝. "손금은 유료 보너스가 아니다"와 같은
 * 원칙으로, 성향정보도 결과 맨 아래 곁다리가 아니라 입력 단계 중 하나로
 * 다룬다. 완전히 건너뛸 수 있어 이탈 위험을 늘리지 않는다.
 * "정밀 심리검사"가 아니라 "간단 성향 체크"라고만 표기한다(6문항).
 * MBTI+6문항은 real-world-personalization.ts에서 실제로 쓰인다 — 사주를
 * 맞추는 보정용이 아니라, 사주에서 나온 구조가 현실에서 어떻게 나타나는지
 * 구체화하는 개인화 정보다.
 *
 * 가독성(재수정): 폰트는 유지하되(14~16px), 라벨 자체를 짧게 줄여서
 * (PERSONALITY_CHECK_ITEMS 참고) 320px에서도 한 줄 안에 들어오게 했다 —
 * 글자를 줄이는 대신 문구를 줄이는 방향. 1~5 버튼은 항상 5등분 flex-1이라
 * 정렬이 항목마다 흔들리지 않는다. */
export function PersonalityStep({
  personalityAnswers,
  onPersonalityChange,
  mbti,
  onMbtiChange,
  onNext,
  onSkip,
  onBack,
}: {
  personalityAnswers: Record<string, number>;
  onPersonalityChange: (id: string, value: number) => void;
  mbti: MbtiType | "모름";
  onMbtiChange: (v: MbtiType | "모름") => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const answeredCount = Object.keys(personalityAnswers).length;

  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Sparkles className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        조금 더 나답게
        <br />볼까요?
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        간단 성향 체크 6문항이에요. 사주를 맞추는 용도가 아니라, 사주와 자기 생각이 얼마나 비슷한지 비교하는 용도예요. 건너뛰어도 결과에는 영향 없어요.
      </p>

      <div className="mt-6 space-y-4">
        {PERSONALITY_CHECK_ITEMS.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3.5">
            <div className="flex items-start justify-between gap-3 text-sm text-foreground/80">
              <span className="flex-1">{item.leftLabel}</span>
              <span className="flex-1 text-right">{item.rightLabel}</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {LIKERT.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onPersonalityChange(item.id, v)}
                  className={`flex-1 rounded-lg border py-3 text-base transition-colors ${
                    personalityAnswers[item.id] === v
                      ? "border-(--gold) bg-(--gold-soft) text-(--gold)"
                      : "border-border text-foreground/80"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-[15px] font-medium">MBTI를 알고 있다면 선택해주세요</p>
        <select
          value={mbti}
          onChange={(e) => onMbtiChange(e.target.value as MbtiType | "모름")}
          className="mystic-card mt-2 w-full rounded-xl border border-border p-3.5 text-[15px]"
        >
          <option value="모름">모름 / 건너뛰기</option>
          {MBTI_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-10">
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
            이전
          </Button>
          <Button
            size="lg"
            disabled={answeredCount > 0 && answeredCount < PERSONALITY_CHECK_ITEMS.length}
            onClick={onNext}
            className="h-13 flex-1 rounded-full text-base"
          >
            {answeredCount === 0
              ? "다음"
              : answeredCount < PERSONALITY_CHECK_ITEMS.length
                ? `${answeredCount}/${PERSONALITY_CHECK_ITEMS.length}문항 응답 중`
                : "다음"}
          </Button>
        </div>
        <button type="button" onClick={onSkip} className="text-center text-sm text-muted-foreground">
          이건 건너뛰고 바로 결과 볼게요
        </button>
      </div>
    </div>
  );
}
```

### 파일: src/components/diagnosis/report-section.tsx
```tsx
"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

/** 무료 사주 V2 섹션 공용 레이아웃. 카드보다 문단 중심으로, 제목/본문 위계를
 * 명확히 하고 3~5분 읽기에 맞춰 line-height를 넉넉히 둔다.
 * px-2(모바일 전용, sm 이상에서는 해제): StepShell의 전역 px-6(24px)은
 * 버튼·카드·진행바까지 다 같이 줄이므로 건드리지 않고, 장문 리포트 본문
 * 컨테이너인 이 컴포넌트에만 안쪽 여백 8px을 더해 모바일 체감 여백을
 * 약 32px로 맞춘다 — 다른 화면 요소는 이 변경의 영향을 받지 않는다. */
export function ReportSection({
  title,
  step,
  children,
}: {
  title: string;
  step?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0.5, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-7 px-2 sm:px-0"
    >
      <h3 className="flex items-baseline gap-1.5">
        {step && <span className="text-xs font-semibold text-(--gold)">{step}</span>}
        <span className="text-[15px] font-semibold tracking-tight">{title}</span>
      </h3>
      <div className="mt-2 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </motion.section>
  );
}

/** 전문 계산근거(재성 N개, 격국, 용신 같은 용어)를 본문에 바로 보여주지
 * 않고 "왜 이렇게 봤나요?" 토글 뒤에 접어둔다 — 기본은 항상 접힘. */
export function EvidenceToggle({ evidence }: { evidence: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        왜 이렇게 봤나요?
      </button>
      {open && <p className="mt-1.5 text-xs text-muted-foreground">{evidence}</p>}
    </div>
  );
}

/** {text, evidence} 쌍을 받아 본문은 항상 보여주고, 근거는 토글 뒤에 접는다.
 * free-report-mock.ts/schema.ts의 ReportParagraph 구조와 짝을 이룬다. */
export function ParagraphSection({
  title,
  step,
  paragraph,
  boxed,
}: {
  title: string;
  step?: string;
  paragraph: { text: string; evidence: string };
  /** leakPattern처럼 강조 박스로 감싸야 하는 문단용 */
  boxed?: boolean;
}) {
  return (
    <ReportSection title={title} step={step}>
      {boxed ? (
        <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{paragraph.text}</p>
      ) : (
        <p>{paragraph.text}</p>
      )}
      <EvidenceToggle evidence={paragraph.evidence} />
    </ReportSection>
  );
}

export function EvidenceItemCard({
  index,
  title,
  detail,
  evidence,
}: {
  index: number;
  title: string;
  detail: string;
  evidence: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-sm font-semibold">
        {index}. {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        왜 이렇게 봤나요?
      </button>
      {open && (
        <span className="mt-1.5 inline-block rounded-full bg-(--gold-soft) px-2 py-0.5 text-[11px] text-(--gold)">
          {evidence}
        </span>
      )}
    </div>
  );
}
```

### 파일: src/components/diagnosis/result-step.tsx
```tsx
"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PalmEntryCard } from "@/components/diagnosis/palm-entry-card";
import { ReportSection, ParagraphSection, EvidenceItemCard } from "@/components/diagnosis/report-section";
import { WealthTypeSection } from "@/components/diagnosis/wealth-type-section";
import { MyeongsikSection } from "@/components/diagnosis/myeongsik-section";
import { DaeunFlowSection } from "@/components/diagnosis/daeun-flow-section";
import { ELEMENT_COLORS } from "@/lib/element-colors";
import type { FullSajuDiagnosis } from "@/lib/saju";

const revealVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/** report.snapshot.text(실제 계산 결과 기반 요약)의 첫 문장을 헤드라인으로,
 * 나머지를 본문으로 나눈다. 일간 하나만 보고 고정된 "OO형 재물운" 라벨을
 * 실제 분석보다 앞세우지 않기 위해(§2), 그 라벨(MoneyTendency.wealthType)은
 * report 자체가 없는 진짜 fallback 상황에서만 쓴다 — 있는 텍스트를 다시
 * 지어내지 않고 나누기만 하므로 새 판단을 추가하지 않는다. */
function splitLeadSentence(text: string): { headline: string; rest: string } {
  const match = text.match(/^(.+?[.!?요])\s+([\s\S]+)$/);
  if (!match) return { headline: text, rest: "" };
  return { headline: match[1], rest: match[2] };
}

/** 1차 무료 결과. 결제 제안/잠금 카드/무료 경계 표시는 이 화면에 절대
 * 두지 않는다 — 무료 콘텐츠는 손금+최종 통합 리포트까지 이어지고, 결제
 * 선택은 그 모든 무료 콘텐츠가 끝난 뒤 손금 결과 화면에서 딱 한 번만
 * 나온다. 이 화면의 유일한 다음 행동은 손금으로 넘어가는 것이다. */
export function ResultStep({
  diagnosis,
}: {
  diagnosis: FullSajuDiagnosis;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  async function handleShare() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "내-재물운.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  }

  const { tendency, deep, freeReport, resultSource, personalityInput, myeongsik, wealthType } = diagnosis;
  const isDeep = resultSource === "deep" && deep !== null;
  const interp = deep?.interpretation;
  const report = freeReport?.report ?? null;
  const lead = report ? splitLeadSentence(report.snapshot.text) : null;

  return (
    <div className="result-bright flex flex-1 flex-col">
      <p className="text-sm font-medium text-(--gold)">나의 재물운</p>

      <motion.div
        ref={cardRef}
        initial="hidden"
        animate="show"
        variants={revealVariants}
        className="mystic-ring relative mt-4 overflow-hidden rounded-2xl border border-(--gold-soft) bg-card p-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: ELEMENT_COLORS[tendency.element] }}
        />

        <motion.div variants={itemVariants} className="relative">
          <Badge
            variant="secondary"
            className="mb-3 gap-1.5 border border-(--gold-soft)"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: ELEMENT_COLORS[tendency.element] }}
            />
            {tendency.element}(五行) · {tendency.stemName}
          </Badge>
          <h2 className="text-xl leading-snug font-semibold tracking-tight text-(--gold)">
            {lead ? lead.headline : tendency.wealthType}
          </h2>
          {(lead ? lead.rest : isDeep ? interp!.summary : tendency.summary) && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {lead ? lead.rest : isDeep ? interp!.summary : tendency.summary}
            </p>
          )}
        </motion.div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          정답이 아니라 흐름을 보는 콘텐츠예요.
        </p>
      </motion.div>

      <Button
        variant="outline"
        onClick={handleShare}
        disabled={saving}
        className="mt-4 h-12 w-full rounded-full"
      >
        {saving ? "저장 중..." : "이미지로 저장하고 공유하기"}
      </Button>

      {/* 명식(근거) -> 재물유형(훅) -> 대운 흐름(지금 이 시기) 순서로
       * 문단 리포트보다 먼저 보여준다. 셋 다 freeReport와 독립적으로
       * SajuFacts만으로 계산되므로 freeReport 파이프라인이 실패해도
       * (report === null) 그대로 렌더된다. */}
      <MyeongsikSection view={myeongsik} />
      <WealthTypeSection result={wealthType} />
      <DaeunFlowSection view={myeongsik} />

      {/* 1차 무료 결과 — 사용자가 실제로 궁금해하는 7가지 질문 순서로
       * 배치한다: 크게 벌 수 있는 타입인가 -> 왜 모이거나 안 모이는가 ->
       * 어떻게 벌 때 유리한가 -> 직장형/사업형 -> 지금 뭘 해야 하는가 ->
       * 어떤 선택이 기회를 놓치게 하는가 -> 언제 변화가 오는가. 나머지
       * 섹션(팀워크/기회를 잡는 방식 등)은 손금까지 끝난 뒤
       * palm-page-client.tsx의 최종 통합 리포트에서 보여준다. */}
      <div className="mt-6">
        {report ? (
          <>
            <ParagraphSection step="②" title="타고난 성향" paragraph={report.temperament} />
            <ParagraphSection step="③" title="돈을 크게 벌 수 있는 타입인가" paragraph={report.bigMoneyAffinity} />
            <ParagraphSection step="④" title="왜 돈이 잘 모이거나 안 모이는가" paragraph={report.wealthStructure} />
            <ParagraphSection step="⑤" title="돈을 지키는 방식" paragraph={report.keepingStyle} />
            <ParagraphSection step="⑥" title="돈을 놓치는 반복 패턴" paragraph={report.leakPattern} boxed />
            <ParagraphSection step="⑦" title="어떤 방식으로 벌 때 유리한가" paragraph={report.earningStyle} />
            <ParagraphSection step="⑧" title="직장형일까, 사업형일까" paragraph={report.jobOrientation} />
            <ParagraphSection step="⑨" title="지금 무엇을 해야 하는가" paragraph={report.nextMove} />
            <ReportSection step="⑩" title="어떤 선택이 돈과 기회를 놓치게 하는가">
              <div className="space-y-2.5">
                {report.cautions.map((c, i) => (
                  <EvidenceItemCard key={c.title} index={i + 1} title={c.title} detail={c.detail} evidence={c.evidence} />
                ))}
              </div>
            </ReportSection>
            <ParagraphSection step="⑪" title="앞으로 언제 큰 변화가 오는가" paragraph={report.timingShift} />
            {report.realWorldPersonalization && (
              <ParagraphSection step="⑫" title="현실에서는 이렇게 나타나요" paragraph={report.realWorldPersonalization} />
            )}
          </>
        ) : (
          <ReportSection title="나의 강점">
            <p>{tendency.topStrength}</p>
          </ReportSection>
        )}
      </div>

      {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소이자 이 화면의 유일한
       * 다음 행동이다. 나머지 심층 섹션과 결제 선택은 손금까지 끝난 뒤
       * 최종 통합 리포트 화면에서 딱 한 번만 나온다. */}
      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          손에도 같은 흐름이 있을까요?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          손금 사진 한 장이면 사주와 교차 비교하고, 나머지 심층 리포트까지 이어서 볼 수 있어요.
        </p>
        <div className="mt-3">
          <PalmEntryCard birthInput={diagnosis.birthInput} personalityInput={personalityInput} />
        </div>
      </div>
    </div>
  );
}
```

### 파일: src/components/diagnosis/saju-forming-visual.tsx
```tsx
"use client";

// 사주 여덟 글자(년/월/일/시주)가 하나씩 자리를 잡아가고, 오행이 순서대로
// 활성화되는 "명식 형성" 로딩 비주얼. 실제 계산 로직과는 무관한 연출용 애니메이션.

import { motion } from "framer-motion";
import { ELEMENT_COLORS } from "@/lib/element-colors";

const PILLARS = ["년주", "월주", "일주", "시주"];

const ELEMENT_DOTS: { element: keyof typeof ELEMENT_COLORS; angle: number }[] = [
  { element: "목", angle: -90 },
  { element: "화", angle: -18 },
  { element: "토", angle: 54 },
  { element: "금", angle: 126 },
  { element: "수", angle: 198 },
];

export function SajuFormingVisual() {
  return (
    <div className="relative mx-auto h-52 w-52">
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, var(--gold-soft) 0%, transparent 70%)",
        }}
      />

      <div className="animate-orbit-spin absolute inset-4 rounded-full border border-dashed border-(--border)">
        {ELEMENT_DOTS.map((d, i) => (
          <motion.span
            key={d.element}
            className="absolute top-1/2 left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-medium text-background"
            style={{
              transform: `rotate(${d.angle}deg) translate(4.4rem) rotate(${-d.angle}deg) translate(-50%, -50%)`,
              backgroundColor: ELEMENT_COLORS[d.element],
            }}
            initial={{ opacity: 0.35, scale: 0.85 }}
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          >
            {d.element}
          </motion.span>
        ))}
      </div>

      <div className="absolute inset-10 rounded-full border border-(--gold-soft)" />

      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 place-items-center gap-2 p-6">
        {PILLARS.map((label, i) => (
          <motion.div
            key={label}
            className="flex size-16 flex-col items-center justify-center rounded-2xl border border-(--gold-soft) bg-card/80"
            initial={{ opacity: 0.25, scale: 0.85 }}
            animate={{ opacity: [0.25, 1, 0.6], scale: [0.85, 1, 0.95] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          >
            <span className="shimmer-text text-sm font-semibold">{label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

### 파일: src/components/diagnosis/step-badge.tsx
```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StepBadge({ icon }: { icon: ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mb-6 flex size-14 items-center justify-center rounded-full bg-(--gold-soft) text-(--gold)"
    >
      <div className="animate-twinkle absolute inset-0 rounded-full ring-1 ring-(--gold-soft)" />
      {icon}
    </motion.div>
  );
}
```

### 파일: src/components/diagnosis/step-shell.tsx
```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

export function StepShell({
  stepKey,
  progress,
  children,
}: {
  stepKey: string;
  progress: number;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10">
      {/* 이전엔 AnimatePresence(mode="wait")가 이전 스텝의 exit 애니메이션이
       * 끝나야 다음 스텝을 마운트/언마운트했다. 탭이 백그라운드로 가면(폰
       * 화면 꺼짐, 앱 전환, 브라우저 탭 전환 등) 크롬이 requestAnimationFrame과
       * CSS 트랜지션을 통째로 멈춰버려서 exit 애니메이션이 영원히 안
       * 끝나고, 그 결과 이전 스텝 화면이 새 스텝(특히 로딩 -> 결과) 위에
       * 그대로 남아 "화면이 안 바뀐다"로 보이는 문제를 직접 재현해서
       * 찾았다(콘솔 에러 없음 — 정확히 신고된 증상과 일치). mode="wait"
       * 제거만으로는 안 됐다 — exit 애니메이션 자체가 있는 한 탭이 백그라운드일
       * 때 새 스텝이 마운트돼도 이전 스텝이 여전히 DOM에 남아있었다.
       * exit을 아예 없애 React가 스텝 전환 시 이전 콘텐츠를 애니메이션
       * 완료를 기다리지 않고 그 자리에서 바로 언마운트하게 한다 — 등장
       * 애니메이션(initial/animate)만 유지해도 체감은 거의 같다. */}
      <Progress value={progress} className="mb-8 h-1.5" />
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

### 파일: src/components/diagnosis/verdict-card.tsx
```tsx
"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ReportParagraph } from "@/lib/free-report-schema";

/** 손금 완료 직후에 뜨는 종합판정 — 원국+대운+성향+손금을 하나로 묶은
 * 무료 경험의 클라이맥스. result-step.tsx의 히어로 카드와 같은
 * mystic-ring 톤을 쓰되, "종합판정"이라는 이름으로 그 앞의 목록형
 * ParagraphSection들과는 시각적으로 분리한다. */
export function VerdictCard({ verdict }: { verdict: ReportParagraph }) {
  return (
    <motion.div
      initial={{ opacity: 0.4, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="mystic-ring relative mt-8 overflow-hidden rounded-2xl border border-(--gold-soft) bg-card p-6"
    >
      <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-(--gold-soft) blur-3xl" />
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-(--gold)">
        <Sparkles className="size-3.5" />
        종합판정
      </p>
      <p className="mt-3 text-[15px] leading-relaxed">{verdict.text}</p>
    </motion.div>
  );
}
```

### 파일: src/components/diagnosis/wealth-type-section.tsx
```tsx
"use client";

import { useState } from "react";
import { ReportSection } from "@/components/diagnosis/report-section";
import type { WealthTypeResult } from "@/lib/wealth-type";

/** 재물 유형 4조각. 4번째 조각(bridge)에서 절대 특정 해법을 지목하지
 * 않는다 — "그래서 무엇부터 바꿔야 하는지"는 유료1(재무 설문→처방)의
 * 몫이라, 여기서는 그 질문만 남기고 끊는다. 아직 유료1 자체가 없으므로
 * CTA는 PaywallOffer의 "준비 중" 톤만 가볍게 재사용하고 실제 링크는
 * 만들지 않는다. */
export function WealthTypeSection({ result }: { result: WealthTypeResult | null }) {
  const [requested, setRequested] = useState(false);
  if (!result) return null;

  const { pieces } = result;

  return (
    <ReportSection title="내 재물 유형">
      <p className="text-base font-semibold text-(--gold)">{pieces.typeAndDiagnosis}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pieces.evidence}</p>
      <p className="mt-3 text-sm leading-relaxed">{pieces.problem}</p>
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">{pieces.bridge}</p>

      <button
        type="button"
        onClick={() => setRequested(true)}
        className="mt-3 text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        내 상황에 맞는 실행 순서가 궁금하다면
      </button>
      {requested && <p className="mt-1.5 text-xs text-(--gold)">이 기능은 아직 준비 중이에요.</p>}
    </ReportSection>
  );
}
```

### 파일: src/components/landing/destiny-card-preview.tsx
```tsx
"use client";

// 아직 입력 전이라 실제 결과는 없다. 대신 "반쯤 열린 명식 카드"처럼
// 결과 화면의 구조(등급 게이지·흐름 곡선)를 미리 보여주는 티저.
// 값은 모두 placeholder이며 실제 진단 데이터가 아니다.

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const PREVIEW_GAUGES = [
  { label: "버는 힘", level: 4 },
  { label: "지키는 힘", level: 2 },
  { label: "기회 잡는 힘", level: 5 },
];

export function DestinyCardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0.6, rotate: -3, y: 12 }}
      animate={{ opacity: 1, rotate: -1.5, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      whileTap={{ rotate: 0, scale: 1.02 }}
      className="mystic-card relative mx-auto mt-8 w-full max-w-xs overflow-hidden p-4 text-left"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 size-32 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gold)" }}
      />

      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">
          내 재물 명식 미리보기
        </p>
        <span className="flex items-center gap-1 rounded-full bg-(--gold-soft) px-2 py-0.5 text-[10px] font-medium text-(--gold)">
          <Lock className="size-2.5" />
          잠김
        </span>
      </div>

      <p className="relative mt-2 text-base leading-snug font-semibold">
        나의 재물 유형은{" "}
        <span className="blur-teaser inline-block align-middle">
          ○○형 재물운
        </span>
      </p>

      <div className="relative mt-3 grid grid-cols-3 gap-2">
        {PREVIEW_GAUGES.map((g) => (
          <div key={g.label} className="rounded-lg border border-border p-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">{g.label}</p>
            <div className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="h-2 w-1 rounded-full"
                  style={{ backgroundColor: i <= g.level ? "var(--gold)" : "var(--muted)" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
        앞으로 흐름, 놓치는 패턴, 어울리는 방식까지{" "}
        <span className="blur-teaser">전부 이 안에 있어요.</span>
      </p>
    </motion.div>
  );
}
```

### 파일: src/components/landing/hero-visual.tsx
```tsx
"use client";

// 오행(五行)을 형상화한 궤도 모티프 + 은은한 빛 입자.
// 텍스트만 있는 랜딩을 피하기 위한 장식용 비주얼이며, 실제 사주 계산과는 무관하다.

const ELEMENTS = [
  { label: "목", angle: -90, color: "oklch(0.72 0.14 145)" },
  { label: "화", angle: -18, color: "oklch(0.72 0.16 35)" },
  { label: "토", angle: 54, color: "oklch(0.78 0.1 85)" },
  { label: "금", angle: 126, color: "oklch(0.85 0.03 90)" },
  { label: "수", angle: 198, color: "oklch(0.68 0.12 250)" },
];

export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto mb-2 h-56 w-56 select-none"
    >
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, var(--gold-soft) 0%, transparent 70%)",
        }}
      />

      <div className="animate-orbit-spin absolute inset-6 rounded-full border border-(--border)">
        {ELEMENTS.map((el) => (
          <span
            key={el.label}
            className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-medium text-background"
            style={{
              transform: `rotate(${el.angle}deg) translate(4.6rem) rotate(${-el.angle}deg) translate(-50%, -50%)`,
              backgroundColor: el.color,
            }}
          >
            {el.label}
          </span>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-card ring-1 ring-(--gold-soft)">
          <span className="shimmer-text text-2xl font-semibold">財</span>
        </div>
      </div>

      <span className="animate-float-soft absolute top-2 right-6 size-1.5 rounded-full bg-(--gold)" />
      <span
        className="animate-float-soft absolute bottom-6 left-3 size-1 rounded-full bg-(--gold)"
        style={{ animationDelay: "1.2s" }}
      />
      <span
        className="animate-float-soft absolute top-10 left-0 size-1 rounded-full bg-(--gold)"
        style={{ animationDelay: "2.4s" }}
      />
    </div>
  );
}
```

### 파일: src/components/landing/landing-reveal.tsx
```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function LandingReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

### 파일: src/components/palm/analysis-result-card.tsx
```tsx
"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_PRICE, PAYMENT_METHODS } from "@/lib/pricing";
import { REPORT_CONTENTS } from "@/lib/report-contents";
import { eunNeun } from "@/lib/korean-particle";
import type { AnalysisResult } from "@/lib/analysis-result";

function formatKrw(n: number): string {
  return `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ko-KR")}원`;
}

/** 설문 직후 분석 결과 화면 — 결제 버튼을 두지 않는다(이 화면의 유일한
 * 다음 행동은 결제 화면으로 넘어가는 것뿐, 결제 자체는 다음 화면에서).
 * 문구 순서 고정: 한 줄 결론 -> 왜 -> 생활에서의 의미 -> 지금 안 해도
 * 되는 것(이유 포함) -> 근거 숫자 -> 격차 한 방(결제 직전 임팩트). 병목
 * 후보는 1개만 보여준다. 격차 문구는 불안 조성이 아니라 순수 숫자 격차만
 * 보여준다("지금 안 하면 늦습니다" 류 표현 없음). 그 아래로 리포트 구성
 * 항목(무엇을 받는지) -> 가격·결제수단(가격은 미정이라 하드코딩하지 않고
 * pricing.ts의 설정값을 그대로 노출) -> 결제하기 순서로 이어진다. */
export function AnalysisResultCard({ result, onProceed }: { result: AnalysisResult; onProceed: () => void }) {
  return (
    <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-8">
      <p className="text-base font-semibold text-(--gold)">{result.headline}</p>
      <p className="mt-3 text-sm leading-relaxed">{result.why}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.lifeMeaning}</p>
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
        {result.notUrgent}{eunNeun(result.notUrgent)} 지금 안 해도 됩니다. {result.notUrgentReason}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">근거 숫자 — 월 잉여금 {formatKrw(result.surplusKrw)}</p>

      <div className="mystic-card mt-4 p-3.5">
        <p className="text-sm leading-relaxed font-medium text-(--gold)">{result.gapStatement}</p>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        이 문제, 구체적으로 뭐부터 손대야 할지 확인해드릴게요. 결제 후 당신에게 맞는 실행 방법을 바로 알려드립니다.
      </p>

      <ul className="mt-4 space-y-1.5 text-sm">
        {REPORT_CONTENTS.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-(--gold)">{RECOMMENDED_PRICE.label}</span>
        <span className="text-xs text-muted-foreground">{PAYMENT_METHODS.join(" · ")}</span>
      </div>

      <Button size="lg" onClick={onProceed} className="mt-4 h-13 w-full rounded-full text-base">
        결제하기
      </Button>
    </motion.div>
  );
}
```

### 파일: src/components/palm/indirect-experience.tsx
```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getExperienceScenes, computeExperienceOutcome } from "@/lib/indirect-experience";
import { PALM_FLAVOR_LINE } from "@/lib/indirect-experience-data";
import { track } from "@/lib/analytics";
import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import type { PalmKeyword } from "@/lib/palm-keyword";
import type { ExperienceChoice } from "@/lib/indirect-experience-data";

type Stage = "intro" | number | "outcome";

/** 재물유형(4종)이 상황·선택지를 정하는 간접체험 — "당신 사주에서 나온
 * 문제 -> 선택하면 결과가 달라지는 걸 직접 확인"하는 체험. 손금 손 모양은
 * 도입부 성향 묘사 한 줄에만 쓴다. step-shell.tsx에서 찾은 교훈대로 exit
 * 애니메이션 없이 구현 — 탭이 백그라운드로 가도 장면 전환이 멈추지 않는다. */
export function IndirectExperience({
  wealthTypeCode,
  palmKeyword,
  onComplete,
}: {
  wealthTypeCode: WealthTypeCode;
  palmKeyword: PalmKeyword;
  onComplete: () => void;
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [tones, setTones] = useState<ExperienceChoice["tone"][]>([]);

  const scenes = getExperienceScenes(wealthTypeCode);
  const flavorLine = PALM_FLAVOR_LINE[palmKeyword];

  function choose(tone: ExperienceChoice["tone"], sceneIndex: number) {
    const next = [...tones, tone];
    setTones(next);
    setStage(sceneIndex + 1 >= scenes.length ? "outcome" : sceneIndex + 1);
  }

  return (
    <div className="mt-8">
      {stage === "intro" && (
        <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-sm font-medium">지금까지는 당신이 어떤 사람인지 봤습니다.</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            이제 그 사람이 어떤 선택을 하면 무엇이 달라지는지, 직접 겪어볼 차례입니다.
          </p>
          {flavorLine && <p className="mt-3 text-xs text-muted-foreground">{flavorLine}</p>}
          <Button
            size="lg"
            onClick={() => {
              track("indirect_experience_started");
              setStage(0);
            }}
            className="mt-4 h-13 w-full rounded-full text-base"
          >
            간접체험 시작하기
          </Button>
        </motion.div>
      )}

      {typeof stage === "number" && scenes[stage] && (
        <motion.div key={scenes[stage].id} initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-xs text-muted-foreground">
            {stage + 1} / {scenes.length}
          </p>
          <p className="mt-1.5 text-sm font-medium">{scenes[stage].situation}</p>
          <div className="mt-3 flex flex-col gap-2">
            {scenes[stage].choices.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => choose(opt.tone, stage)}
                className="mystic-card p-3 text-left text-sm transition-colors hover:border-(--gold-soft)"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {stage === "outcome" && (
        <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
            {computeExperienceOutcome(wealthTypeCode, tones)}
          </p>
          <Button size="lg" onClick={onComplete} className="mt-4 h-13 w-full rounded-full text-base">
            다음
          </Button>
        </motion.div>
      )}
    </div>
  );
}
```

### 파일: src/components/palm/palm-page-client.tsx
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, RotateCcw, HandMetal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import { VerdictCard } from "@/components/diagnosis/verdict-card";
import { ReportSection, ParagraphSection, EvidenceItemCard, EvidenceToggle } from "@/components/diagnosis/report-section";
import { IndirectExperience } from "@/components/palm/indirect-experience";
import { SurveyForm } from "@/components/palm/survey-form";
import { AnalysisResultCard } from "@/components/palm/analysis-result-card";
import { PaymentScreen } from "@/components/palm/payment-screen";
import {
  analyzePalmFromCanvas,
  preloadHandLandmarker,
} from "@/lib/palm-detection";
import { isPalmFactsUsable, describePalmFailureReasons, type PalmFacts } from "@/lib/palm-facts";
import { buildRealObservationText, buildTraditionalReadingText } from "@/lib/palm-observation-text";
import { derivePalmKeyword } from "@/lib/palm-keyword";
import { buildAnalysisResult, type AnalysisResult } from "@/lib/analysis-result";
import type { SurveyInput } from "@/lib/survey-input";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { CompareItem } from "@/lib/triple-compare";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { WealthTypeResult } from "@/lib/wealth-type";
import { track } from "@/lib/analytics";

type Stage = "upload" | "detecting" | "retake" | "loading" | "result" | "saju_only" | "error";

const HAND_SHAPE_KO: Record<PalmFacts["handShape"], string> = {
  square: "사각형 손바닥 · 짧은 손가락",
  rectangular: "사각형 손바닥 · 긴 손가락",
  elongated: "길쭉한 손바닥 · 짧은 손가락",
  slender: "길쭉한 손바닥 · 긴 손가락",
  unknown: "확인 안 됨",
};

async function fileToCanvas(file: File, maxDim = 1280): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context 생성 실패");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

/** 최종 통합 리포트(finalReport)를 렌더링한다. 손금이 있을 때(withPalm)와
 * 없을 때(saju-only) 양쪽에서 재사용한다. NO_DUPLICATION: 1차 무료 결과
 * (result-step.tsx)에서 이미 보여준 필드는 여기서 다시 보여주지 않는다 —
 * "아까 본 얘기 또 하네"를 만들지 않기 위해 아직 안 보여준 나머지 섹션만
 * 싣는다. result-step.tsx가 7질문 구조로 재배치되면서 wealthStructure/
 * bigMoneyAffinity/cautions/nextMove/timingShift가 전부 pre-palm 전용으로
 * 옮겨갔으니 여기서는 절대 다시 쓰지 않는다. 별도의 "이 분석의 한계"
 * 섹션은 만들지 않는다 — 필요한 고지는 화면 맨 아래에 한 줄로만 둔다. */
function FinalReportSections({ report }: { report: FreeSajuReport }) {
  return (
    <div className="mt-3">
      <ParagraphSection title="조직에서 강한 부분" paragraph={report.teamStrength} />
      <ParagraphSection title="독립적으로 움직일 때 강한 부분" paragraph={report.soloStrength} />
      <ParagraphSection title="사람과 돈" paragraph={report.peopleAndMoney} />
      <ParagraphSection title="의사결정 스타일" paragraph={report.decisionStyle} />
      <ParagraphSection title="기회를 잡는 방식" paragraph={report.opportunityStyle} />
      <ReportSection title="나의 강점 3가지">
        <div className="space-y-2.5">
          {report.strengths.map((s, i) => (
            <EvidenceItemCard key={s.title} index={i + 1} title={s.title} detail={s.detail} evidence={s.evidence} />
          ))}
        </div>
      </ReportSection>
      <div className="mt-7 px-2 sm:px-0">
        <EvidenceToggle evidence={report.evidenceExplainer} />
      </div>
    </div>
  );
}

const COMPARE_KIND_LABEL: Record<CompareItem["kind"], string> = { 일치: "일치", 차이: "차이", 보완: "보완" };

/** 손금 자체 해석이 끝난 뒤 딱 한 번 나오는 사주×손금×자기응답 통합 비교.
 * 데이터가 있는 축만 서버(triple-compare.ts)에서 내려오므로, 여기서는
 * 있는 그대로 나열만 한다 — 일치로 억지로 맞추지 않는다. */
function TripleCompareSection({ items }: { items: CompareItem[] }) {
  if (items.length === 0) return null;
  return (
    <ReportSection step="③" title="사주 · 손금 · 자기응답 비교">
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.topic} className="rounded-xl border border-border p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="rounded-full bg-(--gold-soft) px-2 py-0.5 text-[11px] text-(--gold)">
                {COMPARE_KIND_LABEL[item.kind]}
              </span>
              {item.topic}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

/** 손금 완료 -> 간접체험(재물유형×손금 개인화) -> 재무 설문 -> 병목 진단 ->
 * 분석 결과 확인(결제 버튼 없음) -> 결제 화면. 이전 라운드의 "현실정보
 * 입력 -> 사주 연결진단" 다리를 대체한다 — 병목 판단은 설문 응답만 쓰고
 * 사주·손금 요소가 전혀 개입하지 않으므로(§7 원칙) 서버 호출 없이 순수
 * 클라이언트 함수로 동작한다. 결제 이후 실제 실행 리포트 생성 로직은
 * 이번 라운드에서도 확정하지 않는다 — PaywallOffer의 CTA는 실제 결제로
 * 이어지지 않아 도달할 방법 자체가 없다. */
type FunnelStage = "experience" | "survey" | "analysis" | "payment";

function ConversionFunnel({
  wealthType,
  palmFacts,
  onReset,
}: {
  wealthType: WealthTypeResult | null;
  palmFacts: PalmFacts | null;
  onReset: () => void;
}) {
  const [stage, setStage] = useState<FunnelStage>("experience");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  if (!wealthType) return null;

  function handleExperienceComplete() {
    track("indirect_experience_completed");
    setStage("survey");
  }

  function handleSurveyComplete(input: SurveyInput) {
    track("survey_completed");
    setAnalysisResult(buildAnalysisResult(input));
    setStage("analysis");
    track("analysis_result_viewed");
  }

  return (
    <div className="mt-8">
      {stage === "experience" && (
        <IndirectExperience
          wealthTypeCode={wealthType.code}
          palmKeyword={derivePalmKeyword(palmFacts)}
          onComplete={handleExperienceComplete}
        />
      )}

      {stage === "survey" && <SurveyForm onComplete={handleSurveyComplete} />}

      {stage === "analysis" && analysisResult && (
        <AnalysisResultCard
          result={analysisResult}
          onProceed={() => {
            track("payment_screen_viewed");
            setStage("payment");
          }}
        />
      )}

      {stage === "payment" && <PaymentScreen />}

      <button
        type="button"
        onClick={onReset}
        className="mt-6 flex w-full items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
      >
        <RotateCcw className="size-3.5" />
        다른 사진으로 다시 보기
      </button>
    </div>
  );
}

export function PalmPageClient({
  birthInput,
  personalityInput,
}: {
  birthInput: BirthInput | null;
  personalityInput?: PersonalityInputEcho;
}) {
  const [stage, setStage] = useState<Stage>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [palmFacts, setPalmFacts] = useState<PalmFacts | null>(null);
  const [finalReport, setFinalReport] = useState<FreeSajuReport | null>(null);
  const [tripleCompare, setTripleCompare] = useState<CompareItem[]>([]);
  const [verdict, setVerdict] = useState<ReportParagraph | null>(null);
  const [wealthType, setWealthType] = useState<WealthTypeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retakeAttempts, setRetakeAttempts] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    preloadHandLandmarker();
  }, []);

  async function fetchReport(facts: PalmFacts | null) {
    if (!birthInput) {
      setErrorMsg("생년월일 정보를 찾을 수 없어요. 사주 결과 화면에서 다시 들어와주세요.");
      setStage("error");
      return;
    }
    const res = await fetch("/api/palm/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...birthInput,
        palmFacts: facts,
        personalityAnswers: personalityInput?.personalityAnswers ?? undefined,
        mbti: personalityInput?.mbti ?? undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");

    if (!data.usable) {
      setRetakeAttempts((n) => n + 1);
      setPalmFacts((prev) => (prev ? { ...prev, warnings: data.warnings ?? prev.warnings } : prev));
      setStage("retake");
      return;
    }

    setFinalReport(data.freeReport?.report ?? null);
    setTripleCompare(data.tripleCompare ?? []);
    setVerdict(data.verdict ?? null);
    setWealthType(data.wealthType ?? null);
    track("free_report_completed", { palmSkipped: Boolean(data.palmSkipped) });
    setStage(data.palmSkipped ? "saju_only" : "result");
  }

  async function handleFile(file: File) {
    setErrorMsg(null);
    setStage("detecting");
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });

    try {
      const canvas = await fileToCanvas(file);
      const facts = await analyzePalmFromCanvas(canvas);
      setPalmFacts(facts);

      // 손금 성공 판정은 오직 실제 ONNX 결과 기준(isPalmFactsUsable)으로만
      // 한다 — Sobel 휴리스틱이 뭔가 "검출됐다"고 해도 여기서 걸러진다.
      if (!isPalmFactsUsable(facts)) {
        setRetakeAttempts((n) => n + 1);
        setStage("retake");
        return;
      }

      setStage("loading");
      await fetchReport(facts);
    } catch {
      setErrorMsg("분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      setStage("error");
    }
  }

  /** 손금 없이 계속 보기 — 처음부터 건너뛸 때도, 반복 실패 뒤에도 쓴다.
   * 실패한 손금을 성공한 것처럼 꾸며서 보여주지 않는다: 사주만으로 완결된
   * 리포트를 정직하게 보여준다. */
  async function handleSkipPalm() {
    setErrorMsg(null);
    setStage("loading");
    try {
      await fetchReport(null);
    } catch {
      setErrorMsg("분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
      setStage("error");
    }
  }

  function reset() {
    setStage("upload");
    setPalmFacts(null);
    setFinalReport(null);
    setTripleCompare([]);
    setVerdict(null);
    setWealthType(null);
    setErrorMsg(null);
    setRetakeAttempts(0);
  }

  if (!birthInput) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          생년월일 정보를 찾을 수 없어요. 사주 결과 화면에서 다시 들어와주세요.
        </p>
        <Button asChild size="lg" className="mt-6 h-13 w-full rounded-full text-base">
          <Link href="/diagnosis">사주 진단으로 이동</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10 ${stage === "result" || stage === "saju_only" ? "result-bright" : ""}`}
    >
      <StepBadge icon={<HandMetal className="size-5" />} />
      <p className="text-sm font-medium text-(--gold)">손금까지 더해 마저 봅니다</p>
      <h1 className="mt-2 text-xl leading-snug font-semibold tracking-tight">
        사주에서 짚은 이 재물의 결,
        <br />
        손에도 같은 흐름이 있을까?
      </h1>

      {stage === "upload" && (
        <div className="mt-8 flex flex-1 flex-col">
          <div className="mystic-card flex flex-col items-center gap-3 p-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-(--gold-soft)">
              <PalmLineIllustration />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              손바닥 전체가 프레임 안에 들어오게, 밝은 곳에서 찍어주세요.
              <br />
              손금선이 잘 보이도록 손가락을 살짝 펴면 더 좋아요.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => cameraInputRef.current?.click()}
              className="h-13 w-full rounded-full text-base"
            >
              <Camera className="size-4" />
              카메라로 촬영하기
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              className="h-13 w-full rounded-full text-base"
            >
              <ImagePlus className="size-4" />
              사진 선택하기
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={handleSkipPalm}
            className="mt-auto pt-8 text-center text-xs text-muted-foreground"
          >
            손금 없이 사주 결과만 볼게요
          </button>
        </div>
      )}

      {(stage === "detecting" || stage === "loading") && (
        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-6 text-center">
          {previewUrl && (
            <div className="mystic-ring size-40 overflow-hidden rounded-2xl border border-(--gold-soft)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="size-full object-cover" />
            </div>
          )}
          <motion.div
            className="h-10 w-10 rounded-full border-2 border-(--gold-soft) border-t-(--gold)"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-sm text-muted-foreground">
            {stage === "detecting" ? "손과 손금선을 확인하는 중이에요" : "리포트를 만드는 중이에요"}
          </p>
        </div>
      )}

      {stage === "retake" && palmFacts && (
        <div className="mt-8 flex flex-1 flex-col">
          {previewUrl && (
            <div className="mystic-ring mx-auto size-36 overflow-hidden rounded-2xl border border-(--gold-soft) opacity-70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="size-full object-cover" />
            </div>
          )}
          <div className="mystic-card mt-5 p-5">
            <p className="text-sm font-medium text-(--gold)">손금선이 충분히 읽히지 않았어요</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {describePalmFailureReasons(palmFacts, retakeAttempts).map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Button size="lg" onClick={reset} className="h-13 w-full rounded-full text-base">
              <RotateCcw className="size-4" />
              다시 촬영하기
            </Button>
            {retakeAttempts >= 2 && (
              <button type="button" onClick={handleSkipPalm} className="text-center text-xs text-muted-foreground">
                손금 없이 사주 결과만 계속 보기
              </button>
            )}
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="mt-8 flex flex-1 flex-col">
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg ?? "문제가 발생했어요."}
          </div>
          <div className="mt-auto pt-8">
            <Button size="lg" onClick={reset} className="h-13 w-full rounded-full text-base">
              다시 시도하기
            </Button>
          </div>
        </div>
      )}

      {stage === "result" && palmFacts && finalReport && (
        <div className="mt-6 flex flex-1 flex-col">
          <motion.div
            initial={{ opacity: 0.6, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mystic-ring rounded-2xl border border-(--gold-soft) bg-card p-5"
          >
            <div className="flex items-center gap-3">
              {previewUrl && (
                <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-(--gold-soft)">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="" className="size-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  {palmFacts.handSide === "left" ? "왼손" : palmFacts.handSide === "right" ? "오른손" : "손"} ·{" "}
                  {HAND_SHAPE_KO[palmFacts.handShape]}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소이자, 사주와
           * 독립된 두 번째 분석이다(§3): 실제 손 관측 -> 손금 자체 해석 ->
           * (그 다음에야) 사주와의 비교. "사주 문단 + 손에도 같은 모습이
           * 보여요" 식으로 섞지 않는다. */}
          <div className="mt-5">
            <ReportSection step="①" title="실제 이미지에서 관측된 것">
              <p>{buildRealObservationText(palmFacts)}</p>
            </ReportSection>
            <ReportSection step="②" title="손금이 보여주는 것">
              <p className="text-sm text-muted-foreground">{buildTraditionalReadingText(palmFacts)}</p>
            </ReportSection>
            <TripleCompareSection items={tripleCompare} />
          </div>

          <FinalReportSections report={finalReport} />
          {verdict && <VerdictCard verdict={verdict} />}
          <ConversionFunnel wealthType={wealthType} palmFacts={palmFacts} onReset={reset} />
        </div>
      )}

      {stage === "saju_only" && finalReport && (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="mystic-card p-4 text-sm text-muted-foreground">
            이번 결과는 사주와 입력한 정보를 중심으로 봤어요.
          </div>
          <TripleCompareSection items={tripleCompare} />
          <FinalReportSections report={finalReport} />
          {verdict && <VerdictCard verdict={verdict} />}
          <ConversionFunnel wealthType={wealthType} palmFacts={palmFacts} onReset={reset} />
        </div>
      )}

      {/* 무료 리포트 Peak와 다음 행동(운세지도) 사이에 고지 문구가 끼면
       * 몰입이 끊긴다(§O) — 필요한 고지는 여기, 진짜 페이지 최하단에만 둔다. */}
      {(stage === "result" || stage === "saju_only") && (
        <p className="mt-8 text-center text-[11px] text-muted-foreground">이 결과로 중요한 결정을 대신하지 마세요.</p>
      )}
    </div>
  );
}
```

### 파일: src/components/palm/payment-screen.tsx
```tsx
"use client";

import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { TrustBadges } from "@/components/palm/trust-badges";
import { REPORT_CONTENTS } from "@/lib/report-contents";
import { PAYMENT_TIMING_NOTICE, REFUND_POLICY_NOTICE } from "@/lib/payment-notices";

/** 결제 화면 — 분석 결과 화면과 분리된 별도 단계. 기존 PaywallOffer를
 * 그대로 재사용한다(독립적인 카드 컴포넌트라 구조 변경 불필요). 결제는
 * 여전히 준비 중 — PaywallOffer의 CTA는 실제 결제를 완료시키지 않는다.
 * 리포트 구성 항목은 analysis-result-card.tsx의 미리보기와 같은 목록을
 * 공유한다(report-contents.ts) — 두 화면 문구가 어긋나지 않게. 신뢰 신호
 * (TrustBadges)와 결제 소요시간·환불정책 안내를 이 화면에 배치한다. */
export function PaymentScreen() {
  return (
    <div className="mt-8">
      <PaywallOffer
        title="당신에게 맞는 실행 방법"
        includedItems={REPORT_CONTENTS}
        ctaText="결제하고 실행 방법 확인하기"
      />
      <TrustBadges />
      <p className="mt-3 text-center text-xs text-muted-foreground">{PAYMENT_TIMING_NOTICE}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{REFUND_POLICY_NOTICE}</p>
    </div>
  );
}
```

### 파일: src/components/palm/survey-form.tsx
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  JOB_TYPE_OPTIONS,
  FUTURE_EVENT_OPTIONS,
  EXPENSE_AWARENESS_OPTIONS,
  EMERGENCY_FUND_OPTIONS,
  DEBT_INTEREST_OPTIONS,
  DEBT_PAYMENT_OPTIONS,
  DEBT_MATURITY_OPTIONS,
  REPAYMENT_TYPE_OPTIONS,
  FUTURE_EVENT_TIMING_OPTIONS,
  FUTURE_EVENT_AMOUNT_OPTIONS,
  FUTURE_EVENT_PREPARED_OPTIONS,
  MONEY_MANAGEMENT_UNIT_OPTIONS,
  SPENDING_PATTERN_OPTIONS,
  surplusKrw,
  PRIVACY_NOTICE,
  type SurveyInput,
  type SurveyOption,
} from "@/lib/survey-input";

function TapOption({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
        selected ? "border-(--gold) bg-(--gold-soft) text-(--gold)" : "border-border text-foreground/80"
      }`}
    >
      {label}
    </button>
  );
}

function SingleSelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SurveyOption[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((opt) => (
          <TapOption key={opt.value} selected={value === opt.value} onClick={() => onChange(opt.value)} label={opt.label} />
        ))}
      </div>
    </div>
  );
}

const EXCLUSIVE_MULTI_VALUES = new Set(["none", "해당없음"]);

function MultiSelectField({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: SurveyOption[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(value: string) {
    const isExclusive = EXCLUSIVE_MULTI_VALUES.has(value);
    if (isExclusive) {
      onChange(values.includes(value) ? [] : [value]);
      return;
    }
    const withoutExclusive = values.filter((v) => !EXCLUSIVE_MULTI_VALUES.has(v));
    onChange(
      withoutExclusive.includes(value) ? withoutExclusive.filter((v) => v !== value) : [...withoutExclusive, value],
    );
  }
  return (
    <div className="rounded-xl border border-border p-3.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((opt) => (
          <TapOption key={opt.value} selected={values.includes(opt.value)} onClick={() => toggle(opt.value)} label={opt.label} />
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-xl border border-border p-3.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="mt-1.5 w-full border-none bg-transparent p-0 text-base font-semibold outline-none"
      />
    </div>
  );
}

const initialInput: SurveyInput = {
  biggestConcern: "",
  jobType: "",
  futureEvents: [],
  monthlyIncomeKrw: 0,
  monthlyFixedCostKrw: 0,
  monthlySavingsKrw: 0,
  expenseAwareness: "",
  emergencyFund: "",
  hasDebt: false,
  moneyManagementUnit: "",
  spendingPatterns: [],
};

/** 재무 설문 3스텝, 원페이지형. 진행바(1/3~3/3)만 표시하고 장면 연출은
 * 넣지 않는다 — 간접체험에서 이미 체감 장치를 썼으므로 여기선 속도가
 * 우선이다. 숫자 직접입력은 소득/고정지출/저축 3개뿐. */
export function SurveyForm({ onComplete }: { onComplete: (input: SurveyInput) => void }) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<SurveyInput>(initialInput);

  function set<K extends keyof SurveyInput>(key: K, value: SurveyInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const isBusinessOwner = input.jobType === "business_owner";
  const isFreelancer = input.jobType === "freelancer";
  const hasFutureEvent = input.futureEvents.length > 0 && !input.futureEvents.includes("none");

  const step1Complete = input.jobType !== "" && input.futureEvents.length > 0;
  const step2Complete = input.monthlyIncomeKrw > 0 && input.monthlyFixedCostKrw >= 0 && input.monthlySavingsKrw >= 0;
  const step3Complete =
    input.expenseAwareness !== "" &&
    input.emergencyFund !== "" &&
    input.moneyManagementUnit !== "" &&
    input.spendingPatterns.length > 0 &&
    (!input.hasDebt || (input.debtInterestRate && input.debtMaturity && input.debtRepaymentType)) &&
    (!hasFutureEvent || (input.futureEventTiming && input.futureEventAmount && input.futureEventPrepared)) &&
    (!isBusinessOwner || input.businessSeparatesFinance !== undefined) &&
    (!isFreelancer || (input.freelancerIncomeLow && input.freelancerIncomeAvg && input.freelancerIncomeHigh));

  return (
    <div className="mt-8 flex flex-1 flex-col">
      <p className="text-xs text-muted-foreground">{step} / 3</p>
      {step === 1 && <p className="mt-1.5 text-xs text-muted-foreground">{PRIVACY_NOTICE}</p>}

      {step === 1 && (
        <div className="mt-3 space-y-4">
          <div className="rounded-xl border border-border p-3.5">
            <label className="text-sm font-medium">지금 가장 큰 재무 고민을 적어주세요</label>
            <textarea
              value={input.biggestConcern}
              onChange={(e) => set("biggestConcern", e.target.value)}
              placeholder="예: 매달 돈이 어디로 가는지 모르겠어요"
              rows={3}
              className="mt-1.5 w-full resize-none border-none bg-transparent p-0 text-sm outline-none"
            />
          </div>
          <SingleSelectField label="지금 어떤 형태로 일하고 계세요?" options={JOB_TYPE_OPTIONS} value={input.jobType} onChange={(v) => set("jobType", v)} />
          <MultiSelectField
            label="1년 안에 예정된 큰 변화가 있다면요?"
            options={FUTURE_EVENT_OPTIONS}
            values={input.futureEvents}
            onChange={(v) => set("futureEvents", v)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="mt-3 space-y-4">
          <NumberField label="월 소득(원)" value={input.monthlyIncomeKrw} onChange={(v) => set("monthlyIncomeKrw", v)} />
          <NumberField label="월 고정지출(원)" value={input.monthlyFixedCostKrw} onChange={(v) => set("monthlyFixedCostKrw", v)} />
          <NumberField label="월 저축·투자액(원)" value={input.monthlySavingsKrw} onChange={(v) => set("monthlySavingsKrw", v)} />
          <div className="mystic-card p-3.5">
            <p className="text-xs text-muted-foreground">월 잉여금</p>
            <p className="mt-1 text-lg font-semibold text-(--gold)">{surplusKrw(input).toLocaleString("ko-KR")}원</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-3 space-y-4">
          <SingleSelectField
            label="내 지출을 얼마나 정확히 아세요?"
            options={EXPENSE_AWARENESS_OPTIONS}
            value={input.expenseAwareness}
            onChange={(v) => set("expenseAwareness", v)}
          />
          <SingleSelectField
            label="비상자금은 어느 정도 있으세요?"
            options={EMERGENCY_FUND_OPTIONS}
            value={input.emergencyFund}
            onChange={(v) => set("emergencyFund", v)}
          />

          <div className="rounded-xl border border-border p-3.5">
            <p className="text-sm font-medium">대출이나 빚이 있으세요?</p>
            <div className="mt-2.5 flex gap-2">
              <TapOption selected={input.hasDebt === false} onClick={() => set("hasDebt", false)} label="없음" />
              <TapOption selected={input.hasDebt === true} onClick={() => set("hasDebt", true)} label="있음" />
            </div>
          </div>
          {input.hasDebt && (
            <>
              <SingleSelectField label="금리는 어느 정도예요?" options={DEBT_INTEREST_OPTIONS} value={input.debtInterestRate} onChange={(v) => set("debtInterestRate", v)} />
              <SingleSelectField label="월 상환액은요?" options={DEBT_PAYMENT_OPTIONS} value={input.debtMonthlyPayment} onChange={(v) => set("debtMonthlyPayment", v)} />
              <SingleSelectField label="만기는 언제예요?" options={DEBT_MATURITY_OPTIONS} value={input.debtMaturity} onChange={(v) => set("debtMaturity", v)} />
              <SingleSelectField label="상환 방식은요?" options={REPAYMENT_TYPE_OPTIONS} value={input.debtRepaymentType} onChange={(v) => set("debtRepaymentType", v)} />
            </>
          )}

          {hasFutureEvent && (
            <>
              <SingleSelectField label="그 변화, 언제쯤이에요?" options={FUTURE_EVENT_TIMING_OPTIONS} value={input.futureEventTiming} onChange={(v) => set("futureEventTiming", v)} />
              <SingleSelectField label="대략 얼마나 필요할까요?" options={FUTURE_EVENT_AMOUNT_OPTIONS} value={input.futureEventAmount} onChange={(v) => set("futureEventAmount", v)} />
              <SingleSelectField label="지금 준비된 돈은 어느 정도예요?" options={FUTURE_EVENT_PREPARED_OPTIONS} value={input.futureEventPrepared} onChange={(v) => set("futureEventPrepared", v)} />
            </>
          )}

          {isBusinessOwner && (
            <div className="rounded-xl border border-border p-3.5">
              <p className="text-sm font-medium">사업자금과 생활비를 분리해서 관리하세요?</p>
              <div className="mt-2.5 flex gap-2">
                <TapOption selected={input.businessSeparatesFinance === true} onClick={() => set("businessSeparatesFinance", true)} label="예" />
                <TapOption selected={input.businessSeparatesFinance === false} onClick={() => set("businessSeparatesFinance", false)} label="아니오" />
              </div>
            </div>
          )}

          {isFreelancer && (
            <div className="rounded-xl border border-border p-3.5">
              <p className="text-sm font-medium">월 소득이 들쭉날쭉하다면, 낮은 달/평균/높은 달은요?</p>
              <div className="mt-2.5 space-y-2">
                <input
                  value={input.freelancerIncomeLow ?? ""}
                  onChange={(e) => set("freelancerIncomeLow", e.target.value)}
                  placeholder="낮은 달(만원)"
                  className="w-full rounded-lg border border-border p-2 text-sm outline-none"
                />
                <input
                  value={input.freelancerIncomeAvg ?? ""}
                  onChange={(e) => set("freelancerIncomeAvg", e.target.value)}
                  placeholder="평균 달(만원)"
                  className="w-full rounded-lg border border-border p-2 text-sm outline-none"
                />
                <input
                  value={input.freelancerIncomeHigh ?? ""}
                  onChange={(e) => set("freelancerIncomeHigh", e.target.value)}
                  placeholder="높은 달(만원)"
                  className="w-full rounded-lg border border-border p-2 text-sm outline-none"
                />
              </div>
            </div>
          )}

          <SingleSelectField
            label="돈 관리는 어떤 단위로 하세요?"
            options={MONEY_MANAGEMENT_UNIT_OPTIONS}
            value={input.moneyManagementUnit}
            onChange={(v) => set("moneyManagementUnit", v)}
          />
          <MultiSelectField
            label="평소 돈 쓰는 패턴에 해당하는 게 있다면요?"
            options={SPENDING_PATTERN_OPTIONS}
            values={input.spendingPatterns}
            onChange={(v) => set("spendingPatterns", v)}
          />
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-8">
        {step > 1 && (
          <Button variant="outline" size="lg" onClick={() => setStep((s) => s - 1)} className="h-13 rounded-full">
            이전
          </Button>
        )}
        <Button
          size="lg"
          disabled={(step === 1 && !step1Complete) || (step === 2 && !step2Complete) || (step === 3 && !step3Complete)}
          onClick={() => (step < 3 ? setStep((s) => s + 1) : onComplete(input))}
          className="h-13 flex-1 rounded-full text-base"
        >
          {step < 3 ? "다음" : "분석 결과 보기"}
        </Button>
      </div>
    </div>
  );
}
```

### 파일: src/components/palm/trust-badges.tsx
```tsx
"use client";

import { ShieldCheck } from "lucide-react";
import { TRUST_BADGES } from "@/lib/trust-badges-copy";

/** 결제 화면의 신뢰 신호 블록 — 후기·리뷰가 아니라 사실 진술만 나열한다.
 * 옛 trust-section.tsx(현실정보 플로우와 함께 삭제됨)를 복원한 게 아니라
 * 새로 만든 컴포넌트다. enabled: false인 항목(재무협회 관련, 명칭 미확정)은
 * 렌더링에서 제외한다. */
export function TrustBadges() {
  const badges = TRUST_BADGES.filter((b) => b.enabled && b.text);
  if (badges.length === 0) return null;

  return (
    <div className="mystic-card mt-4 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-(--gold)">
        <ShieldCheck className="size-3.5" />
        이렇게 설계했습니다
      </p>
      <ul className="mt-2 space-y-1.5">
        {badges.map((b) => (
          <li key={b.text} className="text-sm leading-relaxed text-muted-foreground">
            {b.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 파일: src/components/ui/badge.tsx
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
```

### 파일: src/components/ui/button.tsx
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

### 파일: src/components/ui/card.tsx
```tsx
import * as React from "react"
import { cn } from "cn"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

### 파일: src/components/ui/input.tsx
```tsx
import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

### 파일: src/components/ui/label.tsx
```tsx
"use client"

import * as React from "react"
import { cn } from "cn"
import { Label as LabelPrimitive } from "radix-ui"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
```

### 파일: src/components/ui/progress.tsx
```tsx
"use client"

import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
```

### 파일: src/components/ui/separator.tsx
```tsx
"use client"

import * as React from "react"
import { cn } from "cn"
import { Separator as SeparatorPrimitive } from "radix-ui"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
```

### 파일: src/components/ui/starfield.tsx
```tsx
// 딥 인디고 배경 위에 은은하게 반짝이는 별빛 레이어.
// 순수 CSS 애니메이션(무거운 캔버스/파티클 라이브러리 없이)으로 구현해
// 모든 화면 뒤에 고정 배치하는 용도.

interface Star {
  top: string;
  left: string;
  size: number;
  duration: string;
  delay: string;
  opacity: number;
}

function seededStars(count: number): Star[] {
  // 고정 시드로 매 렌더마다 동일한 배치를 만든다 (하이드레이션 불일치 방지).
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  return Array.from({ length: count }, () => {
    const size = rand() < 0.15 ? 2 : 1;
    return {
      top: `${(rand() * 100).toFixed(2)}%`,
      left: `${(rand() * 100).toFixed(2)}%`,
      size,
      duration: `${(2.5 + rand() * 3.5).toFixed(2)}s`,
      delay: `${(rand() * 5).toFixed(2)}s`,
      opacity: 0.4 + rand() * 0.5,
    };
  });
}

const STARS = seededStars(70);

export function Starfield() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.33 0.06 290 / 55%), transparent 60%)",
        }}
      />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full bg-(--gold)"
          style={
            {
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              "--twinkle-min": 0.1,
              "--twinkle-max": s.opacity,
              "--twinkle-duration": s.duration,
              animationDelay: s.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
```

### 파일: src/lib/analysis-result.ts
```ts
// 분석 결과 조립 — 병목 판정(bottleneck-engine.ts) + 카피(analysis-result-copy.ts)
// + 코드로 계산한 근거 숫자(surplusKrw, gapStatement)를 합친다. 숫자는 전부
// 코드 계산, AI/추측 없음.
//
// gapStatement("격차 한 방"): 결제 직전 임팩트 문구 — "지금 속도라면 목표까지
// 몇 개월 걸린다" 식의 순수 숫자 격차만 보여준다(불안 조성 문구 아님).
// 설문은 구간(버킷)으로만 받으므로, 버킷 중간값을 코드가 정한 근사치로 써서
// 계산한다 — AI가 지어낸 숫자가 아니라 우리가 정한 고정 환산표를 코드가
// 그대로 적용한 값이다. 병목 항목마다 그 항목에 맞는 격차를 계산하고,
// 전용 계산식이 없는(붙일 실수 데이터가 없는) 항목은 "잉여금 연환산"이라는
// 공통 격차로 대체한다 — 하드코딩된 문장 하나를 모든 유형에 재사용하지
// 않는다는 원칙은 지키되, 데이터가 없는 곳까지 억지로 지어내지 않는다.

import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";
import { detectBottleneck, type BottleneckCode } from "@/lib/bottleneck-engine";
import { BOTTLENECK_COPY } from "@/lib/analysis-result-copy";

export interface AnalysisResult {
  bottleneck: BottleneckCode;
  headline: string;
  why: string;
  lifeMeaning: string;
  notUrgent: string;
  notUrgentReason: string;
  surplusKrw: number;
  gapStatement: string;
}

// 구간 응답을 실제 계산에 쓸 수 있는 근사 숫자로 바꾸는 고정 환산표(코드가
// 정한 값, AI 추측 아님) — 정확한 금액이 아니라 "그 구간을 대표하는 값"이다.
const EMERGENCY_FUND_MONTHS: Record<string, number> = { none: 0, under_1m: 0.5, "1_3m": 2, "3_6m": 4.5, over_6m: 6 };
const FUTURE_EVENT_AMOUNT_KRW: Record<string, number> = { under_500: 2_500_000, "500_2000": 12_500_000, over_2000: 25_000_000 };
const FUTURE_EVENT_PREPARED_FRACTION: Record<string, number> = { none: 0, under_half: 0.25, over_half: 0.75, enough: 1 };
const DEBT_PAYMENT_MONTHLY_KRW: Record<string, number> = { under_30: 150_000, "30_100": 650_000, over_100: 1_200_000 };

function fmt(krw: number): string {
  return `${Math.round(krw).toLocaleString("ko-KR")}원`;
}

/** 저축 여력 — 저축액을 입력했으면 그대로, 안 했으면 잉여금(양수일 때만) 대신 쓴다. */
function monthlySavingCapacity(input: SurveyInput): number {
  if (input.monthlySavingsKrw > 0) return input.monthlySavingsKrw;
  const surplus = surplusKrw(input);
  return surplus > 0 ? surplus : 0;
}

function buildGapStatement(bottleneck: BottleneckCode, input: SurveyInput): string {
  const surplus = surplusKrw(input);

  switch (bottleneck) {
    case "cash_flow_deficit": {
      const yearlyDeficit = Math.abs(surplus) * 12;
      return `지금 흐름이 그대로면, 1년 뒤 ${fmt(yearlyDeficit)}만큼 마이너스가 쌓입니다.`;
    }
    case "emergency_fund_shortage": {
      const targetKrw = 3 * input.monthlyFixedCostKrw;
      const currentKrw = (EMERGENCY_FUND_MONTHS[input.emergencyFund] ?? 0) * input.monthlyFixedCostKrw;
      const rate = monthlySavingCapacity(input);
      const remaining = targetKrw - currentKrw;
      if (remaining <= 0) return "비상자금 3개월 치는 이미 채워져 있는 수준입니다.";
      if (rate <= 0) return "지금 저축 여력으로는 비상자금을 채울 속도 자체를 계산하기 어렵습니다.";
      const months = Math.ceil(remaining / rate);
      return `지금 저축 속도라면, 비상자금 3개월 치를 채우는 데 ${months}개월이 걸립니다.`;
    }
    case "income_interruption_risk": {
      const months = EMERGENCY_FUND_MONTHS[input.emergencyFund] ?? 0;
      return `지금 비상자금 수준이면, 소득이 끊겨도 버틸 수 있는 기간은 약 ${months}개월입니다.`;
    }
    case "high_interest_debt": {
      const monthly = input.debtMonthlyPayment ? DEBT_PAYMENT_MONTHLY_KRW[input.debtMonthlyPayment] : undefined;
      if (!monthly) return "지금 잉여금 기준으로 1년을 환산하면 " + fmt(surplus * 12) + "입니다.";
      return `지금 상환 규모라면, 1년 동안 빚에 들어가는 돈이 약 ${fmt(monthly * 12)}입니다.`;
    }
    case "near_future_funds_shortfall": {
      const target = input.futureEventAmount ? FUTURE_EVENT_AMOUNT_KRW[input.futureEventAmount] : undefined;
      const fraction = input.futureEventPrepared ? FUTURE_EVENT_PREPARED_FRACTION[input.futureEventPrepared] : undefined;
      if (target === undefined || fraction === undefined) return `지금 잉여금 기준으로 1년을 환산하면 ${fmt(surplus * 12)}입니다.`;
      const currentKrw = target * fraction;
      const rate = monthlySavingCapacity(input);
      const remaining = target - currentKrw;
      if (remaining <= 0) return "필요한 금액은 이미 준비된 수준입니다.";
      if (rate <= 0) return "지금 저축 여력으로는 필요한 금액을 채울 속도 자체를 계산하기 어렵습니다.";
      const months = Math.ceil(remaining / rate);
      return `지금 저축 속도라면, 필요한 금액을 채우는 데 약 ${months}개월이 걸립니다.`;
    }
    default: {
      // 전용 계산식이 없는 병목(사업자금혼합/카드의존/지출파악못함/저축시스템없음/
      // 장기목표속도/투자효율) — 지어내지 않고 잉여금 연환산이라는 같은 축의
      // 공통 격차로 대체한다.
      const yearly = surplus * 12;
      return yearly >= 0
        ? `지금 잉여금 흐름이 그대로면, 1년 뒤 ${fmt(yearly)}이 모입니다.`
        : `지금 흐름이 그대로면, 1년 뒤 ${fmt(Math.abs(yearly))}만큼 마이너스가 쌓입니다.`;
    }
  }
}

export function buildAnalysisResult(input: SurveyInput): AnalysisResult {
  const bottleneck = detectBottleneck(input);
  const copy = BOTTLENECK_COPY[bottleneck];
  return {
    bottleneck,
    headline: `지금 가장 먼저 봐야 할 건 ${copy.title}입니다.`,
    why: copy.why,
    lifeMeaning: copy.lifeMeaning,
    notUrgent: copy.notUrgent,
    notUrgentReason: copy.notUrgentReason,
    surplusKrw: surplusKrw(input),
    gapStatement: buildGapStatement(bottleneck, input),
  };
}
```

### 파일: src/lib/analysis-result-copy.ts
```ts
// 분석 결과 화면 카피 — 순수 데이터, 로직 없음(운영자 교체 가능).
// BottleneckCode별 {제목, 왜, 생활에서의 의미, 지금 안 해도 되는 것 + 그 이유}.
// 특정 금융상품·해법은 지목하지 않는다. notUrgentReason은 "왜 뒤로 밀리는지"를
// 반드시 설명한다(결과만 던지지 않는다 — 운영 문서 §5 요구사항).

import type { BottleneckCode } from "@/lib/bottleneck-engine";

export interface BottleneckCopyEntry {
  title: string;
  why: string;
  lifeMeaning: string;
  notUrgent: string;
  notUrgentReason: string;
}

export const BOTTLENECK_COPY: Record<BottleneckCode, BottleneckCopyEntry> = {
  cash_flow_deficit: {
    title: "현금흐름",
    why: "월 소득에서 고정지출과 저축을 빼면 마이너스입니다.",
    lifeMeaning: "매달 쓸 수 있는 돈보다 나가는 돈이 더 많다는 뜻입니다. 카드값이나 마이너스통장으로 메우고 있을 가능성이 높습니다.",
    notUrgent: "투자나 저축을 늘리는 것",
    notUrgentReason: "지금은 나가는 돈부터 줄이는 게 먼저이고, 마이너스 상태에서 늘리는 저축은 오히려 부담만 키우기 때문입니다.",
  },
  income_interruption_risk: {
    title: "소득 중단 위험",
    why: "곧 소득이 끊기거나 줄어들 수 있는 시기입니다.",
    lifeMeaning: "지금 소득 흐름이 당연하게 계속될 거라 가정하고 있다면 위험합니다.",
    notUrgent: "장기 투자 계획",
    notUrgentReason: "소득이 불안정한 시기엔 장기 계획보다 지금 당장의 현금 흐름을 지키는 게 우선이기 때문입니다.",
  },
  high_interest_debt: {
    title: "고금리 부채",
    why: "금리가 높거나 만기가 임박한 빚이 있습니다.",
    lifeMeaning: "이자만으로 매달 상당액이 그냥 빠져나가고 있을 수 있습니다.",
    notUrgent: "저축을 늘리는 것",
    notUrgentReason: "빚의 이자율이 저축으로 버는 수익보다 훨씬 크면, 저축보다 빚부터 줄이는 쪽이 실질적으로 더 이득이기 때문입니다.",
  },
  near_future_funds_shortfall: {
    title: "가까운 목적자금",
    why: "가까운 시일 안에 목돈이 필요한데 준비된 돈이 부족합니다.",
    lifeMeaning: "그 시점이 왔을 때 급하게 빚을 내거나 계획을 미뤄야 할 수 있습니다.",
    notUrgent: "장기 자산관리",
    notUrgentReason: "가까운 시점에 필요한 돈부터 확보되지 않으면, 장기 계획은 그 전에 흔들릴 수 있기 때문입니다.",
  },
  emergency_fund_shortage: {
    title: "비상자금",
    why: "비상자금이 부족합니다.",
    lifeMeaning: "예상 못 한 지출이 생기면 바로 흔들릴 수 있는 구조입니다.",
    notUrgent: "투자",
    notUrgentReason: "비상자금이 채워지기 전엔 투자 수익률보다, 그 돈이 필요할 때 바로 쓸 수 있는지가 더 중요하기 때문입니다.",
  },
  biz_personal_mixed: {
    title: "사업자금·생활비 혼합",
    why: "사업자금과 생활비가 섞여 있습니다.",
    lifeMeaning: "실제로 얼마나 벌고 얼마나 쓰는지 스스로도 파악하기 어려운 상태입니다.",
    notUrgent: "저축 시스템을 만드는 것",
    notUrgentReason: "지금 얼마가 진짜 내 돈인지부터 명확해지지 않으면, 저축 목표 자체를 정하기 어렵기 때문입니다.",
  },
  card_installment_dependence: {
    title: "카드·할부 의존",
    why: "카드나 할부에 반복적으로 의존하고 있습니다.",
    lifeMeaning: "이번 달 지출이 다음 달로 계속 넘어가는 구조입니다.",
    notUrgent: "투자",
    notUrgentReason: "매달 카드값이 먼저 빠져나가는 구조에서는 투자할 여윳돈 자체가 계속 줄어들기 때문입니다.",
  },
  no_expense_awareness: {
    title: "지출 파악",
    why: "실제 지출을 정확히 모르고 계십니다.",
    lifeMeaning: "어디서 새는지 모르는 채로 절약을 시도하면 효과가 안 보입니다.",
    notUrgent: "저축액부터 늘리는 것",
    notUrgentReason: "어디서 새는지 모르는 채로 저축만 늘리면, 결국 새는 곳을 못 막아 저축도 오래 못 가기 때문입니다.",
  },
  no_savings_system: {
    title: "저축 시스템",
    why: "정해진 저축 시스템이 없습니다.",
    lifeMeaning: "남으면 저축하는 방식이라 남는 달도 있고 아예 없는 달도 있을 수 있습니다.",
    notUrgent: "투자 상품을 고르는 것",
    notUrgentReason: "저축 자체가 자동으로 안 되는 구조에서는 투자 상품을 골라도 매달 넣을 돈이 달라지기 때문입니다.",
  },
  long_term_goal_pace_short: {
    title: "장기 목표 속도",
    why: "장기 목표 대비 준비 속도가 느립니다.",
    lifeMeaning: "지금 속도로는 목표 시점에 필요한 만큼 모이지 않을 수 있습니다.",
    notUrgent: "단기 지출 관리",
    notUrgentReason: "장기 목표의 속도 자체가 문제라면, 단기 지출을 아무리 관리해도 목표 시점을 맞추기 어렵기 때문입니다.",
  },
  investment_efficiency: {
    title: "자산 운용 효율",
    why: "기본적인 자금 구조는 안정적입니다.",
    lifeMeaning: "이제는 지금 자산을 얼마나 효율적으로 굴리고 있는지 볼 차례입니다.",
    notUrgent: "추가 소득원을 찾는 것",
    notUrgentReason: "지금 구조가 안정적이라면, 새 소득원을 찾기 전에 있는 자산을 효율적으로 굴리는 쪽이 먼저이기 때문입니다.",
  },
};
```

### 파일: src/lib/analytics.ts
```ts
// 이 프로젝트엔 기존 analytics/event tracking이 없었다(확인 후 신설).
// 이번 라운드의 목적은 Analytics 플랫폼 도입이 아니라서 외부 SaaS는 붙이지
// 않는다 — 대신 나중에 실제 provider(예: PostHog, GA)를 한 곳에서 연결할
// 수 있도록 아주 작은 인터페이스만 만든다. 지금은 개발 중 확인용으로
// console.debug만 한다.

// 퍼널 6단계(§8-7): 무료진단 완료 -> 간접체험 완료 -> 설문 완료 -> 분석결과
// 화면 도달 -> 결제 버튼 클릭 -> 결제 완료. 앞 4개는 이미 커버돼 있었고
// (free_report_completed/indirect_experience_completed/survey_completed/
// analysis_result_viewed), payment_cta_clicked만 이번에 추가했다.
// payment_completed는 타입만 정의해둔다 — 실제 결제 게이트웨이가 없어서
// 지금은 이 이벤트를 발생시키는 곳이 없다(결제 성공 콜백이 생기면 그때 호출).
export type ConversionEvent =
  | "free_report_completed"
  | "indirect_experience_started"
  | "indirect_experience_completed"
  | "survey_completed"
  | "analysis_result_viewed"
  | "payment_screen_viewed"
  | "payment_cta_clicked"
  | "payment_completed";

export function track(event: ConversionEvent, props?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[track] ${event}`, props ?? {});
  }
  // 실제 provider 연결 지점 — 나중에 여기 한 줄만 추가하면 된다.
}
```

### 파일: src/lib/bottleneck-engine.ts
```ts
// 병목 판단 — 순수 계산 함수, AI 아님. 사주·손금 요소는 전혀 개입하지
// 않는다(설문 응답만 쓴다). 11단계를 우선순위 순서로 검사해 처음 걸리는
// 것을 채택한다. 절대적 점수공식이 아니라 순서 기반 체인이다. 필요한
// 정보가 없는 단계는 무조건 스킵한다(억지로 진단하지 않는다) — 10번
// (장기목표 대비 준비속도)은 설문에 해당 필드 자체가 없어 항상 스킵되는
// "정보 부족시 스킵" 원칙의 실제 사례다.

import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";

export type BottleneckCode =
  | "cash_flow_deficit"
  | "income_interruption_risk"
  | "high_interest_debt"
  | "near_future_funds_shortfall"
  | "emergency_fund_shortage"
  | "biz_personal_mixed"
  | "card_installment_dependence"
  | "no_expense_awareness"
  | "no_savings_system"
  | "long_term_goal_pace_short"
  | "investment_efficiency";

const TRANSITIONING_EVENTS = new Set(["leave", "retirement", "job_change"]);
const AMOUNT_RANK: Record<string, number> = { under_500: 1, "500_2000": 2, over_2000: 3 };
const PREPARED_RANK: Record<string, number> = { none: 0, under_half: 1, over_half: 2, enough: 3 };

function step1CashFlowDeficit(input: SurveyInput): boolean {
  return surplusKrw(input) < 0;
}

function step2IncomeInterruptionRisk(input: SurveyInput): boolean {
  if (input.jobType === "transitioning") return true;
  return input.futureEvents.some((e) => TRANSITIONING_EVENTS.has(e));
}

function step3HighInterestDebt(input: SurveyInput): boolean {
  if (!input.hasDebt) return false;
  return input.debtInterestRate === "over_15" || input.debtMaturity === "under_3m";
}

function step4NearFutureFundsShortfall(input: SurveyInput): boolean {
  if (input.futureEvents.length === 0 || input.futureEvents.includes("none")) return false;
  if (!input.futureEventAmount || !input.futureEventPrepared) return false; // 정보 부족 -> 스킵
  const needed = AMOUNT_RANK[input.futureEventAmount] ?? 0;
  const prepared = PREPARED_RANK[input.futureEventPrepared] ?? 0;
  // needed(1~3)와 prepared(0~3)를 같은 척도로 비교 — prepared가 "충분하다"(3)면
  // 항상 부족하지 않다고 본다. 그 외엔 prepared가 needed보다 낮으면 부족.
  if (input.futureEventPrepared === "enough") return false;
  return prepared < needed;
}

function step5EmergencyFundShortage(input: SurveyInput): boolean {
  return input.emergencyFund === "none" || input.emergencyFund === "under_1m";
}

function step6BizPersonalMixed(input: SurveyInput): boolean {
  return input.jobType === "business_owner" && input.businessSeparatesFinance === false;
}

function step7CardInstallmentDependence(input: SurveyInput): boolean {
  return input.spendingPatterns.includes("card_dependence") || input.spendingPatterns.includes("installment");
}

function step8NoExpenseAwareness(input: SurveyInput): boolean {
  return input.expenseAwareness === "unknown";
}

function step9NoSavingsSystem(input: SurveyInput): boolean {
  return input.spendingPatterns.includes("spend_as_earned") && !input.spendingPatterns.includes("auto_savings");
}

// step10: 장기목표 대비 준비속도 — 설문에 해당 필드가 없어 항상 스킵.

export function detectBottleneck(input: SurveyInput): BottleneckCode {
  if (step1CashFlowDeficit(input)) return "cash_flow_deficit";
  if (step2IncomeInterruptionRisk(input)) return "income_interruption_risk";
  if (step3HighInterestDebt(input)) return "high_interest_debt";
  if (step4NearFutureFundsShortfall(input)) return "near_future_funds_shortfall";
  if (step5EmergencyFundShortage(input)) return "emergency_fund_shortage";
  if (step6BizPersonalMixed(input)) return "biz_personal_mixed";
  if (step7CardInstallmentDependence(input)) return "card_installment_dependence";
  if (step8NoExpenseAwareness(input)) return "no_expense_awareness";
  if (step9NoSavingsSystem(input)) return "no_savings_system";
  // step10 (long_term_goal_pace_short): 정보 부족 -> 항상 스킵
  return "investment_efficiency"; // catch-all, 항상 매치
}
```

### 파일: src/lib/element-colors.ts
```ts
// 오행(五行) 색상 매핑. 히어로 비주얼과 결과 카드에서 공유해 사용한다.
export const ELEMENT_COLORS: Record<"목" | "화" | "토" | "금" | "수", string> = {
  목: "oklch(0.72 0.14 145)",
  화: "oklch(0.72 0.16 35)",
  토: "oklch(0.78 0.1 85)",
  금: "oklch(0.85 0.03 90)",
  수: "oklch(0.68 0.12 250)",
};
```

### 파일: src/lib/fortune-candidates.ts
```ts
// "내 운세 지도" — 무료 통합 리포트가 끝난 뒤, 사용자가 지금 가장 궁금한
// 운 하나를 직접 고르는 화면의 데이터 레이어. TRUTH RULE: 전환에 좋은
// 문구를 먼저 정하고 거기 맞춰 사주 해석을 짜내지 않는다 — 이미 SajuFacts에
// 있는 실제 값만 재사용해서 후보별 문구를 만든다.
//
// 이번 라운드 변경:
//  - currentFlow/nextShift가 나이 구간만 인용하던 걸(§7), 실제 대운의
//    십성(stemTenGod/branchTenGod — 이미 SajuFacts에 있던 값인데 안 쓰고
//    있었다)을 반영해 "그 구간이 어떤 성격인지 + 생활에서 어떻게 나타날
//    수 있는지"까지 담도록 깊게 만들었다.
//  - deeperQuestion/paywall 문구를 고정 문구에서 situationCopy(현재상황
//    응답별 문구)로 바꿨다(§8) — 지금까지는 상황을 골라도 analytics에만
//    남고 다음 화면이 똑같았다. 이제 상황 선택값이 실제로 다음 질문·
//    Paywall 제목/항목·CTA를 바꾼다.
//  - "언제 강해질까요?"류 타이밍 중심 질문을 "그래서 지금 나는 무엇을
//    해야 하는가" 행동 중심 질문으로 바꿨다(§9). 시기는 paywallItems의
//    한 줄로만 남긴다.
//  - career_business의 "재성+식상 > 비겁+관성 = 사업형" 이분법을 3구간
//    (business/balanced/stable)으로 완화했다 — 차이가 크지 않을 때 억지로
//    한쪽으로 단정하지 않는다(§6).
//  - change_opportunity의 compareNote는 depthStrength(생명선 두께 근사치)
//    기반 활력 해석을 제거하면서 같이 없앴다 — 생명선에 안전하게 쓸 수
//    있는 대체 근거가 없어 이 축은 손금 비교 자체를 만들지 않는다(§5).
//  - wealth_timing의 compareNote는 "감정선이 있다/없다"만 보던 걸 곡률
//    기반으로 바꿨다 — 선이 검출됐다는 사실 자체로 성향을 판정하지 않는다(§3).

import type { SajuFacts, DaeunFact } from "@/lib/saju-facts";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type FortuneInterestId = "wealth_timing" | "career_business" | "change_opportunity";

export interface SituationOption {
  label: string;
  value: string;
}

/** 현재상황 응답 하나에 대응하는 개인화 카피. deeperQuestion/ctaLabel은
 * 미니리딩의 "더 보기" 버튼에, paywallTitle/paywallItems는 그 다음 결제창에
 * 그대로 이어진다 — 상황을 바꿔 고르면 이 네 가지가 실제로 달라진다. */
export interface SituationCopy {
  deeperQuestion: string;
  ctaLabel: string;
  paywallTitle: string;
  paywallItems: string[];
}

export interface FortuneCandidate {
  id: FortuneInterestId;
  label: string;
  /** 왜 이 사람에게 이 후보가 관련 있는지 — 실제 근거 기반, 전문용어 없이 */
  reason: string;
  /** 무료 16섹션에서 이미 중심적으로 다룬 영역이면 true(단순 완료 표시용, 가짜 진행률 아님) */
  alreadyCovered: boolean;
  bornWay: string;
  currentFlow: string;
  nextShift: string;
  /** 손금에서 안전하게 비교할 수 있는 근거가 실제로 있을 때만 채워진다 —
   * 없으면 null(억지 비교 없음) */
  compareNote: string | null;
  futureScene: string;
  situation: { question: string; options: SituationOption[] };
  situationCopy: Record<string, SituationCopy>;
}

/** 대운 십성(stemTenGod)이 실제로 어떤 결의 10년인지 — 표준 명리 이론의
 * 십성 성격을 그대로 옮긴 것으로, 이번 라운드에 새로 지어낸 판정이 아니다.
 * 지지 십성(branchTenGod)만 있는 경우를 위해 두 값 다 조회해서 쓴다.
 * real-world-personalization.ts의 buildNextMove/buildTimingShift도 이
 * 테이블을 그대로 재사용한다 — 대운 결을 두 군데서 다르게 말하지 않기 위해. */
export const DAEUN_FLAVOR: Record<string, string> = {
  비견: "스스로의 힘으로 밀고 나가는",
  겁재: "경쟁하거나 나눠 가지는 일이 자주 생기는",
  식신: "차분하게 만들고 누리는",
  상관: "표현하고 부딪히는 일이 많아지는",
  편재: "여러 곳에서 기회가 오갔다 하는",
  정재: "꾸준하고 안정적으로 쌓이는",
  편관: "부담이 있지만 그만큼 단련되는",
  정관: "규칙과 책임 안에서 인정받는",
  편인: "혼자 깊이 파고들고 싶어지는",
  정인: "배우고 도움받는 일이 많아지는",
};

export function daeunFlavor(daeun: DaeunFact): string {
  return DAEUN_FLAVOR[daeun.stemTenGod] ?? DAEUN_FLAVOR[daeun.branchTenGod] ?? "여러 기운이 섞인";
}

/** 재성+식상(스스로 벌이는 힘) vs 비겁+관성(체계 안에서 크는 힘) 상대비교.
 * buildFortuneCandidates 내부에 있던 로직을 그대로 뽑아 export만 한
 * 것 — 판정 자체는 바뀌지 않는다(selectPrimaryCandidate가 재사용). */
export function deriveCareerLeaning(facts: SajuFacts): "business" | "stable" | "balanced" {
  const activeGap = facts.wealthStarCount + facts.outputStarCount - (facts.peerStarCount + facts.officerStarCount);
  return activeGap >= 2 ? "business" : activeGap <= -2 ? "stable" : "balanced";
}

/** 현재→다음 대운 사이에 십성이 실제로 바뀌는지. buildFortuneCandidates
 * 내부에 있던 로직을 그대로 뽑아 export만 한 것. */
export function deriveDaeunShift(facts: SajuFacts): boolean {
  const { currentDaeun, nextDaeun } = facts;
  return Boolean(
    currentDaeun && nextDaeun && (currentDaeun.stemTenGod !== nextDaeun.stemTenGod || currentDaeun.branchTenGod !== nextDaeun.branchTenGod),
  );
}

export function buildFortuneCandidates(facts: SajuFacts, onnxLines?: OnnxPalmLines | null): FortuneCandidate[] {
  const {
    wealthStarCount,
    officerStarPillars,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    currentDaeun,
    nextDaeun,
  } = facts;

  // ---------- 재물의 다음 흐름 ----------
  const wealthHeartCurve = onnxLines?.heartLine.detected ? onnxLines.heartLine.curve : null;
  const wealthTiming: FortuneCandidate = {
    id: "wealth_timing",
    label: "재물의 다음 흐름",
    reason:
      wealthOpportunityDaeunCount > 0
        ? "평생 대운을 보면 재물 기운이 겹치는 시기가 여러 차례 옵니다. 그 시기를 미리 짚어두면 도움이 됩니다."
        : "재물이 원국에 직접 드러나 있지는 않지만, 그래서 오히려 시기와 방식을 잡아드리는 게 더 중요합니다.",
    alreadyCovered: true,
    bornWay:
      wealthStarCount === 0
        ? "이 사주는 재물이 저절로 들어오는 구조가 아닙니다. 본업이나 전문성으로 번 돈이 쌓이는 흐름에 가깝습니다."
        : "이 사주는 재물을 다루는 힘을 타고났습니다.",
    currentFlow: currentDaeun
      ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(currentDaeun)} 시기입니다. 돈이 들어오고 나가는 흐름 자체가 평소와 다르게 느껴질 수 있습니다.`
      : "출생시간이 없어 현재 대운은 짚어드리기 어렵습니다.",
    nextShift: nextDaeun
      ? `다음 대운(${nextDaeun.ageRange}세부터)으로 넘어가면 ${daeunFlavor(nextDaeun)} 쪽으로 결이 바뀝니다. 지금까지 돈을 대하던 방식 하나가 자연스럽게 낡고, 새로운 방식이 그 자리를 채우게 됩니다.`
      : "다음 대운은 아직 계산되지 않았습니다.",
    compareNote:
      wealthHeartCurve === null
        ? null
        : wealthHeartCurve === "완만한 곡선"
          ? "손의 감정선도 완만한 곡선입니다. 돈과 관련된 결정에서도 관계와 감정이 함께 작용하는 편입니다."
          : "손의 감정선이 직선에 가깝습니다. 감정보다 원칙 위주로 판단하는 결입니다.",
    futureScene: "큰돈을 움직이거나 중요한 선택을 앞뒀을 때는, 움직일 때와 지킬 때를 구분하는 것이 중요합니다.",
    situation: {
      question: "지금 재물 상황이 어떠세요?",
      options: [
        { label: "안정적으로 유지 중", value: "stable" },
        { label: "변화가 필요하다고 느낌", value: "need_change" },
        { label: "새로운 기회를 찾는 중", value: "seeking" },
        { label: "그냥 앞으로가 궁금함", value: "curious" },
      ],
    },
    situationCopy: {
      stable: {
        deeperQuestion: "지금처럼 안정적으로 유지하는 것과 별개로, 이 흐름을 더 키우려면 지금 뭘 해야 할까요?",
        ctaLabel: "지금 흐름, 어떻게 키울지 보기",
        paywallTitle: "그래서 지금 이 흐름을 어떻게 더 키워야 할까요",
        paywallItems: ["지금 흐름을 키우는 데 실제로 도움 되는 행동", "무리하지 않고 시도해볼 만한 다음 단계", "흐름이 달라지는 시기"],
      },
      need_change: {
        deeperQuestion: "변화가 필요하다고 느끼는 지금, 무엇부터 바꾸고 어떤 기준으로 움직여야 할까요?",
        ctaLabel: "뭐부터 바꿔야 할지 보기",
        paywallTitle: "그래서 저는 지금 뭐부터 바꿔야 할까요",
        paywallItems: ["지금 상황에 맞는 변화 방향", "먼저 정리하면 좋을 것", "흐름이 달라지는 시기"],
      },
      seeking: {
        deeperQuestion: "새 기회를 찾는 지금, 어떤 기준으로 고르고 무엇을 준비해야 할까요?",
        ctaLabel: "이 기회, 잡아도 될지 보기",
        paywallTitle: "지금 이 기회를 어떤 기준으로 판단해야 할까요",
        paywallItems: ["기회를 판단하는 기준", "먼저 준비해두면 좋을 것", "흐름이 달라지는 시기"],
      },
      curious: {
        deeperQuestion: "그래서 지금 나는 이 흐름을 어떻게 활용해야 할까요?",
        ctaLabel: "내가 지금 뭘 해야 할지 보기",
        paywallTitle: "그래서 지금 저는 뭘 해야 할까요",
        paywallItems: ["지금 흐름을 실제로 활용하는 방식", "먼저 준비하면 좋을 것과 피해야 할 행동 패턴", "흐름이 달라지는 시기"],
      },
    },
  };

  // ---------- 직장·사업의 흐름 ----------
  // 차이가 작으면(-1~1) 단정하지 않고 균형형으로 본다.
  const careerLeaning = deriveCareerLeaning(facts);
  const careerHead = onnxLines?.headLine.detected ? onnxLines.headLine.curve : null;
  const careerBusiness: FortuneCandidate = {
    id: "career_business",
    label: "직장·사업의 흐름",
    reason:
      careerLeaning === "business"
        ? "스스로 판을 짜는 쪽에 가까운 신호가 뚜렷합니다. 그 힘을 언제 어떻게 쓰면 좋을지 짚어드릴 수 있습니다."
        : careerLeaning === "stable"
          ? "정해진 체계 안에서 크는 쪽 신호가 뚜렷합니다. 그 안에서 어떻게 움직이면 좋을지 짚어드릴 수 있습니다."
          : "스스로 벌이는 힘과 체계 안에서 크는 힘이 비슷하게 섞여 있습니다. 지금 어느 쪽에 무게를 둬야 하는지가 관건입니다.",
    alreadyCovered: false,
    bornWay:
      careerLeaning === "business"
        ? "이 사주는 직장에 오래 묶여 있기보다, 성과가 바로 결과로 연결되는 일이 더 맞습니다. 조직 안에 있더라도 스스로 기획하고 밀어붙이는 역할일 때 성과가 따라옵니다."
        : careerLeaning === "stable"
          ? `이 사주는 안정적인 틀 안에서 신뢰를 쌓아가는 쪽이 더 맞습니다. ${officerStarPillars.length > 0 ? "역할과 책임이 분명한 환경일수록 오히려 힘이 붙습니다." : "정해진 규칙과 역할이 있는 환경에서 크게 성장합니다."}`
          : "이 사주는 혼자 판을 짜는 쪽도, 체계에 기대는 쪽도 아닙니다. 지금 맡은 역할이 어느 쪽에 가까운지에 따라 결과가 갈립니다.",
    currentFlow: currentDaeun
      ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(currentDaeun)} 시기입니다. 일에서 체감하는 압박이나 기회의 종류가 평소와는 다른 결로 다가올 수 있습니다.`
      : "출생시간이 없어 현재 대운은 짚어드리기 어렵습니다.",
    nextShift: nextDaeun
      ? `다음 대운(${nextDaeun.ageRange}세부터)으로 넘어가면 ${daeunFlavor(nextDaeun)} 쪽으로 결이 바뀝니다. 지금 맞다고 느끼는 일하는 방식 하나가 그때부턴 오히려 안 맞을 수 있습니다.`
      : "다음 대운은 아직 계산되지 않았습니다.",
    compareNote:
      careerHead === null
        ? null
        : careerHead === "완만한 곡선"
          ? "손의 두뇌선도 완만한 곡선입니다. 정해진 틀보다 유연하게 판단하는 결입니다."
          : "손의 두뇌선이 직선에 가깝습니다. 계산하고 따지는 결입니다.",
    futureScene: "새로운 제안이나 독립을 앞뒀을 때는, 밀고 나가는 게 맞는지 기다리는 게 맞는지가 관건이 됩니다.",
    situation: {
      question: "지금 일 관련해서 어떤 상황에 가까우세요?",
      options: [
        { label: "현재 직장 유지", value: "keep_job" },
        { label: "이직 고민", value: "considering_move" },
        { label: "독립·사업 고민", value: "considering_independent" },
        { label: "새로운 역할·제안", value: "new_offer" },
        { label: "단순히 앞으로가 궁금함", value: "curious" },
      ],
    },
    situationCopy: {
      keep_job: {
        deeperQuestion: "지금 자리를 지키기로 한 만큼, 그 안에서 어떻게 움직여야 이 흐름을 제대로 쓸 수 있을까요?",
        ctaLabel: "이 자리에서 뭘 노려야 할지 보기",
        paywallTitle: "지금 이 자리에서 저는 뭘 노려야 할까요",
        paywallItems: ["지금 자리에서 취할 행동 전략", "인정받는 타이밍을 판단하는 기준", "흐름이 달라지는 시기"],
      },
      considering_move: {
        deeperQuestion: "이직을 고민 중인 지금, 무엇을 준비하고 어떤 기준으로 움직여야 할까요?",
        ctaLabel: "이직, 지금이 맞는 타이밍인지 보기",
        paywallTitle: "이직, 지금 움직이는 게 맞을까요",
        paywallItems: ["이직 타이밍을 판단하는 기준", "지금부터 준비하면 좋을 것", "흐름이 달라지는 시기"],
      },
      considering_independent: {
        deeperQuestion: "독립을 고민 중인 지금, 어떤 준비가 먼저 필요할까요?",
        ctaLabel: "독립, 뭐부터 준비할지 보기",
        paywallTitle: "독립하려면 뭐부터 준비해야 할까요",
        paywallItems: ["먼저 준비해야 할 것", "피해야 할 행동 패턴", "흐름이 달라지는 시기"],
      },
      new_offer: {
        deeperQuestion: "새로운 제안을 받은 지금, 어떤 기준으로 받아들이거나 미뤄야 할까요?",
        ctaLabel: "이 제안, 받아도 될지 보기",
        paywallTitle: "이 제안, 저는 받는 게 맞을까요",
        paywallItems: ["제안을 받아들일지 판단하는 기준", "지금 상황에 맞춘 행동 전략", "흐름이 달라지는 시기"],
      },
      curious: {
        deeperQuestion: "그래서 지금 나는 이 일의 흐름을 어떻게 써야 할까요?",
        ctaLabel: "내가 지금 뭘 해야 할지 보기",
        paywallTitle: "그래서 지금 저는 일을 어떻게 풀어가야 할까요",
        paywallItems: ["지금 상황에 맞춘 행동 전략", "기회를 판단하는 기준", "흐름이 달라지는 시기"],
      },
    },
  };

  // ---------- 변화·기회의 흐름 ----------
  const daeunShift = deriveDaeunShift(facts);
  const changeOpportunity: FortuneCandidate = {
    id: "change_opportunity",
    label: "변화·기회의 흐름",
    reason:
      peakStagePillars.length > 0
        ? "기회를 감지하는 힘을 원국에 타고났습니다. 그 타이밍을 미리 짚어두면 도움이 됩니다."
        : "변화가 꾸준히 이어지는 구조입니다. 지금이 어떤 시점인지 짚어드릴 수 있습니다.",
    alreadyCovered: false,
    bornWay:
      peakStagePillars.length > 0
        ? "이 사주는 정점의 기운이 뚜렷한 자리가 있어, 기회가 왔을 때 몸이 먼저 반응합니다."
        : "이 사주는 순발력보다 꾸준함으로 기회를 만들어가는 쪽입니다.",
    currentFlow: currentDaeun
      ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(currentDaeun)} 시기입니다. 평소라면 그냥 지나쳤을 제안이나 만남이 유독 눈에 걸릴 수 있습니다.`
      : "출생시간이 없어 현재 대운은 짚어드리기 어렵습니다.",
    nextShift:
      daeunShift && nextDaeun
        ? `다음 대운(${nextDaeun.ageRange}세부터)으로 넘어가면 ${daeunFlavor(nextDaeun)} 쪽으로 결이 바뀝니다. 구간마다 흐름이 뚜렷하게 갈리는 사주입니다.`
        : "지금 흐름이 비교적 꾸준하게 이어지는 사주입니다.",
    // 생명선 두께(depthStrength)로 활력·변화 대응력을 추론하지 않는다(§5).
    // 생명선에 안전하게 쓸 수 있는 다른 손금 근거가 없어 이 축은 비교를
    // 만들지 않는다 — 억지로 일치·차이를 만드는 것보다 정직하다.
    compareNote: null,
    futureScene: "예상치 못한 제안이나 선택의 갈림길에 섰을 때는, 그 타이밍이 진짜 기회인지 아닌지를 보는 게 중요해집니다.",
    situation: {
      question: "지금 변화에 대해 어떻게 느끼세요?",
      options: [
        { label: "새로운 기회를 기다리는 중", value: "waiting" },
        { label: "변화가 다가오는 걸 느낌", value: "sensing_change" },
        { label: "지금이 움직일 때인지 고민 중", value: "considering_timing" },
        { label: "그냥 앞으로가 궁금함", value: "curious" },
      ],
    },
    situationCopy: {
      waiting: {
        deeperQuestion: "기회를 기다리는 지금, 무엇을 준비해두면 놓치지 않을까요?",
        ctaLabel: "이 기회, 놓치지 않으려면 보기",
        paywallTitle: "이 기회, 놓치지 않으려면 뭘 준비해야 할까요",
        paywallItems: ["기회를 판단하는 기준", "미리 준비해두면 좋을 것", "흐름이 달라지는 시기"],
      },
      sensing_change: {
        deeperQuestion: "변화가 다가오는 걸 느끼는 지금, 무엇부터 준비해야 할까요?",
        ctaLabel: "이 변화, 놓치지 않으려면 보기",
        paywallTitle: "다가오는 이 변화, 저는 뭐부터 준비해야 할까요",
        paywallItems: ["지금 먼저 준비하면 좋을 것", "피해야 할 행동 패턴", "흐름이 달라지는 시기"],
      },
      considering_timing: {
        deeperQuestion: "움직일 때인지 고민 중인 지금, 어떤 기준으로 판단해야 할까요?",
        ctaLabel: "지금이 그 타이밍인지 보기",
        paywallTitle: "지금이 정말 움직일 때가 맞을까요",
        paywallItems: ["움직일 타이밍을 판단하는 기준", "먼저 점검해두면 좋을 것", "흐름이 달라지는 시기"],
      },
      curious: {
        deeperQuestion: "그래서 지금 나는 이 변화·기회를 어떻게 써야 할까요?",
        ctaLabel: "내가 지금 뭘 해야 할지 보기",
        paywallTitle: "그래서 지금 저는 이 변화를 어떻게 써야 할까요",
        paywallItems: ["기회를 판단하는 기준", "지금 먼저 준비하면 좋을 것", "흐름이 달라지는 시기"],
      },
    },
  };

  return [wealthTiming, careerBusiness, changeOpportunity];
}

/** 3개 후보 중 "지금 가장 중요한 흐름" 1개를 고른다. 새 가중치를 만들지
 * 않고, 각 후보를 만들 때 이미 쓰던 신호(재물 대운 존재/직장·사업 기울기/
 * 대운 전환 또는 정점 자리)를 그대로 재사용해 첫 번째로 걸리는 걸 고른다.
 * 셋 다 안 걸리면 wealthTiming을 기본값으로 — "재물"이 이 서비스의
 * 핵심 질문이라 기본 우선순위로 둔다. 사용자는 이후 화면에서 다른 후보로
 * 언제든 바꿔 볼 수 있다(추천은 순서만 바꿀 뿐 선택지를 줄이지 않는다). */
export function selectPrimaryCandidate(facts: SajuFacts, candidates: FortuneCandidate[]): FortuneCandidate {
  const strongSignal: Record<FortuneInterestId, boolean> = {
    wealth_timing: facts.wealthOpportunityDaeunCount > 0,
    career_business: deriveCareerLeaning(facts) !== "balanced",
    change_opportunity: deriveDaeunShift(facts) || facts.peakStagePillars.length > 0,
  };
  return candidates.find((c) => strongSignal[c.id]) ?? candidates[0];
}
```

### 파일: src/lib/free-report-engine.ts
```ts
// interpretation-engine.ts와 동일한 패턴(facts -> prompt -> Claude 또는 mock
// -> 검증). 무료 사주 V2 17섹션 전용. 이 함수도 절대 throw하지 않는다.
//
// 손금(onnxLines)은 이 함수를 거치지 않는다 — 손금 자체 해석(일치/차이
// 비교)은 triple-compare.ts에서, 손금까지 엮은 종합판정은
// real-world-personalization.ts의 buildComprehensiveVerdict에서 각각
// 다룬다(호출부: api/palm/interpret/route.ts). personality(MBTI+6문항)는
// realWorldPersonalization 한 문단으로만 반영한다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityInput } from "@/lib/personality-check";
import { FREE_SAJU_REPORT_SYSTEM_PROMPT, buildFreeSajuReportUserPrompt } from "@/lib/free-report-prompt";
import { validateFreeSajuReport, type FreeSajuReport } from "@/lib/free-report-schema";
import { buildFreeSajuReport } from "@/lib/free-report-mock";

export interface FreeSajuReportResult {
  source: "llm" | "mock";
  report: FreeSajuReport;
  fallbackReason?: string;
}

const DEFAULT_TIMEOUT_MS = 9000;

async function callClaude(systemPrompt: string, userPrompt: string, timeoutMs: number): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾지 못했습니다.");
    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timer);
  }
}

export async function getFreeSajuReport(
  facts: SajuFacts,
  options?: { timeoutMs?: number; personality?: PersonalityInput },
): Promise<FreeSajuReportResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userPrompt = buildFreeSajuReportUserPrompt(facts, options?.personality);

  let raw: unknown = null;
  let fallbackReason: string | undefined;

  try {
    raw = await callClaude(FREE_SAJU_REPORT_SYSTEM_PROMPT, userPrompt, timeoutMs);
    if (!raw) fallbackReason = "no-api-key";
  } catch (err) {
    raw = null;
    fallbackReason = err instanceof Error ? err.message : String(err);
  }

  if (raw) {
    const validation = validateFreeSajuReport(raw);
    if (validation.ok && validation.data) {
      return { source: "llm", report: validation.data };
    }
    fallbackReason = `validation-failed: ${validation.violations.join("; ")}`;
  }

  return {
    source: "mock",
    report: buildFreeSajuReport(facts, options?.personality),
    fallbackReason,
  };
}
```

### 파일: src/lib/free-report-mock.ts
```ts
// 무료 사주 V2의 결정론적(deterministic) 생성기. API 키 없이도 17섹션 전체를
// 항상 완결된 형태로 만든다. be-realdeveloper/saju의 "근거 사전 + 궁위론"
// 패턴(코드가 아니라 구조를 REUSE)과, lguz/humanize-writing-skill·
// boraoztunc/skills(stop-slop, MIT) 조사에서 확인한 "반복 구조 제거" 원칙을
// 함께 적용한다: 모든 문단이 같은 리듬으로 끝나지 않도록, 섹션마다
// (도입부/자기확인 방식) 조합을 다르게 만든다.
//
// 절대 규칙: 콘텐츠(주장/근거)는 오직 SajuFacts에서만 나온다. compose()가
// 하는 일은 같은 사실을 다른 문장 구조에 담는 것뿐, 사실 자체를 바꾸지 않는다.
//
// text/evidence 분리(이번 라운드 신규): 이전에는 "재성 2개", "비겁+관성",
// "격국", "건록·제왕" 같은 전문 계산근거를 본문 문장 끝에 그대로 붙였다 —
// "전문용어를 몰라도 이해 가능해야 한다"는 요구를 어기는 구조였다. 모든
// 서술형 필드는 이제 {text, evidence}로 나뉜다: text는 생활 언어만, evidence는
// "왜 이렇게 봤나요?" 보조 펼침영역에만 쓴다(free-report-schema.ts의
// JARGON_IN_TEXT_PATTERNS가 text에 이 용어들이 들어가면 검증에서 걸러낸다).
//
// 손금/자기보고 비교 로직 이전(Round D): 이전에는 각 주제 문단
// (재물구조/의사결정/사람과 돈/기회) 안에 "감정선이 보이는 편이라..."처럼
// 손금·자기보고 신호를 조용히 섞어 넣었다 — "손금은 사주와 독립된 두
// 번째 분석이어야 한다"는 요구에 따라, 그 비교는 여기서 빼고
// triple-compare.ts의 별도 통합 비교 섹션으로 옮겼다. 이 파일의 13개 주제
// 문단은 지금도 순수 사주 근거로만 구성된다 — 이 원칙은 안 바뀌었다.
//
// MBTI+6문항 재도입: triple-compare에 boolean 투표로 넣는 방식은
// 금지됐다 — 대신 realWorldPersonalization이라는 별도 문단 하나로
// "사주에서 계산된 구조가 현실에서 어떻게 나타나는지"를 설명한다(성향체크를
// 안 했으면 null). 실제 구성은 real-world-personalization.ts에 있다.
//
// 대운 필드 2개 신규(이번 라운드): nextMove("지금 무엇을 해야 하는가")와
// timingShift("앞으로 언제 큰 변화가 오는가")는 항상 채워지는(null 없는)
// daeun 기반 문단이다. realWorldPersonalization은 이제 MBTI/6문항 자체의
// 특성·장면 서술에만 집중하고(대운 이야기는 두 필드가 전담), 손금까지
// 엮은 "종합판정"은 이 파일이 아니라 손금 스캔 이후에만 호출 가능한
// real-world-personalization.ts의 buildComprehensiveVerdict가 api/palm/
// interpret/route.ts에서 직접 만든다 — palm은 무료 사주 단계(/api/saju)엔
// 존재하지 않으므로 이 파일/이 함수는 palm을 아예 받지 않는다.

import type { SajuFacts, PillarFact } from "@/lib/saju-facts";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { PersonalityInput } from "@/lib/personality-check";
import { dayStrengthLabel, dayStrengthShort, elementTemperamentPhrase, dayStemImagery } from "@/lib/saju-labels";
import { buildRealWorldPersonalization, buildNextMove, buildTimingShift } from "@/lib/real-world-personalization";

// ---------- 문장 구조 다양화 유틸 ----------

/** 종성(받침) 유무로 이/가, 은/는을 자동 선택한다. "목이(가)" 같은 미완성
 * 플레이스홀더가 그대로 노출되는 문제를 막는다(실제 스크린샷 검수에서 발견). */
function hasJongseong(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1) - 0xac00;
  if (ch < 0 || ch > 11171) return false;
  return ch % 28 !== 0;
}
function 이가(word: string): string {
  return `${word}${hasJongseong(word) ? "이" : "가"}`;
}
function 은는(word: string): string {
  return `${word}${hasJongseong(word) ? "은" : "는"}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** claim(핵심 결론) + scene(생활 속 구체적 모습)을 seed에 따라 다른 순서로
 * 조립해 text를 만들고, evidence는 별도 필드로 그대로 둔다(본문에 절대
 * 섞지 않는다 — 전문용어는 evidence 전용). */
function compose(seed: number, parts: { claim: string; scene: string; evidence: string }): ReportParagraph {
  const { claim, scene, evidence } = parts;
  const variant = seed % 4;
  let text: string;
  switch (variant) {
    case 0:
      text = `${scene} ${claim}`;
      break;
    case 1:
      text = `${claim} 이를테면 ${scene} ${selfCheck(seed)}`;
      break;
    case 2:
      text = `${scene} ${selfCheck(seed + 1)} ${claim}`;
      break;
    default:
      text = `${claim} ${scene}`;
      break;
  }
  return { text: text.trim(), evidence };
}

const SELF_CHECK_POOL = [
  "스스로도 이미 느끼고 있었을 부분입니다.",
  "주변에서도 비슷한 이야기를 한 번쯤 들었을 것입니다.",
  "최근 있었던 일 하나를 떠올려보면 바로 확인됩니다.",
  "실제로 이렇게 움직이는 경우가 많습니다.",
  "본인은 이미 알고 있었을 수 있습니다.",
  "가까운 사람이라면 고개를 끄덕일 대목입니다.",
];
function selfCheck(seed: number): string {
  return SELF_CHECK_POOL[seed % SELF_CHECK_POOL.length];
}

function pillarNamesKo(pillars: PillarFact["pillar"][]): string {
  const label: Record<PillarFact["pillar"], string> = { year: "연주", month: "월주", day: "일지", hour: "시주" };
  return pillars.map((p) => label[p]).join(", ");
}

function levelOf(count: number): "없음" | "적음" | "보통" | "강함" {
  if (count === 0) return "없음";
  if (count === 1) return "적음";
  if (count <= 2) return "보통";
  return "강함";
}

// ---------- 12운성·신살 심화(REUSE-FIRST) ----------
// ssaju는 이미 pillarStages(기둥별 12운성 bong/geo + specialSals)를 계산해
// 주는데, 이전까지는 peakStagePillars(건록·제왕 자리)로만 걸러 쓰고 나머지는
// 완전히 버려졌다 — 새 계산 엔진 없이 이미 있는 계산 결과를 더 쓰는 것만으로
// 실제 서사 깊이를 늘릴 수 있는 지점이다. 의미 매핑은 사주닥터 레포
// (be-realdeveloper/saju)의 interpretation.md 해석 사전을 그대로 옮긴 것이지
// 이번에 새로 지어낸 판정이 아니다. 신살은 "양념"이라 실제로 검출된 것만
// 풀이하고(없으면 억지로 안 만듦), 의미를 모르는 신살은 이름을 대지 않는다.
const STAGE_ENERGY_PHRASE: Record<string, string> = {
  장생: "새로운 걸 막 시작할 때 힘이 붙는",
  목욕: "시행착오를 겪으며 다듬어가는",
  관대: "본격적으로 성장기에 들어선",
  건록: "가장 힘 있게 밀어붙이는",
  제왕: "정점에서 주도권을 쥐는",
  쇠: "속도를 늦추고 정리하는",
  병: "잠시 쉬어가며 회복하는",
  사: "멈춰서 방향을 다시 보는",
  묘: "안으로 쌓아두고 갈무리하는",
  절: "완전히 새로 시작하기 직전의",
  태: "씨앗처럼 가능성만 있는",
  양: "천천히 준비하며 키워가는",
};

const SINSAL_MEANING: Record<string, { meaning: string; tone: "길" | "주의" }> = {
  도화: { meaning: "사람을 끌어당기는 매력", tone: "길" },
  역마: { meaning: "이동·변화와 잘 맞는 활동성", tone: "길" },
  화개: { meaning: "몰입하고 파고드는 힘", tone: "길" },
  천을귀인: { meaning: "위기일 때 나타나는 귀인의 도움", tone: "길" },
  문창: { meaning: "공부·시험과 잘 맞는 총명함", tone: "길" },
  양인: { meaning: "강하게 밀어붙이는 기세", tone: "주의" },
  백호: { meaning: "강렬하고 극단적인 존재감", tone: "주의" },
  괴강: { meaning: "강렬하고 극단적인 존재감", tone: "주의" },
};

function findNamedSinsal(
  pillarStages: SajuFacts["pillarStages"],
  tone: "길" | "주의",
): { name: string; meaning: string } | null {
  for (const s of pillarStages) {
    for (const raw of s.specialSals) {
      const base = raw.replace(/살$/, "");
      const entry = SINSAL_MEANING[base];
      if (entry && entry.tone === tone) return { name: base, meaning: entry.meaning };
    }
  }
  return null;
}

// ---------- 본체 ----------

export function buildFreeSajuReport(facts: SajuFacts, personality?: PersonalityInput): FreeSajuReport {
  const {
    dayStemKo,
    dayElement,
    dayStrength,
    geukguk,
    dominantElement,
    missingElements,
    wealthStarCount,
    wealthStarPillars,
    peerStarCount,
    outputStarCount,
    outputStarPillars,
    officerStarCount,
    officerStarPillars,
    resourceStarCount,
    hyungsin,
    gilsin,
    gwimunRelations,
    currentDaeun,
    daeunList,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    pillarStages,
    yongsin,
    fiveElements,
  } = facts;

  const baseSeed = hashStr(
    `${dayStemKo}${dayStrength}${geukguk}${wealthStarCount}${peerStarCount}${outputStarCount}${officerStarCount}${resourceStarCount}${gwimunRelations.length}`,
  );
  const seedFor = (i: number) => hashStr(`${baseSeed}:${i}`);

  const wLevel = levelOf(wealthStarCount);
  const activeCompare: "output" | "peer" | "tie" =
    outputStarCount === peerStarCount ? "tie" : outputStarCount > peerStarCount ? "output" : "peer";
  const socialCompare: "officer" | "resource" | "tie" =
    officerStarCount === resourceStarCount ? "tie" : officerStarCount > resourceStarCount ? "officer" : "resource";

  // ① 한눈에 보는 나 — 일간 물상(10종)으로 열어서 갑/을처럼 같은 오행이라도
  // 서로 다른 이미지로 시작하게 한다(벤치마크: 실제 사주 서비스는 "태양처럼",
  // "호랑이의 기상처럼" 같은 물상으로 문장을 여는 경우가 많았는데, 우리는
  // 오행 5종으로만 뭉뚱그려 갑목·을목이 같은 문장을 받고 있었다).
  const imagery = dayStemImagery(dayStemKo);
  const snapshot: ReportParagraph = {
    text:
      `이 사주는 ${imagery.image}처럼 ${imagery.core} 사람의 사주입니다. ${dayStrengthLabel(dayStrength)}이라 ${dayStrength === "strong" ? "그 결이 겉으로도 뚜렷하게 드러납니다" : dayStrength === "weak" ? "그 결이 상황에 따라 완만하게 조절됩니다" : "그 결이 상황 따라 유연하게 나타납니다"}. ` +
      `재물은 ${wLevel === "없음" ? "사주에 직접 드러나 있지는 않고" : `${wLevel} 수준으로 보이고`}${wealthStarPillars.length > 0 ? `(${pillarNamesKo(wealthStarPillars)} 자리)` : ""}, ` +
      `${activeCompare === "output" ? "뭔가를 만들어내는 활동이 곧 돈이 되는" : activeCompare === "peer" ? "직접 부딪히고 경쟁하는 자리에서 돈이 붙는" : "타고난 균형 쪽 흐름이 더 크게 작동하는"} 구조입니다.`,
    evidence: `일간 ${dayStemKo}(${dayElement}), 격국 ${geukguk}, 재성 ${wealthStarCount}개`,
  };

  // ② 타고난 성향
  const temperament = compose(seedFor(2), {
    claim: `원래 ${elementTemperamentPhrase(dayElement)}인데, ${dayStrength === "strong" ? "한번 정한 방향은 잘 바꾸지 않습니다" : dayStrength === "weak" ? "주변 분위기나 상황에 맞춰 스스로를 조정합니다" : "상황에 따라 태도를 유연하게 바꿉니다"}.`,
    scene:
      dayStrength === "strong"
        ? "회의에서 방향이 흔들릴 때 오히려 중심을 잡는 쪽에 서는 경우가 많습니다."
        : dayStrength === "weak"
          ? "혼자 결정하기보다 분위기를 먼저 살피고 나서 움직입니다."
          : "어제와 오늘의 태도가 다를 수 있는데, 그게 오히려 자연스러운 사주입니다.",
    evidence: `일간 ${dayStemKo}(${dayElement}) · 신강신약 ${dayStrengthShort(dayStrength)}, 오행 최다 ${dominantElement}`,
  });
  // 일지(자기·내면 궁위) 12운성 — 겉으로 드러나는 태도와 별개로, 결정적인
  // 순간에 어떤 에너지 단계가 깔려 있는지를 한 겹 더 보여준다.
  const dayStage = pillarStages.find((s) => s.pillar === "day")?.geo;
  const dayStagePhrase = dayStage ? STAGE_ENERGY_PHRASE[dayStage] : null;
  if (dayStagePhrase) {
    temperament.text += ` 평소 태도와 별개로 본바탕에는 ${dayStagePhrase} 기운이 깔려 있어, 정작 중요한 순간에는 평소와 다른 얼굴이 나올 수 있습니다.`;
    temperament.evidence += `, 일지 12운성 ${dayStage}`;
  }

  // ③ 재물운/돈복의 큰 구조
  const wealthStructure = compose(seedFor(3), {
    claim:
      wLevel === "없음"
        ? "재물이 저절로 굴러들어오는 구조는 아니고, 본업이나 전문성이 돈으로 바뀌는 흐름에 가깝습니다."
        : wLevel === "강함"
          ? "사주 자체에 재물을 다루는 축이 뚜렷하게 자리 잡고 있습니다."
          : "재물은 들어오는 것보다 지키는 쪽에서 차이가 나는 균형점에 있습니다.",
    scene:
      missingElements.length > 0
        ? `타고난 기운 중 ${이가(missingElements.join(", "))} 아예 없어, 그 기운이 필요한 상황에서는 사람이나 환경에서 채워야 균형이 맞습니다.`
        : `오행 다섯 가지가 어느 정도 골고루 있어, 극단적으로 한쪽에 쏠리는 재물 패턴은 아닙니다.`,
    evidence: `재성 ${wealthStarCount}개, 용신 ${yongsin.join(", ") || "특이 없음"}`,
  });

  // ④ 돈을 버는 방식
  const earningStyle: ReportParagraph =
    activeCompare === "output"
      ? {
          text:
            `아이디어를 내거나 뭔가를 만들어서 그게 돈으로 바뀌는 방식이 맞습니다. ` +
            `특히 ${pillarNamesKo(outputStarPillars)} 자리에 그 힘이 있어, ${outputStarPillars.includes("month") ? "실제 사회생활과 업무에서" : outputStarPillars.includes("day") ? "본인 성향 자체에서" : "삶의 배경이 되는 부분에서"} 이 활동력이 두드러집니다. ` +
            `직장에 오래 묶여 있기보다, 벌인 일을 마무리 짓는 순간 돈이 따라오는 구조입니다.`,
          evidence: `식상(식신+상관) ${outputStarCount}개, 위치: ${pillarNamesKo(outputStarPillars) || "없음"}`,
        }
      : activeCompare === "peer"
        ? {
            text:
              `직접 경쟁하거나 스스로 실행해야 돈이 붙는 방식입니다. 남이 대신 해주는 일보다, 본인이 직접 판단하고 부딪히는 일에서 결과가 더 좋습니다. ` +
              selfCheck(seedFor(4)),
            evidence: `비겁(비견+겁재) ${peerStarCount}개`,
          }
        : {
            text:
              `식상과 비겁이 뚜렷하게 우세하지 않아, 벌어들이는 힘은 타고난 균형 쪽에서 더 크게 작동합니다. ` +
              `정해진 활동력보다는 상황과 타이밍에 맞춰 버는 방식이 유연하게 바뀝니다.`,
            evidence: `식상 ${outputStarCount}개·비겁 ${peerStarCount}개, 용신(${yongsin.join(", ") || "특이 없음"})`,
          };

  // ⑤ 돈을 지키는 방식
  const keepingStyle: ReportParagraph =
    dayStrength === "strong"
      ? {
          text:
            `자기 기준이 뚜렷해 웬만해서는 흔들리지 않습니다. 다만 그 확신이 지나치면 주변 조언을 듣지 않고 밀어붙이다 지키는 힘을 스스로 깎아먹기 쉽습니다. ` +
            `결정하기 전에 딱 한 번만 다른 사람 의견을 들어보는 것이 순서입니다. 이미 마음을 정한 뒤에는 의견을 구해도 잘 듣지 않게 되니, 결정하기 전이 핵심입니다.`,
          evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)}), 격국 ${geukguk}`,
        }
      : dayStrength === "weak"
        ? {
            text: `혼자 판단하기보다 믿을 만한 사람이나 체계를 곁에 둘 때 돈이 더 잘 지켜집니다. 자동이체나 정기저축처럼 스스로 흔들리지 않아도 되는 장치를 만들어두는 것이 실질적인 도움이 됩니다.`,
            evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})`,
          }
        : {
            text: `한쪽으로 치우치기보다 상황에 맞게 지키는 방식을 바꿉니다. 다만 기준이 유연한 만큼, 명확한 규칙 하나는 고정해두는 것이 흔들림을 줄여줍니다.`,
            evidence: `일간 ${dayStemKo}(중화)`,
          };

  // ⑥ 돈을 놓치는 반복 패턴
  const cautionSinsal = findNamedSinsal(pillarStages, "주의");
  const leakPattern = compose(seedFor(6), {
    claim: cautionSinsal
      ? `${이가(cautionSinsal.meaning)} 있어, 그 기세가 지나치게 튈 때 오히려 손해로 이어지는 패턴이 반복될 수 있습니다.`
      : hyungsin.length > 0
        ? "사주에 있는 특정 기운 탓에, 급하게 밀어붙이거나 감정이 앞선 순간에 손해로 이어지는 패턴이 반복되기 쉽습니다."
        : "뚜렷한 위험 신호는 없지만, 벌어들이는 힘과 실행하는 힘의 균형이 무너질 때가 돈이 새는 신호입니다.",
    scene:
      hyungsin.length > 0 || cautionSinsal
        ? "큰 결정 앞에서는 하루만 미루고 다시 보는 습관을 들이면 이 패턴이 확실히 줄어듭니다."
        : "평소보다 결정을 빨리 내리고 있다면, 그것이 신호일 수 있습니다.",
    evidence: cautionSinsal
      ? `신살 ${cautionSinsal.name}`
      : hyungsin.length > 0
        ? `흉신 ${hyungsin.join(", ")}`
        : `재성 ${wealthStarCount}개·비겁 ${peerStarCount}개 균형`,
  });

  // ⑦ 큰돈/기회와 관계된 성향
  const bigMoneyAffinity = compose(seedFor(7), {
    claim:
      wealthOpportunityDaeunCount === 0
        ? "인생 전체 흐름 중 재물이 뚜렷하게 겹치는 구간은 없지만, 큰돈과 무관하다는 뜻은 아닙니다. 활동력과 실행력이라는 다른 축으로 돈을 만드는 사주입니다."
        : wealthOpportunityDaeunCount <= 2
          ? "평생 흐름 중 재물 기운이 함께 오는 구간이 있습니다. 그 시기가 아니어도 꾸준히 관리하는 것이 기본기가 됩니다."
          : "평생 흐름 중 재물 기운이 함께 오는 구간이 여러 번 있어, 인생 전체로 보면 기회 자체는 여러 번 찾아옵니다.",
    scene:
      peakStagePillars.length > 0 && wealthStarPillars.some((p) => peakStagePillars.includes(p))
        ? "특히 재물이 놓인 자리가 기운이 정점에 달하는 자리와 겹쳐, 기회가 왔을 때 힘 있게 받아낼 수 있는 조건입니다."
        : "다만 기회가 왔을 때 그것을 잡을 준비, 즉 정보력과 실행력이 함께 있어야 실제로 이어집니다.",
    evidence: `대운 중 재성 겹침 ${wealthOpportunityDaeunCount}회, 정점 12운성 자리 ${pillarNamesKo(peakStagePillars) || "없음"}`,
  });

  // ⑧ 직장형/사업형 성향
  const jobOrientation: ReportParagraph =
    wealthStarCount + outputStarCount > peerStarCount + officerStarCount
      ? {
          text:
            `직장에 오래 묶여 있기보다, 성과가 바로 돈으로 연결되는 사업이나 프리랜서 쪽 일이 더 맞습니다. 조직 안에 있더라도, 스스로 결과를 만들어내는 역할을 맡을 때 만족도가 훨씬 높습니다. ` +
            `지시받은 일보다 스스로 기획한 일이 더 잘 풀리는 사주입니다.`,
          evidence: `재성+식상 ${wealthStarCount + outputStarCount}개 vs 비겁+관성 ${peerStarCount + officerStarCount}개`,
        }
      : {
          text:
            `안정적인 체계 안에서 신뢰를 쌓아가는 쪽에서 재물이 더 안정적으로 늘어납니다. 혼자 판을 짜기보다, 명확한 규칙과 역할이 있는 환경에서 오히려 더 크게 성장합니다. ` +
            `자유롭게 알아서 하라고 하면 오히려 막막해지는 사주입니다.`,
          evidence: `비겁+관성 ${peerStarCount + officerStarCount}개 vs 재성+식상 ${wealthStarCount + outputStarCount}개`,
        };

  // ⑨ 조직에서 강한 부분
  const teamStrength = compose(seedFor(9), {
    claim:
      officerStarCount === 0
        ? "조직과 규율을 뜻하는 기운이 사주에 없어, 조직 안에서도 정해진 규칙보다 스스로 만든 기준으로 움직일 때 더 강합니다."
        : "조직 안에서 역할과 책임이 분명할 때 오히려 힘이 붙습니다.",
    scene:
      officerStarPillars.includes("month")
        ? "특히 실제 업무 환경에 그 힘이 있어, 회사와 조직 생활에서 이 성향이 더 뚜렷하게 드러납니다."
        : officerStarCount > 0
          ? "책임을 맡았을 때 회피하지 않고 끝까지 챙기는 쪽에 가깝습니다."
          : "규칙이 너무 촘촘한 곳보다는 결과로 평가받는 구조가 더 맞습니다.",
    evidence: `관성(편관+정관) ${officerStarCount}개, 위치 ${pillarNamesKo(officerStarPillars) || "없음"}`,
  });

  // ⑩ 독립적으로 움직일 때 강한 부분
  const soloStrength = compose(seedFor(10), {
    claim:
      peerStarCount + outputStarCount >= 3
        ? "실행력과 활동력이 함께 강해, 혼자 판단하고 혼자 실행하는 상황에서 오히려 힘이 붙는 사주입니다."
        : "혼자 움직일 때 아주 도드라지는 사주는 아니지만, 필요할 때는 스스로 책임지고 마무리하는 힘이 있습니다.",
    scene:
      peerStarCount + outputStarCount >= 3
        ? "누가 시키지 않아도 스스로 일을 벌이고, 끝까지 밀어붙이는 모습을 자주 보였을 것입니다."
        : "여럿이 헤매는 상황에서 조용히 자기 몫부터 정리하는 쪽에 가깝습니다.",
    evidence: `비겁 ${peerStarCount}개 + 식상 ${outputStarCount}개`,
  });

  // ⑪ 사람과 돈
  const peopleAndMoney: ReportParagraph =
    socialCompare === "officer"
      ? {
          text:
            `조직이나 규칙, 정해진 관계 안에서 돈이 도는 것을 편하게 느낍니다. 이런 구조가 있는 자리에서 돈 관련 결정도 더 안정적으로 내립니다. ` +
            `믿을 만한 시스템이나 계약이 있어야 마음이 놓이는 사주입니다.`,
          evidence: `관성(편관+정관) ${officerStarCount}개`,
        }
      : socialCompare === "resource"
        ? {
            text:
              `정보나 조언을 얻은 뒤에 돈 관련 결정을 내립니다. 믿을 만한 사람의 말 한마디가 실제 선택에 큰 영향을 줍니다. ` +
              `중요한 결정 전에 누군가에게 먼저 물어보고 움직이는 사주입니다.`,
            evidence: `인성(편인+정인) ${resourceStarCount}개`,
          }
        : {
            text: `사람에게 크게 기대지도, 완전히 혼자 판단하지도 않는 균형 잡힌 사주입니다. 상황에 따라 조언을 참고하되 최종 결정은 스스로 내리는 쪽에 가깝습니다.`,
            evidence: `관성 ${officerStarCount}개·인성 ${resourceStarCount}개의 균형`,
          };

  // ⑫ 의사결정 스타일
  const decisionStyle: ReportParagraph =
    dayStrength === "strong"
      ? {
          text: `직관적으로 빠르게 결정하고 밀어붙입니다. 속도는 강점이지만, 중요한 결정일수록 하루 정도 시간을 두고 다시 보면 실수가 확 줄어듭니다.`,
          evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})`,
        }
      : {
          text: `신중하게 정보를 모으고 나서 결정합니다. 다만 너무 오래 재다가 타이밍을 놓치는 경우가 있어, 결정 기한을 스스로 정해두는 것이 도움이 됩니다.`,
          evidence: `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})`,
        };

  // ⑬ 기회를 잡는 방식
  const luckySinsal = findNamedSinsal(pillarStages, "길");
  const opportunityStyle = compose(seedFor(13), {
    claim:
      peakStagePillars.length >= 2
        ? "힘이 정점에 오른 자리가 여러 곳이라, 기회를 감지하는 순간 몸이 먼저 반응합니다."
        : peakStagePillars.length === 1
          ? "정점의 기운이 한 자리에 뚜렷해, 특정 영역에서만큼은 기회를 놓치지 않습니다."
          : "정점 기운이 뚜렷하지 않아, 순발력보다는 꾸준함으로 기회를 만드는 쪽에 가깝습니다.",
    scene: luckySinsal
      ? `사주에 ${이가(luckySinsal.meaning)} 있어, 그것이 기회를 여는 실제 통로가 될 수 있습니다.`
      : gilsin.length > 0
        ? "사주에 길한 기운도 있어, 결정적 순간에 예상치 못한 도움을 받을 때가 있습니다."
        : "화려한 귀인의 도움보다는 스스로 준비해온 것이 기회와 만나는 쪽에 가깝습니다.",
    evidence: `정점(건록·제왕) 자리 ${pillarNamesKo(peakStagePillars) || "없음"}, 길신 ${gilsin.join(", ") || "없음"}${luckySinsal ? `, 신살 ${luckySinsal.name}` : ""}`,
  });

  // ⑭ 강점 3개 — 실제 신호가 있는 항목만 후보로 넣는다. 이전에는 서로 다른
  // 단위(재성 개수 vs 길신 개수×2 같은 임의 가중치)를 억지로 비교해 Top3를
  // 뽑았다 — 카테고리마다 단위가 달라 비교 자체가 의미 없는 산술이었다.
  // 지금은 "이 항목의 근거가 실제로 있는가(present)"만 보고, 있는 항목을
  // 고정 우선순위로 나열한다 — 서로 다른 카테고리의 크기를 비교하지 않는다.
  // 실제 신호가 3개 미만이면(드문 경우) 근거가 약한 사람에게도 거짓으로
  // 확신 있는 강점을 지어내지 않고, 목록 끝에 둔 정직한 대체 문항으로 채운다.
  const strengthPool: { title: string; detail: string; evidence: string; present: boolean }[] = [
    {
      title: "재물을 알아보는 감각",
      detail: "돈이 될 만한 것을 남들보다 먼저 알아채는 감각이 있습니다.",
      evidence: `재성 ${wealthStarCount}개(${facts.wealthStarTypes.join(", ") || "없음"})`,
      present: wealthStarCount > 0,
    },
    {
      title: "직접 밀어붙이는 추진력",
      detail: "남에게 미루지 않고 직접 부딪혀서 해결하는 실행력이 강점입니다.",
      evidence: `비겁 ${peerStarCount}개`,
      present: peerStarCount > 0,
    },
    {
      title: "만들어내고 표현하는 힘",
      detail: "아이디어를 실제 결과물로 바꾸는 표현력과 실행력이 있습니다.",
      evidence: `식상 ${outputStarCount}개`,
      present: outputStarCount > 0,
    },
    {
      title: "귀인의 도움을 받는 힘",
      detail: "결정적인 순간에 사람이나 상황의 도움을 받는 경우가 많습니다.",
      evidence: `길신 ${gilsin.join(", ") || "없음"}`,
      present: gilsin.length > 0,
    },
    {
      title: "안정적으로 신뢰를 쌓는 힘",
      detail: "정해진 틀 안에서 꾸준히 신뢰를 쌓아 결과를 만들어내는 힘이 있습니다.",
      evidence: `관성 ${officerStarCount}개`,
      present: officerStarCount > 0,
    },
    {
      title: "기회를 놓치지 않는 순발력",
      detail: "기회가 왔을 때 반응 속도가 빠릅니다.",
      evidence: `정점 자리 ${peakStagePillars.length}곳`,
      present: peakStagePillars.length > 0,
    },
    {
      title: "상황에 맞춰 균형을 잡는 힘",
      detail: "하나로 확 튀는 강점보다, 상황에 따라 필요한 쪽으로 무게중심을 옮기는 유연함이 있습니다.",
      evidence: "특정 십성으로 뚜렷하게 쏠리지 않은 균형 구조",
      present: true,
    },
  ];
  const strengths = strengthPool
    .filter((c) => c.present)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑮ 조심할 점 3개 — 강점과 같은 원칙. "확실히 조심해야 할 이유가 있는지
  // (present)"만 보고 고정 우선순위로 나열, 임의 가중치로 비교하지 않는다.
  const cautionPool: { title: string; detail: string; evidence: string; present: boolean }[] = [
    {
      title: "감정이 앞서는 순간",
      detail: "특정 기운이 작용할 때는 감정적으로 판단해 손해로 이어지기 쉽습니다. 결정 전에 한 박자 늦추는 것이 도움이 됩니다.",
      evidence: `흉신 ${hyungsin.join(", ")}`,
      present: hyungsin.length > 0,
    },
    {
      title: "지나친 확신",
      detail: "스스로 옳다고 믿으면 주변 말이 잘 들리지 않습니다. 큰 결정일수록 의도적으로 반대 의견을 들어보는 것이 낫습니다.",
      evidence: `일간 ${dayStrengthShort(dayStrength)}`,
      present: dayStrength === "strong",
    },
    {
      title: "혼자 판단하다 정보 부족",
      detail: "확신 없이 결정했다가 나중에 정보 부족을 느끼는 경우가 있습니다. 미리 정보원을 만들어두는 것이 좋습니다.",
      evidence: `일간 ${dayStrengthShort(dayStrength)}`,
      present: dayStrength === "weak",
    },
    {
      title: "불편한 조합이 만드는 스트레스",
      detail: "생각이 복잡해지고 예민해지는 시기에는 돈 관련 결정을 미루는 것이 낫습니다.",
      evidence: gwimunRelations.join(", "),
      present: gwimunRelations.length > 0,
    },
    {
      title: "벌여놓고 마무리를 못 짓는 패턴",
      detail: "새로 벌이는 힘은 있지만, 벌인 만큼 마무리가 따라가지 않으면 힘이 분산됩니다.",
      evidence: `식상 ${outputStarCount}개`,
      present: outputStarCount >= 2,
    },
    {
      title: "없는 오행이 만드는 공백",
      detail: `타고난 기운 중 ${이가(missingElements.join(", "))} 없어, 그 기운이 필요한 상황(결단이나 유연성이 필요한 순간)에서 유독 힘들어질 수 있습니다.`,
      evidence: `없는 오행 ${missingElements.join(", ")}`,
      present: missingElements.length > 0,
    },
    {
      title: "균형이 오히려 우유부단함으로 보일 수 있음",
      detail: "한쪽으로 뚜렷하게 쏠리지 않는 만큼, 결정을 미루는 사람으로 비칠 때가 있습니다. 기준 하나만 미리 정해두면 도움이 됩니다.",
      evidence: "특정 십성으로 뚜렷하게 쏠리지 않은 균형 구조",
      present: true,
    },
  ];
  const cautions = cautionPool
    .filter((c) => c.present)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑯ 왜 이런 결과가 나왔나 — 전체 리포트용 "근거 요약" 보조 섹션. 여기는
  // 전문용어를 써도 된다(이 필드 자체가 펼쳐보는 근거 영역이라서).
  // 시간축 Truth Gate: "앞으로 1~3년" 같은 임의 구간을 말하지 않고, 실제
  // daeunList/currentDaeun에 있는 나이 구간만 그대로 인용한다.
  const daeunFlowNote =
    daeunList.length > 0
      ? `평생 대운은 총 ${daeunList.length}단계로 흘러가며, 지금은 그중 ${currentDaeun ? `${currentDaeun.ageRange}세부터 시작된 ${currentDaeun.ganzhi}` : "특정"} 구간입니다.`
      : "대운 정보는 이번 계산에서 확인되지 않았습니다.";

  const evidenceExplainer =
    `이 결과는 태어난 날의 하늘 기운(일간) ${dayStemKo}(${dayElement})이 ${dayStrengthShort(dayStrength)}이라는 점, 원국 여덟 글자에서 돈(재성)·경쟁(비겁)·활동(식상)·조직(관성)·정보(인성)를 뜻하는 글자가 몇 개씩 있는지, 격국(${geukguk})과 용신(${yongsin.join(", ") || "특이 없음"}), 그리고 12운성으로 그 힘이 어느 시기에 정점을 찍는지를 함께 보고 판단했습니다. ` +
    `${daeunFlowNote} ` +
    `오행 분포는 ${Object.entries(fiveElements).map(([k, v]) => `${k} ${v}개`).join(", ")}이며, 그중 ${이가(dominantElement)} 가장 강했습니다${missingElements.length > 0 ? `, 반대로 ${은는(missingElements.join(", "))} 아예 없었습니다` : ""}.`;

  // ⑰ MBTI+6문항이 있을 때만 채워지는 "현실 발현" 개인화 문단.
  const realWorldPersonalization = personality
    ? buildRealWorldPersonalization(facts, personality)
    : null;

  const nextMove = buildNextMove(facts, personality ?? null);
  const timingShift = buildTimingShift(facts);

  return {
    snapshot,
    temperament,
    wealthStructure,
    earningStyle,
    keepingStyle,
    leakPattern,
    bigMoneyAffinity,
    jobOrientation,
    teamStrength,
    soloStrength,
    peopleAndMoney,
    decisionStyle,
    opportunityStyle,
    strengths,
    cautions,
    evidenceExplainer,
    realWorldPersonalization,
    nextMove,
    timingShift,
  };
}
```

### 파일: src/lib/free-report-prompt.ts
```ts
// 무료 사주 V2 16섹션을 실제 LLM(Claude)에 요청할 때 쓰는 프롬프트.
// 현재 프로덕션은 ANTHROPIC_API_KEY 미설정으로 mock만 쓰지만, 키가 추가되면
// 이 프롬프트가 그대로 free-report-engine.ts에서 쓰인다.
//
// 이번 라운드 변경: (1) 손금/자기보고 비교를 더 이상 개별 섹션에 녹이지
// 않는다 — 손금은 사주와 독립된 두 번째 분석이어야 한다는 요구에 따라
// triple-compare.ts로 옮겼으므로 이 프롬프트는 순수 SajuFacts만 받는다.
// (2) 모든 서술형 필드가 {text, evidence} 쌍이 됐다 — text에는 전문
// 계산근거(재성 N개, 비겁+관성, 격국, 용신, 건록·제왕 같은 용어)를 절대
// 쓰지 않고, evidence에만 담는다. free-report-schema.ts의
// JARGON_IN_TEXT_PATTERNS가 이 규칙이 깨지면 validateFreeSajuReport에서
// 걸러내 mock으로 fallback한다 — 옛 "사주+손금 반복" 구조나 전문용어 노출
// 구조가 LLM 경로로 되살아나도 검증에서 차단된다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityInput } from "@/lib/personality-check";

export const FREE_SAJU_REPORT_SYSTEM_PROMPT = `당신은 사주(四柱) 원국 데이터를 근거로, "무료인데 이렇게까지 해준다고?"라는 반응이 나올 만큼 구체적이고 재미있는 무료 성향·재물 리포트를 쓰는 에디터입니다. 정확한 계산 결과를 나열하는 보고서가 아니라, 3~5분 동안 몰입해서 읽을 만한 글을 씁니다.

절대 규칙 (사실 관련):
1. 아래 SajuFacts 바깥의 사실을 지어내지 마세요. 계산에 없는 대운/신살/십성을 언급하지 마세요.
2. 절대 확정적 미래·보장 표현("부자가 된다", "성공한다", "수익 보장")을 쓰지 마세요.
3. 이 리포트는 현재 직업, 소득, 지출, 자산, 부채, 재무 목표를 절대 묻지도 언급하지도 않습니다. 오직 태어난 날짜(사주 원국)만 근거로 삼으세요. 손금·자기보고 성향정보는 이 리포트가 아니라 별도 단계에서 비교합니다 — 여기서는 다루지 마세요.
4. "앞으로 1~3년" 같은 임의의 시간 구간을 만들어내지 마세요. 실제 currentDaeun/daeunList에 있는 나이 구간만 그대로 인용하세요. 데이터에 없는 시기는 말하지 마세요.

절대 규칙 (전문용어 노출 금지 — 가장 중요):
5. 모든 서술형 필드는 {"text": "...", "evidence": "..."} 형태입니다. text는 전문용어를 전혀 몰라도 이해되는 생활 언어로만 쓰세요 — "재성 2개", "식상 3개", "비겁+관성", "격국", "용신", "건록·제왕" 같은 표현을 text에 절대 쓰지 마세요. 그 계산근거는 evidence에만 담으세요. text는 결론(생활 언어) → 구체적인 행동/생활 패턴 → (필요하면) 독자가 자기 경험과 비교하게 만드는 장치 순서로 쓰세요.
6. 같은 문장 패턴을 반복하지 마세요. 섹션마다 도입 방식(장면 묘사로 시작 / 단정적 주장으로 시작)을 바꾸세요.
7. 전문용어로 문장을 시작하지 마세요("일간이 ~라서"로 시작 금지). 부사 남발("정말", "진짜", "솔직히")을 피하고, 수동태보다 능동태를 쓰세요.
8. 십성이 어느 자리(연/월/일/시)에 있는지("궁위")를 evidence에 최대한 활용해 근거를 구체화하세요.
9. strengths와 cautions는 각각 최소 3개, detail은 전문용어 없는 생활 언어로, evidence에만 실제 SajuFacts 필드 값을 짧게(8~16자) 남기세요.
10. realWorldPersonalization: MBTI/6문항 데이터가 함께 주어졌을 때만 채우세요(없으면 null). 이 필드는 "사주 계산을 MBTI로 다시 맞추는" 자리가 아니라 "이미 위에서 설명한 사주 구조가 현실에서 어떻게 나타나는지"를 MBTI 4축(E/I=에너지 방향, S/N=정보를 받아들이는 방식, T/F=판단 기준, J/P=구조화 선호)으로 구체화하는 자리입니다. 6문항 직접 응답(특히 speed/plan/autonomy)이 있으면 그 응답을 1차 근거로 쓰고, MBTI는 6문항이 다루지 않는 축(E/I, S/N)을 채우세요. "MBTI로 보면", "6문항으로 보면", "직접 답한 것만 보면" 같은 도구 이름을 문장에 그대로 쓰지 마세요 — 그냥 그 사람의 특성으로 단정해서 서술하고, MBTI와 6문항이 실제로 갈릴 때만 "상황에 따라 다른 얼굴이 나올 수 있다"는 식으로 자연스럽게 풀어쓰세요. "J라서 빠르게 결정한다", "F라서 감정적이다" 같은 단순 이분법 문장은 금지합니다 — 반드시 구체적 생활 장면(돈/일/관계 중 최소 2개)으로 풀어쓰세요. 대운(현재/다음) 이야기는 이 필드가 아니라 nextMove/timingShift가 전담하니 여기서 다시 다루지 마세요.
11. nextMove("지금 무엇을 해야 하는가")와 timingShift("앞으로 언제 큰 변화가 오는가")는 반드시 currentDaeun/nextDaeun에 있는 실제 나이 구간·간지만 인용하세요. "1~3년" 같은 임의의 구간을 지어내지 마세요. currentDaeun/nextDaeun이 없으면(시간 미상) 대운 없이도 말할 수 있는 사실(오행/십성 구조)로만 채우세요. "지금은 27세예요"처럼 대운 시작 나이를 사용자의 현재 나이인 것처럼 쓰지 마세요 — "27세부터 이어지는 지금 대운은" 식으로 그 대운이 시작된 나이라는 것을 분명히 하세요.
12. 말투(가장 중요): 보고서·분석 결과·마케팅 카피처럼 들리는 문장을 쓰지 마세요. 실제 사주 상담을 받는 느낌으로, 명리사가 원국과 대운을 보고 현실적으로 풀어주는 어조로 쓰세요. "이 사주는", "원래 ~할 때", "~습니다/~됩니다" 같은 상담체 격식 어미를 기본으로 쓰고, "~편이에요", "~거예요" 같은 캐주얼한 말투는 쓰지 마세요. "돈 성향", "이 축", "도드라져 보여요", "이런 흐름이에요", "결이 갈린다", "신호가 강해진다", "패턴이 나타난다", "데이터가 보여준다", "분석 결과로는" 같은 분석적·마케팅적 표현은 절대 쓰지 마세요. 모든 문장은 (1) 사주에서 무엇이 보이는지 → (2) 현실에서 어떻게 나타나는지 → (3) 그래서 지금 무엇을 조심하거나 활용해야 하는지 순서로 자연스럽게 이어지게 쓰세요.
12. 반드시 요청된 JSON 스키마로만 응답하세요.`;

export function buildFreeSajuReportUserPrompt(facts: SajuFacts, personality?: PersonalityInput): string {
  const personalitySection = personality?.mbti || personality?.check
    ? `

## 성향체크 (MBTI/6문항 — realWorldPersonalization 작성에만 사용, 사주 계산 근거로 쓰지 말 것)
${personality.mbti ? `- MBTI: ${personality.mbti}` : "- MBTI: 입력 안 함"}
${personality.check ? `- 6문항 응답(왼쪽/중간/오른쪽): ${Object.entries(personality.check.levels).map(([k, v]) => `${k}=${v}`).join(", ")}` : "- 6문항: 입력 안 함"}`
    : "";

  return `다음은 한 사람의 사주 원국 계산 결과입니다. 이 데이터만 근거로 16섹션 무료 리포트를 만들어주세요.${personalitySection}

## 원국 요약 (라이브러리 계산 원문)
${facts.compactText}

## 구조화 필드
- 일간: ${facts.dayStemKo}(${facts.dayElement}) / 강약: ${facts.dayStrength}(${facts.dayStrengthScore})
- 격국: ${facts.geukguk} / 용신: ${facts.yongsin.join(", ")}
- 오행 분포: ${JSON.stringify(facts.fiveElements)} (최다: ${facts.dominantElement}, 없는 오행: ${facts.missingElements.join(", ") || "없음"})
- 재성 ${facts.wealthStarCount}개(궁위: ${facts.wealthStarPillars.join(", ") || "없음"}) / 비겁 ${facts.peerStarCount}개 / 식상 ${facts.outputStarCount}개(궁위: ${facts.outputStarPillars.join(", ") || "없음"}) / 관성 ${facts.officerStarCount}개(궁위: ${facts.officerStarPillars.join(", ") || "없음"}) / 인성 ${facts.resourceStarCount}개
- 길신: ${facts.gilsin.join(", ") || "없음"} / 흉신: ${facts.hyungsin.join(", ") || "없음"} / 귀문: ${facts.gwimunRelations.join(", ") || "없음"}
- 공망: ${facts.gongmang.join(", ")}
- 12운성 정점(건록·제왕) 자리: ${facts.peakStagePillars.join(", ") || "없음"}
- 현재 대운: ${facts.currentDaeun ? `${facts.currentDaeun.ageRange}세 ${facts.currentDaeun.ganzhi}` : "정보 없음"} (전체 대운 ${facts.daeunList.length}단계, 그중 재성이 겹치는 구간 ${facts.wealthOpportunityDaeunCount}회 — "1~3년" 같은 임의 구간이 아니라 이 실제 나이 구간만 인용)
- 출생시간 입력 여부: ${facts.hasTimeInput ? "있음" : "없음(시주 제외)"}

## 요청 스키마 (JSON만 응답, 서술형 필드는 전부 {"text":"...", "evidence":"..."} 형태)
{
  "snapshot": {"text": "한눈에 보는 나 (생활 언어만)", "evidence": "일간/격국/재성 등 계산근거"},
  "temperament": {"text": "타고난 성향", "evidence": "..."},
  "wealthStructure": {"text": "재물운/돈복의 큰 구조", "evidence": "..."},
  "earningStyle": {"text": "돈을 버는 방식", "evidence": "..."},
  "keepingStyle": {"text": "돈을 지키는 방식", "evidence": "..."},
  "leakPattern": {"text": "돈을 놓치는 반복 패턴", "evidence": "..."},
  "bigMoneyAffinity": {"text": "큰돈/기회와 관계된 성향", "evidence": "..."},
  "jobOrientation": {"text": "직장형/사업형 성향 (현재 직업 언급 금지, 원국만으로 추론)", "evidence": "..."},
  "teamStrength": {"text": "조직에서 강한 부분", "evidence": "..."},
  "soloStrength": {"text": "독립적으로 움직일 때 강한 부분", "evidence": "..."},
  "peopleAndMoney": {"text": "사람과 돈", "evidence": "..."},
  "decisionStyle": {"text": "의사결정 스타일", "evidence": "..."},
  "opportunityStyle": {"text": "기회를 잡는 방식", "evidence": "..."},
  "strengths": [{"title": "...", "detail": "전문용어 없는 생활 언어", "evidence": "..."}] (최소 3개, 실제 근거가 있는 것만 — 근거가 약하면 개수를 억지로 채우지 말고 톤을 낮추세요),
  "cautions": [{"title": "...", "detail": "전문용어 없는 생활 언어", "evidence": "..."}] (최소 3개, 위와 동일 원칙),
  "evidenceExplainer": "왜 이런 결과가 나왔나 (일간/오행/십성/격국/대운 근거를 마지막에 쉽게 설명 — 이 필드는 이미 근거 요약이 목적이라 전문용어 포함 가능)",
  "realWorldPersonalization": ${personality?.mbti || personality?.check ? '{"text": "위 성향체크 섹션 참고해서 규칙 10번대로 작성", "evidence": "MBTI/6문항 중 실제로 쓴 축"}' : "null // 성향체크 입력이 없으므로 반드시 null"},
  "nextMove": {"text": "지금 무엇을 해야 하는가 — currentDaeun 근거로만, 행동형 문장", "evidence": "현재 대운 간지/십성"},
  "timingShift": {"text": "앞으로 언제 큰 변화가 오는가 — nextDaeun.ageRange만 인용", "evidence": "다음 대운 간지/십성"}
}`;
}
```

### 파일: src/lib/free-report-schema.ts
```ts
// 무료 사주 V2의 16섹션 구조. 기존 Interpretation(유료 업셀용, timing/action
// 등 "정밀 시기" 지향)과는 목적이 달라 별도 스키마로 둔다 — 이쪽은 "이번
// 생애 전반의 성향/패턴"을 완결된 형태로 설명하는 데 집중한다.
// 모든 문단은 "결론(생활언어) -> 구체적 행동/패턴 -> 자기확인 질문성 문장"
// 순서를 따르되, 문단마다 도입/마무리 방식과 문장 리듬을 다르게 해서 같은
// 패턴이 반복되지 않아야 한다(mock/LLM 공통).
//
// text/evidence 분리: 이전에는 "재성 2개", "비겁+관성", "격국", "건록·제왕"
// 같은 전문 계산근거를 본문 문장 끝에 그대로 붙여서 보여줬다. 이번 라운드
// 요구사항은 "전문용어를 몰라도 이해 가능"해야 한다는 것이라, 모든 서술형
// 필드를 { text, evidence }로 나눈다 — text는 생활 언어로만 쓰고(전문
// 계산근거 없이도 이해 가능해야 함), evidence는 "왜 이렇게 봤나요?" 같은
// 보조 펼침영역에서만 보여준다(UI에서 기본 접힘).

import { z } from "zod";

const paragraph = z.object({
  /** 생활 언어로만 쓴 본문 — 재성/식상/관성/비겁/격국/용신/건록·제왕 같은
   * 전문 계산근거 용어를 직접 포함하지 않는다. */
  text: z.string().min(10),
  /** "왜 이렇게 봤나요?" 보조 펼침영역에만 노출하는 전문 계산근거. */
  evidence: z.string().min(2),
});
export type ReportParagraph = z.infer<typeof paragraph>;

const evidenceItem = z.object({
  title: z.string().min(2),
  /** 생활 언어 설명 — evidence 없이도 이해 가능해야 한다. */
  detail: z.string().min(10),
  evidence: z.string().min(2),
});

export const FreeSajuReportSchema = z.object({
  snapshot: paragraph, // ① 한눈에 보는 나
  temperament: paragraph, // ② 타고난 성향
  wealthStructure: paragraph, // ③ 재물운/돈복의 큰 구조
  earningStyle: paragraph, // ④ 돈을 버는 방식
  keepingStyle: paragraph, // ⑤ 돈을 지키는 방식
  leakPattern: paragraph, // ⑥ 돈을 놓치는 반복 패턴
  bigMoneyAffinity: paragraph, // ⑦ 큰돈/기회와 관계된 성향
  jobOrientation: paragraph, // ⑧ 직장형/사업형 성향
  teamStrength: paragraph, // ⑨ 조직에서 강한 부분
  soloStrength: paragraph, // ⑩ 독립적으로 움직일 때 강한 부분
  peopleAndMoney: paragraph, // ⑪ 사람과 돈
  decisionStyle: paragraph, // ⑫ 의사결정 스타일
  opportunityStyle: paragraph, // ⑬ 기회를 잡는 방식
  strengths: z.array(evidenceItem).min(3), // ⑭ 강점 3개 이상
  cautions: z.array(evidenceItem).min(3), // ⑮ 조심할 점 3개 이상
  /** ⑯ 왜 이런 결과가 나왔는지 — 이 필드 자체가 이미 "펼쳐서 보는 근거"
   * 성격이라 전문용어를 포함해도 된다(방법론 요약이 목적). UI에서도 항상
   * 접힌 상태로 시작하는 전체 리포트용 보조 섹션으로 다룬다. */
  evidenceExplainer: z.string().min(10),
  /** ⑰ MBTI/6문항이 있을 때만 채워지는 "현실에서 어떻게 나타나는지" 개인화
   * 문단 — 없으면 null(성향체크를 건너뛴 사람에게 억지로 만들지 않음). */
  realWorldPersonalization: paragraph.nullable(),
  /** ⑱ "지금 무엇을 해야 하는가" — 현재 대운 기반, 항상 채워짐(null 없음). */
  nextMove: paragraph,
  /** ⑲ "앞으로 언제 큰 변화가 오는가" — 다음 대운 기반, 항상 채워짐. */
  timingShift: paragraph,
});

export type FreeSajuReport = z.infer<typeof FreeSajuReportSchema>;

const BANNED_PATTERNS: RegExp[] = [
  /반드시\s*(성공|부자|대박)/,
  /100\s*%/,
  /무조건\s*(성공|보장)/,
  /확실히\s*(부자|성공)/,
  /(수익|돈)\s*(을|를)?\s*보장/,
  /틀림없이/,
  /운명(적으)?으로\s*정해져/,
  /['"](strong|weak|neutral)['"]/i,
  /강약\s*[:：]\s*(strong|weak|neutral)/i,
];

/** text 필드에는 절대 들어가면 안 되는 전문 계산근거 용어. evidence
 * 필드에는 당연히 나와도 된다(거긴 원래 근거를 담는 자리) — 그래서 이
 * 검사는 text만 대상으로 한다. */
const JARGON_IN_TEXT_PATTERNS: RegExp[] = [
  /재성\s*\d/,
  /식상\s*\d/,
  /관성\s*\d/,
  /비겁\s*\d/,
  /인성\s*\d/,
  /비겁\+관성/,
  /재성\+식상/,
  /건록·제왕/,
  /격국/,
  /용신/,
  /원국/,
  /\((비겁|식상|재성|관성|인성)\)/,
  /검출/,
  /ONNX/i,
  /MediaPipe/i,
];

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

export function validateFreeSajuReport(raw: unknown): ValidationResult & { data?: FreeSajuReport } {
  const parsed = FreeSajuReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, violations: parsed.error.issues.map((i) => `schema: ${i.path.join(".")} ${i.message}`) };
  }

  const d = parsed.data;
  const paragraphTexts = [
    d.snapshot,
    d.temperament,
    d.wealthStructure,
    d.earningStyle,
    d.keepingStyle,
    d.leakPattern,
    d.bigMoneyAffinity,
    d.jobOrientation,
    d.teamStrength,
    d.soloStrength,
    d.peopleAndMoney,
    d.decisionStyle,
    d.opportunityStyle,
    d.nextMove,
    d.timingShift,
    ...(d.realWorldPersonalization ? [d.realWorldPersonalization] : []),
  ].map((p) => p.text);

  const fullText = [...paragraphTexts, ...d.strengths.map((s) => s.detail), ...d.cautions.map((c) => c.detail)].join(
    "\n",
  );

  const bannedViolations = BANNED_PATTERNS.filter((re) => re.test(fullText)).map((re) => `banned phrase: ${re.source}`);
  const jargonViolations = JARGON_IN_TEXT_PATTERNS.filter((re) => re.test(fullText)).map(
    (re) => `jargon leaked into plain text: ${re.source}`,
  );
  const violations = [...bannedViolations, ...jargonViolations];
  return { ok: violations.length === 0, violations, data: parsed.data };
}
```

### 파일: src/lib/indirect-experience.ts
```ts
// 간접체험 로직 — 순수 함수, 난수 없음(같은 유형·같은 선택=같은 결과).
import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import { INDIRECT_EXPERIENCE_SCENES, EXPERIENCE_OUTCOME_TEXT, type ExperienceScene, type ExperienceChoice } from "@/lib/indirect-experience-data";

export function getExperienceScenes(code: WealthTypeCode): ExperienceScene[] {
  return INDIRECT_EXPERIENCE_SCENES[code];
}

export function computeExperienceOutcome(code: WealthTypeCode, tones: ExperienceChoice["tone"][]): string {
  const total = tones.length || 1;
  const goodCount = tones.filter((t) => t === "good").length;
  const badCount = tones.filter((t) => t === "bad").length;
  const text = EXPERIENCE_OUTCOME_TEXT[code];
  if (goodCount > total / 2) return text.good;
  if (badCount > total / 2) return text.bad;
  return text.mixed;
}
```

### 파일: src/lib/indirect-experience-data.ts
```ts
// "간접체험" 전용 데이터 — 순수 데이터, 로직 없음. 운영자가 검수 후 통째로
// 교체할 수 있어야 한다(wealth-type-copy.ts와 같은 패턴). 재물유형(4종)이
// 상황·선택지를 결정하는 주 분기축이고, 손금 키워드(HandShape)는 장면
// 도입부에 성향 묘사 한 줄을 얹는 보조 연출로만 쓴다 — 완전 교차(4×5)
// 시나리오를 전부 새로 쓰지 않는다(콘텐츠는 운영자 검수 필요 항목).
//
// 상황은 전부 사주 재물유형이 이미 짚은 "문제"를 그대로 체험 소재로 쓴다:
// ACCUM=모이는데 방치됨, LEAK=설명 안 되게 샘, HOLD=기회를 미루다 놓침,
// TIGHT=여유가 얇음. 특정 해법은 지목하지 않는다(기존 원칙 유지).

import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import type { PalmKeyword } from "@/lib/palm-keyword";

export interface ExperienceChoice {
  id: string;
  label: string;
  tone: "good" | "neutral" | "bad";
}

export interface ExperienceScene {
  id: string;
  situation: string;
  choices: ExperienceChoice[];
}

/** 손금 손 모양(HandShape)에 따른 성향 묘사 한 줄. unknown이면 문장을
 * 아예 생략한다(없는 근거를 말하지 않는다). */
export const PALM_FLAVOR_LINE: Record<PalmKeyword, string | null> = {
  square: "손이 사각형에 가까운 분들은 실용적이고 현실적으로 판단하는 편입니다.",
  rectangular: "손바닥이 길쭉한 사각형에 가까운 분들은 신중하게 따져보고 움직이는 편입니다.",
  elongated: "손가락이 길고 가느다란 분들은 섬세하고 감각적으로 판단하는 편입니다.",
  slender: "손이 갸름한 분들은 유연하고 직관적으로 움직이는 편입니다.",
  unknown: null,
};

export const INDIRECT_EXPERIENCE_SCENES: Record<WealthTypeCode, ExperienceScene[]> = {
  ACCUM: [
    {
      id: "accum1",
      situation: "월급이 들어왔습니다. 이번에도 특별히 쓸 곳을 정하지 않았습니다.",
      choices: [
        { id: "leave", label: "따로 정리하지 않고 그대로 둔다", tone: "bad" },
        { id: "sort", label: "일부를 다른 목적통장으로 옮겨본다", tone: "good" },
        { id: "later", label: "나중에 정리하기로 하고 미룬다", tone: "neutral" },
      ],
    },
    {
      id: "accum2",
      situation: "통장에 여유자금이 꽤 쌓였습니다. 어떻게 하시겠어요?",
      choices: [
        { id: "leave", label: "계속 그대로 둔다", tone: "bad" },
        { id: "review", label: "어디에 쓸지 한번 검토해본다", tone: "good" },
        { id: "later", label: "그냥 두되 나중에 생각한다", tone: "neutral" },
      ],
    },
    {
      id: "accum3",
      situation: "괜찮은 기회가 보였는데, 지금 자산이 어디에 얼마나 있는지 바로 확인이 안 됩니다.",
      choices: [
        { id: "skip", label: "기회를 넘긴다", tone: "bad" },
        { id: "check", label: "지금이라도 자산 현황을 정리해본다", tone: "good" },
        { id: "later", label: "다음에 생각한다", tone: "neutral" },
      ],
    },
  ],
  LEAK: [
    {
      id: "leak1",
      situation: "월급이 들어왔습니다. 이번 달에도 예상 못 한 지출이 벌써 몇 건 있었습니다.",
      choices: [
        { id: "ignore", label: "그냥 넘어간다", tone: "bad" },
        { id: "note", label: "어디에 썼는지 한번 적어본다", tone: "good" },
        { id: "shrug", label: "신경 쓰지 않는다", tone: "neutral" },
      ],
    },
    {
      id: "leak2",
      situation: "카드 명세서를 보니 기억 안 나는 결제가 여럿입니다.",
      choices: [
        { id: "ignore", label: "그냥 넘어간다", tone: "bad" },
        { id: "check", label: "하나씩 확인해본다", tone: "good" },
        { id: "later", label: "다음 달에 보기로 한다", tone: "neutral" },
      ],
    },
    {
      id: "leak3",
      situation: "월말, 예상보다 돈이 안 남았습니다.",
      choices: [
        { id: "ignore", label: "왜 그런지 몰라도 그냥 넘어간다", tone: "bad" },
        { id: "review", label: "이번 달 지출을 되짚어본다", tone: "good" },
        { id: "hope", label: "다음 달엔 다를 거라 생각한다", tone: "neutral" },
      ],
    },
  ],
  HOLD: [
    {
      id: "hold1",
      situation: "괜찮은 제안이 왔는데, 결정을 미루고 있습니다.",
      choices: [
        { id: "delay", label: "계속 미룬다", tone: "bad" },
        { id: "review", label: "지금 검토해본다", tone: "good" },
        { id: "later", label: "나중에 생각한다", tone: "neutral" },
      ],
    },
    {
      id: "hold2",
      situation: "묶여 있는 돈을 움직일 타이밍이 왔습니다.",
      choices: [
        { id: "leave", label: "그대로 둔다", tone: "bad" },
        { id: "move", label: "지금 움직여본다", tone: "good" },
        { id: "watch", label: "좀 더 지켜본다", tone: "neutral" },
      ],
    },
    {
      id: "hold3",
      situation: "다시 비슷한 기회가 왔습니다.",
      choices: [
        { id: "delay", label: "또 미룬다", tone: "bad" },
        { id: "decide", label: "이번엔 바로 결정한다", tone: "good" },
        { id: "think", label: "고민만 한다", tone: "neutral" },
      ],
    },
  ],
  TIGHT: [
    {
      id: "tight1",
      situation: "월급이 들어왔지만 고정지출이 대부분입니다.",
      choices: [
        { id: "same", label: "그냥 쓰던 대로 쓴다", tone: "bad" },
        { id: "check", label: "고정지출을 한번 점검해본다", tone: "good" },
        { id: "shrug", label: "어쩔 수 없다고 넘긴다", tone: "neutral" },
      ],
    },
    {
      id: "tight2",
      situation: "작은 지출 하나가 생겼습니다.",
      choices: [
        { id: "spend", label: "바로 쓴다", tone: "bad" },
        { id: "think", label: "정말 필요한지 한번 생각해본다", tone: "good" },
        { id: "delay", label: "미룬다", tone: "neutral" },
      ],
    },
    {
      id: "tight3",
      situation: "이번 달도 빠듯하게 끝났습니다.",
      choices: [
        { id: "same", label: "다음 달도 똑같을 거라 생각한다", tone: "bad" },
        { id: "plan", label: "어디서부터 손댈지 생각해본다", tone: "good" },
        { id: "ignore", label: "그냥 넘어간다", tone: "neutral" },
      ],
    },
  ],
};

export const EXPERIENCE_OUTCOME_TEXT: Record<WealthTypeCode, { good: string; mixed: string; bad: string }> = {
  ACCUM: {
    good: "쌓아둔 돈을 실제로 움직이기 시작했습니다. 방치되던 자산이 이제 일을 하기 시작합니다.",
    mixed: "일부는 정리했지만, 여전히 상당액이 그대로 멈춰 있습니다.",
    bad: "이번에도 돈은 쌓였지만 그대로입니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
  LEAK: {
    good: "어디로 새는지 조금씩 보이기 시작했습니다. 다음 달은 지금과 다를 수 있습니다.",
    mixed: "몇 군데는 짚었지만, 여전히 설명 안 되는 지출이 남아 있습니다.",
    bad: "이번 달도 돈이 어디로 갔는지 모른 채 끝났습니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
  HOLD: {
    good: "미루던 기회를 실제로 잡아봤습니다. 묶여 있던 돈과 기회가 조금씩 움직이기 시작합니다.",
    mixed: "한 번은 움직였지만, 여전히 망설이다 놓친 것도 있습니다.",
    bad: "이번에도 기회는 왔지만 그냥 지나갔습니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
  TIGHT: {
    good: "빠듯한 와중에도 어디서부터 손댈지 짚어봤습니다. 작지만 분명한 변화입니다.",
    mixed: "몇 가지는 점검했지만, 여전히 빠듯한 구조 자체는 그대로입니다.",
    bad: "이번 달도 여유 없이 끝났습니다. 이런 달이 반복되면 1년 뒤에도 같은 자리입니다.",
  },
};
```

### 파일: src/lib/interpretation-engine.ts
```ts
// facts -> prompt -> (Claude 또는 mock) -> 스키마/금지표현 검증까지의
// 전체 해석 파이프라인. /api/saju(실제 결과 화면용)와
// /api/saju/interpret(단독 테스트/디버그용) 둘 다 이 엔진을 공유한다.
// 이 함수는 절대 throw하지 않는다 — 어떤 실패든 mock으로 떨어져서
// "API 오류 시 화면 전체 실패 금지" 요구를 만족시킨다.

import type { SajuFacts } from "@/lib/saju-facts";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "@/lib/interpretation-prompt";
import { validateInterpretation, type Interpretation } from "@/lib/interpretation-schema";
import { buildMockInterpretation } from "@/lib/interpretation-mock";

export interface InterpretationResult {
  source: "llm" | "mock";
  interpretation: Interpretation;
  /** llm 호출이 실패/타임아웃/검증실패로 mock에 떨어진 경우의 사유 (로그/디버그용, 사용자 노출 안 함) */
  fallbackReason?: string;
}

const DEFAULT_TIMEOUT_MS = 9000;

async function callClaude(systemPrompt: string, userPrompt: string, timeoutMs: number): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status}`);
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾지 못했습니다.");
    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 딥 해석을 시도한다. 키 없음 / 네트워크 실패 / 타임아웃 / 스키마 검증 실패 /
 * 금지표현 검출 중 무엇이 일어나도 결정론적 mock으로 안전하게 떨어진다.
 */
export async function getInterpretation(
  facts: SajuFacts,
  options?: { timeoutMs?: number },
): Promise<InterpretationResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userPrompt = buildInterpretationUserPrompt(facts);

  let raw: unknown = null;
  let fallbackReason: string | undefined;

  try {
    raw = await callClaude(INTERPRETATION_SYSTEM_PROMPT, userPrompt, timeoutMs);
    if (!raw) fallbackReason = "no-api-key";
  } catch (err) {
    raw = null;
    fallbackReason = err instanceof Error ? err.message : String(err);
  }

  if (raw) {
    const validation = validateInterpretation(raw);
    if (validation.ok && validation.data) {
      return { source: "llm", interpretation: validation.data };
    }
    fallbackReason = `validation-failed: ${validation.violations.join("; ")}`;
  }

  return {
    source: "mock",
    interpretation: buildMockInterpretation(facts),
    fallbackReason,
  };
}
```

### 파일: src/lib/interpretation-mock.ts
```ts
// 실제 LLM API 키가 없을 때 쓰는 결정론적(deterministic) 대체 해석기.
// "AI 해석 프로토타입"의 파이프라인(계산→구조화→해석→검증)을 키 없이도
// 끝까지 검증할 수 있도록, SajuFacts 조합에 따라 문장을 조립한다.
// 절대 하드코딩된 "일간 10종 고정 문장"이 아니라, 여러 필드의 조합으로
// 문장을 구성하므로 같은 일간이라도 다른 필드(대운/재성/식상 등)가 다르면
// 결과가 달라진다 — 이게 이번 요구사항(개인화 테스트)의 핵심 조건이다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { Interpretation } from "@/lib/interpretation-schema";
import { dayStrengthLabel, dayStrengthShort } from "@/lib/saju-labels";

// oh-my-saju timing으로 받은 대운과 원국 사이의 합충형파해(로컬 계산, 이견
// 없는 고정 클래식 표) — 실제로 걸리는 게 있을 때만 문장을 만든다.
function daeunRelationSentence(relations: { detail: string }[]): string | null {
  if (relations.length === 0) return null;
  return `이 대운은 타고난 사주와 ${relations.map((r) => r.detail).join(", ")}이 걸려 있습니다.`;
}

function wealthLevel(count: number): "없음" | "보통" | "강함" {
  if (count === 0) return "없음";
  if (count <= 2) return "보통";
  return "강함";
}

export function buildMockInterpretation(facts: SajuFacts): Interpretation {
  const {
    dayStemKo,
    dayElement,
    dayStrength,
    geukguk,
    dominantElement,
    wealthStarCount,
    peerStarCount,
    outputStarCount,
    hyungsin,
    currentDaeun,
    nextDaeun,
    daeunAnalysis,
  } = facts;

  const wLevel = wealthLevel(wealthStarCount);
  // 식상(활동력) vs 비겁(경쟁력) 비교. 둘 다 0이면 "더 많다/우세하다"고 말할
  // 근거 자체가 없으므로 별도 문구를 쓴다 (그 반대로 텍스트를 만들면 사실과
  // 어긋나는 문장이 나온다 — 실제 테스트 케이스 E에서 발견된 버그).
  const activeCompare: "output" | "peer" | "tie" =
    outputStarCount === peerStarCount ? "tie" : outputStarCount > peerStarCount ? "output" : "peer";

  const summary =
    `이 사주는 ${dayStrengthLabel(dayStrength)}이고, ${geukguk}을 타고났습니다. ` +
    `가장 강한 기운은 ${dominantElement}이고, 재물은 ${wLevel === "없음" ? "직접 드러나 있지는 않습니다" : wLevel === "보통" ? "적당히 자리 잡고 있습니다" : "뚜렷하게 자리 잡고 있습니다"}. ` +
    `원래 ${activeCompare === "peer" ? "묵묵히 반복해서 자리를 잡는" : "일단 벌여놓고 결과로 증명하는"} 쪽에 가깝습니다.`;

  const money_style =
    wLevel === "없음"
      ? "이 사주는 재물이 저절로 들어오는 구조가 아닙니다. 돈을 직접 좇기보다, 본업이나 전문성에서 나온 결과물이 자연스럽게 돈으로 바뀌는 흐름에 가깝습니다."
      : wLevel === "보통"
        ? "이 사주는 돈이 완전히 낯설지도, 너무 익숙하지도 않은 균형점에서 관계를 맺습니다."
        : "이 사주는 돈의 흐름을 감지하고 다루는 감각이 핵심 축 중 하나입니다.";

  const earning_style =
    activeCompare === "output"
      ? "뭔가를 만들어내거나 표현하는 활동이 곧 돈으로 이어지는 구조입니다. 직장에 오래 묶여 있기보다 성과가 바로 돈으로 연결되는 일이 더 맞습니다."
      : activeCompare === "peer"
        ? "남과 비교되는 자리, 직접 부딪히는 자리에서 오히려 돈 버는 힘이 커집니다."
        : "벌어들이는 힘이 활동이나 경쟁보다는 재물 자체를 다루는 쪽에서 더 크게 작동합니다.";

  const keeping_style =
    dayStrength === "strong"
      ? "자기 기준이 뚜렷해 쉽게 흔들리지 않습니다. 다만 그 확신이 지나치면 남의 조언을 듣지 않고 밀어붙이다 지키는 힘을 스스로 깎아먹기 쉽습니다."
      : dayStrength === "weak"
        ? "주변 상황에 영향을 잘 받는 사주입니다. 혼자 판단하기보다 믿을 만한 사람이나 체계를 곁에 두는 것이 지키는 힘으로 이어집니다."
        : "한쪽으로 치우치기보다 상황에 따라 지키는 방식을 유연하게 바꾸는 사주입니다.";

  const risk_pattern =
    hyungsin.length > 0
      ? "급하게 밀어붙이거나 감정적으로 판단하는 순간에 손해로 이어지기 쉬운 사주입니다. 큰 결정 전에는 한 박자 늦추는 것이 낫습니다."
      : "특별히 걸리는 것은 없지만, 벌어들이는 힘과 지키는 힘의 균형이 한쪽으로 쏠릴 때가 위험 신호입니다.";

  const career_business =
    geukguk.includes("재") || geukguk.includes("식상")
      ? "정해진 틀 안에 오래 있기보다, 성과가 곧바로 보이는 사업이나 성과제 쪽에서 재물이 더 크게 열립니다."
      : "안정적인 체계 안에서 신뢰를 쌓아가는 직장형 구조에서 재물이 더 안정적으로 늘어납니다.";

  const currentAnalysis = daeunAnalysis?.find((d) => d.isCurrent) ?? null;
  const nextAnalysis = daeunAnalysis?.find((d) => d.isNext) ?? null;
  const currentRelationSentence = currentAnalysis ? daeunRelationSentence(currentAnalysis.relations) : null;
  const nextRelationSentence = nextAnalysis ? daeunRelationSentence(nextAnalysis.relations) : null;

  const timing = currentDaeun
    ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운(${currentDaeun.ganzhi})에서는 ` +
      (currentRelationSentence ? `${currentRelationSentence} ` : "") +
      (nextDaeun
        ? `다음 대운(${nextDaeun.ageRange}세부터, ${nextDaeun.ganzhi})으로 넘어가면 돈을 대하는 방식이 한 번 전환됩니다.` +
          (nextRelationSentence ? ` ${nextRelationSentence}` : "")
        : "이 대운이 지금 재물 흐름의 기본 배경이 되고 있습니다.")
    : "출생시간이 없어 대운은 계산되지 않았습니다.";

  const action =
    wLevel === "없음"
      ? "돈을 직접 좇기보다, 지금 하는 일의 전문성을 한 단계 더 좁고 깊게 파고드는 것이 재물로 이어지는 더 빠른 길입니다."
      : activeCompare === "output"
        ? "지금 벌여놓은 것 중 하나를 골라 이번 주 안에 마무리 짓는 것이 순서입니다. 새로 벌이는 것보다 완결이 먼저입니다."
        : activeCompare === "peer"
          ? "혼자 판단하지 말고, 이번 결정 하나만큼은 믿을 만한 사람에게 먼저 물어보고 진행하는 것이 낫습니다."
          : "새로운 것을 벌이기 전에, 지금 가진 자원을 어디에 쓸지부터 한 줄로 정리하는 것이 순서입니다.";

  // 화면에 그대로 칩으로 노출되므로 짧고 읽기 좋은 형태로 쓴다.
  // (JSON.stringify나 영문 enum을 그대로 넣지 않는다 — 실제 스크린샷 검수에서
  // "강약: 'neutral'" 처럼 디버그 로그 같은 문구가 노출되는 문제를 발견해 수정.)
  const evidence = [
    `일간 ${dayStemKo}(${dayElement}) · ${dayStrengthShort(dayStrength)}`,
    `격국 ${geukguk}`,
    `오행 최다 ${dominantElement}`,
    `재성 ${wealthStarCount}개 · 비겁 ${peerStarCount}개 · 식상 ${outputStarCount}개`,
    currentDaeun ? `현재 대운 ${currentDaeun.ganzhi}(${currentDaeun.stemTenGod})` : "대운 정보 없음",
    ...(currentAnalysis && currentAnalysis.relations.length > 0
      ? [`현재 대운 합충형파해: ${currentAnalysis.relations.map((r) => r.detail).join(", ")}`]
      : []),
  ];

  return {
    summary,
    money_style,
    earning_style,
    keeping_style,
    risk_pattern,
    career_business,
    timing,
    action,
    evidence,
  };
}
```

### 파일: src/lib/interpretation-prompt.ts
```ts
// 실제 LLM(Claude 등)에 보낼 프롬프트를 구성한다.
// 원칙: LLM은 여기 주어진 SajuFacts 바깥의 사실을 추측하지 않는다.
// 확정적 미래예측/보장 표현을 쓰지 않는다.
// 사용자가 "이거 내 얘기인데?" 하고 느끼도록, 자기 경험과 비교하게 만드는
// 질문형 문장을 최소 1개 이상 포함한다.

import type { SajuFacts } from "@/lib/saju-facts";

export const INTERPRETATION_SYSTEM_PROMPT = `당신은 사주(四柱) 원국 데이터를 "재물/돈" 관점으로 해석하는 카피라이터입니다.

절대 규칙:
1. 아래에 주어진 계산 결과(SajuFacts) 바깥의 사실을 지어내지 마세요. 계산에 없는 대운/신살/오행을 언급하지 마세요.
2. "부자가 된다", "성공한다", "수익을 보장한다" 같은 확정적 미래·보장 표현을 쓰지 마세요.
3. "누구에게나 맞는 말"을 쓰지 마세요. 반드시 주어진 필드(일간, 오행 분포, 십성, 대운 등)를 구체적으로 근거로 삼아 문장을 만드세요.
4. summary 또는 money_style 중 최소 한 곳에는, 사용자가 자기 경험과 비교하게 만드는 질문형 문장을 1개 이상 넣으세요. 예: "실제로도 시작은 빠른데 유지가 어렵다는 말을 듣는 편인가요?"
5. 반드시 요청된 JSON 스키마로만 응답하세요. 다른 텍스트를 덧붙이지 마세요.
6. evidence 배열에는 이번 해석에서 실제로 근거로 사용한 SajuFacts 필드명과 값을 최소 3개 이상, 화면에 짧은 칩(chip)으로 그대로 노출되므로 8~14자 내외로 짧고 자연스러운 한국어로 적으세요. 예: "일간 경금 · 강함", "격국 비겁격", "재성 0개". strong/weak/neutral 같은 영문 값이나 JSON을 그대로 쓰지 마세요.
7. summary/money_style 등 문장 안에서도 strength/geukguk 같은 영문·raw 값을 따옴표째로 인용하지 마세요 (예: "강약은 'neutral'이에요" 금지). 반드시 자연스러운 한국어로 풀어 쓰세요 (예: "기운이 중화에 가까워요").
8. 말투: 보고서나 분석 결과처럼 들리는 문장을 쓰지 말고, 실제 사주 상담을 받는 느낌으로 쓰세요. "이 사주는", "원래 ~할 때" 같은 문장으로 시작하고 "~습니다/~됩니다" 어미를 쓰세요. "돈 성향", "이 축", "도드라져 보여요", "이런 흐름이에요", "패턴이 나타난다", "데이터가 보여준다" 같은 표현은 쓰지 마세요.
9. timing에서 대운 나이를 언급할 때는 "지금은 27세예요"처럼 사용자의 현재 나이인 것처럼 쓰지 말고, "27세부터 이어지는 지금 대운은" 식으로 그 대운이 시작된 나이라는 것을 분명히 하세요.`;

export function buildInterpretationUserPrompt(facts: SajuFacts): string {
  return `다음은 한 사람의 사주 원국 계산 결과입니다. 이 데이터만 근거로 "재물/돈" 해석을 만들어주세요.

## 원국 요약 (라이브러리 계산 원문)
${facts.compactText}

## 이번 해석에서 특히 참고할 구조화 필드
- 일간: ${facts.dayStemKo}(${facts.dayElement}) / 강약: ${facts.dayStrength}(${facts.dayStrengthScore})
- 격국: ${facts.geukguk} / 용신: ${facts.yongsin.join(", ")}
- 오행 분포: ${JSON.stringify(facts.fiveElements)} (가장 강한 오행: ${facts.dominantElement})
- 재성(편재+정재) 개수: ${facts.wealthStarCount} (${facts.wealthStarTypes.join(", ") || "없음"})
- 비겁(비견+겁재) 개수: ${facts.peerStarCount}
- 식상(식신+상관) 개수: ${facts.outputStarCount}
- 주요 합충형파해원진: ${facts.keyRelations.join(", ") || "특이 관계 없음"}
- 길신: ${facts.gilsin.join(", ") || "없음"} / 흉신: ${facts.hyungsin.join(", ") || "없음"}
- 공망: ${facts.gongmang.join(", ")}
- 현재 대운: ${facts.currentDaeun ? `${facts.currentDaeun.ageRange}세 ${facts.currentDaeun.ganzhi} (${facts.currentDaeun.stemTenGod}/${facts.currentDaeun.branchTenGod})` : "정보 없음"}
- 다음 대운: ${facts.nextDaeun ? `${facts.nextDaeun.ageRange}세 ${facts.nextDaeun.ganzhi} (${facts.nextDaeun.stemTenGod}/${facts.nextDaeun.branchTenGod})` : "정보 없음"}
- 출생시간 입력 여부: ${facts.hasTimeInput ? "있음 (시주 포함)" : "없음 (시주 제외, 일반적 해석)"}

## 요청 스키마 (JSON만 응답)
{
  "summary": "핵심 성향 한 문단",
  "money_style": "사람과 돈의 관계 + 핵심 재물 스타일",
  "earning_style": "돈 버는 방식",
  "keeping_style": "돈 지키는 방식 / 돈을 놓치는 패턴",
  "risk_pattern": "위험/실수 패턴",
  "career_business": "직업형인지 사업형인지, 왜 그런지",
  "timing": "앞으로의 흐름 힌트 (현재/다음 대운 근거)",
  "action": "지금 필요한 행동 한 가지",
  "evidence": ["근거로 사용한 필드 3개 이상"]
}`;
}
```

### 파일: src/lib/interpretation-schema.ts
```ts
// LLM(또는 mock)이 반드시 이 스키마를 채워야 한다. 자유 문장 하나가 아니라
// 필드별로 구조화해, 사용 전 검증(banned-phrase, 필드 누락)을 걸 수 있게 한다.

import { z } from "zod";

export const InterpretationSchema = z.object({
  summary: z.string().min(10),
  money_style: z.string().min(10),
  earning_style: z.string().min(10),
  keeping_style: z.string().min(10),
  risk_pattern: z.string().min(10),
  career_business: z.string().min(10),
  timing: z.string().min(10),
  action: z.string().min(10),
  /** 각 해석 문장이 참조한 계산 필드(근거). 최소 3개 이상 요구해 "뻔한 말"을 방지한다. */
  evidence: z.array(z.string()).min(3),
});

export type Interpretation = z.infer<typeof InterpretationSchema>;

// 확정적 미래예측/보장 표현 금지 목록. 하나라도 걸리면 해석을 반려한다.
const BANNED_PATTERNS: RegExp[] = [
  /반드시\s*(성공|부자|대박)/,
  /100\s*%/,
  /무조건\s*(성공|보장)/,
  /확실히\s*(부자|성공)/,
  /(수익|돈)\s*(을|를)?\s*보장/,
  /틀림없이/,
  /운명(적으)?으로\s*정해져/,
  // 계산 라이브러리의 영문/raw enum 값이 따옴표째로 그대로 노출되는 디버그성
  // 문구 방지 (실제 스크린샷 검수에서 "강약: 'neutral'" 노출을 발견해 추가).
  /['"](strong|weak|neutral)['"]/i,
  /강약\s*[:：]\s*(strong|weak|neutral)/i,
];

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

/** 스키마 통과 + 금지 표현 검사를 함께 수행한다. */
export function validateInterpretation(raw: unknown): ValidationResult & { data?: Interpretation } {
  const parsed = InterpretationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, violations: parsed.error.issues.map((i) => `schema: ${i.path.join(".")} ${i.message}`) };
  }

  const fullText = Object.entries(parsed.data)
    .filter(([key]) => key !== "evidence")
    .map(([, v]) => v)
    .join("\n");

  const violations = BANNED_PATTERNS.filter((re) => re.test(fullText)).map((re) => `banned phrase: ${re.source}`);

  return { ok: violations.length === 0, violations, data: parsed.data };
}
```

### 파일: src/lib/korean-particle.ts
```ts
// 은/는, 이/가처럼 받침 유무에 따라 갈리는 한글 조사를 동적 문구에 붙일 때
// 쓰는 헬퍼. BOTTLENECK_COPY의 notUrgent처럼 운영자가 자유롭게 바꿀 수 있는
// 카피에 조사를 하드코딩해두면(예: "{notUrgent}는") 받침 있는 단어가 들어올
// 때마다 문법이 깨진다 — 실제로 "추가 소득원을 찾는 것는"처럼 깨지는 걸
// 확인했다. 받침 유무를 코드가 판정해서 항상 맞는 조사를 고른다.

function hasBatchim(text: string): boolean {
  const lastChar = text.trim().slice(-1);
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false; // 완성형 한글이 아니면 판정 불가 — 받침 없는 쪽으로 취급
  return (code - 0xac00) % 28 !== 0;
}

/** "은"/"는" 중 text 뒤에 맞는 조사를 고른다. */
export function eunNeun(text: string): "은" | "는" {
  return hasBatchim(text) ? "은" : "는";
}

/** "이"/"가" 중 text 뒤에 맞는 조사를 고른다. */
export function iGa(text: string): "이" | "가" {
  return hasBatchim(text) ? "이" : "가";
}

/** "을"/"를" 중 text 뒤에 맞는 조사를 고른다. */
export function eulReul(text: string): "을" | "를" {
  return hasBatchim(text) ? "을" : "를";
}
```

### 파일: src/lib/mbti-facts.ts
```ts
// MBTI는 공식 문항을 재현하지 않는다(라이선스/정확도 문제). 이미 자신의
// 유형을 아는 사용자가 "선택"만 하는 자기보고 입력이다.
//
// 복구 배경: 한때 제거했었다 — 어떤 비교·판정에도 실제로 쓰이지 않는
// 죽은 입력이었기 때문. 이번에는 실제로 쓴다: 사주 계산값을 바꾸는 보정
// 용도가 아니라, triple-compare.ts의 결정 방식/관계-감정 축에 네 번째
// 신호로 들어가 "사주에서 나온 성향이 현실에서 어떤 형태로 나타나는지"를
// 더 구체적으로 설명한다. J/P는 결정을 닫는 속도(결정 방식 축), F/T는
// 관계·감정을 얼마나 고려하는지(관계-감정 축)의 실제 MBTI 정의 그대로를
// 재사용한 것이지, 이번에 새로 지어낸 대응이 아니다. 사주와 다르면
// "다르다"고 그대로 보여준다 — MBTI에 맞춰 사주를 고치지 않는다.

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export type MbtiType = (typeof MBTI_TYPES)[number];

export type MbtiSelfReport = { type: MbtiType } | { type: "모름" };
```

### 파일: src/lib/money-tendency.ts
```ts
// 일간(日干, 사주 여덟 글자 중 '나'를 뜻하는 글자)에 따른 재물운 콘텐츠.
// 재미로 보는 엔터테인먼트 콘텐츠이며, 확정적 진단이나 수익을 보장하지 않는다.
// level/leaning 계열 숫자는 실제 계산값이 아니라 콘텐츠 톤에 맞춘 표현용
// 등급(1~5)이며, 화면에는 정밀한 수치가 아닌 게이지/스펙트럼으로만 노출한다.

export interface PowerStat {
  /** 짧은 요약 라벨. e.g. "빠른 실행력" */
  label: string;
  /** 한 줄 설명 */
  description: string;
  /** 게이지 등급 1~5 (정밀 수치 아님, 시각적 스케일용) */
  level: 1 | 2 | 3 | 4 | 5;
}

export interface JobLeaning {
  /** 직장형/사업형 성향 한 줄 */
  label: string;
  /** 1=완전 직장형 ~ 5=완전 사업형, 스펙트럼 그래픽용 */
  leaning: 1 | 2 | 3 | 4 | 5;
}

export interface MoneyTendency {
  stemHanja: string;
  stemName: string;
  element: "목" | "화" | "토" | "금" | "수";

  // --- 완전 공개 영역 ---
  /** 재물 유형 이름. e.g. "개척형 재물운" */
  wealthType: string;
  /** 재물 유형 한 줄 요약 */
  summary: string;
  /** 돈을 버는 힘 */
  earningPower: PowerStat;
  /** 돈을 지키는 힘 */
  keepingPower: PowerStat;
  /** 기회를 잡는 힘 */
  opportunityPower: PowerStat;
  /** 직장형 vs 사업형 스펙트럼 */
  jobType: JobLeaning;
  /** 강점 1개 */
  topStrength: string;
  /** 재물 흐름 라인 그래픽용 6개 포인트(1~5, 등급) */
  flowCurve: [number, number, number, number, number, number];

  // --- 일부 공개(블러 티저) 영역 ---
  /** 돈이 새기 쉬운 패턴 */
  leakPattern: string;
  /** 직업/사업 방향 힌트 */
  careerHint: string;
  /** 앞으로의 흐름 힌트 */
  flowHint: string;
  /** 나에게 맞는 행동 방향 힌트 */
  actionHint: string;
}

const TENDENCY_BY_STEM: Record<string, MoneyTendency> = {
  "甲": {
    stemHanja: "甲", stemName: "갑목", element: "목",
    wealthType: "개척형 재물운",
    summary: "돈이 될 것 같으면 일단 움직이고 보는 타입이에요. 추진력은 최고지만, 벌인 일을 끝까지 챙기는 습관이 자산을 지켜줘요.",
    earningPower: { label: "빠른 실행력", description: "기회다 싶으면 망설임 없이 뛰어들어서 돈 버는 속도 자체가 빨라요.", level: 4 },
    keepingPower: { label: "아직은 헐거운 편", description: "버는 힘에 비해 지키는 힘이 약한 편이라 관리 시스템이 필요해요.", level: 2 },
    opportunityPower: { label: "기회 포착 1순위", description: "새로운 흐름을 남들보다 먼저 알아채고 바로 뛰어드는 감각이 있어요.", level: 5 },
    jobType: { label: "스스로 판을 짜는 사업가형에 가까워요", leaning: 4 },
    topStrength: "장기 목표를 세우면 끝까지 밀어붙이는 추진력",
    flowCurve: [2, 3, 3, 4, 3, 5],
    leakPattern: "벌여놓은 일이 많아질수록 돈이 여기저기 흩어지는 패턴이 반복돼요.",
    careerHint: "정해진 틀보다 스스로 판을 짜는 자리에서 진짜 힘을 발휘하는 편이에요.",
    flowHint: "지금 벌여둔 일 중 하나가 예상보다 빠르게 결실을 맺을 조짐이 보여요.",
    actionHint: "새로 벌이기보다 이미 시작한 일부터 정리하면 흐름이 달라져요.",
  },
  "乙": {
    stemHanja: "乙", stemName: "을목", element: "목",
    wealthType: "실속형 재물운",
    summary: "상황에 맞춰 돈을 유연하게 쓰는 편이라 큰 손해는 잘 안 봐요. 다만 결정을 미루는 습관이 좋은 타이밍을 놓치게 만들 수 있어요.",
    earningPower: { label: "틈새 감각", description: "작은 기회도 놓치지 않고 실속 있게 챙기는 감각이 있어요.", level: 3 },
    keepingPower: { label: "안정적인 편", description: "무리한 지출을 피하고 예산 안에서 조정하는 힘이 좋아요.", level: 4 },
    opportunityPower: { label: "신중한 선택", description: "주변 정보를 잘 활용하지만 결정까지는 시간이 걸리는 편이에요.", level: 2 },
    jobType: { label: "혼자보다 함께 조율하는 자리에서 강해요", leaning: 3 },
    topStrength: "예산에 맞춰 유연하게 조정하는 감각",
    flowCurve: [3, 3, 2, 3, 4, 4],
    leakPattern: "남에게 맞춰주다 정작 내 계획이 흔들리는 순간이 반복돼요.",
    careerHint: "혼자보다 함께 조율하며 만드는 자리에서 성과가 더 잘 나는 편이에요.",
    flowHint: "미뤄뒀던 결정 하나를 지금 내리면 흐름이 빠르게 풀릴 시기예요.",
    actionHint: "고민하던 선택 하나를 이번 주 안에 마감 지어보는 게 어때요.",
  },
  "丙": {
    stemHanja: "丙", stemName: "병화", element: "화",
    wealthType: "폭발형 재물운",
    summary: "돈을 쓸 때도 벌 때도 화끈한 편이에요. 에너지가 넘치는 만큼 큰 지출도 순간적으로 결정하는 경향이 있어요.",
    earningPower: { label: "순발력 최강", description: "기회가 왔을 때 즉시 잡아채는 순발력이 돈 버는 힘으로 이어져요.", level: 5 },
    keepingPower: { label: "감정에 흔들림", description: "기분에 따라 지출이 크게 널뛰는 편이라 지키는 힘은 상대적으로 약해요.", level: 2 },
    opportunityPower: { label: "사람이 곧 기회", description: "사람을 통해 돈이 들어오는 흐름을 잘 만들어요.", level: 4 },
    jobType: { label: "사람을 직접 상대하는 자리에서 크게 터져요", leaning: 4 },
    topStrength: "기회를 잡는 순발력과 사람을 끌어당기는 에너지",
    flowCurve: [3, 4, 2, 5, 3, 4],
    leakPattern: "충동적으로 결정한 큰 지출이 자산 흐름을 흔드는 패턴이 있어요.",
    careerHint: "사람을 직접 상대하고 반응이 바로 오는 일에서 빛을 발하는 편이에요.",
    flowHint: "가까운 시일 내 예상 못 한 곳에서 돈이 들어올 신호가 보여요.",
    actionHint: "큰 지출 앞에서는 하루만 미루고 결정하는 습관을 들여보세요.",
  },
  "丁": {
    stemHanja: "丁", stemName: "정화", element: "화",
    wealthType: "은근형 재물운",
    summary: "겉으론 화려해 보여도 속은 알뜰하게 계산하는 편이에요. 다만 감정적인 소비가 종종 계획을 흔들어요.",
    earningPower: { label: "세밀한 감각", description: "작은 흐름까지 놓치지 않는 꼼꼼함이 돈 버는 기반이 돼요.", level: 3 },
    keepingPower: { label: "가계부 체질", description: "세밀하게 계산하고 관리하는 힘이 자산을 지켜줘요.", level: 4 },
    opportunityPower: { label: "위기에 강함", description: "위기 상황에서 오히려 침착하게 기회를 찾아내는 편이에요.", level: 3 },
    jobType: { label: "겉으로 안 드러나도 꾸준히 성과 내는 직장형", leaning: 2 },
    topStrength: "위기 상황에서도 침착하게 대응하는 힘",
    flowCurve: [2, 2, 3, 3, 4, 4],
    leakPattern: "스트레스를 소비로 푸는 패턴이 작은 지출을 계속 쌓이게 해요.",
    careerHint: "겉으로 드러나지 않아도 꾸준히 성과를 쌓는 자리가 잘 맞아요.",
    flowHint: "그동안 쌓아온 노력이 조용히 결실을 맺기 시작하는 흐름이에요.",
    actionHint: "스트레스성 소비가 있었다면 이번 달만 지출 기록을 남겨보세요.",
  },
  "戊": {
    stemHanja: "戊", stemName: "무토", element: "토",
    wealthType: "축적형 재물운",
    summary: "당장의 수익보다 오래 갈 자산을 선호해요. 신중한 만큼 좋은 기회를 너무 오래 재다가 놓치기도 해요.",
    earningPower: { label: "느리지만 확실", description: "단기 수익보다 오래 유지되는 수익 구조를 만드는 데 강해요.", level: 3 },
    keepingPower: { label: "최고 수준", description: "장기 저축과 자산 방어에서 가장 강한 힘을 가진 유형이에요.", level: 5 },
    opportunityPower: { label: "신중한 판단", description: "위험을 미리 대비하는 습관 덕에 큰 손해는 잘 피해요.", level: 2 },
    jobType: { label: "긴 호흡으로 신뢰를 쌓는 직장형에 가까워요", leaning: 2 },
    topStrength: "장기 저축·투자에서 흔들리지 않는 뚝심",
    flowCurve: [2, 2, 3, 3, 3, 4],
    leakPattern: "새로운 시도를 지나치게 미루다 보면 기회비용이 쌓여요.",
    careerHint: "긴 호흡으로 신뢰를 쌓아가는 자리에서 재물이 안정적으로 늘어요.",
    flowHint: "오래 준비해온 것이 이제 슬슬 자리를 잡기 시작하는 시기예요.",
    actionHint: "고민만 하던 결정 하나에 이번엔 기한을 정해보는 걸 추천해요.",
  },
  "己": {
    stemHanja: "己", stemName: "기토", element: "토",
    wealthType: "정밀관리형 재물운",
    summary: "가계부와 친한 타입. 작은 돈의 흐름까지 꼼꼼히 챙기지만, 그만큼 큰 그림을 놓칠 때가 있어요.",
    earningPower: { label: "꾸준한 축적", description: "화려하진 않아도 놓치는 돈 없이 차곡차곡 모으는 힘이 있어요.", level: 3 },
    keepingPower: { label: "디테일의 힘", description: "세부 지출 관리 능력이 뛰어나 새는 돈이 거의 없는 편이에요.", level: 5 },
    opportunityPower: { label: "약속은 반드시", description: "한번 정한 저축 계획은 끝까지 지키는 실행력이 강점이에요.", level: 3 },
    jobType: { label: "숫자와 디테일을 다루는 직장형이 잘 맞아요", leaning: 2 },
    topStrength: "약속한 저축은 반드시 지키는 실행력",
    flowCurve: [3, 3, 2, 3, 3, 4],
    leakPattern: "작은 절약에 매몰되다 더 큰 기회를 놓치는 패턴이 있어요.",
    careerHint: "숫자와 디테일을 다루는 자리에서 재물운이 특히 잘 풀리는 편이에요.",
    flowHint: "완벽주의 때문에 미뤄온 결정 하나가 곧 방향을 정할 시기예요.",
    actionHint: "이번엔 100% 확신이 없어도 일단 작게 시도해보는 걸 권해요.",
  },
  "庚": {
    stemHanja: "庚", stemName: "경금", element: "금",
    wealthType: "결단형 재물운",
    summary: "쓸 땐 쓰고 아낄 땐 확실히 아끼는 편이에요. 결단력이 강점이지만 유연성이 부족해 손해를 볼 때도 있어요.",
    earningPower: { label: "명확한 기준", description: "기준이 확실해서 벌어야 할 때와 아껴야 할 때를 정확히 구분해요.", level: 4 },
    keepingPower: { label: "손절 빠름", description: "아니다 싶으면 미련 없이 정리하는 결단력이 자산을 지켜줘요.", level: 4 },
    opportunityPower: { label: "원칙 기반 판단", description: "원칙에 맞는 기회만 골라내는 힘이 있지만 유연성은 약한 편이에요.", level: 3 },
    jobType: { label: "기준이 분명한 조직·전문직 직장형이 잘 맞아요", leaning: 2 },
    topStrength: "손절할 때 빠르게 결정하는 명확한 기준",
    flowCurve: [3, 3, 4, 3, 3, 4],
    leakPattern: "원칙이 너무 강해 협상할 수 있었던 기회를 놓치는 패턴이 있어요.",
    careerHint: "기준과 원칙이 분명한 조직이나 전문직에서 힘을 잘 발휘해요.",
    flowHint: "미뤄뒀던 정리 하나를 마무리하면 새로운 흐름이 열릴 시기예요.",
    actionHint: "감정적인 조언도 한 번쯤은 끝까지 들어보는 게 도움이 될 거예요.",
  },
  "辛": {
    stemHanja: "辛", stemName: "신금", element: "금",
    wealthType: "안목형 재물운",
    summary: "싼 것보다 좋은 것에 돈을 쓰는 편. 안목은 좋지만 그만큼 지출 단가가 높아지기 쉬워요.",
    earningPower: { label: "가치 판별력", description: "가치 있는 것을 알아보는 안목이 곧 돈 버는 감각으로 이어져요.", level: 4 },
    keepingPower: { label: "기준이 관건", description: "기준을 세워두면 잘 지키지만, 기준이 흔들리면 지출도 흔들려요.", level: 3 },
    opportunityPower: { label: "트렌드 감각", description: "트렌드를 읽는 감각이 좋아 좋은 타이밍을 잘 잡는 편이에요.", level: 4 },
    jobType: { label: "안목과 취향이 무기가 되는 사업형에 가까워요", leaning: 4 },
    topStrength: "가치 있는 곳에 집중적으로 투자하는 안목",
    flowCurve: [3, 4, 3, 4, 3, 5],
    leakPattern: "과시성 소비를 합리화하다 예산을 넘기는 패턴이 반복돼요.",
    careerHint: "안목과 취향이 무기가 되는 분야에서 재물운이 크게 열려요.",
    flowHint: "눈여겨보던 곳에 지금 움직이면 좋은 결과로 이어질 흐름이에요.",
    actionHint: "이번 지출 전엔 하루만 장바구니에 담아두고 다시 판단해보세요.",
  },
  "壬": {
    stemHanja: "壬", stemName: "임수", element: "수",
    wealthType: "기회포착형 재물운",
    summary: "돈의 흐름을 잘 읽고 기회가 오면 크게 베팅하는 편이에요. 다만 감당 못 할 리스크까지 떠안을 수 있어요.",
    earningPower: { label: "큰 베팅", description: "기회다 싶으면 크게 움직여서 한 번에 큰 수익을 만드는 힘이 있어요.", level: 5 },
    keepingPower: { label: "리스크에 취약", description: "안전자산 비중이 낮아지기 쉬워 지키는 힘은 보완이 필요해요.", level: 2 },
    opportunityPower: { label: "흐름을 읽는 감각", description: "시장의 큰 흐름을 남들보다 먼저 읽어내는 감각이 탁월해요.", level: 5 },
    jobType: { label: "판을 읽는 힘이 필요한 사업형에 가까워요", leaning: 5 },
    topStrength: "시장 흐름을 읽고 새로운 수익원을 발굴하는 감각",
    flowCurve: [2, 4, 2, 5, 2, 5],
    leakPattern: "감당 범위를 넘는 리스크를 떠안다가 크게 흔들리는 패턴이 있어요.",
    careerHint: "변화가 잦고 판을 읽는 힘이 필요한 분야에서 두각을 나타내요.",
    flowHint: "읽고 있던 흐름 하나가 곧 눈에 보이는 결과로 나타날 시기예요.",
    actionHint: "베팅하기 전, 최악의 경우를 먼저 계산해보는 습관을 들여보세요.",
  },
  "癸": {
    stemHanja: "癸", stemName: "계수", element: "수",
    wealthType: "신중축적형 재물운",
    summary: "겉으로 드러내지 않지만 나름의 계획으로 차근차근 자산을 불려가는 타입이에요. 정보 부족이 발목을 잡을 수 있어요.",
    earningPower: { label: "조용한 성장", description: "눈에 띄지 않아도 꾸준히 쌓아가는 방식으로 자산을 늘려요.", level: 3 },
    keepingPower: { label: "안정적 관리", description: "꾸준한 저축 습관이 몸에 배어 있어 잘 새지 않는 편이에요.", level: 4 },
    opportunityPower: { label: "리스크 감지", description: "위험을 미리 감지하는 촉이 좋아 큰 실패를 잘 피해요.", level: 3 },
    jobType: { label: "혼자만의 전문성을 쌓는 균형형에 가까워요", leaning: 3 },
    topStrength: "꾸준한 저축 습관과 위험을 미리 감지하는 촉",
    flowCurve: [2, 2, 3, 3, 4, 4],
    leakPattern: "혼자 판단하다 정보가 부족해 손해를 보는 패턴이 있어요.",
    careerHint: "혼자만의 전문성을 쌓아가는 자리에서 재물이 조용히 늘어나요.",
    flowHint: "그동안 아무도 모르게 쌓아온 것이 곧 드러나기 시작할 시기예요.",
    actionHint: "혼자 고민하기보다 믿을 만한 정보원 하나를 만들어보는 게 좋아요.",
  },
};

/** 사주 라이브러리가 반환한 일주(日柱) 한자에서 첫 글자(일간)를 뽑아 성향을 매핑한다. */
export function getMoneyTendency(dayPillarHanja: string): MoneyTendency {
  const stem = dayPillarHanja.charAt(0);
  const tendency = TENDENCY_BY_STEM[stem];
  if (!tendency) {
    throw new Error(`알 수 없는 일간 문자: ${stem}`);
  }
  return tendency;
}

export interface LockedReportCard {
  title: string;
  cta: string;
}

/** 잠금 리포트 카드 6종. 제목 자체가 결제 이유가 되도록 자극적으로 구성한다. */
export function getLockedReportCards(tendency: MoneyTendency): LockedReportCard[] {
  const { stemName } = tendency;
  return [
    {
      title: "앞으로 3년, 돈 흐름이 강해지는 시기",
      cta: "돈 흐름 강해지는 시기 보기",
    },
    {
      title: `${stemName}이(가) 돈을 놓치는 결정`,
      cta: "내가 반복하는 실수 확인하기",
    },
    {
      title: "나는 직장형일까, 사업형일까?",
      cta: "내 벌이 방식 정체 확인하기",
    },
    {
      title: "큰돈 앞에서 내가 반복하는 패턴",
      cta: "큰돈 앞 내 패턴 열어보기",
    },
    {
      title: `${stemName}에게 맞는 돈 버는 방식`,
      cta: "나에게 맞는 방식 전체 보기",
    },
    {
      title: "지금부터 바꿔야 할 행동 3가지",
      cta: "지금 바꿀 행동 3가지 보기",
    },
  ];
}
```

### 파일: src/lib/myeongsik-view.ts
```ts
// SajuFacts를 "명식(命式)" 화면 표시용으로 변환하는 순수 레이어. 새 계산은
// 하나도 없다 — ssaju/oh-my-saju가 이미 계산해서 SajuFacts에 담아둔 값을
// 표시 순서·형태로만 재배열한다. 무료 결과에서 이 서비스의 실제 계산
// 깊이(자평진전·적천수)를 노출하는 게 목적이라, 없는 근거는 절대 말하지
// 않는다 — geukgukSource가 ssaju_fallback이면 판정 방식 문장을 아예 만들지
// 않는다(myeongsik-section.tsx가 그 문장을 렌더할지 말지 결정한다).

import type { SajuFacts, PillarFact, DaeunFact } from "@/lib/saju-facts";

export interface MyeongsikPillarView {
  pillar: PillarFact["pillar"];
  stemHanja: string | null;
  branchHanja: string | null;
  stemKo: string | null;
  branchKo: string | null;
  stemTenGod: string | null;
  branchTenGod: string | null;
}

export interface MyeongsikView {
  hasTimeInput: boolean;
  /** 항상 연/월/일/시 4개 — 시간 미상이면 hour 항목의 필드가 전부 null */
  pillars: MyeongsikPillarView[];
  fiveElements: Record<string, number>;
  geukguk: string;
  dayStrength: SajuFacts["dayStrength"];
  dayStrengthScore: number;
  dayStrengthGrade: string;
  geukgukSource: SajuFacts["geukgukSource"];
  wealthStarPillars: PillarFact["pillar"][];
  officerStarPillars: PillarFact["pillar"][];
  currentDaeun: DaeunFact | null;
  nextDaeun: DaeunFact | null;
}

const PILLAR_ORDER: PillarFact["pillar"][] = ["year", "month", "day", "hour"];

export function buildMyeongsikView(facts: SajuFacts): MyeongsikView {
  const byPillar = new Map(facts.pillars.map((p) => [p.pillar, p]));

  const pillars: MyeongsikPillarView[] = PILLAR_ORDER.map((pillar) => {
    const p = byPillar.get(pillar);
    if (!p) {
      return {
        pillar,
        stemHanja: null,
        branchHanja: null,
        stemKo: null,
        branchKo: null,
        stemTenGod: null,
        branchTenGod: null,
      };
    }
    return {
      pillar,
      stemHanja: p.stemHanja,
      branchHanja: p.branchHanja,
      stemKo: p.stemKo,
      branchKo: p.branchKo,
      stemTenGod: p.stemTenGod,
      branchTenGod: p.branchTenGod,
    };
  });

  return {
    hasTimeInput: facts.hasTimeInput,
    pillars,
    fiveElements: facts.fiveElements,
    geukguk: facts.geukguk,
    dayStrength: facts.dayStrength,
    dayStrengthScore: facts.dayStrengthScore,
    dayStrengthGrade: facts.dayStrengthGrade,
    geukgukSource: facts.geukgukSource,
    wealthStarPillars: facts.wealthStarPillars,
    officerStarPillars: facts.officerStarPillars,
    currentDaeun: facts.currentDaeun,
    nextDaeun: facts.nextDaeun,
  };
}
```

### 파일: src/lib/oh-my-saju-adapter.ts
```ts
// oh-my-saju(Apache-2.0, vendor/oh-my-saju/) 자식 프로세스 호출 어댑터.
// ssaju는 격국을 "월간 십성 하나"로만 분류하고 신강신약도 단순 가중합이라,
// 자평진전 월률분야(ziping)·적천수 위치배점 통근(ditianshui) 판정이 더 정밀할 때가
// 많다 — 실제 3건 비교에서 ssaju "강함(78)" vs oh-my-saju "신약(39)"처럼 등급이
// 뒤집히는 사례도 나왔다. 같은 호출 1번에 top-level `timing`을 함께 실어서
// 대운 8~10구간(간지·십성·시작연령) 전체도 같이 받는다 — 대운마다 자식
// 프로세스를 새로 띄우지 않는다.
//
// 대운과 원국 사이의 합·충·형·파·해는 oh-my-saju가 안 주는 데이터라(timing은
// "deterministic calendar activation data"일 뿐 Tradition Pack 판정이 아님)
// 여기서 직접 계산한다 — 단, 이건 학파마다 다른 "신강신약 재판정"이 아니라
// 지지/천간 조합표(충/육합/삼합·반합/형/파/해)라는, 이견이 없는 고정 사실이라
// REUSE 범위를 벗어나지 않는다. 신강신약 재계산(9번째 글자 추가)은 하지 않는다.
//
// 실패(타임아웃/파싱 오류 등)해도 절대 throw하지 않는다 — 호출부는 null이면
// ssaju 원본 값을 그대로 쓴다.

import { execFileSync } from "node:child_process";
import path from "node:path";
import type { SajuFacts, SajuFactsInput, DaeunAnalysis, DaeunRelation, PillarFact } from "@/lib/saju-facts";

const SCRIPT_PATH = path.join(process.cwd(), "vendor", "oh-my-saju", "oh-my-saju.mjs");
const TIMEOUT_MS = 6000;

// 폴백 발생 측정용(수정 아님) — 이 프로젝트엔 로깅 인프라가 없어서(analytics.ts도
// console.debug뿐) 새 인프라 없이 구조화 console.error만 남긴다. 같은 사람을
// 다시 조회했을 때 격국/신강신약이 달라지는 사고(엔진 실패 시 ssaju 원본으로
// 조용히 폴백)의 발생 빈도를 나중에 파악하기 위한 것 — 폴백 자체의 동작은
// 하나도 바꾸지 않는다.
const PROCESS_STARTED_AT = Date.now();
let calledOnce = false;

type OhMySajuFallbackReason = "timeout" | "nonzero_exit" | "parse_error" | "enrichment_missing" | "unknown_error";

function classifyOhMySajuError(err: unknown): { reason: OhMySajuFallbackReason; exitCode?: number | null } {
  if (err instanceof SyntaxError) return { reason: "parse_error" };
  if (typeof err === "object" && err !== null) {
    const e = err as { killed?: boolean; signal?: string | null; status?: number | null };
    if (e.killed || e.signal === "SIGTERM") return { reason: "timeout" };
    if (typeof e.status === "number") return { reason: "nonzero_exit", exitCode: e.status };
  }
  return { reason: "unknown_error" };
}

/** callOhMySaju 진입 시점에 한 번 호출 — "이 프로세스에서 첫 호출이거나 모듈
 * 로드 15초 이내"를 콜드스타트로 근사한다(별도 인프라 없이 쓸 수 있는 유일한
 * 신호). 반드시 calledOnce를 true로 갱신하기 전에 판정값을 캡처해야 한다. */
function markCallAndGetColdStart(): boolean {
  const coldStart = !calledOnce || Date.now() - PROCESS_STARTED_AT < 15000;
  calledOnce = true;
  return coldStart;
}

function logOhMySajuFallback(info: {
  reason: OhMySajuFallbackReason;
  elapsedMs: number;
  coldStart: boolean;
  exitCode?: number | null;
  errorMessage?: string;
}): void {
  console.error("[oh-my-saju-fallback]", JSON.stringify({ ...info, timeoutMs: TIMEOUT_MS }));
}

export interface OhMySajuEnrichment {
  /** 예: "칠살격", "편재격" — ziping 팩의 실제 월률분야 판정 */
  pattern: string;
  /** 예: "태왕" | "신강" | "약한 신강" | "중화" | "신약" | "태약" | "극약" */
  strengthGrade: string;
  /** 0~100, ditianshui 위치배점 합산 점수 */
  strengthScore: number;
  strengthBucket: "strong" | "weak" | "neutral";
}

// ---------- 지지/천간 조합표 (이견 없는 고정 클래식 표) ----------
const BRANCH_CLASH: [string, string][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];
const BRANCH_UNION: [string, string][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];
const BRANCH_HALF_TRINE: [string, string][] = [
  ["申", "子"], ["子", "辰"], ["申", "辰"],
  ["亥", "卯"], ["卯", "未"], ["亥", "未"],
  ["寅", "午"], ["午", "戌"], ["寅", "戌"],
  ["巳", "酉"], ["酉", "丑"], ["巳", "丑"],
];
const BRANCH_PUNISH: [string, string][] = [
  ["寅", "巳"], ["巳", "申"], ["丑", "戌"], ["戌", "未"], ["子", "卯"],
];
const BRANCH_SELF_PUNISH = new Set(["辰", "午", "酉", "亥"]);
const BRANCH_BREAK: [string, string][] = [
  ["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["戌", "未"],
];
const BRANCH_HARM: [string, string][] = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];
const STEM_UNION: [string, string][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"],
];

function pairMatch(pairs: [string, string][], a: string, b: string): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

const PILLAR_LABEL: Record<PillarFact["pillar"], { branch: string; stem: string }> = {
  year: { branch: "연지", stem: "연간" },
  month: { branch: "월지", stem: "월간" },
  day: { branch: "일지", stem: "일간" },
  hour: { branch: "시지", stem: "시간" },
};

function computeDaeunRelations(
  daeunStemHanja: string,
  daeunBranchHanja: string,
  natalPillars: PillarFact[],
): DaeunRelation[] {
  const relations: DaeunRelation[] = [];

  for (const p of natalPillars) {
    // PillarFact.ganzhi는 한자 간지 2글자(예: "庚辰") — 앞글자가 천간, 뒷글자가 지지.
    const natalStem = p.ganzhi[0];
    const natalBranch = p.ganzhi[1];
    const label = PILLAR_LABEL[p.pillar];

    if (natalBranch === daeunBranchHanja && BRANCH_SELF_PUNISH.has(natalBranch)) {
      relations.push({ withPillar: p.pillar, type: "자형", detail: `${label.branch}(${natalBranch})와 자형` });
    } else if (pairMatch(BRANCH_CLASH, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "충", detail: `${label.branch}(${natalBranch})와 충` });
    } else if (pairMatch(BRANCH_UNION, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "육합", detail: `${label.branch}(${natalBranch})와 육합` });
    } else if (pairMatch(BRANCH_HALF_TRINE, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "반합", detail: `${label.branch}(${natalBranch})와 반합` });
    } else if (pairMatch(BRANCH_PUNISH, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "형", detail: `${label.branch}(${natalBranch})와 형` });
    } else if (pairMatch(BRANCH_BREAK, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "파", detail: `${label.branch}(${natalBranch})와 파` });
    } else if (pairMatch(BRANCH_HARM, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "해", detail: `${label.branch}(${natalBranch})와 해` });
    }

    if (pairMatch(STEM_UNION, natalStem, daeunStemHanja)) {
      relations.push({ withPillar: p.pillar, type: "천간합", detail: `${label.stem}(${natalStem})와 천간합` });
    }
  }

  return relations;
}

function computeCurrentAge(input: SajuFactsInput, today: Date): number {
  let age = today.getFullYear() - input.year;
  const beforeBirthday =
    today.getMonth() + 1 < input.month || (today.getMonth() + 1 === input.month && today.getDate() < input.day);
  if (beforeBirthday) age -= 1;
  return age;
}

function buildCommand(input: SajuFactsInput) {
  const birth =
    input.hour === null
      ? {
          date: { calendar: "gregorian" as const, year: input.year, month: input.month, day: input.day },
          time: { kind: "unknown" as const, reason: "not-asked" as const },
          timeZone: "Asia/Seoul",
          timeEvidence: { source: "self-report" as const },
        }
      : {
          date: { calendar: "gregorian" as const, year: input.year, month: input.month, day: input.day },
          time: { hour: input.hour, minute: input.minute ?? 0 },
          timeZone: "Asia/Seoul",
        };

  // timing(대운 8~10구간)은 exact 계산에서만 지원된다 — 시간 미상이면 뺀다.
  const timing =
    input.hour === null
      ? undefined
      : {
          fromYear: input.year,
          throughYear: input.year,
          gender: input.gender === "남" ? ("male" as const) : ("female" as const),
          luckPillarCount: 10,
        };

  return {
    schemaVersion: "1",
    command: "analyze-reading",
    request: {
      calculation:
        input.hour === null
          ? { kind: "possibilities", request: { birth } }
          : { kind: "exact", request: { birth, rules: { ziHourPolicy: "civilMidnight" } } },
      question: "타고난 성향과 재물운, 평생 대운 흐름을 설명해줘.",
      readingMode: "focused",
      inferenceDepth: "deep-traditional",
      locale: "ko-KR",
    },
    ...(timing ? { timing } : {}),
  };
}

function bucketFromGrade(grade: string): "strong" | "weak" | "neutral" {
  if (grade === "태왕" || grade === "신강" || grade === "약한 신강") return "strong";
  if (grade === "중화") return "neutral";
  return "weak"; // 신약/태약/극약
}

interface OhMySajuCallResult {
  enrichment: OhMySajuEnrichment | null;
  rawTimingPillars: unknown;
  elapsedMs: number;
  coldStart: boolean;
}

function callOhMySaju(input: SajuFactsInput): OhMySajuCallResult {
  const coldStart = markCallAndGetColdStart();
  const startedAt = Date.now();
  const command = buildCommand(input);

  let stdout: string;
  try {
    stdout = execFileSync(process.execPath, [SCRIPT_PATH], {
      input: JSON.stringify(command),
      timeout: TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf8",
    });
  } catch (err) {
    const { reason, exitCode } = classifyOhMySajuError(err);
    logOhMySajuFallback({
      reason,
      elapsedMs: Date.now() - startedAt,
      coldStart,
      exitCode,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 원본 JSON.parse(stdout)와 동일하게 any로 둔다(아래 옵셔널 체이닝 탐색용)
  let data: any;
  try {
    data = JSON.parse(stdout);
  } catch (err) {
    logOhMySajuFallback({
      reason: "parse_error",
      elapsedMs: Date.now() - startedAt,
      coldStart,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
  const analysis = data?.result?.analysis;
  const doctrines: unknown[] = analysis?.doctrines ?? [];

  const ziping = doctrines.find(
    (d): d is { interpretation: { findings: { ruleId: string; values?: Record<string, unknown> }[] } } =>
      typeof d === "object" && d !== null && (d as { packRef?: { id?: string } }).packRef?.id === "ziping",
  );
  const ditianshui = doctrines.find(
    (d): d is { interpretation: { findings: { ruleId: string; values?: Record<string, unknown> }[] } } =>
      typeof d === "object" && d !== null && (d as { packRef?: { id?: string } }).packRef?.id === "ditianshui",
  );

  const patternFinding = ziping?.interpretation.findings.find((f) => f.ruleId === "ziping.pattern-integrity");
  const strengthFinding = ditianshui?.interpretation.findings.find((f) => f.ruleId === "ditianshui.strength-verdict");

  const pattern = patternFinding?.values?.pattern;
  const strengthGrade = strengthFinding?.values?.grade;
  const strengthScore = strengthFinding?.values?.supportScore;

  const enrichment =
    typeof pattern === "string" && typeof strengthGrade === "string" && typeof strengthScore === "number"
      ? { pattern, strengthGrade, strengthScore, strengthBucket: bucketFromGrade(strengthGrade) }
      : null;

  return {
    enrichment,
    rawTimingPillars: data?.result?.timing?.luckPillars?.pillars,
    elapsedMs: Date.now() - startedAt,
    coldStart,
  };
}

interface RawLuckPillar {
  age: number;
  pillar: { hanja: string; stem: { hanja: string }; branch: { hanja: string } };
  tenGods: { stem: string; branch: string };
  approximateStartDate: { date: string };
}

function isRawLuckPillarArray(value: unknown): value is RawLuckPillar[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as RawLuckPillar).age === "number" &&
        typeof (v as RawLuckPillar).pillar?.hanja === "string",
    )
  );
}

function buildDaeunAnalysis(
  rawTimingPillars: unknown,
  natalPillars: PillarFact[],
  input: SajuFactsInput,
): DaeunAnalysis[] | null {
  if (!isRawLuckPillarArray(rawTimingPillars) || rawTimingPillars.length === 0) return null;

  const currentAge = computeCurrentAge(input, new Date());
  const sorted = [...rawTimingPillars].sort((a, b) => a.age - b.age);

  return sorted.map((lp, i) => {
    const daeunStemHanja = lp.pillar.stem.hanja;
    const daeunBranchHanja = lp.pillar.branch.hanja;
    const isCurrent = currentAge >= lp.age && currentAge < lp.age + 10;
    const isNext = !isCurrent && i > 0 && currentAge >= sorted[i - 1].age && currentAge < lp.age;

    return {
      age: lp.age,
      ganzhi: lp.pillar.hanja,
      stemHanja: daeunStemHanja,
      branchHanja: daeunBranchHanja,
      tenGods: { stem: lp.tenGods.stem, branch: lp.tenGods.branch },
      approximateStartDate: lp.approximateStartDate?.date ?? null,
      relations: computeDaeunRelations(daeunStemHanja, daeunBranchHanja, natalPillars),
      isCurrent,
      isNext,
    };
  });
}

export function getOhMySajuEnrichment(input: SajuFactsInput): OhMySajuEnrichment | null {
  try {
    return callOhMySaju(input).enrichment;
  } catch {
    return null;
  }
}

// facts.geukguk/dayStrength/dayStrengthScore는 oh-my-saju 판정으로 바꾸고,
// facts.daeunAnalysis는 oh-my-saju의 timing(대운 8~10구간) + 로컬 합충형파해
// 계산으로 새로 채운다. 나머지 필드(오행/십성 개수, 궁위, ssaju 자체 대운 등)는
// 전부 ssaju 값 그대로 — REUSE 범위를 벗어나지 않는다.
export function enrichSajuFacts(facts: SajuFacts, input: SajuFactsInput): SajuFacts {
  let result: OhMySajuCallResult;
  try {
    result = callOhMySaju(input);
  } catch {
    return facts;
  }

  const daeunAnalysis = buildDaeunAnalysis(result.rawTimingPillars, facts.pillars, input);

  if (!result.enrichment) {
    // 소프트 폴백: 서브프로세스 자체는 성공(예외 없음)했지만 ziping/ditianshui
    // 판정 결과가 findings에 없었던 경우. callOhMySaju 내부 catch로는 못
    // 잡히는 경로라 여기서 별도로 로그한다 — 이 경로도 geukgukSource를
    // "ssaju_fallback"으로 남긴다.
    logOhMySajuFallback({ reason: "enrichment_missing", elapsedMs: result.elapsedMs, coldStart: result.coldStart });
  }

  return {
    ...facts,
    ...(result.enrichment
      ? {
          geukguk: result.enrichment.pattern,
          dayStrength: result.enrichment.strengthBucket,
          dayStrengthScore: result.enrichment.strengthScore,
          dayStrengthGrade: result.enrichment.strengthGrade,
          geukgukSource: "ziping_ditianshui" as const,
        }
      : {}),
    daeunAnalysis,
  };
}
```

### 파일: src/lib/palm-detection.ts
```ts
// 브라우저 전용 모듈. MediaPipe HandLandmarker(Apache-2.0, 재사용)로 손을
// 검출하고, 랜드마크 기반 관심영역 위에서 palm-line-features.ts의 엣지
// 휴리스틱(직접 구현 — GAP)을 돌려 PalmFacts를 조립한다.
// 이미지는 서버로 전송하지 않고 전부 클라이언트에서 처리한다.

import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { analyzeEdgeBand } from "@/lib/palm-line-features";
import { runPalmLineOnnx, preloadPalmLineModel, type OnnxLineClass, type OnnxLineObservation } from "@/lib/palm-line-onnx";
import type {
  HandShape,
  HandSide,
  ImageQuality,
  LineFeature,
  LineName,
  OnnxLineDetail,
  PalmFacts,
} from "@/lib/palm-facts";

let handLandmarkerPromise: Promise<HandLandmarker> | null = null;

function getHandLandmarker(): Promise<HandLandmarker> {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "/models/hand_landmarker.task",
        },
        runningMode: "IMAGE",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
      });
    })();
  }
  return handLandmarkerPromise;
}

/** 앱 진입 시 미리 불러 첫 분석 지연을 줄이고 싶을 때 호출 (실패해도 무시) */
export function preloadHandLandmarker() {
  getHandLandmarker().catch(() => {});
  preloadPalmLineModel();
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function px(landmark: NormalizedLandmark, width: number, height: number) {
  return { x: landmark.x * width, y: landmark.y * height };
}

function averageBrightness(imageData: ImageData): number {
  const { data } = imageData;
  let sum = 0;
  const step = 16; // 전체 픽셀을 다 안 보고 샘플링해 속도 확보
  let count = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function isNearEdge(p: { x: number; y: number }, w: number, h: number, margin = 0.02) {
  return p.x < w * margin || p.x > w * (1 - margin) || p.y < h * margin || p.y > h * (1 - margin);
}

function classifyHandShape(landmarksPx: { x: number; y: number }[]): HandShape {
  const wrist = landmarksPx[0];
  const middleMcp = landmarksPx[9];
  const middleTip = landmarksPx[12];
  const indexMcp = landmarksPx[5];
  const pinkyMcp = landmarksPx[17];

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const palmLength = dist(wrist, middleMcp);
  const palmWidth = dist(indexMcp, pinkyMcp);
  const fingerLength = dist(middleMcp, middleTip);

  if (palmLength < 1e-3) return "unknown";

  const squareness = palmWidth / palmLength; // 클수록 사각형에 가까움
  const fingerRatio = fingerLength / palmLength; // 클수록 손가락이 긴 편

  const isSquare = squareness > 0.78;
  const isLongFingers = fingerRatio > 0.72;

  if (isSquare && !isLongFingers) return "square";
  if (isSquare && isLongFingers) return "rectangular";
  if (!isSquare && !isLongFingers) return "elongated";
  return "slender";
}

function palmBoundingBox(landmarksPx: { x: number; y: number }[]): Rect {
  const keyIdx = [0, 5, 9, 13, 17];
  const xs = keyIdx.map((i) => landmarksPx[i].x);
  const ys = keyIdx.map((i) => landmarksPx[i].y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function extractLineFeatures(imageData: ImageData, landmarksPx: { x: number; y: number }[]): LineFeature[] {
  const box = palmBoundingBox(landmarksPx);
  const thumbMcp = landmarksPx[2];
  const palmCenterX = box.x + box.width / 2;
  const thumbOnLeft = thumbMcp.x < palmCenterX;

  const regions: Record<LineName, Rect> = {
    감정선: { x: box.x, y: box.y, width: box.width, height: box.height * 0.32 },
    두뇌선: { x: box.x, y: box.y + box.height * 0.3, width: box.width, height: box.height * 0.3 },
    생명선: thumbOnLeft
      ? { x: box.x, y: box.y, width: box.width * 0.42, height: box.height }
      : { x: box.x + box.width * 0.58, y: box.y, width: box.width * 0.42, height: box.height },
  };

  const DETECT_THRESHOLD = 0.12;

  return (Object.keys(regions) as LineName[]).map((name) => {
    const signal = analyzeEdgeBand(imageData, regions[name]);
    const detected = signal.density > DETECT_THRESHOLD && signal.span > 0.15;
    if (!detected) {
      return { name, detected: false, length: null, direction: null, confidence: Math.min(1, signal.density) };
    }
    const length = signal.span < 0.35 ? "짧음" : signal.span < 0.65 ? "보통" : "김";
    const direction = signal.curved ? "완만한 곡선" : "직선에 가까움";
    return { name, detected: true, length, direction, confidence: Math.min(1, signal.density) };
  });
}

/** palm-line-reader의 실제 학습 전처리(pipeline/hand_preprocess.py의
 * crop_and_rotate_hand)를 그대로 재현한다. 이전 버전(cropToCanvas, axis-aligned
 * bbox + 비례 padding)은 이 모델이 학습 때 실제로 본 프레임과 달라서
 * heart_line/head_line이 거의 검출되지 않았다 — upstream을 직접 읽어 확인한
 * 원인은 "손가락이 항상 위를 향하도록 회전"시킨 뒤 크롭한다는 점이었다
 * (우리는 원본 방향 그대로 axis-aligned crop만 하고 있었음).
 *
 * upstream 순서: wrist(0)→middle-MCP(9) 벡터가 수직 위를 향하도록 전체
 * 이미지를 회전 → 회전된 21개 랜드마크의 bbox + 고정 100px 마진으로 크롭 →
 * MediaPipe handedness가 "Left"가 아니면 좌우반전(학습 시 형태 변이를 줄이기
 * 위한 것으로, 실제 손잡이 판정이 아니라고 upstream 주석이 명시함).
 * 마진 100px은 upstream 스크립트의 고정값을 그대로 쓴 것 — 우리가 임의로
 * 추측한 padding 비율이 아니다. */
function cropAndRotatePalm(
  source: HTMLCanvasElement,
  landmarksPx: { x: number; y: number }[],
  isLeftHanded: boolean,
  margin = 100,
): HTMLCanvasElement {
  const wrist = landmarksPx[0];
  const middleMcp = landmarksPx[9];
  const v = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y };
  // wrist->middle-MCP 벡터를 수직 위(0,-r)로 돌리는 회전각.
  const angle = Math.atan2(-v.x, -v.y);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const cx = landmarksPx.reduce((sum, p) => sum + p.x, 0) / landmarksPx.length;
  const cy = landmarksPx.reduce((sum, p) => sum + p.y, 0) / landmarksPx.length;

  const rotatedRelative = landmarksPx.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  });
  const xs = rotatedRelative.map((p) => p.x);
  const ys = rotatedRelative.map((p) => p.y);
  const minX = Math.min(...xs) - margin;
  const minY = Math.min(...ys) - margin;
  const maxX = Math.max(...xs) + margin;
  const maxY = Math.max(...ys) + margin;
  const outW = Math.max(1, Math.round(maxX - minX));
  const outH = Math.max(1, Math.round(maxY - minY));

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = outW;
  rotatedCanvas.height = outH;
  const rctx = rotatedCanvas.getContext("2d");
  if (!rctx) return rotatedCanvas;
  rctx.translate(-minX, -minY);
  rctx.rotate(angle);
  rctx.translate(-cx, -cy);
  rctx.drawImage(source, 0, 0);

  if (isLeftHanded) return rotatedCanvas;

  const flipped = document.createElement("canvas");
  flipped.width = outW;
  flipped.height = outH;
  const fctx = flipped.getContext("2d");
  if (!fctx) return rotatedCanvas;
  fctx.translate(outW, 0);
  fctx.scale(-1, 1);
  fctx.drawImage(rotatedCanvas, 0, 0);
  return flipped;
}

const ONNX_CLASS_TO_LINE_NAME: Record<OnnxLineClass, LineName> = {
  heart_line: "감정선",
  head_line: "두뇌선",
  life_line: "생명선",
};

/** ONNX 추론이 실제로 반환한 픽셀 통계(lineLength/avgThickness/curveScore)를
 * 사람이 읽는 라벨로 분류한다. 라벨 경계값은 우리가 정한 근사 기준이지만,
 * 그 재료(픽셀 수·주성분 투영 범위)는 전부 실제 모델 출력에서 나온다.
 * 이전에는 여기서 Math.min(1, obs.coverage * 40)을 "confidence"로 반환했는데,
 * 40이라는 배율에 근거가 없어 검증된 정확도처럼 보이는 가짜 수치였다 —
 * 제거하고 detected(참/거짓)와 실제 관측 라벨만 반환한다. */
function mapOnnxObservation(obs: OnnxLineObservation): OnnxLineDetail {
  if (!obs.detected) {
    return {
      detected: false,
      length: null,
      curve: null,
      depthStrength: null,
      start: null,
      end: null,
      branchDetected: null,
    };
  }
  const length = obs.lineLength < 150 ? "짧음" : obs.lineLength < 320 ? "보통" : "김";
  const curve = obs.curveScore > 0.35 ? "완만한 곡선" : "직선에 가까움";
  const depthStrength = obs.avgThickness < 2.2 ? "약함" : obs.avgThickness < 4 ? "보통" : "강함";
  const norm = (p: { x: number; y: number } | null) => (p ? { x: p.x / 512, y: p.y / 512 } : null);
  return {
    detected: true,
    length,
    curve,
    depthStrength,
    start: norm(obs.start),
    end: norm(obs.end),
    branchDetected: null,
  };
}

export interface PalmAnalysisSource {
  image: CanvasImageSource & { width: number; height: number };
  canvas: HTMLCanvasElement;
}

/**
 * 이미지(캔버스에 이미 그려진 상태)를 분석해 PalmFacts를 만든다.
 * 손 미검출/저조도/손 잘림 중 하나라도 걸리면 선 분석 없이 바로 재촬영
 * 사유(warnings)와 함께 반환한다 — "억지 해석 금지" 원칙.
 */
export async function analyzePalmFromCanvas(canvas: HTMLCanvasElement): Promise<PalmFacts> {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      handSide: "unknown",
      imageQuality: "no_hand_detected",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["이미지를 처리할 수 없어요. 다른 사진으로 다시 시도해주세요."],
    };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const brightness = averageBrightness(imageData);

  if (brightness < 45) {
    return {
      handSide: "unknown",
      imageQuality: "too_dark",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["사진이 너무 어두워요. 밝은 곳에서 손바닥이 잘 보이게 다시 찍어주세요."],
    };
  }

  const landmarker = await getHandLandmarker();
  const result = landmarker.detect(canvas);

  if (!result.landmarks || result.landmarks.length === 0) {
    return {
      handSide: "unknown",
      imageQuality: "no_hand_detected",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["손이 잘 안 보여요. 손바닥 전체가 프레임 안에 들어오게 다시 찍어주세요."],
    };
  }

  const landmarks = result.landmarks[0];
  const landmarksPx = landmarks.map((l) => px(l, canvas.width, canvas.height));

  const keyIndices = [0, 1, 4, 5, 8, 9, 12, 13, 16, 17, 20];
  const cropped = keyIndices.some((i) => isNearEdge(landmarksPx[i], canvas.width, canvas.height));
  if (cropped) {
    return {
      handSide: "unknown",
      imageQuality: "hand_cropped",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["손바닥 일부가 사진 밖으로 잘렸어요. 손 전체가 나오게 조금 더 멀리서 다시 찍어주세요."],
    };
  }

  const handednessCategory = result.handedness[0]?.[0];
  const handSide: HandSide =
    handednessCategory?.categoryName === "Left"
      ? "left"
      : handednessCategory?.categoryName === "Right"
        ? "right"
        : "unknown";
  const detectionConfidence = handednessCategory?.score ?? 0.5;

  const handShape = classifyHandShape(landmarksPx);
  const lineFeatures = extractLineFeatures(imageData, landmarksPx);

  // 실제 ONNX 모델 추론 — upstream 학습 전처리와 동일하게 손가락이 위로
  // 향하도록 회전 + 고정 마진 크롭 + 좌우손 통일(미러링)한 뒤 넣는다.
  // 실패해도(모델 로드 실패, 추론 오류) null만 반환하고 Sobel 결과로 계속 진행한다.
  const palmCrop = cropAndRotatePalm(canvas, landmarksPx, handSide === "left");
  const onnxRaw = await runPalmLineOnnx(palmCrop);
  const onnxLines: PalmFacts["onnxLines"] = onnxRaw
    ? {
        modelExecuted: true,
        heartLine: mapOnnxObservation(onnxRaw.observations.find((o) => o.class === "heart_line")!),
        headLine: mapOnnxObservation(onnxRaw.observations.find((o) => o.class === "head_line")!),
        lifeLine: mapOnnxObservation(onnxRaw.observations.find((o) => o.class === "life_line")!),
        fateLine: { presence: "unknown", note: "이 모델은 재물선(fate line)을 분할하지 않아 확인할 수 없어요." },
        mounts: "unknown",
        marks: "unknown",
      }
    : null;

  const onnxDetectedNames: LineName[] = onnxLines
    ? (["heart_line", "head_line", "life_line"] as const)
        .filter((cls) => onnxLines[cls === "heart_line" ? "heartLine" : cls === "head_line" ? "headLine" : "lifeLine"].detected)
        .map((cls) => ONNX_CLASS_TO_LINE_NAME[cls])
    : [];
  const sobelDetectedNames = lineFeatures.filter((f) => f.detected).map((f) => f.name);
  const majorLines = Array.from(new Set([...sobelDetectedNames, ...onnxDetectedNames]));

  const lineConfidences = lineFeatures.map((f) => f.confidence);
  const avgLineConfidence =
    lineConfidences.length > 0 ? lineConfidences.reduce((a, b) => a + b, 0) / lineConfidences.length : 0;
  const confidence = detectionConfidence * 0.6 + avgLineConfidence * 0.4;

  const warnings: string[] = [];
  const imageQuality: ImageQuality = "good";
  if (majorLines.length === 0) {
    warnings.push("주요 선이 뚜렷하게 보이지 않았어요. 손바닥을 펴고 조명이 잘 드는 곳에서 다시 찍어보세요.");
  }

  return {
    handSide,
    imageQuality,
    handShape,
    majorLines,
    lineFeatures,
    onnxLines,
    confidence,
    warnings,
  };
}
```

### 파일: src/lib/palm-facts.ts
```ts
// 손 검출/손금 특징 추출 결과의 구조화 타입.
// MediaPipe Hands(손 검출·랜드마크)는 그대로 재사용한다. 선 검출은 두
// 경로를 함께 유지한다:
//   1) lineFeatures — 기존 결정론적 Sobel 엣지 휴리스틱(GAP-BUILD)
//   2) onnxLines — samuelwbarber/palm-line-reader(MIT)의 실제 학습된
//      가중치를 onnxruntime-web으로 브라우저에서 직접 추론한 결과
//      (src/lib/palm-line-onnx.ts). 두 값을 하나로 평균내 섞지 않고
//      "실제 모델 관측값"과 "휴리스틱 신호"를 분리해서 보관한다 —
//      해석 레이어에서 "실제 관측값 vs 전통 해석"을 구분해 설명하기
//      위함이다. ONNX 추론이 실패하면 onnxLines는 null이고, 화면은
//      lineFeatures만으로 계속 동작한다(억지 해석 금지).
// 절대 "클리닉 수준 정밀 인식"이라 주장하지 않고, 낮은 신뢰도는 재촬영으로
// 유도한다.

export type HandSide = "left" | "right" | "unknown";

export type ImageQuality =
  | "good"
  | "no_hand_detected"
  | "too_dark"
  | "hand_cropped";

export type HandShape =
  | "square" // 손바닥이 사각형에 가깝고 손가락이 짧은 편
  | "rectangular" // 손바닥이 사각형에 가깝고 손가락이 긴 편
  | "elongated" // 손바닥이 길쭉하고 손가락이 짧은 편
  | "slender" // 손바닥이 길쭉하고 손가락도 긴 편
  | "unknown";

export type LineName = "생명선" | "감정선" | "두뇌선";
export type LineLength = "짧음" | "보통" | "김";
export type LineDirection = "완만한 곡선" | "직선에 가까움";

export interface LineFeature {
  name: LineName;
  detected: boolean;
  length: LineLength | null;
  direction: LineDirection | null;
  /** 0~1. 엣지 검출 신호 강도 기반 추정치이며 정밀 인식 신뢰도가 아니다. */
  confidence: number;
}

/** ONNX 모델(samuelwbarber/palm-line-reader)이 실제로 반환한 선 하나의
 * 구조화 관측값. 이 모델이 지원하지 않는 항목(분기/fork, 깊이의 물리적
 * 측정치)은 절대 지어내지 않고 null로 둔다. */
export interface OnnxLineDetail {
  detected: boolean;
  length: LineLength | null;
  curve: LineDirection | null;
  /** 마스크 픽셀 수(굵기·뚜렷함) 기반 근사치. 실제 "깊이"를 측정한 값이
   * 아니라는 걸 명시하기 위해 depthStrength로 이름 붙였다. */
  depthStrength: "약함" | "보통" | "강함" | null;
  /** 512x512 모델 좌표계를 0~1로 정규화한 시작점/끝점(주성분 투영 극값) */
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  /** 이 모델은 분기(fork) 검출을 지원하지 않는다 — 항상 null. */
  branchDetected: null;
}

export interface OnnxPalmLines {
  modelExecuted: true;
  heartLine: OnnxLineDetail;
  headLine: OnnxLineDetail;
  lifeLine: OnnxLineDetail;
  /** 이 모델은 생명선/두뇌선/감정선 3종만 분할하며 재물선(fate line)은
   * 지원하지 않는다 — 억지로 채우지 않고 명시적으로 unknown 처리. */
  fateLine: { presence: "unknown"; note: string };
  mounts: "unknown";
  marks: "unknown";
}

export interface PalmFacts {
  handSide: HandSide;
  imageQuality: ImageQuality;
  handShape: HandShape;
  /** 신뢰 가능한 수준으로 "존재가 확인된" 선 이름만 포함 (없으면 빈 배열) */
  majorLines: LineName[];
  /** 선별 상세 특징(Sobel 엣지 휴리스틱). 검출되지 않은 선은 detected:false, length/direction:null */
  lineFeatures: LineFeature[];
  /** 실제 ONNX 모델 추론 결과. 모델 로드/추론이 실패하면 null. */
  onnxLines: OnnxPalmLines | null;
  /** 0~1, MediaPipe 손 검출 확률과 Sobel 엣지 밀도를 섞은 내부 임계값용
   * 수치일 뿐 검증된 정확도가 아니다 — isPalmFactsUsable()의 재촬영 판단에만
   * 쓰고, 사용자에게 "신뢰도/정확도 %"로 노출하지 않는다. */
  confidence: number;
  /** 사용자에게 보여줄 경고/재촬영 사유 */
  warnings: string[];
}

/** 실제 ONNX가 검출한 선 개수(0~3). majorLines(Sobel+ONNX 합집합)는 성공
 * 판정에 쓰지 않는다 — Sobel 혼자 "검출됐다"고 우겨도 손금 리포트를
 * 만들어서는 안 되기 때문이다(그럴듯해 보이는 가짜 결과 방지). */
export function onnxDetectedLineCount(facts: PalmFacts): number {
  if (!facts.onnxLines) return 0;
  const { heartLine, headLine, lifeLine } = facts.onnxLines;
  return [heartLine, headLine, lifeLine].filter((l) => l.detected).length;
}

/** 해석 단계로 넘어가도 되는지 판단하는 기준. 성공 판정은 오직 실제 ONNX
 * 결과로만 한다 — imageQuality 통과 + 모델이 실제로 실행됐고(modelExecuted)
 * + 3개 선 중 최소 2개를 실제로 검출했을 때만 usable이다. Sobel 휴리스틱
 * (lineFeatures/confidence)은 여기서 절대 성공 기준에 넣지 않는다: Sobel은
 * 촬영 품질 보조/디버그 신호일 뿐, ONNX가 못 본 선을 있다고 우겨서 손금
 * 리포트가 만들어지게 해서는 안 된다. 실패 시 재촬영을 요청한다. */
export function isPalmFactsUsable(facts: PalmFacts): boolean {
  if (facts.imageQuality !== "good") return false;
  if (!facts.onnxLines || !facts.onnxLines.modelExecuted) return false;
  if (onnxDetectedLineCount(facts) < 2) return false;
  return true;
}

/** 재촬영 화면에 보여줄, 실패 원인별 짧은 안내. attempt(1부터)가 올라갈수록
 * 더 구체적인 촬영 팁으로 escalate한다(연속 실패 UX). */
export function describePalmFailureReasons(facts: PalmFacts, attempt: number): string[] {
  const reasons: string[] = [];
  if (facts.imageQuality === "no_hand_detected") {
    reasons.push("사진에서 손을 찾지 못했어요.");
  } else if (facts.imageQuality === "too_dark") {
    reasons.push("사진이 너무 어두워서 선이 잘 안 보여요.");
  } else if (facts.imageQuality === "hand_cropped") {
    reasons.push("손 일부가 사진 밖으로 잘렸어요.");
  } else if (!facts.onnxLines || !facts.onnxLines.modelExecuted) {
    reasons.push("손금선 분석 모델이 이번 사진을 처리하지 못했어요.");
  } else {
    const n = onnxDetectedLineCount(facts);
    reasons.push(`손금선이 ${n}개만 뚜렷하게 읽혀서 결과를 만들기엔 부족해요.`);
  }

  if (attempt >= 2) {
    reasons.push(
      "손바닥을 완전히 펴고, 화면 안에 손바닥 전체(손가락 끝~손목)가 다 들어오게 촬영해보세요.",
      "그림자 없이 정면에서 밝은 빛이 손바닥에 고르게 비치는 곳을 찾아보세요.",
    );
  }
  return reasons;
}
```

### 파일: src/lib/palm-keyword.ts
```ts
// 간접체험(indirect-experience)에서 재물유형과 함께 상황을 개인화하는 보조
// 축. 새 손금 분류를 만들지 않는다 — 이미 계산되고 화면에도 노출되는
// PalmFacts.handShape를 그대로 재사용한다(src/lib/palm-facts.ts).

import type { PalmFacts, HandShape } from "@/lib/palm-facts";

export type PalmKeyword = HandShape;

/** palmFacts가 없거나(손금 스킵) 손 모양을 못 읽었으면 "unknown" —
 * indirect-experience-data.ts는 이 경우 성향 묘사 문장을 아예 생략한다. */
export function derivePalmKeyword(palmFacts: PalmFacts | null): PalmKeyword {
  if (!palmFacts) return "unknown";
  return palmFacts.handShape;
}
```

### 파일: src/lib/palm-line-features.ts
```ts
// 손금 "선 검출"을 위한 결정론적 엣지 휴리스틱.
// 검증된 오픈소스 선 세그멘테이션 모델이 없어(REUSE-FIRST 조사 결과 —
// 후보들은 학술/취미 단계이거나 라이선스·유지보수가 불명확) 직접 구현한다.
// Sobel 엣지 검출은 잘 알려진 표준 알고리즘이라 별도 라이브러리 없이
// 캔버스 픽셀 위에서 직접 계산한다. 정밀 선 분류가 아니라 "이 영역에
// 뚜렷한 가로 방향 선이 있는가"를 보는 저비용 신호로만 쓴다.

export interface EdgeBandSignal {
  /** 0~1. 밴드 내 강한 가로 엣지 픽셀 비율 */
  density: number;
  /** 0~1. 엣지가 이어지는 가로 폭 비율(길이 추정용) */
  span: number;
  /** true면 엣지 방향이 밴드 내에서 크게 휘어짐(곡선), false면 비교적 일정(직선) */
  curved: boolean;
}

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

// 3x3 Sobel 커널로 gx, gy를 구해 gradient 크기/방향을 픽셀별로 계산한다.
function sobel(gray: Float32Array, width: number, height: number) {
  const magnitude = new Float32Array(width * height);
  const angle = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] + gray[i - width + 1] +
        -2 * gray[i - 1] + 2 * gray[i + 1] +
        -gray[i + width - 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      magnitude[i] = Math.sqrt(gx * gx + gy * gy);
      angle[i] = Math.atan2(gy, gx);
    }
  }
  return { magnitude, angle };
}

/**
 * 주어진 관심영역(ROI) 안에서 "가로로 이어지는 뚜렷한 선"이 있는지 신호를 뽑는다.
 * 손금선(생명선/두뇌선/감정선)은 대체로 손바닥을 가로지르는 형태라, 세로
 * 방향보다 가로~대각선 방향 엣지에 가중치를 준다.
 */
export function analyzeEdgeBand(
  imageData: ImageData,
  roi: { x: number; y: number; width: number; height: number },
): EdgeBandSignal {
  const { width: imgW, height: imgH, data } = imageData;
  const x0 = Math.max(0, Math.floor(roi.x));
  const y0 = Math.max(0, Math.floor(roi.y));
  const x1 = Math.min(imgW, Math.floor(roi.x + roi.width));
  const y1 = Math.min(imgH, Math.floor(roi.y + roi.height));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);

  if (w < 4 || h < 4) {
    return { density: 0, span: 0, curved: false };
  }

  // ROI만 잘라 별도 버퍼로 만든 뒤 Sobel 적용 (전체 이미지 대비 계산량 절약)
  const cropped = new Uint8ClampedArray(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    const srcStart = ((y0 + yy) * imgW + x0) * 4;
    const dstStart = yy * w * 4;
    cropped.set(data.subarray(srcStart, srcStart + w * 4), dstStart);
  }

  const gray = toGrayscale(cropped, w, h);
  const { magnitude, angle } = sobel(gray, w, h);

  const threshold = 40; // 경험적 임계값: 노이즈 대비 유의미한 엣지만 카운트
  let horizontalStrongCount = 0;
  const colHasEdge = new Array<boolean>(w).fill(false);
  const angles: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (magnitude[i] > threshold) {
        const a = angle[i];
        // gradient는 엣지에 수직이므로, gradient가 수직(위/아래)에 가까우면
        // 실제 엣지 라인은 가로 방향이라는 뜻.
        const isHorizontalEdge = Math.abs(Math.cos(a)) < 0.6;
        if (isHorizontalEdge) {
          horizontalStrongCount++;
          colHasEdge[x] = true;
          angles.push(a);
        }
      }
    }
  }

  const totalPixels = w * h;
  const density = totalPixels > 0 ? horizontalStrongCount / totalPixels : 0;
  const spanCols = colHasEdge.filter(Boolean).length;
  const span = w > 0 ? spanCols / w : 0;

  let curved = false;
  if (angles.length > 4) {
    const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
    const variance = angles.reduce((a, b) => a + (b - mean) ** 2, 0) / angles.length;
    curved = variance > 0.15;
  }

  return { density: Math.min(1, density * 25), span, curved };
}
```

### 파일: src/lib/palm-line-onnx.ts
```ts
// 실제 ONNX 런타임 실행 레이어. samuelwbarber/palm-line-reader(MIT)의
// 실제 학습된 가중치(student_fp16.onnx, val_fg_dice 0.81)를
// onnxruntime-web(npm 런타임 의존성, 실제 설치)으로 브라우저에서 직접
// 추론한다. 여기서 계산하는 값(픽셀 마스크 → 바운딩박스/시작점/끝점/
// 곡률)은 전부 그 실제 추론 결과에서 나온 관측값이며, 사전에 정의한
// 조건문으로 지어낸 값이 아니다.
//
// MediaPipe로 만든 손 크롭을 512x512로 넣는 이 모델의 훈련 프레이밍과
// 완전히 같지는 않아(모델은 "손금이 꽉 찬" 근접 크롭으로 학습됨) 정확도가
// 낮아질 수 있다는 점을 UI 쪽에 그대로 노출한다(관측값 vs 해석 분리 원칙).

import * as ort from "onnxruntime-web";
import { PalmLineSegmenter } from "@/lib/vendor/palm-line-reader/palmLines.js";

// public/ort/에 self-host한 wasm 번들만 사용 — CDN에 의존하지 않는다
// (이 프로젝트가 MediaPipe wasm도 동일하게 자체 호스팅하는 것과 같은 원칙).
ort.env.wasm.wasmPaths = "/ort/";
// threaded wasm은 SharedArrayBuffer(COOP/COEP 크로스오리진 격리 헤더)가
// 필요한데 이 배포 환경에 그 헤더가 없다 — numThreads=1로 강제해 메인
// 스레드에서 단일 스레드로 동작하게 해서 별도 서버 설정 없이 안정적으로
// 돌아가게 한다. webgpu는 브라우저 지원 편차가 커서 이번엔 wasm(CPU)로
// 고정해 "실제로 항상 돌아가는 것"을 우선한다.
ort.env.wasm.numThreads = 1;

let segmenterPromise: Promise<InstanceType<typeof PalmLineSegmenter>> | null = null;

function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = PalmLineSegmenter.create(ort, {
      modelUrl: "/models/palm_line_student_fp16.onnx",
      executionProviders: ["wasm"],
    });
  }
  return segmenterPromise;
}

/** 앱 진입 시 미리 불러 첫 분석 지연을 줄이고 싶을 때 호출 (실패해도 무시) */
export function preloadPalmLineModel() {
  getSegmenter().catch(() => {});
}

export type OnnxLineClass = "heart_line" | "head_line" | "life_line";
const CLASS_INDEX: Record<OnnxLineClass, number> = { heart_line: 1, head_line: 2, life_line: 3 };
const MIN_PIXELS_FOR_DETECTION = 60; // 512x512=262144픽셀 중 임계치. 노이즈성 소수 픽셀은 미검출로 처리.

export interface OnnxLineObservation {
  class: OnnxLineClass;
  detected: boolean;
  /** 마스크에서 이 클래스로 분류된 픽셀 수 — 실제 추론 결과 원값 */
  pixelCount: number;
  /** 0~1, 512x512 대비 픽셀 비율 */
  coverage: number;
  boundingBox: { x0: number; y0: number; x1: number; y1: number } | null;
  /** 주성분(선의 진행 방향) 투영값이 가장 작은/큰 점 — "시작점/끝점" 근사 */
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  /** 주성분 직선 대비 수직 잔차의 표준편차를 선 길이로 정규화한 값.
   * 0에 가까울수록 직선, 클수록 곡선. 임의 스케일(대략 0~1+)이며
   * "곡률의 물리량"이 아니라 상대적 지표다. */
  curveScore: number;
  /** 주성분 투영 범위(시작~끝 픽셀 거리). 512 기준 픽셀 단위. */
  lineLength: number;
  /** pixelCount / lineLength — 선의 평균 굵기 근사치(두께 프록시). */
  avgThickness: number;
}

export interface OnnxPalmLineResult {
  observations: OnnxLineObservation[];
  maskWidth: number;
  maskHeight: number;
}

function computeObservation(
  mask: Uint8Array,
  width: number,
  height: number,
  cls: OnnxLineClass,
): OnnxLineObservation {
  const classIndex = CLASS_INDEX[cls];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[row + x] === classIndex) {
        xs.push(x);
        ys.push(y);
      }
    }
  }

  const pixelCount = xs.length;
  const coverage = pixelCount / (width * height);
  const detected = pixelCount >= MIN_PIXELS_FOR_DETECTION;

  if (!detected) {
    return {
      class: cls,
      detected: false,
      pixelCount,
      coverage,
      boundingBox: null,
      start: null,
      end: null,
      curveScore: 0,
      lineLength: 0,
      avgThickness: 0,
    };
  }

  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  // 주성분 방향(PCA 1st component)을 2x2 공분산의 고유벡터로 직접 계산.
  const meanX = xs.reduce((a, b) => a + b, 0) / pixelCount;
  const meanY = ys.reduce((a, b) => a + b, 0) / pixelCount;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < pixelCount; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= pixelCount;
  syy /= pixelCount;
  sxy /= pixelCount;

  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const discriminant = Math.max(0, trace * trace / 4 - det);
  const lambda1 = trace / 2 + Math.sqrt(discriminant);
  // 고유벡터 (sxy, lambda1 - sxx) 정규화. sxy가 0에 가까우면 축 정렬된 방향으로 처리.
  let dirX = sxy;
  let dirY = lambda1 - sxx;
  const dirLen = Math.hypot(dirX, dirY);
  if (dirLen < 1e-6) {
    dirX = 1;
    dirY = 0;
  } else {
    dirX /= dirLen;
    dirY /= dirLen;
  }

  let minProj = Infinity;
  let maxProj = -Infinity;
  let minIdx = 0;
  let maxIdx = 0;
  let residualSumSq = 0;
  for (let i = 0; i < pixelCount; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    const proj = dx * dirX + dy * dirY;
    const perp = -dx * dirY + dy * dirX; // 주성분 직선까지의 수직 거리
    residualSumSq += perp * perp;
    if (proj < minProj) {
      minProj = proj;
      minIdx = i;
    }
    if (proj > maxProj) {
      maxProj = proj;
      maxIdx = i;
    }
  }

  const lineLength = Math.max(1, maxProj - minProj);
  const residualStd = Math.sqrt(residualSumSq / pixelCount);
  const curveScore = (residualStd / lineLength) * 10; // 상대 지표로 스케일 조정
  const avgThickness = pixelCount / lineLength;

  return {
    class: cls,
    detected: true,
    pixelCount,
    coverage,
    boundingBox: { x0, y0, x1, y1 },
    start: { x: xs[minIdx], y: ys[minIdx] },
    end: { x: xs[maxIdx], y: ys[maxIdx] },
    curveScore,
    lineLength,
    avgThickness,
  };
}

/**
 * 실제 ONNX 추론을 실행한다. 실패(모델 로드/추론 오류)하면 null을 반환하고
 * 절대 throw하지 않는다 — 호출부는 Sobel 휴리스틱으로만 계속 진행할 수 있다.
 * 성공 시 반환되는 모든 수치는 실제 model output에서 계산된 값이다.
 */
export async function runPalmLineOnnx(source: CanvasImageSource): Promise<OnnxPalmLineResult | null> {
  try {
    const segmenter = await getSegmenter();
    const { mask, width, height } = await segmenter.segment(source);
    const observations: OnnxLineObservation[] = (["heart_line", "head_line", "life_line"] as const).map((cls) =>
      computeObservation(mask, width, height, cls),
    );
    return { observations, maskWidth: width, maskHeight: height };
  } catch (err) {
    console.error("palm-line ONNX inference failed:", err);
    return null;
  }
}
```

### 파일: src/lib/palm-observation-text.ts
```ts
// "실제 관측값"과 "손금 자체 해석"을 분리해서 문장으로 만든다.
// 관측값 문장은 오직 실제 ONNX 추론 결과(palm-line-onnx.ts)의 수치만 쓴다.
// 해석 문장은 명시적으로 "전통적으로/관상학적으로 보는 편"이라고 표현해,
// 과학적으로 검증된 사실처럼 말하지 않는다. 검출되지 않은 선에는 해석도
// 붙이지 않는다("있다고 말하지 않는다").
//
// 이번 라운드 변경 — 두 가지:
// (1) depthStrength(마스크 굵기 근사치)로 활력/지구력/컨디션/변화 대응력을
//     추론하지 않는다(§5). 생명선은 전통 손금에서도 그런 추론이 건강·수명
//     쪽으로 흐르기 쉬워, 실제 근거가 약한데 단정하는 위험이 가장 크다 —
//     그래서 생명선은 ①실제 관측(사실 그대로)에만 담고, ②해석에서는 뺐다.
// (2) 곡률(curve)만 쓰던 걸 길이(length)까지 함께 써서 감정선·두뇌선 해석을
//     더 깊게 만들었다(§4) — "찍으니 실제로 새 내용을 하나 더 봤다"를
//     만드는 게 목적이라, 한 줄짜리 해석에서 두 특징을 엮은 해석으로,
//     그리고 두 선을 합쳐 보는 문장까지 더했다(이미 나온 두 해석을
//     논리적으로 묶을 뿐 새 데이터를 지어내지 않는다).

import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";

const LINE_LABEL = { heartLine: "감정선", headLine: "두뇌선", lifeLine: "생명선" } as const;

/** ① 실제 이미지 관측 — ONNX 모델이 실제로 반환한 수치만, 분석 용어 없이 */
export function buildRealObservationText(facts: PalmFacts): string {
  if (!facts.onnxLines) {
    return "이번 사진은 이미지 분석 모델이 결과를 내지 못했습니다. 아래 내용은 보조 신호만으로 채운 참고 수준입니다.";
  }
  const parts = (["heartLine", "headLine", "lifeLine"] as const).map((key) => {
    const d: OnnxLineDetail = facts.onnxLines![key];
    const label = LINE_LABEL[key];
    if (!d.detected) return `${label}은 이번 사진에서 뚜렷하게 보이지 않았습니다`;
    return `${label}은 ${d.length} 길이에 ${d.curve}으로 나타났습니다`;
  });
  return parts.join(". ") + ".";
}

/** ② 손금 자체 해석 — 감정선·두뇌선은 길이+곡률을 함께 엮어 읽고, 마지막에
 * 둘을 합쳐 보는 문장을 한 번 더 더한다. 생명선은 실제 근거(depthStrength)가
 * 활력·건강 쪽 단정으로 흐르기 쉬워 해석에서 제외했다 — ①에서 사실만
 * 전달한다. 검출된 선에만 붙이고, 항상 "전통적으로 보는 편" 톤을 유지한다. */
export function buildTraditionalReadingText(facts: PalmFacts): string {
  if (!facts.onnxLines) return "관측 결과가 없어 해석은 이번에 생략합니다.";

  const heart = facts.onnxLines.heartLine;
  const head = facts.onnxLines.headLine;
  const notes: string[] = [];

  if (heart.detected) {
    const lengthNote =
      heart.length === "김"
        ? "감정 표현이 풍부하고 관계에 마음을 많이 쓰는 사람으로"
        : heart.length === "짧음"
          ? "감정을 크게 드러내기보다 실용적으로 관계를 대하는 사람으로"
          : "감정을 상황에 맞게 적당히 조절해 표현하는 사람으로";
    const curveNote =
      heart.curve === "완만한 곡선" ? "표현 방식 자체는 유연한 쪽" : "표현보다는 원칙과 기준이 앞서는 쪽";
    notes.push(`감정선은 전통적으로 ${lengthNote} 보고, ${curveNote}으로 봅니다.`);
  }

  if (head.detected) {
    const lengthNote =
      head.length === "김"
        ? "여러 각도로 오래 따져보고 결정하는 사람으로"
        : head.length === "짧음"
          ? "판단이 빠르고 실용적인 사람으로"
          : "필요한 만큼만 재고 결정하는 사람으로";
    const curveNote = head.curve === "완만한 곡선" ? "직관적이고 유연한 사고와" : "논리적이고 현실적인 사고와";
    notes.push(`두뇌선은 전통적으로 ${lengthNote} 보고, ${curveNote} 연결해서 봅니다.`);
  }

  if (heart.detected && head.detected) {
    const bothFlexible = heart.curve === "완만한 곡선" && head.curve === "완만한 곡선";
    const bothLinear = heart.curve !== "완만한 곡선" && head.curve !== "완만한 곡선";
    if (bothFlexible) {
      notes.push("감정선과 두뇌선이 둘 다 완만한 곡선이라, 감정과 사고 모두 유연하게 움직이는 결로 함께 읽힙니다.");
    } else if (bothLinear) {
      notes.push("감정선과 두뇌선이 둘 다 직선에 가까워, 감정과 사고 모두 원칙과 기준을 앞세우는 결로 함께 읽힙니다.");
    } else {
      notes.push("감정선과 두뇌선이 서로 다른 결이라, 감정과 사고가 늘 같은 방향으로 움직이지는 않을 수 있습니다.");
    }
  }

  if (notes.length === 0) {
    return "이번 사진에서는 해석을 붙일 만큼 뚜렷하게 보인 선이 적어, 억지로 해석을 만들지 않습니다.";
  }
  return notes.join(" ");
}
```

### 파일: src/lib/payment-notices.ts
```ts
// 결제 화면 하단 안내 문구 — 처리 방식·환불 정책이 아직 정해지지 않아
// 지금은 문구 자리와 상수만 두고 placeholder로 채운다. 운영자가 정책을
// 확정하면 이 값만 바꾸면 된다(하드코딩된 화면 텍스트가 아니라 상수).

export const PAYMENT_TIMING_NOTICE = "결제 후 리포트 제공 시점은 안내 예정입니다.";

export const REFUND_POLICY_NOTICE = "환불 정책은 안내 예정입니다.";
```

### 파일: src/lib/personality-check.ts
```ts
// "정밀 심리검사"가 아니라 개인화 보조정보 + 실제 돈습관을 함께 얻는
// 아주 짧은 자기정보 체크. REUSE-FIRST 조사 결과 이 6개 축을 한 번에 묻는
// 기존 공개·상업사용 가능 척도는 찾지 못했다 — 가장 근접한 DOSPERT(위험감수
// 척도)는 상업적 사용을 명시적으로 금지한다(비상업 인용만 허용). 그래서
// 이 6문항은 GAP-BUILD로 직접 만들었다: 단일 문항 양극 슬라이더(1~5) 형태의
// 아주 단순한 자기보고이며, 화면에는 "정밀 검사"가 아니라 "간단 자기정보 체크"
// 라고만 표기한다.
//
// 이전 라운드까지는 이 6문항(성향)과 별도로 후반부에 MoneyCheckStep(지출
// 파악/저축/충동구매/자산목표 4문항)을 또 물어봐서 사용자가 총 10개 질문에
// 답해야 했다. 이번 라운드에서 MoneyCheckStep을 없애고, 그 4문항 중 실제
// 필요한 정보(지출 파악도, 저축·목표관리 습관)를 아래 5·6번 축으로 흡수했다
// — 질문 총량은 그대로 6개를 유지하면서 개인화 + 돈습관 정보를 함께 얻는다.
// 판정 목적이 아니라 사주/손금 데이터와 비교해 개인화 체감을 높이는 용도다.

export interface PersonalityCheckItem {
  id: string;
  leftLabel: string;
  rightLabel: string;
}

// 라벨은 320px 화면에서 좌우 두 줄로 나란히 놓인다 — 원래 문장형 라벨이
// 길어서(예: "돈이 어디로 나가는지 잘 모르는 편" 18자) 작은 화면에서
// 지저분하게 줄바꿈됐다. 뜻은 그대로 두고 8~9자 안팎의 짧은 구로 줄였다.
export const PERSONALITY_CHECK_ITEMS: PersonalityCheckItem[] = [
  { id: "speed", leftLabel: "빠르게 결정", rightLabel: "신중하게 결정" },
  { id: "plan", leftLabel: "계획적으로 움직임", rightLabel: "즉흥적으로 움직임" },
  { id: "risk", leftLabel: "기회·위험 감수", rightLabel: "안정 우선" },
  { id: "autonomy", leftLabel: "혼자 결정", rightLabel: "관계·의견 영향받음" },
  { id: "spendAwareness", leftLabel: "지출을 잘 파악", rightLabel: "지출이 잘 안 보임" },
  { id: "savingConsistency", leftLabel: "저축이 일정함", rightLabel: "저축이 들쭉날쭉" },
];

export type PersonalityCheckLevel = "왼쪽" | "중간" | "오른쪽";

export interface PersonalityCheckFacts {
  answers: Record<string, number>;
  levels: Record<string, PersonalityCheckLevel>;
}

function levelOf(v: number): PersonalityCheckLevel {
  if (v <= 2) return "왼쪽";
  if (v >= 4) return "오른쪽";
  return "중간";
}

/** answers: 문항 id -> 1~5 응답(1=왼쪽 라벨, 5=오른쪽 라벨). */
export function scorePersonalityCheck(answers: Record<string, number>): PersonalityCheckFacts {
  const levels: Record<string, PersonalityCheckLevel> = {};
  for (const item of PERSONALITY_CHECK_ITEMS) {
    levels[item.id] = levelOf(answers[item.id] ?? 3);
  }
  return { answers, levels };
}

/** MBTI + 6문항을 함께 실어 나르는 입력 묶음. free-report-mock.ts의
 * realWorldPersonalization이 이 둘을 우선순위를 두고 조합한다 — 둘 다
 * 없으면(스킵) null로 둔다. */
export interface PersonalityInput {
  mbti: import("@/lib/mbti-facts").MbtiType | null;
  check: PersonalityCheckFacts | null;
}
```

### 파일: src/lib/pricing.ts
```ts
// 소액 유료 리포트 가격 A/B 가설. 실제 결제는 붙이지 않으며, 여기서
// RECOMMENDED_PRICE만 실제 화면에 노출한다. 나머지 후보는 추후 실험용으로
// 구조만 남겨둔다 — 가격 자체를 확정하지 않는다는 요구사항을 코드 구조로도
// 지킨다(하드코딩된 단일 가격이 아니라 후보 배열 + 추천 인덱스).

export interface PriceCandidate {
  amountKrw: number;
  label: string;
  /** 이 가격을 가설로 세운 이유 (A/B 테스트 근거) */
  hypothesis: string;
}

export const PRICE_CANDIDATES: PriceCandidate[] = [
  {
    amountKrw: 2900,
    label: "2,900원",
    hypothesis:
      "가장 낮은 결제 장벽. 다만 콘텐츠 단독 상품 치고 너무 저렴하면 '별거 없겠지' 하는 신뢰 저하 리스크가 있음.",
  },
  {
    amountKrw: 4900,
    label: "4,900원",
    hypothesis:
      "국내 디지털 콘텐츠 단건 결제의 대표적인 심리적 임계선(5,000원 미만). 충동구매 허들은 낮게 유지하면서 '싸구려' 인상은 피함.",
  },
  {
    amountKrw: 7900,
    label: "7,900원",
    hypothesis:
      "체감 가치는 높아지지만 '한번 생각해볼게요' 이탈이 늘어날 가능성. 호기심 기반 충동 구매 맥락에는 다소 무거움.",
  },
];

function priceFromEnv(): PriceCandidate | null {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_PRICE_KRW;
  const amountKrw = raw ? Number(raw) : NaN;
  if (!Number.isFinite(amountKrw) || amountKrw <= 0) return null;
  return { amountKrw, label: `${amountKrw.toLocaleString("ko-KR")}원`, hypothesis: "운영자 설정값(NEXT_PUBLIC_PAYMENT_PRICE_KRW)" };
}

/** 1순위 추천: 결제 장벽은 낮으면서 저가 인상은 덜한 지점. 가격이 아직
 * 미정이라 운영자가 코드 수정 없이(Vercel 환경변수 NEXT_PUBLIC_PAYMENT_PRICE_KRW)
 * 바꿔볼 수 있게 한다 — 값을 못 읽으면 후보 중 추천값(4,900원)으로 떨어진다. */
export const RECOMMENDED_PRICE: PriceCandidate = priceFromEnv() ?? PRICE_CANDIDATES[1];

/** 결제수단 노출 목록. 아직 실제 결제 연동 전이라 문구만 준비한다 — 마찬가지로
 * 환경변수(쉼표 구분)로 운영자가 바꿀 수 있다. */
export const PAYMENT_METHODS: string[] =
  process.env.NEXT_PUBLIC_PAYMENT_METHODS?.split(",").map((s) => s.trim()).filter(Boolean) ?? ["카카오페이", "토스페이"];
```

### 파일: src/lib/real-world-personalization.ts
```ts
// MBTI + 6문항을 "사주에서 계산된 구조가 현실에서 어떻게 나타나는지"를
// 구체화하는 개인화 문단으로 쓴다. 이전 라운드는 MBTI를 triple-compare의
// 네 번째 boolean 신호("J=빠른 결정, F=감정적")로 넣었는데, 이번 요구는
// 그 방식을 명시적으로 금지한다 — 그래서 여기서는 비교/투표가 아니라
// "이 사람의 현실 모습을 설명하는 문장"으로만 쓴다.
//
// MBTI 4축의 정의는 이번에 지어낸 게 아니라 MBTI 자체의 표준 정의를 그대로
// 옮긴 것이다:
//   E/I → 에너지·외부 상호작용 선호
//   S/N → 정보·가능성을 받아들이는 방식
//   T/F → 판단할 때 우선 고려하는 기준
//   J/P → 구조화·계획 선호 vs 열린 선택·유연성
//
// 우선순위 규칙: 6문항(speed/plan/autonomy)이 실제로 답변됐으면 그 직접
// 응답이 "지금 이 사람이 어떻게 움직이는지"의 1차 근거가 된다. MBTI는
// 6문항이 직접 묻지 않는 축(E/I, S/N)을 채우고, 6문항과 겹치는 축(J/P↔
// plan/speed, F/T↔autonomy)에서는 "설명을 더하는 두 번째 시선"으로만
// 쓴다. 둘이 다르면 오류로 취급하지 않고 "상황에 따라 다르게 나타나는
// 두 얼굴"로 그대로 보여준다 — 사주 계산값도, 6문항 응답도 고치지 않는다.

import type { SajuFacts, DaeunAnalysis, TenGodGroup } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";
import type { ReportParagraph } from "@/lib/free-report-schema";
import type { PersonalityInput } from "@/lib/personality-check";
import type { MbtiType } from "@/lib/mbti-facts";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import { buildTripleCompare } from "@/lib/triple-compare";
import { daeunFlavor, deriveDaeunShift } from "@/lib/fortune-candidates";
import { dayStemImagery, dayStrengthLabel } from "@/lib/saju-labels";

// 이번 라운드: 원국+대운(daeunAnalysis)+MBTI/6문항+손금을 "지금 이 시기엔
// 이렇게 나타난다"는 하나의 문단으로 묶는다. 손금은 별도 해석을 새로
// 만들지 않고, 이미 있는 triple-compare.ts의 일치/차이/보완 판정을 그대로
// 인용한다 — "손금은 사주와 독립된 두 번째 분석"이라는 기존 원칙을
// 유지하면서, 그 판정 결과를 이 문단 안에서 시기와 엮어 보여주기만 한다.
// 새 점수/판정식은 만들지 않았다: 대운 십성 → 오행 그룹 매핑은 앱 전체가
// 이미 쓰는 비겁/식상/재성/관성/인성 분류 그대로이고, "구조화/관계" 두 축도
// 위에서 이미 계산된 structured/relational 값을 그대로 재사용한다.

/** 대운 십성이 어떤 축(구조화/관계)과 실제로 맞닿는지 + 그 축에서
 * structured·relational이 각각 true/false일 때 이 시기가 어떻게 느껴지는지.
 * 지어낸 점수가 아니라 위에서 이미 derive된 두 boolean을 문장으로만 옮긴다. */
const GROUP_SIGNAL: Record<TenGodGroup, { label: string; axis: "structured" | "relational"; whenTrue: string; whenFalse: string }> = {
  비겁: {
    label: "스스로 밀어붙이고 경쟁하는 힘",
    axis: "relational",
    whenTrue: "평소에는 주변 의견을 먼저 살피지만, 이 시기에는 스스로 밀어붙이려는 마음이 더 강해집니다.",
    whenFalse: "원래도 스스로 판단하고 움직이는 편인데, 이 시기에는 그 색이 한층 짙어집니다.",
  },
  식상: {
    label: "표현하고 새로 만들어내는 힘",
    axis: "structured",
    whenTrue: "미리 계획하고 준비해온 것을 실제로 밀고 나가면 결과로 이어지는 시기입니다.",
    whenFalse: "즉흥적으로 떠오른 생각을 바로 행동으로 옮기는 쪽이 오히려 잘 먹히는 시기입니다.",
  },
  재성: {
    label: "돈과 기회를 직접 다루는 힘",
    axis: "structured",
    whenTrue: "미리 준비해둔 만큼 이 시기의 기회를 실제로 붙잡습니다.",
    whenFalse: "예상 밖에서 오는 기회에 빠르게 올라타는 쪽이 이 시기에는 더 맞습니다.",
  },
  관성: {
    label: "책임과 규율, 조직의 힘",
    axis: "structured",
    whenTrue: "원래 구조와 계획을 선호하는 사람이라, 이 시기의 책임과 규율이 오히려 편하게 느껴집니다.",
    whenFalse: "원래 열어두고 움직이는 사람이라, 이 시기의 규율과 책임이 평소보다 답답하게 느껴질 수 있습니다.",
  },
  인성: {
    label: "배우고 도움받는 힘",
    axis: "relational",
    whenTrue: "주변 도움을 잘 받는 사람이라, 이 시기에는 그 도움이 유독 크게 작용합니다.",
    whenFalse: "스스로 판단하는 사람이라, 이 시기에 누군가의 도움을 받는 게 오히려 낯설 수 있습니다.",
  },
};

/** "지금 무엇을 해야 하는가"에 직접 답하는 행동형 문장 1개씩 — GROUP_SIGNAL과
 * 같은 그룹 분류를 쓰되, 서술이 아니라 행동을 말한다(무료 결과 nextMove용). */
const GROUP_ACTION_HINT: Record<TenGodGroup, string> = {
  비겁: "지금은 남 눈치보다 하고 싶은 것을 직접 밀어붙이는 쪽이 유리합니다. 경쟁을 피하기보다 정면으로 부딪히는 게 순서입니다.",
  식상: "머릿속에만 있던 것을 지금 실제로 꺼내 보이는 게 순서입니다. 완성도보다 일단 보여주는 쪽이 이 시기의 힘이 됩니다.",
  재성: "지금 들어오는 제안이나 기회는 미루지 말고 바로 검토해야 합니다. 망설이는 사이 다른 사람이 먼저 잡습니다.",
  관성: "지금은 확실한 자리와 역할을 만드는 데 집중해야 합니다. 승진이나 계약처럼 인정받는 자리를 먼저 챙기면 나머지는 따라옵니다.",
  인성: "지금은 혼자 다 하려 하지 말고 배우거나 도와줄 사람을 곁에 두는 게 순서입니다. 그 관계가 이 시기의 실제 자산이 됩니다.",
};

function dominantGroup(d: DaeunAnalysis): TenGodGroup | null {
  return TEN_GOD_GROUP[d.tenGods.stem] ?? TEN_GOD_GROUP[d.tenGods.branch] ?? null;
}

function relationsClause(d: DaeunAnalysis): string {
  if (d.relations.length === 0) {
    return "원국과 크게 부딪히거나 합쳐지는 자리는 없어, 비교적 무난하게 흘러가는 시기입니다.";
  }
  return `원국과는 ${d.relations.map((r) => r.detail).join(", ")}이 걸려 있어, 평소와 다르게 움직이는 시기입니다.`;
}

/** 이 시기(대운)와 손금이 같은 방향을 보여주는지, 다른 면을 보여주는지 —
 * 새로 판정하지 않고 triple-compare.ts의 기존 일치/차이/보완 결과를 그대로
 * 가져온다. "손금까지 보면" 같은 도구 라벨 없이, 이미 앞에서 짚은 이야기에
 * 자연스럽게 이어지는 한 문장으로만 얹는다. palm이 없거나 해당 축 비교가
 * 없으면 null. */
function palmAlignmentClause(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityInput["check"],
  axis: "structured" | "relational",
): string | null {
  if (!palm) return null;
  const compareItems = buildTripleCompare(facts, palm, check);
  const topic = axis === "structured" ? "결정하는 방식" : "관계에서 감정이 작용하는 정도";
  const item = compareItems.find((c) => c.topic === topic);
  return item ? item.text : null;
}

/** 대운 한 구간 = 사주 신호(대운 십성 그룹) + 원국과의 합충형파해 + 성향
 * fit + (있으면) 손금 정렬까지 한 몸으로 묶은 문단 본문. 현재/다음
 * 대운(buildRealWorldPersonalization)과 생애 10구간(buildLifetimeStory)이
 * 이 조합 로직을 그대로 공유한다 — 같은 사람·같은 시기인데 두 함수가
 * 다른 이야기를 하면 안 되므로. group이 없으면(십성 매핑 실패, 이론상
 * 없음) null. */
function composePeriodNarrative(
  d: DaeunAnalysis,
  structured: boolean,
  relational: boolean,
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityInput["check"],
): { text: string; group: TenGodGroup } | null {
  const group = dominantGroup(d);
  if (!group) return null;
  const signal = GROUP_SIGNAL[group];
  const axisValue = signal.axis === "structured" ? structured : relational;
  const parts = [`${signal.label}이 강해지는 시기입니다.`, relationsClause(d), axisValue ? signal.whenTrue : signal.whenFalse];
  const palmClause = palmAlignmentClause(facts, palm, check, signal.axis);
  if (palmClause) parts.push(palmClause);
  return { text: parts.join(" "), group };
}

function ei(mbti: MbtiType): string {
  return mbti[0] === "E"
    ? "사람들과 부딪히고 이야기하면서 에너지를 얻는 사람"
    : "혼자 정리할 시간이 있어야 에너지가 차는 사람";
}

function sn(mbti: MbtiType): string {
  return mbti[1] === "S"
    ? "눈앞의 사실과 경험을 먼저 보고 판단하는 사람"
    : "가능성과 패턴을 먼저 읽고 판단하는 사람";
}

/** plan/speed 6문항 응답 → "구조화 선호" 서술. 6문항이 없으면 null(MBTI로 대체). */
function structureFromCheck(check: PersonalityInput["check"]): string | null {
  if (!check) return null;
  const planned = check.levels.plan === "왼쪽";
  const fast = check.levels.speed === "왼쪽";
  if (planned && fast) return "미리 계획을 세우고 빠르게 결정을 닫는 사람";
  if (planned && !fast) return "계획은 세워두되 결정은 충분히 생각하고 내리는 사람";
  if (!planned && fast) return "즉흥적으로 움직이면서도 결정만큼은 빠르게 내리는 사람";
  return "즉흥적으로 움직이면서 결정도 천천히 여지를 두는 사람";
}

function structureFromMbti(mbti: MbtiType): string {
  return mbti[3] === "J" ? "미리 구조를 짜고 계획대로 움직이는 사람" : "열어두고 상황에 맞춰 움직이는 사람";
}

/** autonomy 6문항 응답 → "관계 영향" 서술. 6문항이 없으면 null(MBTI로 대체). */
function relationFromCheck(check: PersonalityInput["check"]): string | null {
  if (!check) return null;
  return check.levels.autonomy === "오른쪽"
    ? "결정을 내릴 때 주변 의견에 실제로 영향받는 사람"
    : "결정을 내릴 때 주변 의견보다 스스로 판단을 우선하는 사람";
}

function relationFromMbti(mbti: MbtiType): string {
  return mbti[2] === "F" ? "관계와 그 결정이 미칠 영향을 먼저 헤아리는 사람" : "원칙과 논리를 먼저 따지는 사람";
}

/** 사주 영역(재물/일/관계)마다 이 성향이 다르게 나타나는 실제 장면.
 * structured(계획적)·relational(관계영향) 두 축의 조합 4가지로 나눈다 —
 * MBTI/6문항 자체가 아니라 그 결과로 나온 두 축을 보고 장면을 고른다. */
function realLifeScene(structured: boolean, relational: boolean, domain: "money" | "work" | "relationship"): string {
  const scenes: Record<"money" | "work" | "relationship", [string, string, string, string]> = {
    money: [
      // structured & relational
      "돈 쓰는 계획을 미리 세우고, 그 계획도 가족이나 파트너와 맞춰서 조정합니다.",
      // structured & !relational
      "예산을 스스로 정해두고, 누가 뭐라 해도 그 기준대로 밀고 나갑니다.",
      // !structured & relational
      "정해둔 예산보다 그때그때 주변 상황과 사람에 맞춰 지출이 오갑니다.",
      // !structured & !relational
      "예산을 미리 짜두기보다 필요할 때 스스로 판단해서 씁니다.",
    ],
    work: [
      "일정을 촘촘히 짜두고 팀과 계속 맞춰가며 진행하는 방식이 맞습니다.",
      "혼자 계획을 세우고 그 계획대로 끝까지 밀어붙이는 방식이 맞습니다.",
      "정해진 절차보다 그때그때 분위기에 맞춰 유연하게 움직이는 방식이 맞습니다.",
      "정해진 틀 없이 혼자 판단해서 즉흥적으로 처리하는 방식이 맞습니다.",
    ],
    relationship: [
      "관계에서도 미리 약속을 정해두고, 그 약속을 상대와 함께 지켜나갑니다.",
      "관계에서 자기 기준이 뚜렷해, 상대가 흔들어도 잘 흔들리지 않습니다.",
      "정해진 게 없어도 상대 상황에 맞춰 유연하게 관계를 맞춰갑니다.",
      "관계에서도 자기 리듬대로 움직이고, 상대에게 크게 맞추지 않습니다.",
    ],
  };
  const idx = structured ? (relational ? 0 : 1) : relational ? 2 : 3;
  return scenes[domain][idx];
}

/** 강점이 약점으로 뒤집히는 지점 — structured/relational 조합별로 다른
 * 문장을 준다(모든 조합에 "과유불급"이 있다는 걸 보여주기 위함). */
function strengthFlip(structured: boolean, relational: boolean): string {
  if (structured && relational) return "다만 계획도 관계도 다 챙기려다 정작 자기 결정을 뒤로 미루는 순간을 조심해야 합니다.";
  if (structured && !relational) return "다만 계획이 틀어지는 상황에서 유독 완고해져, 주변 도움을 놓치기 쉽습니다.";
  if (!structured && relational) return "다만 상황과 사람에 맞추다 보면 정작 자기 기준이 흐려질 때가 있습니다.";
  return "다만 혼자 판단하고 즉흥적으로 움직이다 보면, 중요한 순간에 필요한 정보를 놓치기 쉽습니다.";
}

/** structured(계획적)/relational(관계영향) 두 축을 한 번만 derive해서
 * buildRealWorldPersonalization과 buildLifetimeStory가 똑같이 재사용한다 —
 * 같은 사람인데 두 곳에서 다르게 계산되면 안 되므로 로직을 한 곳에 둔다. */
function derivePersonalityAxes(
  facts: SajuFacts,
  personality: PersonalityInput,
): { structured: boolean; relational: boolean } {
  const { mbti, check } = personality;
  const structuredText = structureFromCheck(check) ?? (mbti ? structureFromMbti(mbti) : null);
  const relationText = relationFromCheck(check) ?? (mbti ? relationFromMbti(mbti) : null);

  const structured = structuredText
    ? (structureFromCheck(check) !== null ? check!.levels.plan === "왼쪽" : mbti![3] === "J")
    : facts.dayStrength === "strong";
  const relational = relationText
    ? (relationFromCheck(check) !== null ? check!.levels.autonomy === "오른쪽" : mbti![2] === "F")
    : facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount;

  return { structured, relational };
}

export function buildRealWorldPersonalization(
  facts: SajuFacts,
  personality: PersonalityInput,
): ReportParagraph | null {
  const { mbti, check } = personality;
  if (!mbti && !check) return null;

  const sentences: string[] = [];
  const evidenceParts: string[] = [];

  if (mbti) {
    sentences.push(`${ei(mbti)}이고, ${sn(mbti)}입니다.`);
    evidenceParts.push(`MBTI ${mbti}`);
  }

  const structuredText = structureFromCheck(check) ?? (mbti ? structureFromMbti(mbti) : null);
  const relationText = relationFromCheck(check) ?? (mbti ? relationFromMbti(mbti) : null);

  if (structuredText) {
    const fromCheck = structureFromCheck(check) !== null;
    sentences.push(`${structuredText}입니다.`);
    if (fromCheck && mbti) {
      const mbtiStructured = mbti[3] === "J";
      const checkStructured = check!.levels.plan === "왼쪽";
      if (mbtiStructured !== checkStructured) {
        sentences.push("다만 익숙한 일과 낯선 일에서는 태도가 갈립니다 — 상황에 따라 다른 얼굴이 나올 수 있습니다.");
      }
    }
    evidenceParts.push(fromCheck ? "6문항 speed/plan" : `MBTI ${mbti![3]}`);
  }

  if (relationText) {
    const fromCheck = relationFromCheck(check) !== null;
    sentences.push(`${relationText}입니다.`);
    evidenceParts.push(fromCheck ? "6문항 autonomy" : `MBTI ${mbti![2]}`);
  }

  // 두 축(구조화/관계) 조합으로 재물·일·관계 장면을 각각 다르게 만든다 —
  // "사주 본문"에 실제로 personalization이 반영되는 지점.
  const { structured, relational } = derivePersonalityAxes(facts, personality);

  sentences.push(realLifeScene(structured, relational, "money"));
  sentences.push(realLifeScene(structured, relational, "work"));
  sentences.push(strengthFlip(structured, relational));

  // 대운(지금/다음 시기) 이야기는 nextMove/timingShift 두 필드가 전담한다 —
  // 여기서 같은 사실을 또 말하면 "세 군데서 반복 설명"이 되므로, 이 문단은
  // MBTI/6문항 자체의 특성·장면에만 집중한다.

  return {
    text: sentences.join(" "),
    evidence: evidenceParts.length > 0 ? evidenceParts.join(", ") : "성향체크 없음",
  };
}

export interface LifetimePeriodStory {
  age: number;
  ageRange: string;
  ganzhi: string;
  tenGodGroup: TenGodGroup;
  text: string;
  isCurrent: boolean;
  isNext: boolean;
}

/** 대운 10구간 전체를 MBTI+6문항+손금과 결합한 생애 전체 통합 서사.
 * 무료 결과의 nextMove/timingShift는 현재+다음 대운만 행동/시기 관점으로
 * 짧게 다루고, 이건 그 뒤에 이어지는 심층 해석용 원자료 — composePeriodNarrative/
 * derivePersonalityAxes를 그대로 재사용해 같은 시기를 다르게 설명하는 일이
 * 없게 한다. personality가 전혀 없으면 개인화가 안 되므로 null(사주+대운만
 * 으로는 "통합 서사"라고 부르지 않는다). */
export function buildLifetimeStory(
  facts: SajuFacts,
  personality: PersonalityInput,
  palm: OnnxPalmLines | null = null,
): LifetimePeriodStory[] | null {
  const { mbti, check } = personality;
  if (!mbti && !check) return null;
  if (!facts.daeunAnalysis || facts.daeunAnalysis.length === 0) return null;

  const { structured, relational } = derivePersonalityAxes(facts, personality);

  const stories: LifetimePeriodStory[] = [];
  for (const d of facts.daeunAnalysis) {
    const narrative = composePeriodNarrative(d, structured, relational, facts, palm, check);
    if (!narrative) continue;
    stories.push({
      age: d.age,
      ageRange: `${d.age}세~${d.age + 9}세`,
      ganzhi: d.ganzhi,
      tenGodGroup: narrative.group,
      text: narrative.text,
      isCurrent: d.isCurrent,
      isNext: d.isNext,
    });
  }
  return stories;
}

/** "지금 무엇을 해야 하는가"에 답하는 행동형 문단. facts.currentDaeun(ssaju,
 * 태어난 시간이 있으면 항상 존재)만으로 동작하고, oh-my-saju의
 * daeunAnalysis가 없어도(호출 실패 등) 폴백 없이 정상 작동한다 — "지금 뭘
 * 해야 하는가"는 대운 십성 하나만으로도 답할 수 있는 사실이라, 굳이
 * daeunAnalysis에 의존하게 만들지 않았다. personality가 있으면 구조화 축을
 * 한 문장 더 얹는다. */
export function buildNextMove(facts: SajuFacts, personality: PersonalityInput | null = null): ReportParagraph {
  const { currentDaeun } = facts;
  if (!currentDaeun) {
    return {
      text: "출생시간이 없어 지금 대운까지는 짚어드리기 어렵습니다. 다만 이 사주는 성과가 눈에 보이는 쪽으로 움직이는 것이 유리합니다.",
      evidence: "대운 정보 없음(출생시간 미상)",
    };
  }

  const group = TEN_GOD_GROUP[currentDaeun.stemTenGod] ?? TEN_GOD_GROUP[currentDaeun.branchTenGod] ?? null;
  const sentences = [`지금 만 ${facts.currentAge}세, ${currentDaeun.ageRange}세부터 이어지는 이 대운은 ${daeunFlavor(currentDaeun)} 시기입니다.`];

  if (group) {
    sentences.push(GROUP_ACTION_HINT[group]);
    if (personality && (personality.mbti || personality.check)) {
      const { structured } = derivePersonalityAxes(facts, personality);
      sentences.push(
        structured
          ? "평소 계획을 세워두는 사람이니, 이번에는 그 계획을 실행에 옮길 날짜까지 정해두는 게 순서입니다."
          : "평소 즉흥적으로 움직이는 사람이니, 이번에는 마음먹은 그 순간 첫걸음부터 떼는 게 순서입니다.",
      );
    }
  }

  return {
    text: sentences.join(" "),
    evidence: `현재 대운 ${currentDaeun.ganzhi}(${currentDaeun.stemTenGod})`,
  };
}

/** "앞으로 언제 큰 변화가 오는가"에 답하는 문단. facts.nextDaeun(ssaju)만
 * 인용하고, 그 시기가 정말 결이 바뀌는 전환점인지는 fortune-candidates.ts의
 * deriveDaeunShift를 그대로 재사용해 판정한다(새 기준 없음). */
export function buildTimingShift(facts: SajuFacts): ReportParagraph {
  const { nextDaeun } = facts;
  if (!nextDaeun) {
    return {
      text: "다음 대운은 아직 계산되지 않았습니다. 지금 흐름이 당분간 그대로 이어진다고 보시면 됩니다.",
      evidence: "다음 대운 정보 없음",
    };
  }

  const shifts = deriveDaeunShift(facts);
  const text = shifts
    ? `${nextDaeun.ageRange}세부터는 ${daeunFlavor(nextDaeun)} 쪽으로 넘어가면서 결이 한 번 크게 바뀝니다. 지금 익숙한 방식 하나가 그 무렵부터는 슬슬 맞지 않기 시작할 수 있습니다.`
    : `${nextDaeun.ageRange}세로 넘어가도 ${daeunFlavor(nextDaeun)} 흐름은 계속 이어집니다. 큰 전환보다는 지금 방식을 더 깊게 파고드는 것이 맞는 시기입니다.`;

  return { text, evidence: `다음 대운 ${nextDaeun.ganzhi}(${nextDaeun.stemTenGod})` };
}

/** 손금 완료 직후에 보여줄 종합판정 — 지금까지 모인 원국+대운+성향+손금을
 * 하나의 결정적인 문단으로 묶는다. 절대 null을 반환하지 않는다(무료
 * 경험의 클라이맥스라 항상 떠야 한다). personality/palm/daeunAnalysis 중
 * 없는 게 있으면 해당 문장만 조용히 생략한다. 마지막 문장은 이 다음에
 * 나올 "지금 가장 궁금할 흐름" 추천으로 자연스럽게 이어지는 다리 역할을
 * 한다 — 무엇을 더 풀어줄지 예고하되, 광고 카피처럼 부풀리지 않는다. */
export function buildComprehensiveVerdict(
  facts: SajuFacts,
  personality: PersonalityInput | null,
  palm: OnnxPalmLines | null = null,
): ReportParagraph {
  const sentences: string[] = [];
  const evidenceParts: string[] = [`일간 ${facts.dayStemKo}(${facts.dayElement})`, `격국 ${facts.geukguk}`];

  const imagery = dayStemImagery(facts.dayStemKo);
  sentences.push(`이 사주는 ${imagery.image}처럼 ${imagery.core} 사람의 사주입니다. ${dayStrengthLabel(facts.dayStrength)}이고, ${facts.geukguk}을 타고났습니다.`);

  sentences.push(
    facts.wealthOpportunityDaeunCount > 0
      ? "평생 대운을 보면 재물이 크게 움직이는 시기가 여러 번 옵니다. 돈과 인연이 없는 사주는 아닙니다."
      : "재물이 저절로 붙는 사주는 아니지만, 그만큼 본업과 전문성을 무기로 버는 힘이 큽니다.",
  );

  const currentPeriod = facts.daeunAnalysis?.find((d) => d.isCurrent) ?? null;
  let group: TenGodGroup | null = null;
  if (currentPeriod) {
    group = dominantGroup(currentPeriod);
    if (group) {
      sentences.push(`지금 만 ${facts.currentAge}세, ${currentPeriod.age}세부터 이어지는 이 대운에서는 ${GROUP_SIGNAL[group].label}이 강해집니다. ${relationsClause(currentPeriod)}`);
      evidenceParts.push(`현재 대운 ${currentPeriod.ganzhi}(${currentPeriod.tenGods.stem})`);
    }
  } else if (facts.currentDaeun) {
    sentences.push(`지금 만 ${facts.currentAge}세, ${facts.currentDaeun.ageRange}세부터 이어지는 이 대운은 ${daeunFlavor(facts.currentDaeun)} 시기입니다.`);
  }

  if (personality && (personality.mbti || personality.check) && group) {
    const { structured, relational } = derivePersonalityAxes(facts, personality);
    const axisValue = GROUP_SIGNAL[group].axis === "structured" ? structured : relational;
    sentences.push(axisValue ? GROUP_SIGNAL[group].whenTrue : GROUP_SIGNAL[group].whenFalse);
  }

  if (palm && group) {
    const palmClause = palmAlignmentClause(facts, palm, personality?.check ?? null, GROUP_SIGNAL[group].axis);
    if (palmClause) sentences.push(palmClause);
  }

  sentences.push("지금 이 사주에서 가장 먼저 봐야 할 부분은 정해졌습니다. 이어서 그 흐름부터 구체적으로 짚어드리겠습니다.");

  return {
    text: sentences.join(" "),
    evidence: evidenceParts.join(", "),
  };
}
```

### 파일: src/lib/report-contents.ts
```ts
// 결제로 받는 첫 실행 리포트의 구성 항목 — analysis-result-card.tsx(결제 전
// 미리보기)와 payment-screen.tsx(PaywallOffer의 includedItems)가 같은
// 목록을 공유한다. 두 화면에서 문구가 어긋나지 않도록 한 곳에만 둔다.
// analysis-result-copy.ts와 같은 패턴으로 순수 데이터만 담아 운영자가
// 통째로 교체할 수 있게 한다.

export const REPORT_CONTENTS: string[] = ["병목 진단 1개와 이유", "지금 안 해도 되는 것", "30일 실행계획", "90일 돈관리 시스템"];
```

### 파일: src/lib/saju.ts
```ts
import { calculateSaju, calculateSajuSimple } from "@fullstackfamily/manseryeok";
import { getMoneyTendency, type MoneyTendency } from "./money-tendency";
import type { Interpretation } from "./interpretation-schema";
import type { FreeSajuReport } from "./free-report-schema";
import type { MbtiType } from "./mbti-facts";
import type { DaeunAnalysis } from "./saju-facts";
import type { LifetimePeriodStory } from "./real-world-personalization";
import type { MyeongsikView } from "./myeongsik-view";
import type { WealthTypeResult } from "./wealth-type";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  /** 출생시간을 모르면 null */
  hour: number | null;
  minute: number | null;
  gender: "남" | "여";
}

/** 무료 사주 단계에서 함께 받은 자기보고 성향정보(6문항 + MBTI). 손금
 * 페이지로 넘어갈 때도 다시 써서 "사주+손금+성향" 통합 비교를 만든다.
 * MBTI는 triple-compare.ts에서 결정 방식(J/P)·관계-감정(F/T) 축의 네 번째
 * 신호로만 쓰인다 — 사주 계산값을 바꾸지 않는다. */
export interface PersonalityInputEcho {
  personalityAnswers: Record<string, number> | null;
  mbti: MbtiType | null;
}

export interface SajuDiagnosis {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string | null;
  hasTimeInput: boolean;
  /** 얕은 일간 10종 매핑 결과. 항상 계산해 fallback/게이지 시각화 근거로 유지한다. */
  tendency: MoneyTendency;
}

export interface DeepResultPayload {
  source: "llm" | "mock";
  interpretation: Interpretation;
  /** 무료 화면에 바로 노출할 근거 2~3개 (evidence 전체가 아님) */
  evidencePreview: string[];
}

export interface FreeReportPayload {
  source: "llm" | "mock";
  report: FreeSajuReport;
}

export interface FullSajuDiagnosis extends SajuDiagnosis {
  /** "deep" = 딥 해석 성공(LLM 또는 검증 통과한 mock), "fallback" = 딥 파이프라인 자체가 실패해 얕은 결과만 있음 */
  resultSource: "deep" | "fallback";
  deep: DeepResultPayload | null;
  /** 무료 사주 V2(12섹션). 딥 파이프라인이 실패해도 이건 별도로 계산을 시도한다. */
  freeReport: FreeReportPayload | null;
  /** 손금 교차 분석 페이지로 넘어갈 때 다시 쓰기 위해 입력값을 그대로 echo. */
  birthInput: BirthInput;
  /** 성향정보 입력을 손금 페이지까지 이어가기 위한 echo. 입력 안 했으면 둘 다 null. */
  personalityInput: PersonalityInputEcho;
  /** oh-my-saju timing 기반 대운 8~10구간 + 원국과의 합충형파해. 호출 실패/시간 미상이면 null. */
  daeunAnalysis: DaeunAnalysis[] | null;
  /** 대운 10구간 전체 x MBTI/6문항 x (있으면) 손금 통합 서사. 무료 화면은
   * 현재/다음만 보여주고, 이건 심층 해석용 원자료 — 성향 입력이 없으면 null. */
  lifetimeStory: LifetimePeriodStory[] | null;
  /** 명식(원국 8자·오행·격국·신강신약·재성관성 궁위·대운) 화면 표시용 뷰.
   * SajuFacts 계산 자체가 실패하는 드문 경우에만 null. */
  myeongsik: MyeongsikView | null;
  /** 버는 힘×지키는 힘 재물 유형 판정. myeongsik과 같은 이유로만 null. */
  wealthType: WealthTypeResult | null;
}

export function diagnoseSaju(input: BirthInput): SajuDiagnosis {
  const { year, month, day, hour, minute } = input;

  const result =
    hour === null
      ? calculateSajuSimple(year, month, day)
      : calculateSaju(year, month, day, hour, minute ?? 0);

  return {
    yearPillar: `${result.yearPillar}(${result.yearPillarHanja})`,
    monthPillar: `${result.monthPillar}(${result.monthPillarHanja})`,
    dayPillar: `${result.dayPillar}(${result.dayPillarHanja})`,
    hourPillar:
      result.hourPillar && hour !== null
        ? `${result.hourPillar}(${result.hourPillarHanja})`
        : null,
    hasTimeInput: hour !== null,
    tendency: getMoneyTendency(result.dayPillarHanja),
  };
}
```

### 파일: src/lib/saju-facts.ts
```ts
// 계산 전용 레이어. ssaju(MIT, 십성/지장간/대운/신살/격국/용신 포함)로
// 원국을 계산해, "돈/재물" 해석에 필요한 필드만 추려 구조화한다.
// 이 파일은 절대 문장을 지어내지 않는다 — 오직 라이브러리가 계산한 값만 옮긴다.
// LLM은 이 SajuFacts만 보고 해석하며, 여기 없는 사실을 추측해서는 안 된다.

import { calculateSaju, type SajuResult, type Gender } from "ssaju";

export interface SajuFactsInput {
  year: number;
  month: number;
  day: number;
  /** 출생시간을 모르면 null. null이면 시주 관련 필드는 채워지지 않는다. */
  hour: number | null;
  minute: number | null;
  gender: "남" | "여";
}

export interface PillarFact {
  pillar: "year" | "month" | "day" | "hour";
  ganzhi: string;
  /** 아래 4개는 ssaju가 이미 계산해서 주는 값을 그대로 노출한다(새 계산 아님) —
   * 명식 표(원국 8글자)를 한자+한글 병기로 보여줄 때 쓴다. */
  stemHanja: string;
  branchHanja: string;
  stemKo: string;
  branchKo: string;
  stemTenGod: string;
  branchTenGod: string;
  hiddenStems: { 여기: string | null; 중기: string | null; 정기: string | null };
}

export interface DaeunFact {
  ageRange: string;
  ganzhi: string;
  stemTenGod: string;
  branchTenGod: string;
  isCurrent: boolean;
}

export interface PillarStageFact {
  pillar: "year" | "month" | "day" | "hour";
  /** 봉법 12운성(지지 기준) */
  bong: string;
  /** 거법 12운성(일간 기준) */
  geo: string;
  twelveSal: string;
  /** 천을귀인 등 개별 특살. 없으면 빈 배열 */
  specialSals: string[];
}

export interface SajuFacts {
  hasTimeInput: boolean;
  dayStem: string;
  dayStemKo: string;
  dayElement: string;
  dayStrength: "strong" | "weak" | "neutral";
  dayStrengthScore: number;
  /** dayStrength(3단계)가 파생되어 나온 세분화된 등급. oh-my-saju 판정이
   * 성공하면 그 원본 등급("태왕"|"신강"|"약한 신강"|"중화"|"신약"|"태약"|
   * "극약")을 그대로 노출한다(새 판정 아님) — enrichSajuFacts 성공 전에는
   * ssaju가 이 세분화 등급을 안 주므로 dayStrengthShort(dayStrength)와
   * 같은 3단계 값으로 시작한다. */
  dayStrengthGrade: string;
  geukguk: string;
  yongsin: string[];
  fiveElements: Record<string, number>;
  dominantElement: string;
  /** 재성(편재+정재) 개수 — "재물을 남에게서 취하는 힘"의 원국 근거 */
  wealthStarCount: number;
  wealthStarTypes: string[];
  /** 비겁(비견+겁재) 개수 — "직접 벌어들이는 힘/경쟁력"의 근거 */
  peerStarCount: number;
  /** 식상(식신+상관) 개수 — "돈을 만들어내는 활동력"의 근거 */
  outputStarCount: number;
  /** 관성(편관+정관) 개수 — "조직/규율/책임"과의 관계 근거 */
  officerStarCount: number;
  /** 인성(편인+정인) 개수 — "정보/신중함/도움받는 힘"의 근거 */
  resourceStarCount: number;
  /** 재성이 실제로 앉아 있는 자리(궁위) — 어느 자리인지에 따라 해석 영역이 달라진다 */
  wealthStarPillars: PillarFact["pillar"][];
  /** 식상이 앉아 있는 자리(궁위) */
  outputStarPillars: PillarFact["pillar"][];
  /** 관성이 앉아 있는 자리(궁위) — "조직에서 강한 부분" 해석에 쓴다 */
  officerStarPillars: PillarFact["pillar"][];
  /** 오행 중 원국에 아예 없는(0개) 것들 — "없는 오행"은 통변에서 자주 쓰는 별도 근거 */
  missingElements: string[];
  /** 대운 전체 중 재성(편재/정재)이 천간이나 지지에 나타나는 회차 수.
   * "정확한 시기"가 아니라 "인생 전체에 이런 흐름이 몇 번 있다"는 구조적 사실로만 쓴다 */
  wealthOpportunityDaeunCount: number;
  /** 12운성 중 건록/제왕(정점)이 놓인 자리 — "기회를 잡는 방식"의 근거 */
  peakStagePillars: PillarFact["pillar"][];
  pillars: PillarFact[];
  keyRelations: string[];
  /** 귀문(鬼門)만 따로 — "궁위론" 해석(어느 자리끼리 귀문인지)에 쓴다 */
  gwimunRelations: string[];
  /** 핀(연/월/일/시)별 12운성·12살·특살. hasTimeInput=false면 hour 제외 */
  pillarStages: PillarStageFact[];
  gilsin: string[];
  hyungsin: string[];
  gongmang: string[];
  currentDaeun: DaeunFact | null;
  nextDaeun: DaeunFact | null;
  /** 앞으로의 대운 전체 흐름(현재 포함). "정밀 시기"가 아니라 "평생 흐름 존재"의 근거로만 쓴다 */
  daeunList: DaeunFact[];
  /** LLM 프롬프트에 그대로 삽입할 수 있는 사람이 읽기 좋은 원국 요약 */
  compactText: string;
  /** oh-my-saju timing으로 받은 대운 8~10구간 전체 + 원국과의 합충형파해.
   * ssaju 자체 계산이 아니라 oh-my-saju 호출 결과라 null일 수 있다(호출 실패/시간 미상). */
  daeunAnalysis: DaeunAnalysis[] | null;
  /** 생년월일 기준 만 나이(ssaju가 이미 계산해서 주는 값 그대로 REUSE — 새로
   * 계산하지 않는다). 대운 시작 나이(daeunAnalysis[].age, currentDaeun.ageRange)와
   * 절대 혼동하면 안 된다 — 이 값이 "사용자의 실제 지금 나이"다. */
  currentAge: number;
  /** geukguk/dayStrength/dayStrengthScore가 oh-my-saju(자평진전+적천수) 판정에서
   * 왔는지, ssaju 원본 폴백인지. enrichSajuFacts가 성공하면 이 3개 필드가
   * 항상 같이 바뀌므로(atomic) 플래그 1개로 셋 다 게이트한다. UI는 이 값이
   * "ssaju_fallback"이면 판정 방식 근거 문장을 표시하지 않는다 — 없는 근거를
   * 말하면 안 된다. computeSajuFacts는 oh-my-saju를 호출하지 않으므로 항상
   * "ssaju_fallback"으로 시작하고, enrichSajuFacts 성공 시에만 바뀐다. */
  geukgukSource: "ziping_ditianshui" | "ssaju_fallback";
}

export interface DaeunRelation {
  withPillar: PillarFact["pillar"];
  type: "충" | "육합" | "반합" | "형" | "파" | "해" | "자형" | "천간합";
  detail: string;
}

export interface DaeunAnalysis {
  age: number;
  /** 한자 간지 2글자, 예: "甲申" */
  ganzhi: string;
  stemHanja: string;
  branchHanja: string;
  tenGods: { stem: string; branch: string };
  /** 근사 시작일(3일=1년 환산), 예: "2017-08-10" */
  approximateStartDate: string | null;
  /** 이 대운 간지가 원국 4기둥과 맺는 합/충/형/파/해 (없으면 빈 배열) */
  relations: DaeunRelation[];
  isCurrent: boolean;
  isNext: boolean;
}

function toPillarFact(result: SajuResult, key: PillarFact["pillar"]): PillarFact {
  const detail = result.pillarDetails[key];
  const tenGod = result.tenGods[key];
  return {
    pillar: key,
    ganzhi: `${detail.stem}${detail.branch}`,
    stemHanja: detail.stem,
    branchHanja: detail.branch,
    stemKo: detail.stemKo,
    branchKo: detail.branchKo,
    stemTenGod: tenGod.stem,
    branchTenGod: tenGod.branch,
    hiddenStems: detail.hiddenStems,
  };
}

function toDaeunFact(item: NonNullable<SajuResult["daeun"]["current"]>, isCurrent: boolean): DaeunFact {
  return {
    ageRange: item.age_range,
    ganzhi: item.ganzhi,
    stemTenGod: item.stemTenGod,
    branchTenGod: item.branchTenGod,
    isCurrent,
  };
}

function toPillarStageFact(result: SajuResult, key: PillarStageFact["pillar"]): PillarStageFact {
  return {
    pillar: key,
    bong: result.stages12.bong[key],
    geo: result.stages12.geo[key],
    twelveSal: result.sals[key].twelveSal,
    specialSals: result.sals[key].specialSals,
  };
}

const WEALTH_STARS = new Set(["편재", "정재"]);
const PEER_STARS = new Set(["비견", "겁재"]);
const OUTPUT_STARS = new Set(["식신", "상관"]);
const OFFICER_STARS = new Set(["편관", "정관"]);
const RESOURCE_STARS = new Set(["편인", "정인"]);

/** 십성 10종 → 5그룹(비겁/식상/재성/관성/인성) 분류. real-world-personalization.ts와
 * triple-compare.ts가 대운/원국 신호를 같은 기준으로 묶을 때 공유해서 쓴다
 * (파일마다 다시 정의하면 분류 기준이 갈라질 수 있어 여기 한 곳에만 둔다). */
export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";
export const TEN_GOD_GROUP: Record<string, TenGodGroup> = {
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};
/** 각 그룹이 "구조화(계획적)" 축과 "관계(타인 영향)" 축 중 어디에 더
 * 가까운지 — real-world-personalization.ts의 GROUP_SIGNAL과 짝을 이룬다. */
export const TEN_GOD_GROUP_AXIS: Record<TenGodGroup, "structured" | "relational"> = {
  비겁: "relational",
  식상: "structured",
  재성: "structured",
  관성: "structured",
  인성: "relational",
};

function pillarsWithTenGod(pillars: PillarFact[], stars: Set<string>): PillarFact["pillar"][] {
  return pillars.filter((p) => stars.has(p.stemTenGod) || stars.has(p.branchTenGod)).map((p) => p.pillar);
}

const PEAK_STAGES = new Set(["건록", "제왕"]);

export function computeSajuFacts(input: SajuFactsInput): SajuFacts {
  const genderKo: Gender = input.gender;

  const result = calculateSaju({
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? 12,
    minute: input.minute ?? 0,
    gender: genderKo,
  });

  const pillars: PillarFact[] = (["year", "month", "day", "hour"] as const)
    .filter((key) => key !== "hour" || input.hour !== null)
    .map((key) => toPillarFact(result, key));

  const allTenGods = pillars.flatMap((p) => [p.stemTenGod, p.branchTenGod]);
  const wealthStarTypes = allTenGods.filter((t) => WEALTH_STARS.has(t));
  const peerStarCount = allTenGods.filter((t) => PEER_STARS.has(t)).length;
  const outputStarCount = allTenGods.filter((t) => OUTPUT_STARS.has(t)).length;
  const officerStarCount = allTenGods.filter((t) => OFFICER_STARS.has(t)).length;
  const resourceStarCount = allTenGods.filter((t) => RESOURCE_STARS.has(t)).length;
  const wealthStarPillars = pillarsWithTenGod(pillars, WEALTH_STARS);
  const outputStarPillars = pillarsWithTenGod(pillars, OUTPUT_STARS);
  const officerStarPillars = pillarsWithTenGod(pillars, OFFICER_STARS);

  // ssaju는 hour를 항상 필수로 받아(시간 미상이면 12시로 우리가 채워 호출)
  // 시주를 포함한 전체 4기둥 기준으로 fiveElements/관계를 계산한다 — 즉
  // "시간 미상"이어도 가짜 시주(예: 12시=午)가 오행 집계와 합충형파해 판정에
  // 그대로 섞여 들어온다. pillars 배열은 이미 hasTimeInput 기준으로 hour를
  // 뺐으니, 오행은 그 pillars만으로 직접 재계산하고(result.fiveElements를
  // 그대로 쓰지 않는다), 관계는 "hour" 키에 걸린 값과 동일한 문자열을
  // 전부 제외해 가짜 시주가 만든 합/충/귀문 등이 새지 않게 한다.
  const elementByPillar: Record<PillarFact["pillar"], { stem: string; branch: string }> = {
    year: result.pillarDetails.year.element,
    month: result.pillarDetails.month.element,
    day: result.pillarDetails.day.element,
    hour: result.pillarDetails.hour.element,
  };
  const fiveElements: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of pillars) {
    const el = elementByPillar[p.pillar];
    fiveElements[el.stem] = (fiveElements[el.stem] ?? 0) + 1;
    fiveElements[el.branch] = (fiveElements[el.branch] ?? 0) + 1;
  }

  const dominantElement = Object.entries(fiveElements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const missingElements = Object.entries(fiveElements)
    .filter(([, count]) => count === 0)
    .map(([el]) => el);

  // ssaju는 PillarKey(year/month/day/hour) 4개짜리 Record에 관계를 저장하는데,
  // 지지관계 하나는 두 기둥 사이의 관계라 관여하는 두 키 모두에 같은 문자열을
  // 넣는다 — 즉 Object.values()로 펼치면 관계 하나가 항상 2번 찍힌다
  // (humanize-writing 스킬로 실제 생성 문장을 검토하다 "辰巳 귀문, 辰巳 귀문"처럼
  // 같은 문구가 그대로 중복 출력되는 걸 발견하고 역추적함). new Set()으로 dedupe.
  // ssaju가 관계 하나를 참여 기둥별로 각자 다른 문자열(단수/복수 병기 등)로
  // 저장하는 경우가 있어(예: hour="午丑 해, 午丑 해" vs month="午丑 해"),
  // 값 비교만으로는 가짜 시주가 낀 관계를 다 걸러내지 못한다. 대신 가짜
  // 시주의 지지 한자(예: 午) 자체가 문자열 어디에도 등장하지 않는 것만
  // 남긴다 — 이견 없는 고정 조합표라 지지 한자가 곧 그 관계의 식별자다.
  const fakeHourBranchHanja = input.hour === null ? result.pillarDetails.hour.branch : null;
  function relationValues(record: Record<string, string | null>): string[] {
    const entries = Object.entries(record).filter((e): e is [string, string] => Boolean(e[1]));
    if (fakeHourBranchHanja === null) return entries.map(([, v]) => v);
    return entries.filter(([k, v]) => k !== "hour" && !v.includes(fakeHourBranchHanja)).map(([, v]) => v);
  }

  const stemRelationDescs =
    input.hour !== null
      ? result.stemRelations.map((r) => r.desc)
      : result.stemRelations.filter((r) => !r.pillars.includes("hour")).map((r) => r.desc);

  const keyRelations: string[] = Array.from(
    new Set(
      [
        ...stemRelationDescs,
        ...relationValues(result.branchRelations.방합),
        ...relationValues(result.branchRelations.삼합),
        ...relationValues(result.branchRelations.반합),
        ...relationValues(result.branchRelations.육합),
        ...relationValues(result.branchRelations.충),
        ...relationValues(result.branchRelations.형),
        ...relationValues(result.branchRelations.파),
        ...relationValues(result.branchRelations.해),
        ...relationValues(result.branchRelations.원진),
      ].filter((v): v is string => Boolean(v)),
    ),
  );

  const gwimunRelations = Array.from(new Set(relationValues(result.branchRelations.귀문)));

  const pillarStages: PillarStageFact[] = (["year", "month", "day", "hour"] as const)
    .filter((key) => key !== "hour" || input.hour !== null)
    .map((key) => toPillarStageFact(result, key));

  const peakStagePillars = pillarStages.filter((s) => PEAK_STAGES.has(s.geo)).map((s) => s.pillar);

  const rawDaeunList = result.daeun.list;
  const currentIdx = rawDaeunList.findIndex((d) => d === result.daeun.current);
  const currentDaeun = result.daeun.current ? toDaeunFact(result.daeun.current, true) : null;
  const nextDaeun =
    currentIdx >= 0 && rawDaeunList[currentIdx + 1] ? toDaeunFact(rawDaeunList[currentIdx + 1], false) : null;
  const daeunList = rawDaeunList.map((d) => toDaeunFact(d, d === result.daeun.current));
  const wealthOpportunityDaeunCount = rawDaeunList.filter(
    (d) => WEALTH_STARS.has(d.stemTenGod) || WEALTH_STARS.has(d.branchTenGod),
  ).length;

  return {
    hasTimeInput: input.hour !== null,
    dayStem: result.dayStem,
    dayStemKo: result.pillarDetails.day.stemKo,
    dayElement: result.pillarDetails.day.element.stem,
    dayStrength: result.advanced.dayStrength.strength,
    dayStrengthScore: result.advanced.dayStrength.score,
    dayStrengthGrade:
      result.advanced.dayStrength.strength === "strong"
        ? "강함"
        : result.advanced.dayStrength.strength === "weak"
          ? "약함"
          : "중화",
    geukguk: result.advanced.geukguk,
    yongsin: result.advanced.yongsin,
    fiveElements,
    dominantElement,
    wealthStarCount: wealthStarTypes.length,
    wealthStarTypes,
    peerStarCount,
    outputStarCount,
    officerStarCount,
    resourceStarCount,
    wealthStarPillars,
    outputStarPillars,
    officerStarPillars,
    missingElements,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    pillars,
    keyRelations,
    gwimunRelations,
    pillarStages,
    gilsin: result.advanced.sinsal.gilsin,
    hyungsin: result.advanced.sinsal.hyungsin,
    gongmang: result.gongmang.branchesKo,
    currentDaeun,
    nextDaeun,
    daeunList,
    // ssaju.toCompact()는 항상 4기둥(시주 포함) 기준 원국표를 반환한다 —
    // 시간 미상이어도 우리가 채운 임시 12시(午)를 실제 시주인 것처럼
    // "12:00"·시 열에 그대로 적어준다. 이 텍스트는 LLM 프롬프트에 그대로
    // 들어가므로(interpretation-prompt.ts/free-report-prompt.ts), 시간
    // 미상일 땐 그 시 열/시각을 사실로 쓰지 말라는 경고를 앞에 붙인다.
    compactText:
      input.hour === null
        ? `※ 출생 시간을 몰라 아래 "시" 열과 "12:00" 표기는 계산 편의상 넣은 임시값입니다. 시주(시 기둥)와 관련된 어떤 내용도 사실로 언급하지 마세요.\n\n${result.toCompact()}`
        : result.toCompact(),
    daeunAnalysis: null,
    currentAge: result.currentAge,
    geukgukSource: "ssaju_fallback",
  };
}
```

### 파일: src/lib/saju-labels.ts
```ts
// ssaju가 반환하는 영문/한자 원문 값을 화면·문장에 그대로 노출하면
// "강약: 'neutral'" 같은 디버그 로그처럼 보인다. 사람이 읽는 문장/칩에는
// 항상 이 라벨을 거쳐서 쓴다.

import type { SajuFacts } from "@/lib/saju-facts";

export function dayStrengthLabel(strength: SajuFacts["dayStrength"]): string {
  switch (strength) {
    case "strong":
      return "기운이 강한 편";
    case "weak":
      return "기운이 약한 편";
    default:
      return "기운이 중화에 가까운 편";
  }
}

export function dayStrengthShort(strength: SajuFacts["dayStrength"]): string {
  switch (strength) {
    case "strong":
      return "강함";
    case "weak":
      return "약함";
    default:
      return "중화";
  }
}

/** 궁위론: 십성이 어느 자리(연/월/일/시)에 있는지에 따른 생활 영역 의미.
 * be-realdeveloper/saju의 "궁위론" 구조를 참고해 자체 구현. */
export function pillarLifeAreaLabel(pillar: "year" | "month" | "day" | "hour"): string {
  switch (pillar) {
    case "year":
      return "어릴 때/가족·기반";
    case "month":
      return "사회생활/직업 활동";
    case "day":
      return "나 자신/가장 가까운 관계";
    case "hour":
      return "말년/실행한 결과가 드러나는 자리";
  }
}

/** 일간 10종 물상(物像) + 핵심 기질. be-realdeveloper/saju의
 * interpretation.md 해석 사전(제2장 "일간 10종 — 타고난 본질")을 그대로
 * 옮겼다 — 새로 지어낸 이미지가 아니라 실제 명리학 레퍼런스다.
 * elementTemperamentPhrase(5개 오행)는 갑/을처럼 같은 오행 안의 두 일간을
 * 구분하지 못했다 — 실제 사주 서비스 벤치마크(예시 리딩)를 보면 "태양처럼",
 * "호랑이의 기상"처럼 일간 단위 물상으로 문장을 여는 경우가 많았는데,
 * 우리는 오행 단위로만 뭉뚱그려서 갑목과 을목이 똑같은 문장을 받았다.
 * 이 함수는 10개 일간 각각의 물상으로 그 차이를 살린다. */
export function dayStemImagery(dayStemKo: string): { image: string; core: string } {
  const table: Record<string, { image: string; core: string }> = {
    갑: { image: "큰 나무", core: "곧고 진취적으로 앞장서는" },
    을: { image: "화초·덩굴", core: "유연하게 적응하며 살아남는" },
    병: { image: "태양", core: "밝고 화통하게 표현하는" },
    정: { image: "촛불·등불", core: "섬세하게 몰입하고 헌신하는" },
    무: { image: "산·대지", core: "듬직하게 포용하고 중심을 잡는" },
    기: { image: "논밭·정원", core: "섬세하게 챙기고 관리하는" },
    경: { image: "무쇠·바윗돌", core: "강직하게 밀어붙이고 결단하는" },
    신: { image: "보석·칼", core: "예리하고 세련되게 기준을 세우는" },
    임: { image: "바다·강", core: "큰 그릇으로 통찰하고 유연한" },
    계: { image: "비·이슬", core: "총명하고 섬세하게 감지하는" },
  };
  return table[dayStemKo] ?? { image: "고유한 결", core: "자기만의 방향을 가진" };
}

/** 오행별 전통적 기질 키워드. 특정 일간 하나에 고정된 문장이 아니라
 * dayElement와 dayStrength를 조합해 문장을 만드는 재료로만 쓴다. */
export function elementTemperamentPhrase(element: string): string {
  switch (element) {
    case "목":
      return "새로운 걸 벌이고 성장시키는 방향으로 에너지가 향하는 편";
    case "화":
      return "반응이 빠르고 사람 앞에서 에너지가 살아나는 편";
    case "토":
      return "중심을 잡고 오래 지속하는 쪽으로 안정을 추구하는 편";
    case "금":
      return "기준이 분명하고 맺고 끊는 게 확실한 편";
    case "수":
      return "상황에 맞춰 유연하게 흐름을 타는 편";
    default:
      return "고유한 방향성을 가진 편";
  }
}
```

### 파일: src/lib/survey-input.ts
```ts
// 간접체험 다음, 결제 전 재무 설문 — 3스텝. 숫자 직접입력은 소득/고정지출/
// 저축 3개뿐(병목 계산에 실수값이 필요한 항목), 나머지 숫자성 정보는 전부
// 구간 버튼. 사주 요소는 전혀 개입하지 않는다(순수 재무 설문).

export interface SurveyOption {
  value: string;
  label: string;
}

/** 설문 스텝1 진입 시 보여줄 개인정보 안내 한 줄. 상수로 분리해 운영자가
 * 문구를 바꿀 수 있게 한다. */
export const PRIVACY_NOTICE = "입력하신 정보는 진단 목적에만 사용되며 외부에 공유되지 않습니다.";

export const JOB_TYPE_OPTIONS: SurveyOption[] = [
  { value: "employee_fixed", label: "직장인(고정급)" },
  { value: "employee_variable", label: "직장인(변동급·성과급)" },
  { value: "freelancer", label: "프리랜서" },
  { value: "business_owner", label: "자영업·사업자" },
  { value: "transitioning", label: "육아휴직·퇴직예정·이직예정" },
];

export const FUTURE_EVENT_OPTIONS: SurveyOption[] = [
  { value: "marriage", label: "결혼" },
  { value: "moving", label: "이사" },
  { value: "home_purchase", label: "주택구입" },
  { value: "car", label: "자동차" },
  { value: "startup", label: "창업" },
  { value: "childbirth", label: "출산" },
  { value: "medical", label: "치료·수술" },
  { value: "leave", label: "휴직" },
  { value: "retirement", label: "퇴직" },
  { value: "job_change", label: "이직" },
  { value: "none", label: "없음" },
];

export const EXPENSE_AWARENESS_OPTIONS: SurveyOption[] = [
  { value: "precise", label: "정확히 안다" },
  { value: "rough", label: "대략 안다" },
  { value: "unknown", label: "모른다" },
];

export const EMERGENCY_FUND_OPTIONS: SurveyOption[] = [
  { value: "none", label: "없다" },
  { value: "under_1m", label: "1개월 미만" },
  { value: "1_3m", label: "1~3개월" },
  { value: "3_6m", label: "3~6개월" },
  { value: "over_6m", label: "6개월 이상" },
];

export const DEBT_INTEREST_OPTIONS: SurveyOption[] = [
  { value: "under_10", label: "10% 미만" },
  { value: "10_15", label: "10~15%" },
  { value: "over_15", label: "15% 이상" },
];

export const DEBT_PAYMENT_OPTIONS: SurveyOption[] = [
  { value: "under_30", label: "월 30만원 미만" },
  { value: "30_100", label: "월 30~100만원" },
  { value: "over_100", label: "월 100만원 이상" },
];

export const DEBT_MATURITY_OPTIONS: SurveyOption[] = [
  { value: "under_3m", label: "3개월 이내" },
  { value: "3_12m", label: "3개월~1년" },
  { value: "over_1y", label: "1년 이상" },
];

export const REPAYMENT_TYPE_OPTIONS: SurveyOption[] = [
  { value: "principal_interest", label: "원리금상환" },
  { value: "interest_only", label: "이자만 납부" },
];

export const FUTURE_EVENT_TIMING_OPTIONS: SurveyOption[] = [
  { value: "under_3m", label: "3개월 이내" },
  { value: "3_6m", label: "3~6개월" },
  { value: "6_12m", label: "6개월~1년" },
  { value: "over_1y", label: "1년 이상" },
];

export const FUTURE_EVENT_AMOUNT_OPTIONS: SurveyOption[] = [
  { value: "under_500", label: "500만원 미만" },
  { value: "500_2000", label: "500~2,000만원" },
  { value: "over_2000", label: "2,000만원 이상" },
];

export const FUTURE_EVENT_PREPARED_OPTIONS: SurveyOption[] = [
  { value: "none", label: "전혀 없다" },
  { value: "under_half", label: "절반 미만" },
  { value: "over_half", label: "절반 이상" },
  { value: "enough", label: "충분하다" },
];

export const MONEY_MANAGEMENT_UNIT_OPTIONS: SurveyOption[] = [
  { value: "individual", label: "개인" },
  { value: "couple", label: "부부공동" },
  { value: "family_support", label: "가족지원포함" },
  { value: "mixed_biz_personal", label: "사업자금-생활비 혼합" },
];

export const SPENDING_PATTERN_OPTIONS: SurveyOption[] = [
  { value: "card_dependence", label: "카드의존" },
  { value: "installment", label: "할부" },
  { value: "impulse", label: "충동소비" },
  { value: "compensatory", label: "보상소비" },
  { value: "social_spending", label: "관계지출" },
  { value: "avoidance", label: "확인회피" },
  { value: "spend_as_earned", label: "생기면바로씀" },
  { value: "auto_savings", label: "자동저축" },
  { value: "investment_impulse", label: "투자충동" },
  { value: "none", label: "해당없음" },
];

export interface SurveyInput {
  biggestConcern: string;
  jobType: string;
  futureEvents: string[];
  monthlyIncomeKrw: number;
  monthlyFixedCostKrw: number;
  monthlySavingsKrw: number;
  expenseAwareness: string;
  emergencyFund: string;
  hasDebt: boolean;
  debtInterestRate?: string;
  debtMonthlyPayment?: string;
  debtMaturity?: string;
  debtRepaymentType?: string;
  futureEventTiming?: string;
  futureEventAmount?: string;
  futureEventPrepared?: string;
  businessSeparatesFinance?: boolean;
  freelancerIncomeLow?: string;
  freelancerIncomeAvg?: string;
  freelancerIncomeHigh?: string;
  moneyManagementUnit: string;
  spendingPatterns: string[];
}

export function surplusKrw(input: Pick<SurveyInput, "monthlyIncomeKrw" | "monthlyFixedCostKrw" | "monthlySavingsKrw">): number {
  return input.monthlyIncomeKrw - input.monthlyFixedCostKrw - input.monthlySavingsKrw;
}
```

### 파일: src/lib/triple-compare.ts
```ts
// 사주 × 손금 × 자기응답을 한 번에 비교하는 통합 섹션. 손금은 사주와
// 독립된 두 번째 분석이어야 한다는 원칙에 따라, 손금 자체 해석이 끝난 뒤
// 딱 한 번 나오는 별도 통합 비교 섹션으로 다룬다.
//
// 일치/차이/보완 세 가지를 모두 허용한다(사주 결과를 손금/자기응답에
// 맞춰 억지로 고치지 않는다):
//  - 일치: present한 신호가 전부 같은 방향
//  - 차이: 정확히 2개(사주+손금 또는 사주+자기응답)만 있는데 서로 다른 방향
//  - 보완: 3개(사주+손금+자기응답) 다 있는데 하나로 안 모일 때 — 단순
//    이분법(일치/차이)으로 억지로 구겨넣지 않는다
//
// classify()는 present한 신호 전부를 항상 함께 본다(과거 "3개 있다고 해놓고
// 2개만 반영" 버그 수정 버전, 그대로 유지).
//
// MBTI 재설계(이번 라운드): 이전 버전은 이 파일에 MBTI를 네 번째 boolean
// 신호로 넣어 "J=빠른 결정, F=감정적" 식으로 단순 투표에 태웠다 — 이번
// 요구사항은 그 방식을 명시적으로 금지한다. MBTI는 여기서 완전히 뺐고,
// 대신 free-report-mock.ts의 realWorldPersonalization에서 MBTI 4축 전체
// (E/I·S/N·T/F·J/P)를 6문항 직접 응답과 우선순위를 두고 조합해 "현실에서
// 어떻게 나타나는지"를 설명하는 별도 문단으로 다룬다 — 사주×손금×자기응답
// 일치/차이 판정에 강제로 끼워 넣지 않는다.
//
// 손금 신호와 사주/자기응답 신호를 짝지을 때도 실제로 비교 가능한 동일
// 의미축만 남겼다:
//   - 결정하는 방식: 두뇌선 곡률(전통적으로 사고방식과 연결) ↔ 신강약 ↔
//     자기응답 결정속도 — 세 축 모두 "판단 속도/방식"을 말한다.
//   - 관계에서 감정이 작용하는 정도: 감정선 곡률(전통적으로 감정 표현과
//     연결) ↔ 관성+인성 vs 비겁+식상 상대비교(절대 임계값 아님) ↔
//     자기응답 autonomy — 세 축 모두 "관계/타인 영향"을 말한다.
// "돈을 대하는 방식" 축은 손금에 이와 견줄 만한 실제 근거가 없어서
// 완전히 뺐다 — 억지로 비교 항목을 만들지 않는다(그 내용은 무료
// 리포트의 재물 구조/버는 방식 섹션에서 이미 충분히 다룬다).
//
// 대운 시기 결합(이번 라운드): 이 비교는 원래 시간과 무관한(원국 자체
// 성향) 비교였는데, 지금 대운(daeunAnalysis, oh-my-saju timing 기반)의
// 지배 십성 그룹이 이 축(structured/relational)과 같으면 "지금 이 시기엔
// 이 비교가 더 도드라진다"는 한 문장을 덧붙인다. 일치/차이/보완 판정
// 로직 자체는 그대로다 — 새 판정을 추가한 게 아니라 이미 나온 결론에
// 시기 맥락만 더하는 것.

import type { SajuFacts } from "@/lib/saju-facts";
import { TEN_GOD_GROUP, TEN_GOD_GROUP_AXIS } from "@/lib/saju-facts";
import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type CompareKind = "일치" | "차이" | "보완";

export interface CompareItem {
  topic: string;
  kind: CompareKind;
  text: string;
}

// 이번 라운드: 이 비교가 "지금 이 대운 시기"와 실제로 맞물리는지도 같은
// 문장 안에 덧붙인다. 새 비교 로직이 아니라, 이미 계산된 kind/text 뒤에
// daeunAnalysis(현재 대운의 지배 십성 그룹)가 이 축과 같은 축이면 시기를
// 언급하는 한 문장만 더하는 것뿐 — 일치/차이/보완 판정 자체는 안 바뀐다.
function currentPeriodClause(facts: SajuFacts, axis: "structured" | "relational"): string | null {
  const current = facts.daeunAnalysis?.find((d) => d.isCurrent) ?? null;
  if (!current) return null;
  const group = TEN_GOD_GROUP[current.tenGods.stem] ?? TEN_GOD_GROUP[current.tenGods.branch];
  if (!group || TEN_GOD_GROUP_AXIS[group] !== axis) return null;
  return `${current.age}세부터 이어지는 지금 대운(${current.ganzhi})에는 이 모습이 유독 뚜렷하게 나타납니다.`;
}

function withPeriodContext(item: Omit<CompareItem, "text"> & { text: string }, facts: SajuFacts, axis: "structured" | "relational"): CompareItem {
  const clause = currentPeriodClause(facts, axis);
  return clause ? { ...item, text: `${item.text} ${clause}` } : item;
}

function classify(signals: (boolean | null)[]): CompareKind | null {
  const present = signals.filter((s): s is boolean => s !== null);
  if (present.length < 2) return null;
  const unanimous = present.every((s) => s === present[0]);
  if (unanimous) return "일치";
  return present.length === 2 ? "차이" : "보완";
}

function decisionAxis(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem | null {
  const sajuFast = facts.dayStrength === "strong";
  const palmFast = palm?.headLine.detected ? palm.headLine.curve === "직선에 가까움" : null;
  const selfFast = check ? check.levels.speed === "왼쪽" : null;

  const kind = classify([sajuFast, palmFast, selfFast]);
  if (!kind) return null;

  let text: string;
  if (kind === "일치") {
    text =
      palmFast !== null && selfFast !== null
        ? "타고난 결정 속도와 손의 두뇌선, 실제 응답까지 모두 같은 방향을 가리킵니다. 세 가지가 겹치는 흔치 않은 경우입니다."
        : palmFast !== null
          ? "손의 두뇌선이 타고난 결정 속도와 같은 방향입니다."
          : "실제 응답이 타고난 결정 속도와 같은 방향입니다. 다른 방식으로 같은 결을 보여준 셈입니다.";
  } else if (kind === "차이") {
    text =
      palmFast !== null
        ? "손의 두뇌선은 타고난 결정 속도와 다른 결을 보여줍니다. 타고난 결과 지금 습관이 달라졌을 수 있습니다."
        : "실제 응답은 타고난 결정 속도와 다릅니다. 둘 중 하나가 틀린 게 아니라, 금액 크기나 되돌리기 어려운 정도에 따라 속도가 달라지는 사람일 수 있습니다.";
  } else {
    text =
      "타고난 결정 속도와 손의 두뇌선, 실제 응답이 하나로 겹치지는 않습니다. 두뇌선은 평소 사고방식을, 응답은 실제 체감 속도를 보여줍니다 — 상황에 따라 둘 다 나오는 사람입니다.";
  }

  return withPeriodContext({ topic: "결정하는 방식", kind, text }, facts, "structured");
}

function relationEmotionAxis(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem | null {
  // 절대 임계값(예: ">=3") 대신 상대 비교로 — "관계/도움을 통해 움직이는
  // 힘"과 "스스로 밀어붙이는 힘" 중 어느 쪽이 이 사람 안에서 구조적으로
  // 더 큰지만 본다.
  const sajuRelational = facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount;
  const palmRelational = palm?.heartLine.detected ? palm.heartLine.curve === "완만한 곡선" : null;
  const selfRelational = check ? check.levels.autonomy === "오른쪽" : null;

  const kind = classify([sajuRelational, palmRelational, selfRelational]);
  if (!kind) return null;

  let text: string;
  if (kind === "일치") {
    text =
      palmRelational !== null && selfRelational !== null
        ? "타고난 대인관계 구조와 손의 감정선, 실제 응답까지 같은 방향입니다. 세 가지에서 같은 결이 겹쳐 나왔습니다."
        : palmRelational !== null
          ? "손의 감정선이 타고난 대인관계 구조와 같은 방향입니다."
          : "실제 응답이 타고난 대인관계 구조와 같은 방향입니다.";
  } else if (kind === "차이") {
    text =
      palmRelational !== null
        ? "손의 감정선은 타고난 대인관계 구조와 다른 결을 보여줍니다."
        : "실제 응답은 타고난 대인관계 구조와 다릅니다. 돈이 걸린 결정일 때 유독 누군가에게 먼저 물어보는지, 아니면 오히려 더 혼자 판단하게 되는지 돌아볼 만합니다.";
  } else {
    text =
      "타고난 대인관계 구조와 손의 감정선, 실제 응답이 정확히 겹치지는 않습니다. 감정선은 관계에서 감정이 작용하는 결을, 응답은 실제 의사결정 습관을 보여줍니다 — 둘 다 이 사람의 진짜 모습일 수 있습니다.";
  }

  return withPeriodContext({ topic: "관계에서 감정이 작용하는 정도", kind, text }, facts, "relational");
}

/** 사주 × 손금 × 자기응답(6문항) 통합 비교. 진짜로 비교 가능한 축(결정
 * 방식, 관계·감정)만 넣는다 — 견줄 손금 근거가 없는 축은 애초에 만들지
 * 않는다. MBTI는 여기 들어오지 않는다(free-report-mock.ts의
 * realWorldPersonalization에서 별도로 다룬다). */
export function buildTripleCompare(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem[] {
  return [decisionAxis(facts, palm, check), relationEmotionAxis(facts, palm, check)].filter(
    (x): x is CompareItem => x !== null,
  );
}
```

### 파일: src/lib/trust-badges-copy.ts
```ts
// 신뢰 신호 블록 데이터 — 후기·리뷰가 아니라 사실 진술 4가지만. 특정
// 금융상품·회사를 우열 비교하는 표현은 넣지 않는다. 서민금융진흥원 관련
// 문구는 "연계" 사실만 말하고 "공식"·"인증"·"제휴"·"검증받은" 같은 표현은
// 쓰지 않는다(과거 라운드부터 지켜온 원칙 — 공식 서비스로 오해할 표현 금지).
//
// 4번째(재무협회 관련)는 명칭·표기 형태를 운영자가 아직 확정하지 않아
// enabled: false로 자리만 마련해둔다 — 확정되면 이 값만 true로 바꾸면 된다.
// 미확정 문구를 실제 결제 화면에 그대로 보여주지 않기 위한 선택이다.

export interface TrustBadge {
  text: string;
  enabled: boolean;
}

export const TRUST_BADGES: TrustBadge[] = [
  {
    text: "독립 재무상담을 운영하며, 통장나누기·소액장기투자 원칙으로 상담해왔습니다.",
    enabled: true,
  },
  {
    text: "실제 대면상담 녹취 34건, 32시간 이상의 온라인 상담 데이터를 바탕으로 설계했습니다.",
    enabled: true,
  },
  {
    text: "서민금융진흥원 찾아가는 재무상담 서비스와 연계해 상담을 진행합니다.",
    enabled: true,
  },
  {
    // 명칭·표기 형태 운영자 확인 후 text 채우고 enabled: true로 전환.
    text: "",
    enabled: false,
  },
];
```

### 파일: src/lib/utils.ts
```ts
export { cn } from "cn"
```

### 파일: src/lib/vendor/palm-line-reader/palmLines.js
```js
/**
 * Vendored verbatim from samuelwbarber/palm-line-reader (MIT License,
 * Copyright (c) 2026 Sam Barber), commit as of 2026-09, file
 * web/palmLines.js — https://github.com/samuelwbarber/palm-line-reader
 *
 * This is the actual upstream inference wrapper, not a reimplementation.
 * Do not hand-edit; if the upstream file changes, re-vendor it whole.
 *
 * saju-app usage: src/lib/palm-line-onnx.ts imports PalmLineSegmenter from
 * this file, pairs it with onnxruntime-web (real npm dependency) and the
 * real trained student_fp16.onnx weights (public/models/), self-hosted the
 * same way this project already self-hosts MediaPipe's WASM assets.
 */

/**
 * palmLines.js — client-side palm-crease segmentation (exp2 student model).
 *
 * Framework-agnostic ES module. Wraps onnxruntime-web. No build step required.
 * All preprocessing/postprocessing constants mirror model/model_meta.json —
 * if you change one, change both.
 *
 * Usage:
 *   import * as ort from 'onnxruntime-web';          // or your bundler's path
 *   import { PalmLineSegmenter } from './palmLines.js';
 *
 *   const seg = await PalmLineSegmenter.create(ort, {
 *     modelUrl: '/models/student_fp16.onnx',
 *     // executionProviders default: try webgpu, fall back to wasm
 *   });
 *   const result = await seg.segment(imgElementOrCanvasOrImageBitmap);
 *   // result.mask   -> Uint8Array(512*512) of class indices 0..3
 *   // result.width/height = 512
 *   const rgba = seg.maskToRGBA(result.mask);         // Uint8ClampedArray, ready for ImageData
 *
 * The model input is a FIXED 512x512. Feed it a reasonably square hand/palm
 * crop for best results (the same framing the training crops used); this
 * module just plain-resizes whatever you give it to 512x512, matching training.
 */

export const MODEL_INPUT_SIZE = 512;
export const IMAGENET_MEAN = [0.485, 0.456, 0.406];
export const IMAGENET_STD = [0.229, 0.224, 0.225];

export const CLASSES = [
  { index: 0, name: 'background', color: [0, 0, 0] },
  { index: 1, name: 'heart_line', color: [255, 0, 0] },
  { index: 2, name: 'head_line', color: [0, 0, 255] },
  { index: 3, name: 'life_line', color: [0, 255, 0] },
];
export const NUM_CLASSES = CLASSES.length;

export class PalmLineSegmenter {
  /**
   * @param {object} ort           the onnxruntime-web module (imported by the host app)
   * @param {InferenceSession} session
   * @param {object} opts
   */
  constructor(ort, session, opts = {}) {
    this.ort = ort;
    this.session = session;
    this.inputName = session.inputNames[0];
    this.outputName = session.outputNames[0];
    this.size = opts.size || MODEL_INPUT_SIZE;
    // Reusable offscreen canvas for resize+pixel extraction.
    this._canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(this.size, this.size)
        : Object.assign(document.createElement('canvas'), { width: this.size, height: this.size });
    this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * @param {object} ort  onnxruntime-web module
   * @param {object} opts  { modelUrl, executionProviders?, sessionOptions? }
   */
  static async create(ort, opts) {
    if (!opts || !opts.modelUrl) throw new Error('PalmLineSegmenter.create: opts.modelUrl is required');
    const sessionOptions = {
      executionProviders: opts.executionProviders || ['webgpu', 'wasm'],
      graphOptimizationLevel: 'all',
      ...(opts.sessionOptions || {}),
    };
    const session = await ort.InferenceSession.create(opts.modelUrl, sessionOptions);
    return new PalmLineSegmenter(ort, session, opts);
  }

  /**
   * Draw the source into the 512x512 canvas and build the normalized NCHW tensor.
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|HTMLVideoElement} source
   * @returns {Float32Array} length 3*size*size
   */
  preprocess(source) {
    const s = this.size;
    // Plain resize to s x s (no letterbox) — matches training's A.Resize.
    this._ctx.drawImage(source, 0, 0, s, s);
    const { data } = this._ctx.getImageData(0, 0, s, s); // RGBA, row-major, uint8

    const chw = new Float32Array(3 * s * s);
    const plane = s * s;
    for (let i = 0, p = 0; i < plane; i++, p += 4) {
      // RGBA -> normalized R,G,B planes
      chw[i] = (data[p] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
      chw[plane + i] = (data[p + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
      chw[2 * plane + i] = (data[p + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
    }
    return chw;
  }

  /**
   * Run the full pipeline on one image.
   * @returns {Promise<{mask: Uint8Array, width: number, height: number}>}
   *          mask is size*size class indices (0..3), row-major.
   */
  async segment(source) {
    const s = this.size;
    const chw = this.preprocess(source);
    const input = new this.ort.Tensor('float32', chw, [1, 3, s, s]);
    const out = await this.session.run({ [this.inputName]: input });
    const logits = out[this.outputName].data; // Float32Array [1,4,s,s], class-major
    const mask = argmaxCHW(logits, NUM_CLASSES, s * s);
    return { mask, width: s, height: s };
  }

  /**
   * Colorize a class-index mask into RGBA pixels (background transparent),
   * suitable for `new ImageData(rgba, size, size)` and drawing as an overlay.
   * @param {Uint8Array} mask
   * @param {number} alpha  overlay opacity for foreground classes (0..255), default 255
   * @returns {Uint8ClampedArray}
   */
  maskToRGBA(mask, alpha = 255) {
    const rgba = new Uint8ClampedArray(mask.length * 4);
    for (let i = 0; i < mask.length; i++) {
      const c = mask[i];
      if (c === 0) continue; // background stays transparent
      const [r, g, b] = CLASSES[c].color;
      const o = i * 4;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = alpha;
    }
    return rgba;
  }
}

/** Per-pixel argmax over a class-major [C, HW] logits buffer. */
export function argmaxCHW(logits, numClasses, hw) {
  const mask = new Uint8Array(hw);
  for (let i = 0; i < hw; i++) {
    let best = 0;
    let bestVal = logits[i];
    for (let c = 1; c < numClasses; c++) {
      const v = logits[c * hw + i];
      if (v > bestVal) {
        bestVal = v;
        best = c;
      }
    }
    mask[i] = best;
  }
  return mask;
}
```

### 파일: src/lib/wealth-type.ts
```ts
// "버는 힘 × 지키는 힘" 재물 유형 판정. 새 원국 계산은 하지 않는다 — 이미
// computeSajuFacts가 계산한 5개 십성 개수(wealthStarCount/outputStarCount/
// officerStarCount/resourceStarCount/peerStarCount)를 재조합할 뿐이다.
//
// 버는 힘 = 재성(돈 그 자체) + 식상(돈을 만드는 활동)
// 지키는 힘 = 관성(규율/통제) + 인성(비축/신중함)
// peerStarCount(비겁)는 전통적으로 "나눠 갖는" 힘이라 버는/지키는 어느 쪽
// 신호도 아니라서 두 축 어디에도 넣지 않는다 — 새 계산이 아니라 새 해석
// 규칙이라는 뜻이다.
//
// 등급은 1~5단계(sum 0→1 ... 4 이상→5), 3 이상을 "상"으로 본다(운영 문서
// 지시 그대로). 이 게이지는 무료 화면에도 "버는 힘 N / 지키는 힘 N" 형태로
// 그대로 노출된다 — 소수점 없이 정수 등급으로만.

import type { SajuFacts } from "@/lib/saju-facts";
import { WEALTH_TYPE_COPY, type WealthTypeCode, type WealthTypeCopyEntry } from "@/lib/wealth-type-copy";

export interface WealthPowerGauge {
  sum: number;
  level: 1 | 2 | 3 | 4 | 5;
  grade: "상" | "하";
}

export interface WealthTypePieces {
  /** 1조각: 유형명 + 한 줄 진단 */
  typeAndDiagnosis: string;
  /** 2조각: 왜 이 유형인지 — 명식 근거 + 게이지 숫자 */
  evidence: string;
  /** 3조각: 이 유형이 겪는 문제(현실 연결) */
  problem: string;
  /** 4조각: 해법 미지목, 유료1 안내 톤 */
  bridge: string;
}

export interface WealthTypeResult {
  code: WealthTypeCode;
  earning: WealthPowerGauge;
  keeping: WealthPowerGauge;
  pieces: WealthTypePieces;
}

function gauge(sum: number): WealthPowerGauge {
  const level = Math.min(5, sum + 1) as WealthPowerGauge["level"];
  return { sum, level, grade: level >= 3 ? "상" : "하" };
}

function codeFor(earningGrade: "상" | "하", keepingGrade: "상" | "하"): WealthTypeCode {
  if (earningGrade === "상" && keepingGrade === "상") return "ACCUM";
  if (earningGrade === "상" && keepingGrade === "하") return "LEAK";
  if (earningGrade === "하" && keepingGrade === "상") return "HOLD";
  return "TIGHT";
}

export function classifyWealthType(facts: SajuFacts): WealthTypeResult {
  const earning = gauge(facts.wealthStarCount + facts.outputStarCount);
  const keeping = gauge(facts.officerStarCount + facts.resourceStarCount);
  const code = codeFor(earning.grade, keeping.grade);
  const copy = WEALTH_TYPE_COPY[code];

  const pieces: WealthTypePieces = {
    typeAndDiagnosis: copy.headline,
    evidence: `${copy.reasonTemplate} 버는 힘 ${earning.level} / 지키는 힘 ${keeping.level}`,
    problem: copy.problemText,
    bridge: copy.bridgeText,
  };

  return { code, earning, keeping, pieces };
}

/** 무료 구간에서 특정 해법을 지목하면 안 된다는 원칙의 회귀 방지 가드.
 * free-report-schema.ts의 BANNED_PATTERNS 관례를 그대로 따른다 — 테스트
 * 스크립트가 4개 카피 항목 전체를 이 함수로 검사한다. */
const BANNED_SOLUTION_PATTERNS: RegExp[] = [
  /통장을?\s*나누/,
  /가계부를?\s*쓰/,
  /적금을?\s*(들|가입)/,
  /예산\s*앱/,
  /(자동이체|풍차\s*돌리기)/,
];

export function validateWealthTypeCopy(entry: WealthTypeCopyEntry): string[] {
  const fullText = [entry.headline, entry.reasonTemplate, entry.problemText, entry.bridgeText].join("\n");
  return BANNED_SOLUTION_PATTERNS.filter((re) => re.test(fullText)).map(
    (re) => `banned solution mentioned: ${re.source}`,
  );
}
```

### 파일: src/lib/wealth-type-copy.ts
```ts
// 재물 유형 4종의 카피 전용 데이터 파일 — 로직 없음, SajuFacts import 없음.
// 운영자가 검수 후 이 파일만 통째로 교체할 수 있어야 한다는 요구사항 때문에
// wealth-type.ts(로직)와 완전히 분리했다. 십성 원어("재성"/"식상" 등)는
// 본문에 노출하지 않는다(free-report-schema.ts의 JARGON_IN_TEXT_PATTERNS와
// 같은 원칙) — 십성 개수는 pieces.evidence의 "버는 힘/지키는 힘 숫자"로만
// 간접 노출한다. 4번째 조각(bridgeText)에는 특정 해법을 지목하지 않는다 —
// 사주는 방향, 실행 순서는 사람마다 다르다는 게 이 무료 구간의 전제다.

export type WealthTypeCode = "ACCUM" | "LEAK" | "HOLD" | "TIGHT";

export interface WealthTypeCopyEntry {
  typeName: string;
  /** 1조각: 유형명 + 한 줄 진단 */
  headline: string;
  /** 2조각: 왜 이 유형인지 — 숫자 붙기 전 고정 문장 */
  reasonTemplate: string;
  /** 3조각: 이 유형이 겪는 문제(현실 연결) */
  problemText: string;
  /** 4조각: 해법 미지목, 유료1 안내 톤 */
  bridgeText: string;
}

const COMMON_BRIDGE_TEXT =
  "그런데 이걸 고치는 방법은 사람마다 다릅니다. 이미 해보신 게 무엇인지, 지금 무엇이 가장 걸리는지에 따라 순서가 완전히 달라집니다.";

export const WEALTH_TYPE_COPY: Record<WealthTypeCode, WealthTypeCopyEntry> = {
  ACCUM: {
    typeName: "쌓이는 형",
    headline: "쌓이는 형 — 들어오는 돈도, 남는 돈도 있는 결입니다.",
    reasonTemplate: "돈을 만드는 힘과 그걸 지키는 힘이 둘 다 뚜렷합니다.",
    problemText:
      "다만 이런 분들이 놓치는 건 액수가 아니라 시간입니다. 모이기는 하는데 그 돈이 그대로 멈춰 있는 경우가 많습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  LEAK: {
    typeName: "새는 형",
    headline: "새는 형 — 들어온 돈이 머무르지 않는 결입니다.",
    reasonTemplate: "돈을 만드는 힘은 뚜렷한데, 그걸 지키는 자리가 상대적으로 약합니다.",
    problemText:
      "이런 분들은 수입이 적어서 못 모으는 게 아닙니다. 들어온 돈이 어디로 갔는지 설명이 안 되는 쪽에 가깝습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  HOLD: {
    typeName: "묶어두는 형",
    headline: "묶어두는 형 — 새지 않지만 늘지도 않는 결입니다.",
    reasonTemplate: "지키는 힘은 강한데, 돈을 만드는 활동력은 상대적으로 약합니다.",
    problemText:
      "이런 분들은 돈을 잘못 쓰는 쪽이 아닙니다. 오히려 쓸 자리, 움직일 타이밍을 자꾸 미루는 쪽에 가깝습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  TIGHT: {
    typeName: "빠듯한 형",
    headline: "빠듯한 형 — 들어오는 것도 남는 것도 얇은 결입니다.",
    reasonTemplate: "돈을 만드는 힘도, 지키는 힘도 아직 크게 서 있지 않습니다.",
    problemText:
      "이런 분들은 크게 잘못한 게 없는데도 늘 여유가 없다고 느낍니다. 버는 구조 자체가 아직 얇기 때문입니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
};
```

