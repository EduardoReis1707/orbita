import Link from "next/link";
import {
  ArrowRightIcon,
  DumbbellIcon,
  FolderIcon,
  LineChartIcon,
  TargetIcon,
  TrendingUpIcon,
  UtensilsIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: LineChartIcon,
    title: "Dashboard consolidada",
    description:
      "Peso, IMC, treinos da semana e progresso das metas em cards e gráficos fáceis de ler.",
  },
  {
    icon: DumbbellIcon,
    title: "Treinos com histórico",
    description:
      "Registre exercícios, séries, repetições e cargas e acompanhe a evolução ao longo do tempo.",
  },
  {
    icon: UtensilsIcon,
    title: "Alimentação",
    description:
      "Refeições, calorias e macronutrientes, comparados com as suas metas diárias.",
  },
  {
    icon: TargetIcon,
    title: "Metas objetivas",
    description:
      "Defina objetivos de peso, medidas, carga ou frequência e veja o percentual concluído.",
  },
  {
    icon: TrendingUpIcon,
    title: "Evolução visual",
    description:
      "Gráficos de peso, medidas e desempenho por período: 7 dias, 30 dias, 3 meses ou personalizado.",
  },
  {
    icon: FolderIcon,
    title: "Seus documentos",
    description:
      "Fichas de treino, planos alimentares e avaliações físicas em PDF, organizados num só lugar.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-140px] -z-10 h-[440px] w-[760px] max-w-[95vw] -translate-x-1/2 rounded-full bg-primary/20 blur-[130px] dark:bg-primary/25"
      />

      <div className="mx-auto w-full max-w-5xl px-4">
        <section className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
          <span className="rounded-full border border-primary/25 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            Treino, alimentação, metas e evolução num só lugar
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            Todo o seu acompanhamento físico em um só lugar
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground md:text-lg">
            Pare de espalhar treinos, dieta, peso e medidas por planilhas e
            aplicativos diferentes. Registre a sua rotina e acompanhe a evolução
            com gráficos, metas e relatórios.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/cadastrar" className={buttonVariants({ size: "lg" })}>
              Criar conta
              <ArrowRightIcon />
            </Link>
            <Link
              href="/entrar"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 motion-safe:hover:-translate-y-0.5"
            >
              <CardHeader>
                <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                  <feature.icon className="size-5" />
                </span>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="pb-20">
          <Card className="relative isolate overflow-hidden border-0 text-white shadow-lg shadow-primary/25">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-brand-gradient"
            />
            <div aria-hidden className="absolute inset-0 -z-10 bg-primary/30" />
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <h2 className="font-heading text-xl font-semibold md:text-2xl">
                Comece a registrar hoje
              </h2>
              <p className="max-w-xl text-sm text-white/85">
                Crie a sua conta, defina o seu objetivo e comece a registrar os
                seus treinos, medidas e alimentação.
              </p>
              <Link
                href="/cadastrar"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-medium text-primary shadow-sm transition-all duration-200 hover:bg-white/90 motion-safe:hover:-translate-y-0.5 [&_svg]:size-4"
              >
                Criar conta
                <ArrowRightIcon />
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
