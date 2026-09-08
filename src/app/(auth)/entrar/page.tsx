import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Entrar" };

/** Só aceita caminho interno ("/algo"), nunca URL absoluta ou "//host". */
function safeNext(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNext((await searchParams).next);
  return <SignInForm next={next} />;
}
