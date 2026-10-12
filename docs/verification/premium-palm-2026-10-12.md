# 프리미엄 연간 리포트 / 양손 분석 검증 (2026-10-12)

수정 브랜치: `fix/annual-premium-palm-analysis`. 기준 체크아웃: `7b0c213aa87133cb7ec45615aed82c94fc891b66` (`work`, 작업 시작 시 clean). 선택된 `/workspace/wd-7k2n-app` 환경에서 실행했다. 원격 push·PR·Production 배포는 하지 않았다.

## 결과와 남은 제한

- 프리미엄에서 무료 분야 생성기와 무료 본문 재사용을 제거했다. 실제 계산된 십성 개수·자리·신뢰 가능한 강약·결여 오행에 연결된 가설, 분야별 2주 실험과 확인 기준을 추가했다. 관심 분야를 API로 전달해 첫 분야와 실행 과제가 달라진다.
- 기존 연간 계산을 재사용해 12개월 × 4분야의 상대 비교표를 추가했다. 같은 분야의 12개월 안에서만 `실험/유지/점검`을 비교한다. 동점은 유지로 처리하며 성공 확률이나 길흉 점수로 노출하지 않는다. 현재 대운을 고정 배경으로 쓰고 매월 15일을 대표값으로 쓰는 근사·절기 경계 및 대운 전환의 한계를 알린다. 시간 미상은 강약 단정과 대운 반영을 제외한다.
- 손금의 62%/94% 시간 기반 표시를 실제 로컬 단계, 서버 응답 대기, 본문 수신 및 각 작업의 경과시간으로 교체했다. 로컬 분석 60초, 요청 시작부터 본문 JSON까지 30초의 제한을 적용한다. HTTP/본문 스트림은 AbortSignal로, 로컬 추론은 worker 종료로 중단한다.
- 작업 식별/취소 검사로 늦은 완료·실패·진행 이벤트를 배제한다. 양손 분석·미리보기를 유지한 서버 재시도와 같은 사진의 로컬 재분석을 제공한다. 화면 이탈 시 중단하고 BFCache 복귀 시 재시도 화면을 연다. 다른 입력으로 이동하면 컴포넌트를 새로 마운트한다.
- 기존 MediaPipe/ONNX 모델·전처리·인식 임계값·주요선 우선/보정 규칙·모바일 보조모델 생략 기준은 유지했다. 사진은 브라우저 내 worker로만 전달되며 서버에는 기존 구조화된 관측값만 보낸다. worker는 성공 후 양손 사이에서 재사용하고 취소·실패·이탈 시 종료한다. `Worker`/`OffscreenCanvas` 미지원 브라우저는 안내 후 사진 분석 대신 사주만 계속할 수 있다.
- **실제 iPhone Safari / Android Chrome 카메라, 실제 양손 사진의 품질·정확도·저메모리 동작은 미검증이다.** 관측된 데스크톱 멈춤이 대표님의 실제 기기 원인과 같다고 확정하지 않는다. 로그인·Anthropic 호출도 검증하지 않았으며 이 변경 경로에는 새 모델·유료 API·가입·인증을 추가하지 않았다.
- HTTP 취소는 브라우저 연결·본문 수신을 중단한다. 이미 서버에서 시작된 동기 사주 계산 자체를 강제 종료한다고 보장하지 않는다. 브라우저 이미지 디코더가 늦게 끝나도 취소 이후 후속 처리·상태 반영은 차단한다.

## 재현 및 계측

1. 응답 헤더만 먼저 보내고 본문을 끝내지 않는 로컬 HTTP 서버로 과거 구조의 헤더 제한이 본문 대기를 종료하지 못함을 재현했다. 수정된 함수는 헤더 이전 정지와 본문 중 정지 모두 실제 연결 종료까지 확인했다.
2. 기준 커밋을 `/tmp/wd-7k2n-baseline`의 detached worktree에서 실행했다. 저장소의 `public/images/journey-palm.webp` (손 모형 일러스트, 고객 사진 아님)를 양쪽 버전에 두 번 입력해 실제 MediaPipe와 기존 ONNX 모델을 실행했다.

| 항목 | 기준 커밋(메인 스레드) | 수정본(worker) |
|---|---:|---:|
| 양손 로컬 처리 경과 | 34,111ms | 30,887ms |
| 20ms 화면 타이머 실행 횟수 | 143 | 1,534 |
| 최대 타이머 간격 | 14,830.9ms | 147ms |
| 250ms 초과 간격 | 5 | 0 |
| 양손/주손 관측값 | 소요시간 진단값을 제외하고 일치 | 일치 |

이 결과는 데스크톱에서 UI 스레드 차단과 worker 이동 효과를 보여준다. 실제 카메라 정확도나 일반적인 성능 수치는 아니다. 원본 개발 서버는 의존성 symlink 제한 때문에 webpack, 수정본은 Turbopack으로 실행했다. 동일 모델·이미지·인식 결과를 비교했지만 번들러와 단일 실행 환경의 차이는 남는다.

계측 로그 `[palm-analysis]`는 작업 번호·단계·경과시간만 남기고 사진·생년월일·손금 관측값은 기록하지 않는다.

## 검증

| 검사 | 결과 |
|---|---|
| `pnpm build` (최종 코드) | 통과, 20개 정적 페이지 생성, TypeScript 통과 |
| `pnpm exec tsc --noEmit` | 통과 |
| `node scripts/test-premium-annual.mjs` | 합성 생년월일 3건, 무료 문구 독립성, 관심 분야별 계획 차이, 12×4, KST 연도 전환, 동점, 시간 미상 통과 |
| `node scripts/test-palm-analysis-task.mjs` | 헤더/본문 제한·실제 연결 취소·JSON/HTTP 실패·재시도·늦은 작업 차단 통과 |
| `node scripts/test-palm-browser.mjs` | Chromium 양손 순서, 오른손 후 서버 호출 없음, 양손 후 합산, 느린 응답, 정지/본문 정지, 취소·즉시 재시도·오래된 결과 배제, SPA 이탈, 모의 BFCache 이벤트, 실제 worker의 빈 사진 거절 통과 |
| 브라우저 30초 실시간 제한 | 헤더 전 정지 약 30.1초, 본문 정지 약 30.6초 후 오류/연결 종료. 양손 재사용, 인식 재실행 없음 |
| 로컬 60초 제한 | 브라우저 가상 시계로 61초 전진, worker 종료·오른손 보존·왼손 동일 사진 재시도 통과 |
| 실제 모델 실행 중 취소 | 최종 빌드에서 ONNX 실행 단계의 취소 버튼 반응과 native worker 종료, 사진 보존 통과 (실측 로그 참조) |
| `pnpm test:reality-answer-regressions` | 답변/시기 10건 및 기존 UI·관리 검사 통과. UI 소스 검사의 60초 표기와 새 복구 버튼 이름만 수정 |
| `test-palm-secondary-regressions.mjs` / `test-palm-fate-fusion.mjs` | 7/7 + 9/9 및 양손·프레이밍 규칙 통과 |
| 모바일 폭 프리미엄 | 로그인/결제 없이 열림, 12행·4열, 후속 질문 입력 없음, 가로 넘침 없음 |
| 전체 lint | **기존 4오류·11경고 → 3오류·9경고**, 새 문제 없음. 기존 손금 진행률 effect 오류와 미사용 인자/중첩 함수 경고 제거 |
| 기존 `test-palm-result.mjs` | **나이 문구 3건 실패가 원본에서도 동일**. 검사는 `세부터 이어지는`을 기대하지만 기존 코드가 `세 전후부터 이어지는`을 출력. 나머지 판정/추천/유형/결정론 검사는 통과. 이 문구/검사는 변경하지 않음 |

남아 있는 lint 오류는 `src/app/diagnosis/page.tsx:112`, `src/app/management/page.tsx:41`, `src/app/share/relationship/page.tsx:39`의 기존 `react-hooks/set-state-in-effect`이다. 범위 밖 파일은 변경하지 않았다. 전체 lint 성공이라고 보고하지 않는다.

브라우저 상태/재시도 시험은 인식 출력만 합성 관측값으로 대체하고 실제 API/HTTP 응답과 UI를 사용한다. 실제 인식 시험(빈 이미지/모형 일러스트)은 별도로 구분했다. API와 로컬 서버만 사용했으며 외부 유료 호출은 없다.

## 무료 / 프리미엄 비교

[3개 합성 샘플과 월별 표](./premium-comparison-2026-10-12.md). 무료 전체·4개 분야에 있는 **40자 이상 고유 문자열**이 프리미엄에 그대로 포함되는 개수는 32→0, 32→0, 28→0이다. 같은 주제·사주 근거를 공유할 수 있으며 이 수치가 의미적 중복 0%나 예측 정확도를 뜻하지 않는다.

예: 무료 일 풀이가 직업 성향을 설명했다면, 새 프리미엄은 `식상/관성 개수`를 근거로 결과물 피드백 실험 또는 담당·마감·완료 기준 합의 실험을 선택한다. 2주 후에는 투입시간/재작업 횟수를 확인하고, 월별 표로 그 행동을 다시 실험할지 유지할지 점검할지 비교한다. 관심 분야를 돈으로 바꾸면 첫 과제는 지출 예상/실제 비용 또는 거래 기록 비교로 바뀐다.

## 재실행과 산출물

```sh
pnpm build
pnpm exec tsc --noEmit
pnpm lint
node scripts/test-premium-annual.mjs
node scripts/test-palm-analysis-task.mjs
pnpm test:reality-answer-regressions
node scripts/test-palm-secondary-regressions.mjs
node scripts/test-palm-fate-fusion.mjs
# 별도 터미널에서 로컬 앱을 실행한 뒤 (Playwright는 테스트 도구이며 제품 의존성 추가 없음):
TEST_BASE_URL=http://localhost:3003 \
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core \
node scripts/test-palm-browser.mjs
```

원시 로그·브라우저 JSON·스크린샷·인식 비교 실행 스크립트는 `/tmp/wd-7k2n-evidence/`에 보존했다. 핵심 파일: `build-final.txt`, `typecheck-final.txt`, `lint-baseline.txt`, `lint-final.txt`, `browser-production.txt`, `browser-final-build.txt`, `recognition-parity.json`, `recognition-parity.txt`, `real-worker-cancel.txt`, `palm-result-baseline.txt`, `premium-mobile.png`, `premium-months-mobile.png`, `palm-slow-request.png`.

저장소 `AGENTS.md`와 설치된 Next 16.3.4의 client/route/Turbopack 지침을 확인했다. `.agents/skills`는 없었다. `docs/reference-notes/humanize-report-writing-notes/SKILL.md`와 `docs/reference-notes/saju-gungwi-interpretation-notes/SKILL.md`는 **DEVELOPMENT_SKILL_USED**로 적용했으며 런타임 호출/의존성 추가는 없다. **RUNTIME_LIB_USED**는 기존 사주 계산·MediaPipe·ONNX 라이브러리이다.

## 대표 승인 후 배포할 범위

연간 프리미엄 생성/표시·관심 분야 전달, 손금 작업 수명/제한시간/취소·재시도, 로컬 worker와 공용 canvas 호환 처리, 해당 회귀검사·검증 문서만 대상이다. 결제·가격·공유 보상·후속 질문·인증·보안 설정·DB·다른 사업은 변경하지 않았다. 결제 전 프리미엄 보기는 유지한다.

배포 전 실제 iPhone/Android의 오른손→왼손 촬영, 차가운 캐시·느린 망·저메모리, 백그라운드/뒤로 가기 복귀, worker 지원 안내를 확인하고 이 변경 범위에 대해 대표 승인을 받은 뒤 별도로 배포해야 한다.
