# 유료2(개인 재무 리포트) 출력 항목 — 설계 문서

이번 라운드는 코드/라우트를 만들지 않는다. 리포트 템플릿에 개인 숫자가
들어갈 자리(placeholder)만 미리 정의해, 나중에 실제 구현할 때 인테이크
스키마(`docs/paid-tier-2-intake-schema.md`)와 바로 연결되게 한다.

## 출력 자리 목록

| 자리 | 설명 | 데이터 출처 |
|---|---|---|
| `{consultDate}` | 참고한 상담 기록의 상담 시점(비식별, 연월까지만) | 인테이크 스키마 |
| `{wealthTypeLabel}` | 사용자의 재물 유형명(예: "새는 형") | 앱 계산값(`WealthTypeCode`) 그대로 |
| `{startingIncomeRange}` | 사용자의 수입 구간 | 인테이크 스키마의 수입 구간 필드 |
| `{fixedCostRatio}` | 고정지출 비중 구간 | 인테이크 스키마의 고정지출 비중 필드 |
| `{peerCountInSameSituation}` | "비슷한 상황으로 상담받은 분 N명" | 인테이크 데이터 집계(재물 유형 × 수입 구간 × 주요 고민 교차) |
| `{mostMissedItem}` | 그 집단이 가장 많이 놓치고 있던 항목 | 인테이크 데이터의 "첫 처방" 필드 집계(가장 빈도 높은 처방 유형) |
| `{firstPrescriptionSummary}` | 사용자에게 나갈 첫 처방 한 줄 요약 | 유료1(재무 설문→처방) 결과 — 이번 라운드 범위 밖, 향후 연결 |
| `{monthsSinceFirstPrescription}` | 비슷한 상황에서 실제로 바꾼 분들이 변화를 보기까지 걸린 평균 개월 수 | 인테이크 데이터의 "실행 여부"+"이후 변화" 날짜 차이 집계 |
| `{savingsRateChange}` | 실행한 분들의 평균 저축률/부채 변화 | 인테이크 데이터의 "이후 변화" 숫자 변화량 집계 |
| `{personalMonthlyAmount}` | 위 집계 비율을 사용자의 실제 소득·지출에 대입한 금액 | 유료2 자체 설문(소득/지출/저축/부채 정확한 값) — 이번 라운드 범위 밖 |

## 비고

- 위 자리 중 `{peerCountInSameSituation}`, `{mostMissedItem}`,
  `{monthsSinceFirstPrescription}`, `{savingsRateChange}`는 **개별 사례가
  아니라 집계값**이어야 한다 — 인테이크 스키마 문서의 원칙(패턴 소비, 개별
  사례 노출 금지)을 그대로 따른다.
- 이번 라운드는 이 표를 앱 코드로 계산하는 로직을 만들지 않는다. 실제
  구현 시점에 인테이크 데이터가 일정량 쌓인 뒤 집계 쿼리/배치를 설계한다.
