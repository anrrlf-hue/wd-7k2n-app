// Public service invitation only. Never accept a report, name, birth input,
// current page URL or palm data here.
export const PUBLIC_SERVICE_ORIGIN = "https://saju-app-rouge.vercel.app";
export const FREE_SHARE_ENTRY_PATH = "/diagnosis?mode=free&focus=overall&start=free&from=share";
export const SERVICE_SHARE_TITLE = "운·돈 · 무료 사주";
export const SERVICE_SHARE_TEXT = "운·돈에서 내 사주를 무료로 살펴보세요. 성향·관계·일·재물의 흐름을 참고할 수 있어요.";

export function buildServiceShare(): ShareData & { url: string } {
  return {
    title: SERVICE_SHARE_TITLE,
    text: SERVICE_SHARE_TEXT,
    url: PUBLIC_SERVICE_ORIGIN + FREE_SHARE_ENTRY_PATH,
  };
}
