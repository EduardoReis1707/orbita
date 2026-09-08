import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <p className="text-sm text-muted-foreground">Carregando conteúdo…</p>
      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-8 w-48 max-w-full motion-reduce:animate-none" />
        <Skeleton className="h-32 w-full motion-reduce:animate-none" />
        <Skeleton className="h-48 w-full motion-reduce:animate-none" />
      </div>
    </div>
  );
}
