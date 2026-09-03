import { WifiOffIcon } from "lucide-react";

export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <WifiOffIcon className="size-6 text-muted-foreground" />
      </span>
      <h1 className="font-heading text-lg font-semibold">Você está offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Reconecte à internet para continuar usando o Auxiliar de Treino.
      </p>
    </div>
  );
}
