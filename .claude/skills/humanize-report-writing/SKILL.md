---
name: humanize-report-writing
description: AI 티 나는 반복 문장 패턴을 제거하고 리듬을 다양화하는 개발용 편집 Skill. lguz/humanize-writing-skill(MIT)과 boraoztunc/skills의 stop-slop/copywriting 스킬에서 확인한 구체적 규칙을 정리했다. saju-app의 free-report-mock.ts, cross-interpretation-mock.ts 등 사용자 대상 리포트 문구를 작성/리뷰할 때 이 체크리스트를 적용한다.
---

# 리포트 문장 휴먼화 체크리스트

lguz/humanize-writing-skill (MIT, https://github.com/lguz/humanize-writing-skill)와
boraoztunc/skills의 stop-slop/copywriting 스킬(MIT,
https://github.com/boraoztunc/skills)에서 실제로 fetch해 읽은 규칙을
saju-app 리포트 문구 작성 체크리스트로 재정리했다.

## 금지 패턴

1. **부사 남발** — "정말", "진짜", "솔직히", "확실히" 같은 강조 부사를 문장에서 뺀다.
2. **이진 대비 구조 반복** — "A가 아니라 B" 형태를 문단마다 반복하지 않는다. 바로 B를 말한다.
3. **모든 문단이 같은 자기확인 장치로 끝남** — "~하지 않나요?"만 계속 쓰지 않는다.
   질문형 / 단정형("~낯설지 않을 거예요") / 예시 나열형을 섞는다.
4. **모든 문단이 같은 근거 태그로 끝남** — "OO개를 근거로 했어요"를 매번 반복하지
   않는다. 근거를 문장 중간에 자연스럽게 녹이거나, 괄호로 짧게 붙이거나,
   아예 도입부에 배치하는 등 위치를 바꾼다.
5. **장식적 대시 남용** — em dash를 남발하지 않는다.
6. **막연한 선언** — 구체적 장면/행동 없이 추상적 결론만 말하지 않는다.

## 권장 기법

- 문장 길이를 섹션마다 다르게(짧은 문장 + 긴 문장 섞기).
- 문단의 도입부를 바꾼다: 장면 묘사로 시작 / 단정적 주장으로 시작 / 질문으로 시작.
- 실제 계산된 값(숫자, 자리 이름)을 구체적으로 언급해 "누구에게나 할 수 있는 말"을 줄인다.

## saju-app 실제 적용

free-report-mock.ts의 `compose()` 헬퍼(claim/scene/evidence를 5가지 문장
구조로 조립)와 `SELF_CHECK_POOL`(자기확인 문구 6종 로테이션)이 이 체크리스트를
코드로 구현한 것이다. seed는 그 사람의 실제 계산값(일간/격국/십성 개수)에서
파생돼 사람마다, 그리고 같은 리포트 안 섹션마다 다른 구조를 쓰게 만든다.

## 이 Skill의 실제 사용 범위

이 체크리스트는 개발 단계에서 문구 코드를 작성/리뷰할 때 참고하는 것이며,
런타임에 사용자 요청마다 이 Skill을 호출해 LLM이 실시간으로 편집하는 구조가
아니다(런타임은 여전히 결정론적 mock). `DEVELOPMENT_SKILL_USED` /
`RUNTIME_LIB_USED`를 구분해서 보고할 것.
