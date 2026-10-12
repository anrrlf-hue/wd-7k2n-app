# 사주 홍보 운영 연결 검증

출발점 `ab51325`, 격리 브랜치 `feat/saju-operations-workpack`. 기존 합성 업무팩을 보존하고 `operations/saju_launch`만 추가했다. 앱·Base·Growth·Factory·Product 소스 또는 운영 설정을 수정하지 않았다.

## 결과와 실행 경계

최초 사주 Goal 등록안 → 홍보 원고/주제/공유문구 초안 → 검증된 결과 조회 → 별도 품질평가 요청/실행을 위한 운영자 CLI를 구현했다. 원본 Base의 Goal, Task Contract, general_freeform, llm-task, verifier, Job/lease/checkpoint를 사용한다. 실서버에는 아직 설치·등록하지 않았고 실제 모델 호출은 0회다. 도메인 연결 전 통계 보류를 유지한다.

초안·평가의 자유작성/AI 판단은 미검증이다. 테스트의 모델 대체 응답은 실제 홍보 산출물이나 사용자 성과로 제공하지 않는다. Product 웹 계정·tenant binding·웹 UI·알림까지 연결된 것으로 표시하지 않는다. 실행 진입점은 승인된 기존 운영 쉘의 `python3 -m operations.saju_launch`다.

## 실제 운영 환경 읽기 확인

- 공식 연결: Desktop Commander의 MiniHQ `DESKTOP-GF8ODN1` → Ubuntu-24.04. 본부 주PC `DESKTOP-M14JNKH` 터미널도 확인했으며 두 장치를 혼동하지 않았다. 화면 접근·새 SSH/키/계정은 사용하지 않았다.
- Base root `/home/muk/.openclaw/workspace/automation/agent-base`, 기존 DB `state/base-runtime.sqlite` 존재.
- 현재 release `d9e8fd24fa46b094`, 배포 시각 `2026-10-12T07:21:16.388267+00:00`.
- release의 Base SHA `5eb7054f6a2116ab6901a0063299692bd09f26cc`, Product SHA `f1a9847c973b948dd64c7b46033281c6e7c7f744`. 과거 freeze를 현재 설치본으로 간주하지 않았다.
- 관련 Base 파일 11개: 9개 Git blob 일치. 두 파일은 raw hash가 달랐지만 줄바꿈/바깥 공백 정규화 SHA-256이 GitHub 원본과 같았다. 설치 소스는 수정하지 않았다.
  - `goal_agent_v1.py`: `12aeb4d5a5476003504e788ea6403eaf271311a9df53532d43f1dbc8014ee339`
  - `task_contract.py`: `4bad25a8c7f57fba4b2250f5ddd703c1d92203a134dfa060929c641e65c85c98`
- DB `mode=ro`, query_only로 필요한 기존 테이블 6개의 존재와 사주 tenant `saju-prelaunch`의 Goal 미등록만 확인했다. 다른 tenant 레코드는 읽지 않았다.
- 설정의 비밀 아닌 모델명만 확인: llm-task enabled, `defaultProvider=google`, `defaultModel=gemini-3.1-flash-lite`, allowedModels는 Google 모델 및 `openrouter/openrouter/free`. public-command 모델도 Google 모델이다. 허용 목록과 무료 요금 증명을 구분한다. 키 값을 조회·반출하지 않았다.
- 실제 `general_tool_free` 경로는 기존 기본 모델을 사용하며 이 클라이언트가 모델을 선택/교체하지 않는다. 구독/native 또는 추가 과금 없음은 확인되지 않았다.

## 새 검증

`python -m unittest operations.saju_launch.test_launch -v`: **11/11 PASS**, 0.806초. `compileall`, whitespace 검사 PASS.

원본 Task Contract의 작성/평가 분류, 실제 Base Goal/admission/tick/general_freeform/execute_tool_free/verifier를 시험했다. 가용성/설치 호스트와 마지막 모델 transport만 대체했다. 임시 DB, 소켓 차단, 외부 모델 호출 0회.

- 최초 등록 승인 digest 및 덮어쓰기 차단.
- 실행 승인/추가 과금 없음 확인 누락 시 Job 생성 0건.
- 동일 요청 중복 모델 실행 차단, 동시 제출 OS 잠금 차단.
- 실제 저장된 검증 결과만 표시하고 품질평가의 입력으로 사용.
- 다른 tenant, payload·소스·Goal scope 변조 차단.
- provider 실패는 완료로 표시하지 않고 자동 재시도하지 않음.
- 실행 의도와 제약 문맥을 분리하되 모든 금지 조건이 실제 모델 직전 입력에 유지됨.
- 실패/미검증 결과, 임의 수정한 평가 입력 거절; business_evidence 0건.

최초 시험에서 기존 verifier의 `게시용 글 초안:` 표제 계약과 요청 수량 형식을 맞춰야 함을 발견해 사주 요청 문구를 보정했다. 엔진 verifier는 변경하지 않았다. 최종 검사는 실제 활성 Base SHA 기준이다. 이전 8개 합성 시험, 기존 제품 빌드·타입·lint는 Python 운영 진입점과 무관하여 반복하지 않았다.

## Factory 설명의 정확한 범위

합성 제한은 이전에 확인한 freeze `c0f8616`의 `WORKPACK_SCHEMA_V1` 경로에 대한 설명이다. [workpack_contract.py](https://github.com/anrrlf-hue/agent-base/blob/c0f861661f664edd70c45b6a29d20dfded0f5669/contract/workpack_contract.py#L86)는 reviewed bundle의 `synthetic_only`와 SYNTHETIC 입력을 요구한다. [workpack_product_flow.py](https://github.com/anrrlf-hue/agent-base/blob/c0f861661f664edd70c45b6a29d20dfded0f5669/contract/workpack_product_flow.py#L149)의 `start_test`는 TEST/SANDBOX admission이며 `live_request`는 Production을 활성화하지 않는다. 전체 Factory 또는 기존 native 실행기가 가짜라는 뜻이 아니다. 이번 작성 경로는 실제 설치된 일반 작성 업무팩이다. Growth 자동학습이나 Factory 운영 성과 ingestion까지 검증한 것은 아니다.

## 필수 승인 범위

대상은 위 MiniHQ 기존 Base 한 곳이다. 새 운영 클라이언트를 별도 사주 폴더에 설치하고 기존 DB에 사주 전용 MANUAL_ONLY/SANDBOX Goal 1건을 등록하는 변경을 승인받아야 한다. 첫 실제 실행은 기존 경로의 추가 과금 없음이 별도 확인된 경우에 한해 초안 1작업·평가 1작업으로 제한한다. 비용이 확인되지 않으면 모델 호출은 보류한다. 기존 엔진·공유 provider 설정·Production 웹앱·다른 tenant·게시·통계·계정/키 변경은 승인 범위에 포함하지 않는다.

자동 승인 검토는 별도 환경의 원본 소스 전체 반출 요청을 거절했다. 원문을 가져오는 대신 해당 환경에서 정규화 해시만 계산하는 허용된 방식으로 필요한 대조를 완료했다. 소스 반출 승인을 추가로 요구하지 않는다.
