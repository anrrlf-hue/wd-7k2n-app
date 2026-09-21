import { LoginCard } from "@/components/auth/login-card";

function safeNext(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/management";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-10">
        <LoginCard nextPath={safeNext(params.next)} />
      </div>
    </main>
  );
}
