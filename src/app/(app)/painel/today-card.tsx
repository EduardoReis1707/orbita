import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CheckCircle2Icon,
  DumbbellIcon,
  MoonIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type TodayState =
  | { kind: "planned-today"; id: number; name: string }
  | { kind: "done-today"; name: string; trainedThisWeek: number }
  | { kind: "planned-future"; id: number; name: string; date: string }
  | {
      kind: "rest";
      trainedThisWeek: number;
      daysSinceWorkout: number | null;
    };

/**
 * Cartão "o que fazer hoje" — a primeira coisa do painel. Responde de um
 * olhar: tem treino hoje? já treinei? nada planejado? — em vez de jogar a
 * pessoa direto nos números.
 */
export function TodayCard({ state }: { state: TodayState }) {
  if (state.kind === "planned-today") {
    return (
      <Shell icon={<DumbbellIcon className="text-primary" />}>
        <p className="text-xs font-medium text-muted-foreground">
          Treino de hoje
        </p>
        <p className="mt-0.5 font-heading text-lg font-semibold break-words">
          {state.name}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/treinos/${state.id}`}
            className={buttonVariants({ size: "sm" })}
          >
            Abrir treino
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Marque como realizado quando terminar.
        </p>
      </Shell>
    );
  }

  if (state.kind === "done-today") {
    return (
      <Shell icon={<CheckCircle2Icon className="text-success" />}>
        <p className="text-xs font-medium text-muted-foreground">Hoje</p>
        <p className="mt-0.5 font-heading text-lg font-semibold break-words">
          Treino concluído ✅
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.name} · {state.trainedThisWeek}
          {state.trainedThisWeek === 1 ? " treino" : " treinos"} nesta semana.
        </p>
      </Shell>
    );
  }

  if (state.kind === "planned-future") {
    return (
      <Shell icon={<CalendarIcon className="text-muted-foreground" />}>
        <p className="text-xs font-medium text-muted-foreground">
          Nada planejado para hoje
        </p>
        <p className="mt-0.5 font-heading text-lg font-semibold break-words">
          Próximo: {state.name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Planejado para {state.date}.
        </p>
      </Shell>
    );
  }

  // rest
  const { trainedThisWeek, daysSinceWorkout } = state;
  const recovering = trainedThisWeek >= 1 && (daysSinceWorkout ?? 99) <= 2;
  const neverTrained = daysSinceWorkout == null;

  return (
    <Shell
      icon={
        recovering ? (
          <MoonIcon className="text-muted-foreground" />
        ) : (
          <DumbbellIcon className="text-primary" />
        )
      }
    >
      <p className="text-xs font-medium text-muted-foreground">Hoje</p>
      {recovering ? (
        <>
          <p className="mt-0.5 font-heading text-lg font-semibold">
            Dia de descanso
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Você já treinou {trainedThisWeek}
            {trainedThisWeek === 1 ? " vez" : " vezes"} nesta semana. Aproveite
            para recuperar.
          </p>
        </>
      ) : neverTrained ? (
        <>
          <p className="mt-0.5 font-heading text-lg font-semibold">
            Que tal começar?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie o seu primeiro treino — pode ser simples, você ajusta depois.
          </p>
          <div className="mt-3">
            <Link
              href="/treinos?novo=1"
              className={buttonVariants({ size: "sm" })}
            >
              <DumbbellIcon />
              Criar treino
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-0.5 font-heading text-lg font-semibold">
            Nada planejado para hoje
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {daysSinceWorkout === 0
              ? "Você treinou hoje."
              : `Faz ${daysSinceWorkout} ${daysSinceWorkout === 1 ? "dia" : "dias"} desde o seu último treino.`}
          </p>
          <div className="mt-3">
            <Link
              href="/treinos?novo=1"
              className={buttonVariants({ size: "sm" })}
            >
              <DumbbellIcon />
              Novo treino
            </Link>
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex gap-3 px-4 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:size-4">
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </CardContent>
    </Card>
  );
}
