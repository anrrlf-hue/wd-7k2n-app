# 개발 연결 검증 — 2026-10-12

아래는 `d2f8d49` 연결 검증 기록이다. 이후 추가된 비용 차단·설치 후보의 최신 범위와 검증은 [ACTIVATION_CANDIDATE.md](ACTIVATION_CANDIDATE.md)를 기준으로 한다. 추가비용 0 확인만으로 모델 실행을 허용하던 경로는 대체되었다.

운영 연결을 켠 결과가 아니라 격리된 코드와 임시 상태에서의 검증이다. main, 기존 검토 브랜치 `3f0ddb8`, 원격, Production, 보험 데이터는 변경하지 않았다. 실제 모델·메시지·게시 호출은 수행하지 않았다.

## 결과

| 검사 | 결과 / 확인 범위 |
|---|---|
| Python 집중 회귀 16개 | 통과. 실제 검토된 Base·Growth 코드, 임시 SQLite/registry/Goal. 네트워크 및 모델 subprocess 차단 |
| 브라우저 통계 단위검사 | 통과. OFF에서 본문/저장소 읽기·ID 생성·전송·로그 없음, 서버 TEST/LIVE 출처, 허용 필드·4KB 제한, 풀이 ID 유지, 만료, beacon 실패 대체 |
| 로컬 Chromium 양손→리포트 | 통과. 오른손 뒤 합산 요청 없음, 왼손 뒤 1회, 요청 대기 중 완료/열람 없음, 생성 완료 뒤 실제 결과와 연간 리포트 노출 계측 |
| 로컬 Chromium 공유 | 통과. 공유 resolve/cancel/reject/pending, 복사 resolve/reject/미지원, 기존/새 수신자 진입, 과거 공유 링크 처리. 이벤트가 전달 성공으로 바뀌지 않음 |
| 손금 요청 회귀 | 통과. 헤더까지만 제한했던 이전 동작 재현, 전체 응답·본문 지연 제한과 연결 중단, 본문 읽기 중 취소, 오류 후 재시도, 오래된/완료/이탈 작업 결과 차단 |
| Next.js 타입 | `next typegen` 뒤 `tsc --noEmit` 통과 |
| Next.js 빌드 | 기본 환경에서 `next build` 통과. 20개 정적 페이지 생성 완료 |
| lint | 기준 `3f0ddb8`와 수정본 모두 오류 2·경고 9. 새 진단 없음. 이전 4·11 보고를 현재 기준으로 재사용하지 않음 |
| 원본 보존 | 원본 38개 중 Base 계약 두 파일만 변경. 원본·패치 지문 검사, Goal pin 변경 및 native 의존 파일 변조 때 claim 차단 확인 |

기존 lint 오류는 `src/app/diagnosis/page.tsx:112`, `src/app/management/page.tsx:41`의 `react-hooks/set-state-in-effect`다. 이번 범위 밖의 기존 오류는 수정하지 않았다. 두 검사 출력은 경로와 줄 이동을 정규화하여 비교했다.

## 연결 검증이 증명한 것

1. 실제 Growth `PurposeAutonomousAgent.step()`이 Factory reuse-first 경로로 COMPILED 제안을 만든다.
2. 실제 Base admission과 dependency gate가 draft → review → improve 순서의 세 작업을 실행하고 각 문서를 다시 읽어 확인한다. 모델 완성문만 명시적 TEST fixture다.
3. 실제 Growth `LearningAssetStore.ingest_base_outcomes()`가 QUALITY 증거 3개를 RAW로 수집한다. OUTCOME/사업 성과/대표 승인으로 승격하거나 Goal을 종료하지 않는다.
4. 다음 실제 Growth step의 context에 수집된 증거·평가문·집계가 들어간다. 시험 director는 시간 초과 집계 유무에 따라 다른 가설 검토를 선택하고, NO_DATA이면 관측 자료를 요청한다. 이는 모델의 판단 능력이나 개선 실효성 검증이 아니다.
5. 기존 Base의 실제 모델 요청 직렬화 함수에도 집계 출처, 오류 수, 검토 증거 참조, TEST/의견 한계가 남는다. 큰 객체가 생략되는 기존 bridge 규칙 때문에 사주 어댑터에서 작은 요약을 함께 제공한다.
6. 같은 invocation 재개는 모델 작업·증거를 중복 생성하지 않는다. 부분 실행 재개, 다른 tenant의 증거 수집 거부, 증거 출처 변경 충돌도 확인했다.
7. 기본 모델 연결은 기존 transport를 구성하지만 정책 검사에서 실제 프로세스 호출 전에 멈춘다. 모델 응답 소실은 Base SUBMIT_UNKNOWN으로 남고 재호출하지 않는다.

## 비교 가능한 TEST 집계

[정상 흐름 예시](examples/test-aggregate.json)는 1개 TEST 세션의 필수 전환을 연결한다. 연간 리포트 미사용은 선택 경로 0/1일 뿐, 이탈로 집계하지 않는다. 공유 취소 1/1, 링크 복사 1/1이어도 전달 성공·사람 수·신규 고객 수·인과적 효과는 모두 null이다.

[기본 비활성 예시](examples/disabled-aggregate.json)는 NO_DATA이고 counts=null이다. 실제 방문자 0명이라는 의미가 아니다. 두 파일 모두 이름·생년월일·사진·원문·sessionId·readingId를 포함하지 않는다.

이전 제품 수정의 무료/프리미엄 비교는 [기존 비교 샘플](../../docs/verification/premium-comparison-2026-10-12.md)에 보존되어 있다. 이번 연결 작업에서 그 리포트 생성 규칙이나 가격·결제·공유 보상을 바꾸지 않았다.

## 재현 명령

```bash
python -m unittest operations.saju_agent.test_telemetry operations.saju_agent.test_integration -v
node scripts/test-saju-analytics.mjs
node scripts/test-palm-analysis-task.mjs
node_modules/.bin/next typegen
node_modules/.bin/tsc --noEmit
node_modules/.bin/next build
node_modules/.bin/eslint
```

브라우저 검증은 **로컬 클라이언트 TEST 설정만** 켜고 서버 이벤트는 가로채어 저장하지 않았다. 서버/배포 설정은 변경하지 않는다.

```bash
NEXT_PUBLIC_SAJU_ANALYTICS_ENABLED=true node_modules/.bin/next dev --hostname 127.0.0.1 --port 3016
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core TEST_BASE_URL=http://127.0.0.1:3016 node scripts/test-saju-analytics-browser.mjs
PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core TEST_BASE_URL=http://127.0.0.1:3016 EXPECT_ANALYTICS_ENABLED=1 TEST_EVIDENCE_DIR=/tmp/saju-integration-evidence node scripts/test-service-share-browser.mjs
```

브라우저 기록: `/tmp/saju-integration-evidence/browser-analytics.json`, `/tmp/saju-integration-evidence/service-share-browser.json`. 인식 결과·API 응답·공유는 fixture이며, 카메라 실기기 검증의 대체물이 아니다.

## 미검증 / 별도 승인

개발 검증을 막는 blocker는 없다. 실제 iPhone/Android 촬영, 모델 응답의 내용 품질, 실제 이용량·홍보 효과, 운영 로그 내보내기와 계정의 추가비용 조건은 미검증이다. 설치·등록·수집 활성화·배포는 별도 승인 후 진행한다. 기존 Production 수집이 OFF라는 주장은 하지 않는다.
