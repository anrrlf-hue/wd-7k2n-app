# 사주 앱 통합 에이전트 — 개발 검토본

이 패키지는 기존 Growth의 판단 → Factory 제안 → Base 실행·읽기 검증 → Growth 증거 수집 → 다음 판단을 연결한다. 홍보 초안 3개, 별도 평가문, 이용 흐름 근거를 반영한 다음 실험 제안은 로컬 문서로만 준비한다. 새로운 엔진·스케줄러·공개 채널·통계 벤더는 없다.

**운영 설치·모델 호출·통계 활성화·게시·배포를 실행한 상태가 아니다.** 비용 가드와 설치 후보는 [ACTIVATION_CANDIDATE.md](ACTIVATION_CANDIDATE.md)를 기준으로 한다. `3f0ddb8`의 기존 `operations/saju_launch` 설치안은 취소된 역사 자료로 보존한다. 이 구현은 public-command Base `5eb…`를 사용하지 않는다.

## 검토 범위와 소스

- 앱: `feat/saju-agent-integration`, 기준 `3f0ddb8adffa62fbfa256966dbee1bac7ef271bf`.
- Base: `c0f861661f664edd70c45b6a29d20dfded0f5669`.
- Growth: `dc50636ae97f6f3a9a5d76be2c7968b69cd1f920`.
- 개발 사본: `/workspace/saju-agent-integration-upstream`, `dev/saju-public-local`.
- `upstream/source-manifest.json`: 사용한 38개 원본 파일의 Git blob 지문. `sources.verify_sources()`는 변경된 Base 파일의 수정 후 SHA-256과 나머지 원본 지문을 검사한다.
- `upstream/public-local.patch`: 원본 `agent-base` 루트에서 적용할 수 있는 누적 패치. 계약 두 파일, 기존 모델 경계 두 파일 수정과 비용 가드 한 파일 추가를 포함한다. Growth 소스는 변경하지 않는다.

PUBLIC 입력은 기존 Goal이 지문으로 승인한 registry에 `synthetic_only:false`, `public_local_only:true`가 있을 때만 TEST/SANDBOX의 NONE/LOCAL_WRITE 작업에 허용한다. 제안 자체가 권한을 부여하지 않는다. TENANT_PRIVATE, 혼합 분류, 무승인 지출·게시·Production 변경은 계속 거부한다. 모델 비용은 검증된 과금조건과 Goal의 금액 승인에 맞는 공통 한도 안에서만 허용하는 구조이며, 현재 transport는 제한 기능 미확인으로 차단된다. 기존 SYNTHETIC 경로는 유지한다. 공개 제품 설명과 공개 제공을 검토한 비식별 집계만 registry에 넣는다. 집계가 비식별이라는 이유만으로 자동 공개 승인된 것으로 취급하지 않는다.

`unreviewed-draft.json`의 null 지문과 MISSING 선행조건은 의도적이다. 운영 승인이나 설치 가능한 registry로 가장하지 않는다. 테스트만 임시 디렉터리에 `TEST_AUTHORITY_NOT_ACTIVATION` 권한을 만든다.

## 실제 연결 지점

`runtime.build_agent(...)`는 이미 존재하는 Base의 DB·Goal·검토 registry와 사주 전용 Scope를 요구한다. 소스 버전, 환경 변수의 DB 경로, 실제 로드된 엔진 경로, tenant/goal/version/domain/environment/policy를 검사한다. 별도 Goal·등록·설치 명령은 제공하지 않는다.

기본 판단 콜백은 기존 `AutonomousGrowthBrain` + `AgentBaseBrainCommandClient` + Base의 `autonomous_growth_brain_bridge.py`를 사용한다. 홍보 작성·평가·개선안과 Growth 판단 모두 기존 `_llm_task_synthesis`에서 같은 실행의 호출·토큰·금액 예약을 검사한다. 추가비용 0이라는 확인 문구만으로는 실행할 수 없다. 실제 계정 과금조건, 금액·실행 키·모델·만료일 승인, 강제 출력 제한과 완전한 사용량 검증이 필요하다. 현재 transport는 이 기능을 확인하지 못했으므로 **실제 모델 호출이 차단된다**. 시험용 지원 adapter는 provider 지원 증거가 아니다.

`runtime.advance_once(base=..., agent=..., assets=..., invocation_key=...)`는 이미 승인된 로컬 범위에서 한 번만 연결한다. Factory는 기존 reuse-first/compile, Base는 기존 admission/claim/lease/dependency/verify/recovery, Growth는 기존 `LearningAssetStore.ingest_base_outcomes`를 소유한다. 최대 3개 Base tick 뒤 돌아오며, 반복 작업이나 새 재시도 큐를 만들지 않는다. 호스트의 기존 cycle 기록에 invocation key를 보관해 재시작 때 같은 키를 전달한다. 같은 키 재개 시 중복 모델 작업·중복 증거를 만들지 않는다.

Base native 디렉터리에 필요한 파일은 `manifest.json`, `native_handler.py`, `handler.py`, `telemetry.py`, `brief.json`이다. **다섯 파일 모두** 기존 registry의 `native_files`로 지문을 고정해야 한다. entrypoint는 ambient 앱 모듈 대신 이 디렉터리의 파일만 읽는다. 로컬 문서 역시 job/item/run/input/prompt 지문에 묶여 읽기 검증을 거친다. 모델 제출 뒤 응답을 잃으면 기존 SUBMIT_UNKNOWN 검증 경로로 남기며 다시 호출하지 않는다.

문서 존재·형식·해시 검증은 QUALITY 증거다. LLM 의견이나 파일 개수를 매출·방문 효과·대표 승인·Goal 완료로 승격하지 않는다. 시험 응답은 `synthetic:true`, RAW 상태로 수집한다. 실제 PUBLIC/local 작업도 verifier의 해당 증거에 대한 명시적 `synthetic:false`가 없으면 합성으로 남는다. 비용 증거는 UNKNOWN/null이다.

다음 Growth context는 집계와 읽기 검증된 평가·개선 문서 및 수집된 증거를 받는다. 기존 모델 bridge가 큰 중첩 객체를 생략하므로 `data_quality`, `funnel_metrics`, `optional_metrics`, `quality_advisory`의 작은 요약을 함께 전달한다. 실제 bridge의 요청 직렬화까지 회귀검사한다. 개선의 타당성과 실효성은 시험용 director로 검증된 것이 아니다.

## 기본 비활성 계측

앱의 상대 경로 `/api/analytics`를 사용하므로 도메인 확정이 필요 없다. 이 개발본은 다음 조건을 모두 만족해야 수집한다.

| 설정 | 기본값 / 역할 |
|---|---|
| `NEXT_PUBLIC_SAJU_ANALYTICS_ENABLED` | 미설정/false: 클라이언트 ID 생성·저장·전송 없음. true는 빌드 시 반영 |
| `SAJU_ANALYTICS_ENABLED` | 미설정/false: 서버는 본문 읽기와 이벤트 로그 전에 204 반환 |
| `SAJU_ANALYTICS_REALM` | 명시적 TEST 또는 LIVE 필요. 서버가 출처를 부여 |

**기존 배포 코드에는 별도 비활성 스위치 없는 전송·로그 코드가 있다. 현재 Production 수집이 OFF라고 확인하거나 변경한 것이 아니다.** 위 조건은 이 미배포 개발본의 동작이다.

활성화 후의 원시 이벤트에는 탭 세션·풀이·이벤트의 임시 무작위 ID가 있다. 따라서 원시 로그 전체를 익명 데이터라고 부르지 않는다. sessionStorage의 세션은 30분 비활동 뒤 교체하고, 이미 끝난 풀이를 다시 시작하면 풀이 ID도 교체한다. 생년월일·이름·손 사진·해석·질문·쿼리 URL·계정 ID·임의 props는 허용하지 않는다. 이 원시 이벤트는 Growth에 넘기지 않는다.

서버는 기존 console 로그 경로에 `[product-event-v2]` 구조화 이벤트만 기록한다. 새 저장소나 자동 로그 수집기를 설치하지 않는다. 추후 운영 승인 때 기존 로그의 보존기간·수집 범위·공개 집계 여부를 정하고 필요한 V2 JSONL 행만 명시적으로 내보낸다. 로그 누락, 차단기, 브라우저 종료, 인위적 이벤트는 측정 한계다.

`python -m operations.saju_agent --realm TEST --coverage DISABLED --start 2026-10-12T00:00:00Z --end 2026-10-12T01:00:00Z --observed-until 2026-10-12T01:30:00Z`는 OFF 상태의 `NO_DATA` 집계만 출력한다. 승인된 V2 JSONL 파일을 줄 때만 `--events <path> --coverage COMPLETE_EXPORT`를 명시한다. 실제 사용량을 보려면 승인된 운영 로그가 필요하다.

집계 규칙:

- 세션 수이며 사람 수·신규 고객 수를 계산하지 않는다. 동일 사람이 여러 탭/세션으로 나타날 수 있다.
- 필수 흐름은 landing → 시작 → 무료 생성 완료 → 실제 결과 열람이다. 두 손·재시도는 같은 풀이로 합치며 이벤트 ID를 중복 제거한다.
- 마지막 두 전환은 동일 풀이 ID 안에서 순서를 확인한다. 복원·직접 접근 등 연결되지 않은 결과는 별도 항목이다.
- 연간 리포트·공유·복사는 선택 경로다. 해당 결과 세션 중의 행동 비율만 제공하고 미사용을 이탈로 부르지 않는다.
- 공유창 종료, 취소, 오류, 복사 완료를 구분한다. 전달 성공·도달 고객·인과적 개선 효과는 null이다.
- 30분 비활동이 지난 세션의 다음 단계 미도달과 아직 진행 중인 세션을 구분한다. 실제 이탈 원인을 추정하지 않는다.
- 수집 OFF, 불명확한 export, 빈 자료는 NO_DATA/null이다. TEST와 LIVE를 섞으면 거부한다. 20세션 미만은 LOW_SAMPLE이며 그 이상도 기술 통계일 뿐이다.
- 집계 기간은 첫 관측 이벤트 기준 세션 cohort다. COMPLETE_EXPORT는 기간 이전 세션 문맥과 기간 뒤 최소 30분 관측을 포함해야 한다. 불완전하면 UNKNOWN으로 입력한다.

## 검증과 남은 승인

`python -m unittest operations.saju_agent.test_telemetry operations.saju_agent.test_integration -v`

`node scripts/test-saju-analytics.mjs`

브라우저 검사는 `scripts/test-saju-analytics-browser.mjs`, `scripts/test-service-share-browser.mjs`를 로컬 서버에서만 실행한다. 모든 API·외부 네트워크·공유를 fixture로 막는다. 손금 제한시간 회귀는 `scripts/test-palm-analysis-task.mjs`다. 검증 결과는 [VALIDATION.md](VALIDATION.md)에 정리한다.

남은 별도 승인 범위는 누적 Base 패치·MiniHQ의 별도 예정 디렉터리에 배치할 설치 후보·registry/Goal·기존 모델의 과금조건과 금액·호출/토큰 한도·운영 로그 범위와 TEST/LIVE 설정·통계 활성화·앱 배포다. 실제 모델 경로의 강제 제한·사용량 검증은 먼저 해결해야 할 기술 blocker다. 어떤 것도 이 작업으로 활성화하지 않는다. 실제 모델의 홍보문 품질, 실제 이용자의 행동과 효과, iPhone/Android 카메라는 미검증이다.
