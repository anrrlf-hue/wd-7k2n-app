# Actual path development resource gap

현재 저장소와 작업 환경에서 확인된 자료:

- `Normal_creases_adult.jpg` 1장과 기존 mask/path/provenance 결과
- 공개 bootstrap 후보 문서: PalmVeda/Lines 63장, CC BY 4.0; 24rd021/Palm-Reading 506장, CC BY 4.0이라고 기록됨
- 실제 dataset export(`data.yaml`, split별 image/label)와 smartphone capture 평가셋은 저장소에 없음
- sun은 `solar_line`/`sun_line`만 후보로 취급할 수 있고, mercury를 wealth로 바꿀 근거는 없음
- 현재 모델 결과에는 운명선 보조 pose 후보와 ROI 신호가 있으나, 태양선·재물선의 검증된 학습 경로는 없음

## 최소 다음 평가 사양

새 경로를 고객 판독에 연결하려면 원본 이미지와 source-grouped label을 함께 확보해야 한다.

1. 같은 원본 기준으로 raw, 밝기 변화, 회전·crop 변화의 path overlap/endpoint/continuity를 비교한다.
2. 다른 사람 사진과 일반 손바닥 잔주름·그림자 경계를 negative로 포함한다.
3. fate/sun/wealth 각각에 `visible path`, `not visible`, `ambiguous`를 별도 label하고, 선이 보이지 않는 경우 빈 path를 보존한다.
4. train/validation/test를 source image 기준으로 분리하고, smartphone 사진을 독립 test로 둔다.
5. 고객 승격 기준은 line name accuracy 하나가 아니라 path 연결성, 영역 적합성, false-positive rate, 변형 일관성을 함께 통과해야 한다.

이 자원이 없으므로 현재는 실제 사진 한 장에서의 false-positive 보류와 path provenance까지만 구현했다. 추가 사진을 추정 좌표로 채우거나, public bootstrap dataset을 검증 없이 학습·고객 판독에 사용하지 않는다.
