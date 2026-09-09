"use client";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", textAlign: "center", padding: "1.5rem" }}>
        <h2>일시적인 오류가 발생했어요</h2>
        <button onClick={() => retry()} style={{ marginTop: "1rem" }}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
