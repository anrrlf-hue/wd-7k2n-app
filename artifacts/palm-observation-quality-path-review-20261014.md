# Palm observation quality — path agreement first evidence

이번 작업의 첫 개발 단위는 새 모델이 아니라, 이미 모델이 반환한 실제 foreground path를 raw/enhanced crop 사이에서 비교할 수 있는 좌표 계약이다.

- `src/lib/palm-line-stability.ts`는 랜드마크로 선을 만들지 않는다.
- 각 관찰 path를 wrist→middle-MCP 축과 palm-width 기준으로 공통 좌표에 투영한다.
- 경로 순서가 반대로 반환되는 경우도 비교하고, 평균·최대·끝점 거리와 길이 비율을 기록한다.
- 경로가 없거나 frame이 유효하지 않으면 `missing_path`/`invalid_frame`으로 남긴다.
- 이번 단계에서는 임계값을 고객 판독 gate로 사용하지 않는다. 합성 시험은 좌표 변환·순서 반전·형상 변화가 metric에 반영되는지만 검증한다.

따라서 이 artifact는 손금 인식 정확도나 운명선·태양선·재물선 판독 성공을 주장하지 않는다. 실제 동일 사진의 raw/enhanced 출력, 촬영 변화, 다른 사람, 불명확 사진을 연결한 평가셋이 있어야 다음 단계에서 안정성 gate를 정할 수 있다. MediaPipe landmark는 좌표 정렬에만 쓰며 주름 경로를 생성하지 않는다.
