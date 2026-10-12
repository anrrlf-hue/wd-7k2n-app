# 사주 운영 업무팩 — 로컬 계약 연결

사주 앱은 독립 제품이다. 이 폴더는 사주풀이를 대체하지 않고, 허용된 운영 점검 상태를 기존 엔진에 전달하기 위한 **미설치 로컬 업무팩**이다. Next.js에서 import하거나 호출하지 않는다. 자동 실행·HTTP 전송·고객 데이터 수집·모델 호출·인증·DB·스케줄러를 추가하지 않는다. 방문/사용 통계는 도메인 연결 후 정식 출시까지 보류한다.

## 확인한 기존 계약

CURRENT의 10/5 최종 추가항과 10/6 인수인계, 실제 원격 freeze 브랜치를 대조했다. 앞부분의 과거 Growth `a53ff...` 대신 최종 `dc50636...`을 사용한다. 문서의 과거 261/261 PASS는 이번 시험 결과가 아니다.

| 소유자 | 확인한 기준 | 재사용 경계 |
| --- | --- | --- |
| Base | `c0f861661f664edd70c45b6a29d20dfded0f5669` | `workpack_contract.validate_spec`, admission, 기존 Job/lease/checkpoint/recovery/verify, `workpack_product_flow` |
| Growth + Factory | `dc50636ae97f6f3a9a5d76be2c7968b69cd1f920` | `GrowthWorkpackAdapter.execution_proposer` → `FactoryExecutionProposer` → reuse-first → reviewed Method ID/version/digest·scope → 새 target compile |
| Product | `1db6368a6ad3531bb09226669b6e8cbb47264e69` | 인증된 `POST /api/jobs`, JSON `command`, `Idempotency-Key`, body/command 각각 4096 UTF-8 bytes 제한 |

Product의 범용 command는 특정 Factory 업무팩을 설치하거나 실행하도록 강제하는 API가 아니다. `product_request.py`는 이 DTO를 로컬에서 만들 뿐 실제 인증·라우팅·수신·결과 delivery는 시험하지 않았다. Factory 어댑터와 Product handoff는 각각 검증된 경계이며, 둘 사이의 실제 tenant/Goal/native binding이 구성됐다고 주장하지 않는다.

확인한 freeze 트리에는 관련 `AGENTS.md`와 `.agents/skills`가 없었다. 사주 저장소의 Next.js 지침을 확인했고 앱 런타임 코드는 변경하지 않았다. 다른 프로젝트의 기존 checkout·설치 runtime·DB·보험 payload·JiIn1 설정은 수정/복사하지 않았다. 공용 엔진은 이 저장소에 복제하지 않고, 테스트에서만 읽기 전용 원본을 import한다. `upstream-source-lock.json`은 21개 원본 파일의 Git blob 해시이며 **승인 registry가 아니다**.

## 추가 코드

- `handler.py`: 정해진 점검 ID·상태·fixture ref·release SHA만 허용한다. 원문/URL/사용자 식별자/생년월일/손금 사진/풀이/통계/credential 같은 추가 필드는 삭제 후 통과시키지 않고 거절한다. 실패·미검증 상태를 고정된 개선 검토 항목으로 바꾸는 순수 도메인 규칙이다. Growth 판단·학습을 별도로 구현하지 않는다.
- `adapter.py`: 기존 Growth 어댑터에 snapshot과 proposal callback을 연결한다. trusted registry·권한·재사용 후보 검증과 컴파일은 원본 Factory에 맡긴다. caller context의 임의 승인/조건은 전달하지 않는다. 설치 증거가 없으므로 `available_capabilities`는 비어 있다. draft는 scope와 정규화한 입력 digest에 결속하며, 이미 컴파일된 과거 Workpack을 받지 않는다.

Factory 호출 전에는 host가 명시한 `AGENT_BASE_ROOT`의 registry와 `AGENT_BASE_DB`가 이미 존재해야 한다. 누락되면 WAIT로 끝내므로 Base의 SQLite 연결이 빈 DB를 새로 만드는 경우도 막는다. 여기서 환경변수를 설정하거나 실제 DB를 생성하지 않는다.
- `product_request.py`: 개인정보 없는 합성 command와 안정적인 멱등 키를 생성한다. 항상 `send_allowed=false`; URL/키/송신 함수가 없다.
- `manifest.json`: 기존 Base handler 형식의 미설치 업무팩 명세. 실제 설치 승인을 뜻하지 않는다.
- `fixtures/unreviewed-target-draft.json`: null pin·MISSING prerequisite를 가진 **미승인 DRAFT 예시**다. 사용할 reviewed pin이나 운영 권한을 발급하지 않는다.

기본 입력은 없음이다. `NO_DATA / WAIT`, 결과값 `null`, 요청/컴파일/실행 없음으로 끝난다. 통계 부재를 0명이나 성과로 바꾸지 않는다. 합성 fixture의 `palm_pipeline=FAIL` 등은 의도적인 시험 입력이며 현재 배포본의 장애 보고가 아니다.

## 로컬 실행과 검증

```sh
python -m operations.saju_ops_workpack
python -m operations.saju_ops_workpack --fixture operations/saju_ops_workpack/fixtures/synthetic-review.json
SAJU_CONTRACT_SOURCES=/tmp/saju-agent-contracts python -m unittest operations.saju_ops_workpack.test_contract -v
```

마지막 경로에는 lock에 명시한 `agent-base`, `insurance-growth-agent`, `agent-product`의 해당 원본 파일들이 필요하다. 정확한 Git blob 검사를 통과해야 테스트가 시작된다. 다운로드·로그인·키 발급은 테스트가 수행하지 않으며, 누락/변조 시 실패한다. 실행 중 소켓 연결은 차단한다.

2026-10-12 targeted 검사 **8/8 PASS**:

1. 무자료/빈 fixture → `NO_DATA/WAIT`, request/spec/persistence 없음.
2. 고객 필드·중첩 원문·URL·실측 표시·중복 check ID·임의 명령 거절.
3. Product 원본의 멱등키 함수·요청 크기·receiver 필드와 로컬 DTO 일치, 순서만 바꾼 fixture는 동일 키.
4. draft/registry/authority 누락 → WAIT, PRODUCTION scope 거절.
5. 원본 Factory → Base admission → scoped tick → 원본 Product projection. 같은 invocation은 같은 run, 두 번째 tick은 NO_WORK. `SUCCESS_VERIFIED`는 로컬 합성 계산 검증이며 business receipt는 **0개**. live는 `PRODUCTION_NOT_ENABLED_IN_FACTORY_V1`, 실행 불가.
6. 입력 digest·tenant scope·reviewed pin 변조 차단.
7. native 결과 변조·무자료 성공 주장·PRODUCTION handler 호출 차단.
8. 합성 후보로 실제 reuse pin/target compile 검사: Method v2 exact identity 결속, 원본 compiled artifact 재사용 없음, v3 미승인 pin과 후보 중복은 WAIT. 이 검사에서 **과거 후보 discovery만 대체**했으며 실제 사주 Method가 발견됐다는 증거는 아니다.

테스트만 임시 디렉터리 안에 Base의 기존 스키마와 명시적인 synthetic Goal/registry를 구성한다. fixture pin은 `TEST_ONLY_NOT_OPERATOR_APPROVAL` 데이터의 해시다. 실제 operator 승인·설치 registry·신규 runtime DB가 아니다. 제품의 기존 손금/프리미엄 전체 검사나 Production 배포를 반복하지 않았다.

## 아직 연결되지 않은 부분

- 실제 사주용 reviewed Method/target draft·registry·Goal 권한·설치 capability·Product tenant binding·운영 receipt는 이 환경에서 확인되지 않았다. 기존 연결이 없다고 단정하지 않는다.
- 실제 host에서 이 어댑터를 등록하는 작업은 미실행이다. 현재 freeze Factory의 synthetic-only 제한을 해제하지 않았다.
- Product HTTP 수신/인증/라우팅부터 Base까지의 실제 통합, 실제 운영 결과·학습·추천 효과는 미검증이다.
- 다음 단계는 기존 운영자의 사주 binding/권한 readback과 해당 업무팩 설치·연결 범위 승인이다. 실제 데이터/외부 효과가 필요하면 기존 capability readiness·Human Gate 경계를 별도로 검증해야 한다. 이 폴더의 소스가 있다는 이유로 승인 없이 활성화할 수 없다.

근거: [최종 freeze CURRENT](https://docs.google.com/document/d/1Sj32D7UGXqgFvdjK05IeQ0WZbOGE5Jv4SnjAV2UMomg/edit), [10/6 CURRENT](https://docs.google.com/document/d/1AV78YH993zO-1Au6uQ38wFdm3ILVGTPnJ7rQt9CxKOU/edit), [재사용 계약](https://docs.google.com/document/d/1J4N5TW7vuwdcT7rNBiU_Kr_btg-Ts6b7fmJWjfbFDNE/edit), [사주 MASTER 13항](https://docs.google.com/document/d/1LlPHTe-A0hN03YCK1y64hz8T7oLsY5jb_2bTKYN3_fU/edit).
