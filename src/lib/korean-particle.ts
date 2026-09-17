// 은/는, 이/가처럼 받침 유무에 따라 갈리는 한글 조사를 동적 문구에 붙일 때
// 쓰는 헬퍼. BOTTLENECK_COPY의 notUrgent처럼 운영자가 자유롭게 바꿀 수 있는
// 카피에 조사를 하드코딩해두면(예: "{notUrgent}는") 받침 있는 단어가 들어올
// 때마다 문법이 깨진다 — 실제로 "추가 소득원을 찾는 것는"처럼 깨지는 걸
// 확인했다. 받침 유무를 코드가 판정해서 항상 맞는 조사를 고른다.

function hasBatchim(text: string): boolean {
  const lastChar = text.trim().slice(-1);
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false; // 완성형 한글이 아니면 판정 불가 — 받침 없는 쪽으로 취급
  return (code - 0xac00) % 28 !== 0;
}

/** "은"/"는" 중 text 뒤에 맞는 조사를 고른다. */
export function eunNeun(text: string): "은" | "는" {
  return hasBatchim(text) ? "은" : "는";
}

/** "이"/"가" 중 text 뒤에 맞는 조사를 고른다. */
export function iGa(text: string): "이" | "가" {
  return hasBatchim(text) ? "이" : "가";
}

/** "을"/"를" 중 text 뒤에 맞는 조사를 고른다. */
export function eulReul(text: string): "을" | "를" {
  return hasBatchim(text) ? "을" : "를";
}
