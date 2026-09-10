# oh-my-saju (vendored)

`oh-my-saju.mjs`는 [JaeSang1998/oh-my-saju](https://github.com/JaeSang1998/oh-my-saju)
(commit `a8c0cf64adfde8fb1ce253112529edd8e90cc94b`, 2026-08-23)의
`plugins/oh-my-saju/skills/oh-my-saju/scripts/oh-my-saju.mjs`를 그대로 복사한
자기완결(self-contained) esbuild 번들이다. 외부 파일 의존 없이 단독 실행된다
(moment/astronomy-engine 등 런타임 의존성이 모두 인라인됨).

- 라이선스: Apache-2.0 (`LICENSE`, `NOTICE.md` 원본 그대로 보존).
- 용도: `src/lib/oh-my-saju-adapter.ts`가 자식 프로세스로 이 스크립트를 호출해
  `analyze-reading` 커맨드를 실행하고, `ziping`(격국/월령, 《자평진전》·《연해자평》)과
  `ditianshui`(통근/신강신약, 《적천수》) 팩의 구조화된 판정만 우리 제품의
  `geukguk`/`dayStrength` 필드 보강에 사용한다. 원본의 `qiongtong`(조후) 팩은
  자체적으로 "실험용 전사, 120칸 중 7칸만 대조 완료"라고 밝히고 있어 제품에는
  연결하지 않는다.
- 업데이트 방법: 원본 저장소에서 새 커밋을 clone한 뒤 같은 경로의 `.mjs`/`LICENSE`/
  `NOTICE.md`를 다시 복사하고, 이 README의 commit 해시를 갱신한다.
