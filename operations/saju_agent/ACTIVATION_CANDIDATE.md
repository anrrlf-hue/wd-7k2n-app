# MiniHQ 사주 설치 후보와 모델 비용 차단

아직 설치·등록·push·배포·모델 호출을 수행하지 않았다. 인증값을 조회하지 않았고 신규 권한도 만들지 않았다. 준비한 것은 검토할 코드·패치·파일 배치 계획이다.

## 어디에 무엇을 둘 것인가

대상 기기는 이전에 확인한 **MiniHQ / DESKTOP-GF8ODN1 / Ubuntu-24.04**다. 다음은 **예정 경로이며 존재 여부를 새로 확인한 경로가 아니다**.

`/home/muk/.openclaw/workspace/automation/saju-agent/`

- `releases/<앱 전체 SHA>/app/operations/saju_agent`: 사주 도메인 코드와 준비 자료.
- `releases/<앱 전체 SHA>/sources/agent-base`: 원본 `c0f861661f664edd70c45b6a29d20dfded0f5669`의 별도 전체 사본에 후보 패치 적용.
- `releases/<앱 전체 SHA>/sources/insurance-growth-agent`: 원본 `dc50636ae97f6f3a9a5d76be2c7968b69cd1f920`의 별도 전체 사본. 코드 변경 없음.
- `state/<앱 전체 SHA>/base`: 사주 전용 Base DB·native workpack·문서·비용 예약 기록. contract 링크는 이 후보의 Base 사본만 가리킴.
- `state/<앱 전체 SHA>/growth`: 사주 전용 Growth 상태.

예정 위치가 이미 사용 중이면 설치를 중단하고 재검토한다. 기존 검수 원본, 실행 서비스, current 별칭, 공용 provider 설정, 고객·보험 DB를 덮어쓰거나 재사용하지 않는다. 개발에 사용한 38개 발췌 파일을 전체 엔진 설치본으로 가장하지 않는다. 설치 시 별도 위치에 정확한 버전의 전체 저장소 사본을 준비해야 한다.

**파일을 배치해도 자동으로 시작되는 것은 없다.** 서비스·cron·timer·watcher·포트를 추가하지 않는다. Goal/registry 등록도 파일 설치에 포함되지 않는다. 등록 후보는 tenant `saju`, Goal `saju-preparation`, domain `saju-agent`, SANDBOX이며 초기 상태는 DRAFT다. 운영 권한·검토 참조는 아직 미발급이다.

앱 반영은 `anrrlf-hue/wd-7k2n-app`의 별도 변경이다. 패키지의 앱 커밋은 코드 반영 대상이며 현재 Production SHA나 배포 완료를 뜻하지 않는다. 새 통계는 기본 비활성이고 현재 Production의 수집 OFF는 미확인이다.

## 연결 및 비용 제어

기존 Growth 판단 → Factory 제안 → Base 실행·검증 → Growth 증거 수집·다음 판단 연결을 유지한다. 홍보 작성·평가·개선안, Growth 판단은 동일한 기존 `_llm_task_synthesis` 경계에서 공통 실행 예산을 사용한다. 새로운 모델·유료 API·스케줄러는 추가하지 않는다.

`model-policy.pending.json`의 **검토용 제안 상한**은 다음과 같다. 승인 금액·과금조건·모델·계정 참조는 null이며 실행은 false다.

| 한 번의 승인된 실행 전체 | 제안 상한 |
|---|---:|
| 총 모델 호출 | 8회 |
| 총 입력 토큰 | 65,536 |
| 총 최대 출력 토큰 예약 | 16,000 |
| 한 호출의 입력 | 8,192 |
| 한 호출의 최대 출력 | 2,000 |
| 동일 요청의 명시적 재시도 | 최대 1회, 위 총량에 포함 |
| 자동 모델 재시도 / 자동 반복 실행 | 없음 |
| 승인 금액 | **미설정(null)** |

기본적인 전·후 Growth 평가/판단 4회와 문서 3회는 7회이며, 실제 다른 판단 경로도 동일한 총량에서 차감한다. 한도는 계획상 자동 호출 보장이 아니며, 한도가 부족하면 호출 전에 중단한다.

실행 전 조건:

1. Goal이 지문으로 승인한 policy와 사주 Scope가 일치해야 한다. 같은 승인으로 다른 실행 키를 시작해 한도를 리셋할 수 없다.
2. 계정 과금조건의 비밀값 없는 참조·지문, 계정 연결 참조, provider/model, 통화, 승인 금액, 입력/출력 단가 상한·호출당 추가비용 상한, 모든 청구 항목을 포함한다는 근거, 승인 만료일이 필요하다. 값은 임의로 채우지 않았다.
3. Goal의 승인 금액·통화·모델 예산 승인 참조가 일치해야 한다. 양수 비용을 허용하는 계약 경로도 구현했다. 무료 전용으로 축소한 것이 아니다.
4. transport가 전체 provider 요청의 입력 토큰, 강제 출력 토큰 상한, 모든 청구 사용량, 단일 시도, 전체 비용 상한을 검증할 수 있어야 한다.

예약은 모델 제출 전에 같은 Base DB 트랜잭션에서 수행한다. 호출수·입력 토큰·최대 출력 토큰·최대 비용을 보수적으로 예약하며 사용량이 적어도 환급하여 추가 호출을 허용하지 않는다. 재개·허용된 명시적 재시도도 같은 예약 기록을 사용한다. 검증 완료된 동일 응답은 다시 호출하지 않고 읽는다. 제출 후 응답 소실, 미완료 예약, 사용량 누락·상한 초과는 해당 실행의 후속 호출을 차단한다. 기존 Base가 SUBMIT_UNKNOWN을 소유하며 자동 재호출하지 않는다.

### 현재 실제 모델 경로의 기술 blocker

검토된 `llm-task` 경계는 출력 토큰 제한을 전달하지 않으며 provider/model/usage를 선택적으로 받는다. 문자열 길이·JSON schema·타임아웃은 출력 토큰 비용 상한이 아니다. tokenizer와 숨은 재시도·추가 청구 항목의 검증도 확인되지 않았다.

따라서 현재 transport의 지원 상태를 코드에서 미확인으로 고정하고 `PROVIDER_HARD_LIMIT_AND_USAGE_UNVERIFIED`로 차단한다. 승인 금액을 채우거나 enabled만 바꿔도 이를 통과하지 못한다. 실제 지원을 확인하거나 검토된 경계를 보완하기 전에는 실모델 실행 불가다. 시험용 지원 transport는 외부 호출 없는 합성 fixture이며 실제 provider 지원의 증거가 아니다.

## 반영 패키지

커밋이 깨끗한 상태에서 아래 명령은 **로컬 검토 아카이브만** 만든다.

```bash
python -m operations.saju_agent.prepare_candidate \
  --sources /workspace/saju-agent-integration-upstream \
  --output /tmp/saju-agent-candidate-<새로운-출력명>
```

산출물은 `saju-agent-candidate.zip`, `install-manifest.json`, `SHA256SUMS`다. manifest에는 정확한 앱 SHA, 원본 버전, 예정 경로, 파일 설치 변경, native 파일 해시, 비용 승인 미설정 상태, 자동 시작 없음, 되돌리기 방법이 포함된다.

- `patches/agent-base.patch`: 원본 `anrrlf-hue/agent-base`의 위 c0f8616 버전 루트에서 `git apply --check` 가능한 누적 패치. 기존 계약 2개·모델 경계 2개 수정, 비용 가드 1개 추가.
- `patches/wd-7k2n-app.patch`: 앱의 `3f0ddb8adffa62fbfa256966dbee1bac7ef271bf`에서 manifest의 앱 커밋까지 반영할 누적 패치.
- `app/operations/saju_agent`: 앱 커밋에 포함된 도메인 코드·검증·검토 자료.
- 각 파일의 SHA-256과 archive SHA-256을 제공한다. 설치나 등록 명령은 실행하지 않는다.

## 되돌리기

파일 배치만 한 상태는 시작된 서비스가 없으므로 후보 환경을 더 이상 참조하지 않으면 된다. 후보 디렉터리와 상태는 보존하며 기존 서비스나 검수 원본을 수정할 필요가 없다. 추후 별도 승인으로 실행했다면 사주 tenant/Goal의 기존 중지 경로로 새 claim을 막고, 비용 예약·UNKNOWN 요청·증거는 유지한다. 예산을 지우거나 응답 불명 호출을 재실행하지 않는다. 앱 배포의 되돌리기는 배포 직전에 확인한 실제 이전 배포 ID를 기준으로 별도 수행한다.

## 추가 집중 검증

2026-10-12 최종 집중검사 **18/18 통과**: 새 비용 검사 16개와 기존 실제 엔진 연결·재개 검사 2개. 변경 Python 구문 검사 및 whitespace 검사도 통과했다. 원본 Base 파일의 임시 사본에 누적 패치를 적용하여 5개 결과 파일의 SHA-256 일치를 확인했다. 제품 전체 회귀·빌드는 이번 추가 범위에서 반복하지 않았다.

`python -m unittest operations.saju_agent.test_budget.BudgetTests -v`는 승인 누락·만료·금액/실행 키 불일치, 실제 미지원 transport 차단, 작성/평가/Growth 공통 호출 한도, 입력/출력/금액 사전 예약, 양수 비용 계약, 명시적 재시도 총량, 응답·사용량 불명 차단, 재개·완료 실행의 한도 유지, 실제 기존 모델 경계와 Growth budget 전달을 검사한다. 금액·과금조건·응답은 모두 TEST fixture다. 실제 네트워크와 모델 프로세스는 차단한다.

패키지는 원본 파일의 임시 사본에 Base 패치를 적용하고 수정 후 해시를 대조한다. 앱 패치 역시 원본 기반에 적용 가능한지 확인한다. 기존 제품 전체 검사·빌드·기기 촬영을 반복하는 범위가 아니다. 실제 iPhone/Android 카메라와 모델 품질·과금·운영 효과는 여전히 미검증이다.
