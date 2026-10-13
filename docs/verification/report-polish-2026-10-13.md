> 이 문서는 ae7e854 단계의 기록입니다. 문장·월별 표시·저장본 정책·lint 최종 결과는 [후속 검증 기록](narrative-report-verification-2026-10-13.md)을 따릅니다.

# 통합 리포트·손금 반복 수정 검증

기준 main: `c3392b1a87503e3c3631710b1ff1e4b2c5a11731`.
브랜치: `fix/integrated-report-reading-flow`.
작업공간: `/workspace/wd-7k2n-report-polish`.
후보 서버: 선택된 클라우드 환경 내부 `http://127.0.0.1:3027` (외부 공개/Production 아님).

## 결과와 원인

- **손금 반복 재현:** 기존 `buildPalmBilateralReading`은 양손별 동일 문장 생성기를 호출했다. 동일 관찰값의 합성 양손에서 첫 두 문단이 완전히 같았다. 새 생성기는 두뇌선·감정선·생명선을 양손 한 항목으로 비교하고 관찰/해석을 분리한다. 읽히지 않은 선은 보류한다. 운명선 직업 예시는 기존의 `clear && corroborated` 조건에서만 추가한다. 인식 모델·품질 기준은 그대로다.
- **표시 중복:** 양손 풀이 뒤의 별도 강점/조직/기회 나열을 제거했다. 직접 성향 응답이 있을 때의 추가 비교는 접힌 항목으로 남겼다. 손금 특징을 나이 구간에 순환 배정하던 20년 표는 생성/API/화면에서 제거했다. 이를 다른 예측으로 대체하지 않았으며 기존 사주 기반 12개월 비교를 유지한다.
- **저장 원인:** 옛 문장과 미래 표를 통째로 복원했다. 이제 저장된 양손 관찰값에서 새 풀이를 생성한다. 성향 입력이 바뀌면 촬영 결과를 보존하되 리포트 재요청을 안내한다. 완료된 첫 손과 양손 분석은 탭 내 저장되어 새로고침/뒤로가기 후 이어갈 수 있다. 원본 사진은 메모리에만 있고 저장·전송하지 않는다.
- **프리미엄:** 분야 선택/별도 상세 호출을 없앴다. 한 번 누르면 총운→연애→재물→직장→12개월로 읽는다. 과거 `focus` 값이 어떤 것이어도 같은 통합 결과를 만든다. 무료 요약 복제, 우선 행동 재복제, 프리미엄에서의 전체 손금 재복제를 표시하지 않는다. `2주` 고정 과제는 실제 대화·업무·지출 때 쓸 행동 예시로 고쳤다. 월별 같은 행동은 분야마다 한 번만 묶는다.
- **공유:** 사주 결과 뒤 손금 진입 전 공유를 없앴다. 양손 결과 뒤 또는 사용자가 ‘손금 없이 결과 마무리하기’를 고른 뒤에만 나온다. 프리미엄을 열면 그 리포트 아래에 위치한다. 요청 중에는 감춘다. 기존 서비스 링크만 공유하며 생년월일·손 원본·개인 풀이·질문을 추가하지 않는다.
- **프리미엄 수신:** 헤더+본문 전체 30초 제한, fetch/stream 취소, 새 요청·화면 이탈 뒤 늦은 결과 차단을 적용했다. 응답/저장 구조를 확인한 후 표시한다. 같은 입력·KST 월의 리포트는 같은 탭에서 재열람한다. 저장 차단/용량 오류는 성공 결과를 막지 않는다.

## 실제 검증

| 검사 | 결과 / 범위 |
| --- | --- |
| `npm run build` | PASS, Next 16.3.4 production build |
| `npx next typegen`, `npx tsc --noEmit` | PASS |
| 변경 소스 ESLint | 오류 0 / 경고 0 |
| `npm run lint` | 기존 오류 2 / 경고 5. 아래 구분 참조 |
| `test-premium-annual.mjs` | 합성 생년월일 3개, 무료 긴 문자열 재사용 0, 구 focus 5개 모두 동일 통합 결과, 12×4 계산/정밀도/근거 수정 전과 동일, 불완전 구조 거절 |
| `test-premium-annual-grouping.mjs` | 연속/비연속 월 구분, 동일 행동 한 번, 12개월과 근거 모두 유지 |
| `test-integrated-palm-report.mjs` | 이전 중복 재현, 다른 모양/주손 변경/부분 판독/판독 불가, 실제 로컬 API, 이전 저장본 재진입, 성향 변경 시 재요청 |
| `test-palm-browser.mjs` | 정상 오른손→왼손, 헤더 정지 30,222ms / 본문 정지 30,130ms 뒤 네트워크 중단, 양손 유지 재시도, 느린 응답, 취소·늦은 응답 차단, 첫 손 완료 후 새로고침, 뒤로가기 후 재요청 |
| `test-palm-analysis-task.mjs` | 이전 본문 무기한 대기 재현, 현재 요청/본문 제한·중단·잘못된 JSON·오류·재시도·stale guard |
| `test-premium-release-browser.mjs` | 모바일 390 / 데스크톱 1440, 통합 순서·12개월·공유 순서, 접기/재열람/새로고침 시 재호출 없음, 다른 입력 분리, 취소·정지/본문 지연·이탈·재시도·불완전 응답·저장 차단 |
| `test-service-share-browser.mjs` | 손금 선택 전 공유 없음, 건너뛴 뒤 공유 가능, native/clipboard 성공·실패·취소·수동 복사, 수신자는 새 무료 진입, 개인 데이터 없는 정확한 공유 payload |
| `test-palm-secondary-regressions.mjs`, `test-palm-fate-fusion.mjs` | 7/7, 9/9. 기존 선·보조선 품질 구분 유지 |
| 실제 로컬 MediaPipe worker | 빈 이미지 거절 PASS. 실제 손 인식 정확도 증거는 아님 |

브라우저의 정상 인식 흐름에는 합성 관찰값을 사용했다. 프리미엄 요청/본문 제한과 로컬 인식 60초 제한은 브라우저 가상 시계로 확인했다. 손금 합산 서버의 두 30초 제한은 실제 경과시간이다. BFCache는 pagehide/pageshow 이벤트 시뮬레이션이며 Safari 실제 복원 검증이 아니다. 외부 모델 요청과 메시지 전송은 하지 않았다. 분석 수집 OFF를 유지했고 프리미엄 테스트에서 `/api/analytics` 호출이 없었다.

전체 lint 오류는 변경하지 않은 `src/app/diagnosis/page.tsx:112`, `src/app/management/page.tsx:41`의 `react-hooks/set-state-in-effect`다. 시작 기준 보고의 2 오류/9 경고에서 변경 파일의 기존 경고 4개가 사라져 2 오류/5 경고다. 수정한 각 파일의 HEAD 원문과 현재 코드를 같은 ESLint 설정으로 비교했다. 신규 오류/경고는 없다.

## 증거와 비교 샘플

- [합성 입력 3개의 무료/프리미엄 전문 비교](integrated-report-samples-2026-10-13.md)
- [요구사항별 수정·검증 목록](report-polish-checklist-2026-10-13.md)
- 실행 로그·JSON·스크린샷: `/workspace/saju-report-polish-evidence/`
- 모바일 화면: `palm-observations-restored.png`, `premium-overview-390.png`, `premium-money-390.png`, `premium-annual-390.png`, `service-share-mobile.png`
- 전체 화면: `premium-integrated-390.png`, `premium-integrated-1440.png`
- 상세 기록: `palm-duplication.json`, `palm-full-deadlines.log`, `palm-storage-recheck.log`, `premium-integrated-browser.json`, `service-share-browser.json`, `changed-files-lint.json`, `build.log`, `full-lint.log`

중복 0은 **40자 이상 무료 문자열의 동일 재사용** 지표다. 의미적 유사도, 소비자 만족도, 예측 정확도 또는 유료 지불 의향을 입증하지 않는다.

## 남은 검증과 출시 판단

- 실제 iPhone Safari/Android Chrome 카메라에서 오른손→왼손, 흐린 사진, 통신 지연, 뒤로가기/재시도를 확인해야 한다. 실제 손 사진 인식 품질과 원래 ‘멈춤’ 원인은 이 환경에서 확정하지 않았다.
- 프리미엄 재열람은 동일 탭의 sessionStorage 범위다. 탭 종료 후, 다른 기기, 계정 간 장기 보관은 구현하지 않았다. 처리 완료 전 사진의 재진입 복원도 제공하지 않는다. 같은 화면의 사진 재시도 및 완료된 관찰값 복원은 검증했다.
- 기존 lint 오류 2건은 별도 정리가 필요하다. 로그인·Supabase·Anthropic 실호출은 이번에 검증하지 않았다. 현재 변경은 이들을 새로 요구하지 않는다.
- 상위 스레드 조사에서 전달받은 점신의 메뉴 폭, 포스텔러의 주제/월별 풀이, 헬로우봇의 대상/범위/미리보기를 고려하면, ‘통합 리포트’만으로 독점적 차별성이 생겼다고 볼 수 없다. 현재 후보의 검토 가치는 읽기 쉬운 구체적 행동, 풀이 근거, 월별 재열람 연결이다. 실제 사용자 이해도·재열람·지불 의향은 미검증이다. 가격·결제·공유 보상은 별도 사업 결정으로 남긴다.

## 승인 전 변경 범위

검토 대상은 위 리포트 생성/표시, 공유 위치, 탭 내 복원/요청 취소와 관련 회귀 스크립트다. 로컬 수정 브랜치에만 커밋한다. main 병합·원격 push·공개 PR·Production 배포를 하지 않는다. 첫 화면 hero 제거를 그대로 유지한다. 가격/결제/보상·수집 활성화·고객정보/보안 설정·Core/Growth/Factory/설치된 Saju agent는 변경하지 않는다.

DEVELOPMENT_SKILL_USED: 저장소의 humanize-report-writing-notes, saju-gungwi-interpretation-notes.
RUNTIME_LIB_USED: 기존 사주 계산·규칙 생성·로컬 MediaPipe/ONNX 및 기존 Zod. 신규 모델/유료 API/인증 없음.
