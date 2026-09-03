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

import { Button } from "@/components/ui/button";
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
    <div className="mx-auto w-full max-w-5xl px-4">
      <section className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
        <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          Treino · Alimentação · Metas · Evolução
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
          <Button size="lg" render={<Link href="/painel" />}>
            Começar agora
            <ArrowRightIcon />
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/painel" />}
          >
            Ver o painel
          </Button>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="size-5 text-foreground" />
              </span>
              <CardTitle className="text-base">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="pb-20">
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h2 className="font-heading text-xl font-semibold md:text-2xl">
              Comece a registrar hoje
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              O cadastro e o login chegam na próxima etapa do desenvolvimento.
              Por enquanto, explore a estrutura do painel.
            </p>
            <Button render={<Link href="/painel" />}>
              Explorar o painel
              <ArrowRightIcon />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
