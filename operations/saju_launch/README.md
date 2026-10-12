# 사주 출시 전 홍보 업무 실행 진입점

홍보 주제·짧은 글·공유문구 세 묶음을 작성하고, 별도 작업으로 품질을 평가한다. **연결 코드와 로컬 검증은 준비됐으며 실제 운영 설치·등록·모델 실행은 아직 하지 않았다.** 생성 결과는 대표 검토용이다. 게시, 고객 접촉, 통계 수집, 가격·결제·보상 확정은 포함하지 않는다.

## 실제 재사용하는 엔진

- MiniHQ `DESKTOP-GF8ODN1`, Desktop Commander의 해당 장치 → `Ubuntu-24.04` WSL 터미널. 본부 주PC `DESKTOP-M14JNKH`와 구분한다. 새 SSH 연결은 만들지 않았다.
- 설치 위치: `/home/muk/.openclaw/workspace/automation/agent-base`.
- 활성 릴리스 `d9e8fd24fa46b094`; Base `5eb7054f6a2116ab6901a0063299692bd09f26cc`, Product `f1a9847c973b948dd64c7b46033281c6e7c7f744`.
- 실제 설치의 관련 파일 11개를 위 Base 원본과 대조했다. 9개 Git blob 일치; Goal·Task Contract 두 파일은 바깥 공백/줄바꿈 정규화 SHA-256 일치. `source-lock.json`은 코드 출처 검사용이며 운영 승인이나 요금 증명이 아니다.
- `build_task_contract` → `general_freeform` → `create.llm_task` / `think.llm_task` → `execute_tool_free` → OpenClaw `tools.invoke(llm-task)` → 기존 verifier와 Base Job을 재사용한다. 자체 AI 실행기, 스케줄러, DB, 테이블, 반복 worker를 추가하지 않는다.
- 현재 실제 설정: `llm-task` enabled, 기본 `google/gemini-3.1-flash-lite`. 허용 목록의 `openrouter/openrouter/free`는 이 작성 경로가 무료로 실행된다는 증거가 아니다. 이 클라이언트는 provider/model/인증을 선택하거나 변경하지 않는다. 구독/native 직결 또는 추가 과금 없는 실행 경로는 확인되지 않았다.

## 실행 전 필요한 승인

운영 환경에 이 클라이언트를 복사하고 **사주 전용 tenant/Goal을 처음 등록하는 운영 변경**은 별도 승인 대상이다. 계정·키·공유 채널 권한을 생성하는 작업은 아니다. 제안 범위는 `saju-prelaunch`, 업무팩 `general_freeform`, capability `create.llm_task`와 `think.llm_task`, `SANDBOX`, `MANUAL_ONLY`, 지출 한도 0원이다. Base의 SANDBOX도 실제 모델을 호출할 수 있으며 무료 요금제를 뜻하지 않는다.

`--confirm-existing-zero-cost-route`는 운영자가 기존 경로의 추가 과금이 없음을 **별도로 확인한 후** 입력하는 명시적 확인이다. 코드가 모델 요금·구독·무료 한도·fallback 과금을 검증하거나 차단해 주는 기능이 아니다. 확인할 수 없으면 실행하지 않는다. 유료 호출을 허용하는 선택지는 이 패키지에 없다. 새 provider/키 설정이나 공유 모델 정책 변경도 포함하지 않는다.

## 사용 순서

기존 승인된 운영 쉘에서 사용한다. `AGENT_BASE_ROOT`, `AGENT_BASE_DB`, Goal feature가 기존 환경에 설정돼 있어야 한다. 이 클라이언트는 환경변수나 서비스 설정을 변경하지 않는다. 아래 DB는 mode=ro로 필요한 기존 테이블 존재와 `saju-prelaunch` Goal 미등록만 확인했다. 다른 tenant의 레코드는 조회하지 않았고 등록은 하지 않았다.

```sh
SAJU_BASE=/home/muk/.openclaw/workspace/automation/agent-base
SAJU_DB=/home/muk/.openclaw/workspace/automation/agent-base/state/base-runtime.sqlite

# 1. 공개 제품 정보만으로 요청과 최초 등록안을 만든다. 모델/DB 호출 없음.
python3 -m operations.saju_launch prepare --source-root "$SAJU_BASE" --output-dir ./saju-launch-review

# 2. 기존 DB를 읽기 전용으로 확인한다. 누락 DB/스키마를 생성하지 않는다.
python3 -m operations.saju_launch preflight --base-root "$SAJU_BASE" --database "$SAJU_DB"

# 3. 운영 변경 승인 후 registration.json의 registration_digest로 최초 등록한다.
python3 -m operations.saju_launch register --base-root "$SAJU_BASE" --database "$SAJU_DB" --packet ./saju-launch-review/registration.json --approve-registration <registration_digest>

# 4. 추가 과금 없는 기존 경로가 확인된 뒤, 요청 내용과 digest를 검토해 실행한다.
python3 -m operations.saju_launch run --base-root "$SAJU_BASE" --database "$SAJU_DB" --packet ./saju-launch-review/draft.request.json --approve-request <request_digest> --confirm-existing-zero-cost-route <request_digest>

# 5. 위 출력의 job_id로 결과를 확인한다. 모델을 재호출하지 않는다.
python3 -m operations.saju_launch result --base-root "$SAJU_BASE" --database "$SAJU_DB" --job-id <draft_job_id>

# 6. 검증된 초안에서 품질평가 요청을 만든다. 임의 원문 입력은 받지 않는다.
python3 -m operations.saju_launch review-request --base-root "$SAJU_BASE" --database "$SAJU_DB" --job-id <draft_job_id> --output ./saju-launch-review/quality.request.json

# 7. quality.request.json의 새 digest를 검토한 뒤 4번과 같은 run 명령으로 평가한다.
#    평가 job_id로 5번 result 명령을 사용한다. 최종 공개 여부는 대표가 판단한다.
```

각 요청은 사람이 실행하는 단일 Base 작업이다. 새 평가 요청까지 승인 없이 연속 실행하지 않는다. 같은 요청을 다시 넣으면 Base에 저장된 동일 payload의 작업을 찾아 결과를 읽는다. 현재 설치 Base에는 `admission_key` 인자가 없으므로 이 CLI의 짧은 제출 단계만 기존 DB 파일의 OS advisory lock으로 직렬화한다. 새 상태 파일·테이블을 만들지 않으며 실제 실행/lease/checkpoint는 Base가 소유한다. 실패·불명확 상태는 자동 재시도하지 않는다. 다른 도구가 이 CLI의 잠금을 따르지 않고 직접 만드는 작업까지 중복 방지를 보장하지 않는다.

결과가 `engine_verified=true`여도 광고 효과·매출·사주 예측 정확도가 검증된 것은 아니다. `human_review_required=true`, `publish_allowed=false`, `business_effect_verified=false`를 유지한다. 이 진입점은 운영자 CLI이며 Product 웹 로그인·계정 등록·알림 전달까지 연결된 UI라고 주장하지 않는다.

## 의도와 제약의 보존

실행 의도는 첫 문단, 제품 사실·금지 조건은 기존 Task Contract가 지원하는 `[CUSTOMER_PROFILE]` 문맥에 둔다. 원본 전체는 실제 모델 입력에 유지한다. 금지 문장에 들어 있는 단어 때문에 ACTION이나 웹 조사로 오분류되는 것을 피하면서, 계약이 도구 없는 CONTENT_DRAFT/GENERAL_ADVICE로 승인됐는지 별도로 검사한다. 제약 조건을 제거하거나 기존 정책·verifier를 수정하지 않는다. 검증된 초안만 평가 대상으로 사용하며 평가 시 임의 수정된 요청을 거절한다.

## Factory/Growth 범위

기존 `saju_ops_workpack`의 합성 점검/Factory 연결은 보존한다. 이전에 확인한 **freeze `c0f8616`의 `WORKPACK_SCHEMA_V1` 컴파일·admission·Product `start_test/live_request` 경로**에서 `bundle.synthetic_only`, SYNTHETIC 입력, TEST/SANDBOX를 요구하고 Live를 차단한다. 이는 그 경로의 제한이며 전체 Factory나 기존 native 업무가 모의 기능이라는 뜻이 아니다. 현재 홍보 작성은 실제 설치된 `general_freeform` 경로를 사용한다. Growth 학습·Factory 성과 ingestion을 실행했다고 표시하지 않는다.

## 검증

```sh
SAJU_LAUNCH_SOURCES=/tmp/saju-active-contracts python3 -m unittest operations.saju_launch.test_launch -v
python3 -m compileall -q operations/saju_launch
```

2026-10-12 새 검사 11/11 PASS, Python compileall 및 git diff whitespace 검사 PASS. 위 소스 폴더는 정확한 관련 원본을 준비한 시험 환경 경로다. 테스트가 원본을 다운로드하거나 운영 DB에 접근하지 않는다. 테스트에서만 임시 DB와 Goal을 만든다. 원본 Goal/Task Contract/Base Job/tick/일반 작성 runtime/execute_tool_free/verifier는 실제 실행한다. 설치 경로·capability 가용성·마지막 모델 transport는 대체한다. AI 작성·판단 품질과 실제 과금·운영 실행 성공은 미검증이다. 이전 8개 합성 검사와 제품 전체 회귀검사는 이번에 반복하지 않았다.
