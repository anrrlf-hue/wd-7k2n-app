# 외부 해석 운영 조건

`SAJU_EXTERNAL_MODEL_ENABLED`는 서버 전용 환경 변수입니다. 값이 정확히 `true`인 경우에만 기존 Anthropic 경로를 사용할 수 있습니다. 미설정, `false` 및 다른 값은 OFF입니다. `NEXT_PUBLIC_` 변수나 요청 본문으로 활성화하지 않습니다.

키만 설정되어 있어도 기본 OFF에서는 외부 호출 없이 기존 규칙 풀이를 제공합니다. 실제 서비스의 플래그나 환경 변수를 변경하는 작업은 이번 변경에 포함하지 않았습니다. ON에서도 키가 없거나 네트워크·응답 검증이 실패하면 기존 fallback과 품질 기준을 유지합니다.

적용 경로는 `/api/saju`의 두 해석, `/api/saju/interpret`의 단독 해석, `/api/reality-answer`의 질문·후속 질문입니다. 통합 연간 리포트·손금·관계 비교는 계속 내부 규칙을 사용합니다.

`node scripts/test-external-model-opt-in.mjs`는 프로세스 안에서 테스트용 키와 fetch mock만 사용해 서버 OFF/ON, 실제 요청 handler, 응답 검증과 fallback을 확인합니다. 실제 유료 API를 호출하지 않습니다. 입력 동의 화면과 개인정보처리방침은 기기 자동 저장 및 명시적 외부 해석 활성화의 처리 범위를 함께 알립니다.
