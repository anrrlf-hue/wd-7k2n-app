# 공개 사진 path 대조 — 기존 오류의 실제 보류 근거

재실행 없이 기존 저장 결과를 원본 사진과 대조했다.

- 사진: `Normal_creases_adult.jpg`
- source SHA-256: `c49aeecada0c1f72714b3220b9bd37b588c76955602dbb504018ac32158dde5f`
- 기존 aligned crop SHA-256: `9eb92ec2abe81b27fc13a2e2607c1ff59e78a409accaac1581580fb5cf233dc3`
- 재사용 path: `path-c49aeecada0c-exact-canvas-baseline-00.json`
- path point 수: 270
- pixel bbox: `x=290..460, y=527..622`

## 관찰

원본에서 기존 후보는 엄지와 검지 사이 위쪽의 짧은 가로 주름에 놓인다. 저장된 path를 기존 landmark frame(wrist→middle-MCP, palm width)으로 투영하면:

```text
along: 0.7239..0.8489
alongSpan: 0.1250
across: 0.1018..0.4931
```

즉 path는 손목에서 올라오는 긴 생명선 경로가 아니라 손바닥 상부의 짧은 횡단 주름이다. `alongSpan < 0.2`이므로 현재 생명선 guard는 이를 `supported`로 승격하지 않고 `unconfirmed`로 보류한다. 이 결과는 MediaPipe landmark로 선을 만든 것이 아니라 저장된 실제 foreground path를 해부학 frame에서 측정한 것이다.

## 결론

이 사례에서 필요한 개선은 안정성 점수를 높이는 것이 아니라, 후보 path의 위치·연속성·영역 불일치를 선 이름보다 먼저 적용하는 것이다. 현재 구현은 생명선에 대해 이 보류를 수행하며, 보조 운명선 후보도 실제 연결 foreground path가 없으면 관찰 후보로 승격하지 않는다. 운명선·태양선·재물선은 이 사진에서 전체 경로와 연결 범위를 확보하지 않았으므로 고객 선 해석으로 승격하지 않는다. 이 artifact는 다른 선 이름을 자동 확정했다는 증거가 아니며, 실제 성인 사진 한 장의 false-positive rejection 증거다.

## fixture 계약 분리

`test-palm-customer-reading.mjs`의 `fingers` 기대는 `7d7a270`에서 고객 passage 구현이 제거된 뒤 남은 낡은 assertion이다. 현재 `buildPalmCustomerPassages`는 검증된 3개 주요선과 승인된 fate candidate만 반환하고 손가락 비율은 해석 근거로 쓰지 않는다. 따라서 이는 새 path 변경의 회귀가 아니라 fixture와 현재 제품 계약의 불일치다.
