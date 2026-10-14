# 생명선 오해석 방지 guard 검수

검수 branch HEAD: `fb48e8c5a2d841c98904e17b81c7921816e68278` 이전 작업 기준  
목적: 자동 인식 개선이나 출시 완료가 아니라, 기존 모델의 `life_line` class가 중앙 짧은 세로 segment를 생명선 풀이로 승격시키는 오해석 방지.

## 구현

- `src/lib/palm-life-line-geometry.ts`에 landmark-derived frame guard를 추가했다.
- `src/lib/palm-detection.ts`는 선택된 raw/enhanced crop의 landmark와 같은 crop 좌표의 ONNX start/end를 비교한다.
- 모델 class 이름만으로 anatomical identity를 확정하지 않는다.
- 중앙에 가깝고 세로로 긴 segment는 `rejected`로 분류한다.
- 짧거나 endpoint/geometry가 없거나 ambiguous이면 `unconfirmed`로 남긴다.
- 엄지 쪽 normalized 위치·방향·충분한 span이 맞을 때만 `supported`다.
- `palmPersonalLineReading("lifeLine", ...)`는 새 provenance가 있는 경우 `supported`만 customer prose로 보낸다. `rejected`/`unconfirmed`는 해당 항목을 보류하며 다른 확인된 선은 유지한다.
- 좌우 mirror와 회전은 wrist→middle-MCP 축 및 thumb-MCP cross product로 처리하고, 해상도는 normalized crop 좌표와 landmark frame으로 처리한다.

## 합성 검수

`scripts/test-life-line-geometry.mjs`:

- 엄지 쪽 곡선: `supported`
- 중앙 세로 segment: `rejected`
- 짧은 segment: `unconfirmed`
- mirror: 동일하게 `supported`
- rejected/unconfirmed customer line: prose 미생성
- supported customer line: 기존 생활 풀이 보존

합성 테스트는 지오메트리 guard와 보류 불변식을 검증할 뿐 실제 사진 인식 성공률의 증거가 아니다.

## 현재 한계와 blocker

ONNX 출력은 선택 component의 PCA extrema start/end만 제공하고 완전한 선 경로를 제공하지 않는다. 따라서 이 guard는 명백한 중앙 세로 오해석을 차단할 수 있지만, 모든 엄지 둘레 생명선을 검증하거나 손금 종류를 완전 분류하지 않는다. 충분한 geometry가 없으면 `unconfirmed`로 남긴다.

새 모델·외부 API·사진 전송은 사용하지 않았다. main/Production은 변경하지 않았다.
