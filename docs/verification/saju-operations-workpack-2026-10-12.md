# 사주 운영 업무팩 연결 개발 검토

기준: 실제 PR53 병합·Production SHA `d83f1e400ccea1fc30dee58f97bf2191c86a90fc`.
격리 worktree: `/workspace/wd-7k2n-ops-review`, branch: `feat/saju-operations-workpack`.

## 기존 사주 변경 검토

- 프리미엄: 계산 근거 → 2주 실험·전환 조건 → 12개월 흐름을 추가하고 반복 권고를 해당 기간별로 묶었다. 미리보기는 열려 있고 가격·결제·보상은 미확정이다. 같은 근거에서 같은 권고가 나올 수 있으며 과학적 예측이나 사용자 성과가 검증된 것은 아니다.
- 손금: worker로 로컬 분석을 옮기고 실제 단계·전체 요청/본문 제한시간·취소·stale 결과 차단·양손 보존 재시도를 반영했다. 데스크톱 합성/일러스트 검증과 실제 iPhone/Android 카메라 검증은 구분한다. 실제 기기·저메모리 원인은 여전히 미확정이다.
- 공유: 개인정보 없는 공식 무료 진입 링크와 공유창/복사 상태를 사용한다. 실제 수신자 전달 완료를 확인하는 기능은 아니다.
- PR 및 main CI, 로컬 제품 검사는 이전에 통과했다. Production READY·main SHA 일치는 확인했지만 공개 브라우저 재검증은 당시 환경 프록시 CONNECT 403으로 막혔다. 이를 공개 동작 PASS로 바꾸지 않는다.
- 현재는 출시 전 검토용이다. 사용자 지시에 따라 방문·사용 통계 연결은 도메인 연결 후까지 보류한다. 이번 작업은 기존 analytics 코드나 Production 설정을 바꾸지 않는다.

## 이번 결과

[운영 업무팩과 상세 계약/검증](../../operations/saju_ops_workpack/README.md)을 추가했다. 고객 정보 없는 합성 점검 상태 → 기존 Growth callback/Factory compiler → 기존 Base native handler → 기존 Product projection까지 로컬 계약을 검증했다. 별도로 기존 Product `/api/jobs` 요청을 생성하되 전송하지 않는 handoff를 추가했다. 두 경계를 실제 운영에서 연결했다고 주장하지 않는다.

원본 엔진 21파일의 Git blob을 검증한 뒤 targeted 8/8 PASS. 신규 엔진·스케줄러·운영 DB·키·쿠키·수집 도구·유료 API는 없다. 테스트는 임시 공간에서만 기존 Base 스키마를 사용하고 네트워크를 차단했다. 무자료는 NO_DATA/WAIT, synthetic 결과는 실측 성과로 승격하지 않으며 Base business receipt도 기록하지 않는다.

실제 연결 blocker는 사주용 reviewed registry/draft/Method pin, Goal 권한, installed capability와 Product binding의 readback 및 활성화 승인이다. 확인되지 않은 운영 pin은 생성하지 않았다. 원격 push/PR/main 변경/Production 배포/활성화는 이번 작업에서 수행하지 않았다.
